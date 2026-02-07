import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { GoalCreateSchema, GoalUpdateSchema } from '../types/index.js';
import { z } from 'zod';
import {
  createGoal,
  getGoals,
  getGoal,
  updateGoal,
  deleteGoal,
  addToGoal,
  getGoalProgress,
} from '../controllers/goalsController.js';

const router = Router();

const GoalIdSchema = z.object({
  id: z.string().cuid(),
});

// All routes require authentication
router.use(authenticate);

// Goal CRUD operations
router.post('/', validateBody(GoalCreateSchema), createGoal);
router.get('/', getGoals);
router.get('/progress', getGoalProgress);
router.get('/:id', validateParams(GoalIdSchema), getGoal);
router.put('/:id', validateParams(GoalIdSchema), validateBody(GoalUpdateSchema), updateGoal);
router.delete('/:id', validateParams(GoalIdSchema), deleteGoal);

// Goal-specific operations
router.post('/:id/add', validateParams(GoalIdSchema), validateBody(z.object({
  amount: z.number().positive(),
})), addToGoal);

export default router;
