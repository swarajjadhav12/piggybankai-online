import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { InsightCreateSchema, InsightUpdateSchema } from '../types/index.js';
import { z } from 'zod';
import {
  createInsight,
  getInsights,
  getInsight,
  updateInsight,
  deleteInsight,
  markAsRead,
  markAllAsRead,
  generateInsights,
  getUnreadCount,
} from '../controllers/insightsController.js';

const router = Router();

const InsightIdSchema = z.object({
  id: z.string().cuid(),
});

// All routes require authentication
router.use(authenticate);

// Insight operations
router.post('/', validateBody(InsightCreateSchema), createInsight);
router.get('/', getInsights);
router.get('/unread-count', getUnreadCount);
router.get('/generate', generateInsights);
router.get('/:id', validateParams(InsightIdSchema), getInsight);
router.put('/:id', validateParams(InsightIdSchema), validateBody(InsightUpdateSchema), updateInsight);
router.delete('/:id', validateParams(InsightIdSchema), deleteInsight);

// Insight-specific operations
router.put('/:id/read', validateParams(InsightIdSchema), markAsRead);
router.put('/mark-all-read', markAllAsRead);

export default router;
