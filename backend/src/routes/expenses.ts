import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { ExpenseCreateSchema, ExpenseUpdateSchema } from '../types/index.js';
import { z } from 'zod';
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expensesController.js';

const router = Router();

const ExpenseIdSchema = z.object({
  id: z.string().cuid(),
});

// All routes require authentication
router.use(authenticate);

// Expense CRUD operations
router.post('/', validateBody(ExpenseCreateSchema), createExpense);
router.get('/', getExpenses);
router.get('/:id', validateParams(ExpenseIdSchema), getExpense);
router.put('/:id', validateParams(ExpenseIdSchema), validateBody(ExpenseUpdateSchema), updateExpense);
router.delete('/:id', validateParams(ExpenseIdSchema), deleteExpense);

export default router;
