import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

export const createExpense = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const expenseData = req.body;

    const expense = await prisma.expense.create({
      data: {
        ...expenseData,
        userId,
        date: new Date(expenseData.date),
      },
    });

    return res.status(201).json({
      success: true,
      data: expense,
      message: 'Expense created successfully',
    });
  } catch (error) {
    console.error('Create expense error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create expense',
    });
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      page = '1',
      limit = '20',
      category,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };

    if (category) where.category = category;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.expense.count({ where }),
    ]);

    return res.json({
      success: true,
      data: expenses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get expenses',
    });
  }
};

export const getExpense = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Expense ID is required',
      });
    }

    const expense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    return res.json({
      success: true,
      data: expense,
    });
  } catch (error) {
    console.error('Get expense error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get expense',
    });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Expense ID is required',
      });
    }

    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    const dataToUpdate = {
      ...req.body,
      ...(req.body.date && { date: new Date(req.body.date) }),
    };

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: dataToUpdate,
    });

    return res.json({
      success: true,
      data: updatedExpense,
      message: 'Expense updated successfully',
    });
  } catch (error) {
    console.error('Update expense error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update expense',
    });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Expense ID is required',
      });
    }

    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId },
    });

    if (!existingExpense) {
      return res.status(404).json({
        success: false,
        error: 'Expense not found',
      });
    }

    await prisma.expense.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete expense',
    });
  }
};

