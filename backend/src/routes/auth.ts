import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { UserRegisterSchema, UserLoginSchema } from '../types/index.js';
import {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
} from '../controllers/authController.js';

const router = Router();

// Public routes
router.post('/register', validateBody(UserRegisterSchema), register);
router.post('/login', validateBody(UserLoginSchema), login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);

export default router;
