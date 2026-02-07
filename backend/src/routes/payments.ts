import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { deposit, withdraw, transfer, getWallet, getTransactions } from '../controllers/paymentsController.js';

const router = Router();

router.use(authenticate);

router.get('/wallet', getWallet);
router.get('/transactions', getTransactions);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);
router.post('/transfer', transfer);

export default router;
