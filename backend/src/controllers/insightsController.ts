import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { aiService } from '../services/aiService.js';
import { InsightType, Impact } from '@prisma/client';

export const createInsight = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const insightData = req.body;

    const insight = await prisma.aIInsight.create({
      data: {
        userId: String(userId),
        type: mapToInsightType(insightData.type),
        title: insightData.title,
        description: insightData.description,
        impact: mapPriorityToImpact(insightData.priority),
      },
    });
    

    return res.status(201).json({
      success: true,
      data: insight,
      message: 'Insight created successfully',
    });
  } catch (error) {
    console.error('Create insight error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create insight',
    });
  }
};

export const getInsights = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      page = '1',
      limit = '20',
      type,
      isRead,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };

    if (type) where.type = mapToInsightType(String(type));
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const [insights, total] = await Promise.all([
      prisma.aIInsight.findMany({
        where,
        orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.aIInsight.count({ where }),
    ]);

    return res.json({
      success: true,
      data: insights,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get insights error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get insights',
    });
  }
};

export const getInsight = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Insight ID is required',
      });
    }

    const insight = await prisma.aIInsight.findFirst({
      where: { id, userId },
    });

    if (!insight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    }

    return res.json({
      success: true,
      data: insight,
    });
  } catch (error) {
    console.error('Get insight error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get insight',
    });
  }
};

export const updateInsight = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Insight ID is required',
      });
    }

    const existingInsight = await prisma.aIInsight.findFirst({
      where: { id, userId },
    });

    if (!existingInsight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    }

    const updatedInsight = await prisma.aIInsight.update({
      where: { id },
      data: req.body,
    });

    return res.json({
      success: true,
      data: updatedInsight,
      message: 'Insight updated successfully',
    });
  } catch (error) {
    console.error('Update insight error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update insight',
    });
  }
};

export const deleteInsight = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Insight ID is required',
      });
    }

    const existingInsight = await prisma.aIInsight.findFirst({
      where: { id, userId },
    });

    if (!existingInsight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    }

    await prisma.aIInsight.delete({ where: { id } });

    return res.json({
      success: true,
      message: 'Insight deleted successfully',
    });
  } catch (error) {
    console.error('Delete insight error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete insight',
    });
  }
};

export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Insight ID is required',
      });
    }

    const existingInsight = await prisma.aIInsight.findFirst({
      where: { id, userId },
    });

    if (!existingInsight) {
      return res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    }

    const updatedInsight = await prisma.aIInsight.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json({
      success: true,
      data: updatedInsight,
      message: 'Insight marked as read',
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark insight as read',
    });
  }
};

export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    await prisma.aIInsight.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({
      success: true,
      message: 'All insights marked as read',
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to mark all insights as read',
    });
  }
};

// Helper function to map string to InsightType enum
const mapToInsightType = (type: string): InsightType => {
  const upperType = type.toUpperCase();
  if (Object.values(InsightType).includes(upperType as InsightType)) {
    return upperType as InsightType;
  }
  // Default to SAVING if type doesn't match
  return InsightType.SAVING;
};

// Helper function to map priority number (1-5) to Impact enum
const mapPriorityToImpact = (priority?: number): Impact => {
  if (!priority) return Impact.MEDIUM;
  if (priority >= 4) return Impact.HIGH;
  if (priority >= 2) return Impact.MEDIUM;
  return Impact.LOW;
};

export const generateInsights = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const aiInsights = await aiService.generateFinancialInsights(userId);

    const createdInsights = await Promise.all(
      aiInsights.map(insight =>
        prisma.aIInsight.create({
          data: {
            userId: String(userId),
            type: mapToInsightType(insight.type),
            title: insight.title,
            description: insight.content, // Prisma uses 'description', not 'content'
            impact: mapPriorityToImpact(insight.priority),
          },
        })
      )
    );
    

    return res.json({
      success: true,
      data: createdInsights,
      message: `Generated ${createdInsights.length} AI-powered insights`,
    });
  } catch (error) {
    console.error('Generate insights error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate insights',
    });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const count = await prisma.aIInsight.count({
      where: { userId, isRead: false },
    });

    return res.json({
      success: true,
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
    });
  }
};
