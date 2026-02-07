import { Request, Response } from 'express';
import { aiService } from '../services/aiService.js';

export const chatController = {
  async sendMessage(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || (req as any).userId || 'anonymous';
      const { message, context } = req.body as { message?: string; context?: string };

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      const result = await aiService.chat({
        userId,
        message: message.trim(),
        ...(context && { context }),
      });

      return res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Chat controller error:', error);
      return res.status(500).json({ success: false, error: 'Failed to process chat message' });
    }
  },
};

export default chatController;


