import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { SavingCreateSchema } from '../types/index.js';
import { z } from 'zod';
import {
  createSaving,
  getSavings,
  getSaving,
  deleteSaving,
  getSavingsSummary,
  getSavingsAnalytics,
} from '../controllers/savingsController.js';

const router = Router();

const SavingIdSchema = z.object({
  id: z.string().cuid(),
});

// All routes require authentication
router.use(authenticate);

// Saving operations
router.post('/', validateBody(SavingCreateSchema), createSaving);
router.get('/', getSavings);
router.get('/summary', getSavingsSummary);
router.get('/analytics', getSavingsAnalytics);
router.get('/:id', validateParams(SavingIdSchema), getSaving);
router.delete('/:id', validateParams(SavingIdSchema), deleteSaving);

export default router;
