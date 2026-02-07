import express from 'express';
import { chatController } from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Chat endpoint (authenticated)
router.post('/', authenticate, chatController.sendMessage);

export default router;


