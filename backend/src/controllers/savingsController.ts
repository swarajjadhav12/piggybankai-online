import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const createSaving = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const savingData = req.body;

    const saving = await prisma.saving.create({
      data: {
        ...savingData,
        userId,
        date: new Date(savingData.date),
      },
    });

    return res.status(201).json({
      success: true,
      data: saving,
      message: 'Saving recorded successfully',
    });
  } catch (error) {
    console.error('Create saving error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record saving',
    });
  }
};

export const getSavings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      page = '1',
      limit = '20',
      type,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };
    if (type) where.type = type;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [savings, total] = await Promise.all([
      prisma.saving.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.saving.count({ where }),
    ]);

    return res.json({
      success: true,
      data: savings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get savings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get savings',
    });
  }
};

export const getSaving = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Saving ID is required',
      });
    }

    const saving = await prisma.saving.findFirst({
      where: { id, userId },
    });

    if (!saving) {
      return res.status(404).json({
        success: false,
        error: 'Saving record not found',
      });
    }

    return res.json({
      success: true,
      data: saving,
    });
  } catch (error) {
    console.error('Get saving error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get saving record',
    });
  }
};

export const deleteSaving = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Saving ID is required',
      });
    }

    const existingSaving = await prisma.saving.findFirst({
      where: { id, userId },
    });

    if (!existingSaving) {
      return res.status(404).json({
        success: false,
        error: 'Saving record not found',
      });
    }

    await prisma.saving.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Saving record deleted successfully',
    });
  } catch (error) {
    console.error('Delete saving error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete saving record',
    });
  }
};

export const getSavingsSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { period = '30' } = req.query;
    const days = Number(period);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const totalSaved = await prisma.saving.aggregate({
      where: { userId, date: { gte: startDate } },
      _sum: { amount: true },
    });

    const savingsByType = await prisma.saving.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startDate } },
      _sum: { amount: true },
      _count: { type: true },
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await prisma.saving.groupBy({
      by: ['date'],
      where: { userId, date: { gte: sixMonthsAgo } },
      _sum: { amount: true },
    });

    return res.json({
      success: true,
      data: {
        totalSaved: totalSaved._sum.amount || 0,
        monthlyAverage: (totalSaved._sum.amount || 0) / (days / 30),
        savingsByType: savingsByType.map(t => ({
          type: t.type,
          amount: t._sum.amount || 0,
          count: t._count.type,
          percentage: totalSaved._sum.amount
            ? ((t._sum.amount || 0) / totalSaved._sum.amount) * 100
            : 0,
        })),
        monthlyTrend: monthlyTrend.map(item => ({
          month: item.date.toISOString().slice(0, 7),
          amount: item._sum.amount || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Get savings summary error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get savings summary',
    });
  }
};

export const getSavingsAnalytics = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const totalSavings = await prisma.saving.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const goals = await prisma.goal.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        target: true,
        saved: true,
      },
    });

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const savingsTrend = await prisma.saving.groupBy({
      by: ['date'],
      where: { userId, date: { gte: twelveMonthsAgo } },
      _sum: { amount: true },
    });

    return res.json({
      success: true,
      data: {
        totalSaved: totalSavings._sum.amount || 0,
        goalProgress: goals.map(goal => ({
          goalId: goal.id,
          goalName: goal.name,
          progress: (goal.saved / goal.target) * 100,
          remaining: goal.target - goal.saved,
        })),
        savingsTrend: savingsTrend.map(item => ({
          month: item.date.toISOString().slice(0, 7),
          amount: item._sum.amount || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Get savings analytics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get savings analytics',
    });
  }
};
