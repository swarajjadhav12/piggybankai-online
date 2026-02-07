import { Request, Response } from 'express';
import { prisma } from '../config/database.js';

function toNumber(value: any): number {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function normalizePhoneCandidates(input: string): string[] {
  if (!input) return [];
  const trimmed = String(input).trim();
  const digitsOnly = trimmed.replace(/\D+/g, '');
  const candidates = new Set<string>();

  candidates.add(trimmed);
  if (digitsOnly) candidates.add(digitsOnly);
  if (digitsOnly) candidates.add(`+${digitsOnly}`);

  if (digitsOnly.length === 10) {
    candidates.add(`1${digitsOnly}`);
    candidates.add(`+1${digitsOnly}`);
  }

  return Array.from(candidates);
}

export const getWallet = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    let wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 1000, currency: 'USD' },
      });
    }

    const [sent, received] = await Promise.all([
      prisma.transaction.count({ where: { senderUserId: userId } }),
      prisma.transaction.count({ where: { receiverUserId: userId } }),
    ]);

    return res.json({
      success: true,
      data: {
        ...wallet,
        stats: { sent, received },
      },
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get wallet' });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          OR: [{ senderUserId: userId }, { receiverUserId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({
        where: {
          OR: [{ senderUserId: userId }, { receiverUserId: userId }],
        },
      }),
    ]);

    return res.json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
};

export const deposit = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const amount = toNumber(req.body.amount);
    const currency = (req.body.currency as string) || 'USD';

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
    }

    const wallet = await prisma.wallet.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount, currency },
    });

    await prisma.transaction.create({
      data: {
        amount,
        currency,
        type: 'DEPOSIT',
        status: 'COMPLETED',
        description: req.body.description || 'Deposit',
        receiverWalletId: wallet.id,
        receiverUserId: userId,
      },
    });

    return res.status(201).json({ success: true, data: wallet, message: 'Deposit successful' });
  } catch (error) {
    console.error('Deposit error:', error);
    return res.status(500).json({ success: false, error: 'Failed to deposit' });
  }
};

export const withdraw = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const amount = toNumber(req.body.amount);
    const currency = (req.body.currency as string) || 'USD';

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient funds' });
    }

    const updated = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    });

    await prisma.transaction.create({
      data: {
        amount,
        currency,
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        description: req.body.description || 'Withdrawal',
        senderWalletId: wallet.id,
        senderUserId: userId,
      },
    });

    return res.json({ success: true, data: updated, message: 'Withdrawal successful' });
  } catch (error) {
    console.error('Withdraw error:', error);
    return res.status(500).json({ success: false, error: 'Failed to withdraw' });
  }
};

export const transfer = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const amount = toNumber(req.body.amount);
    const currency = (req.body.currency as string) || 'USD';
    const receiverPhoneInput = (req.body.receiverPhone as string) || '';
    const description = (req.body.description as string) || 'Transfer';

    if (amount <= 0) {
      return res.status(400).json({ success: false, error: 'Amount must be greater than 0' });
    }

    if (!receiverPhoneInput) {
      return res.status(400).json({ success: false, error: 'Receiver phone number is required' });
    }

    const candidates = normalizePhoneCandidates(receiverPhoneInput);
    const digitsOnly = receiverPhoneInput.replace(/\D+/g, '');
    const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : undefined;

    const [sender, senderWallet, receiverUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.wallet.findUnique({ where: { userId } }),
      prisma.user.findFirst({
        where: {
          OR: [
            { phone: { in: candidates } },
            ...(last10
              ? [{ phone: { endsWith: last10 } }, { phone: { contains: last10 } }]
              : []),
          ],
        },
      }),
    ]);

    if (!receiverUser) {
      return res.status(404).json({ success: false, error: 'Receiver not found' });
    }

    if (sender?.phone && receiverUser.phone && sender.phone === receiverUser.phone) {
      return res.status(400).json({ success: false, error: 'Cannot transfer to your own phone number' });
    }

    if (!senderWallet || senderWallet.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient funds' });
    }

    let receiverWallet = await prisma.wallet.findUnique({ where: { userId: receiverUser.id } });
    if (!receiverWallet) {
      receiverWallet = await prisma.wallet.create({
        data: { userId: receiverUser.id, balance: 0, currency },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedSender = await tx.wallet.update({
        where: { id: senderWallet.id },
        data: { balance: { decrement: amount } },
      });

      const updatedReceiver = await tx.wallet.update({
        where: { id: receiverWallet!.id },
        data: { balance: { increment: amount } },
      });

      const txRecord = await tx.transaction.create({
        data: {
          amount,
          currency,
          type: 'TRANSFER',
          status: 'COMPLETED',
          description,
          senderWalletId: senderWallet.id,
          senderUserId: userId,
          receiverWalletId: receiverWallet!.id,
          receiverUserId: receiverUser.id,
        },
      });

      return { updatedSender, updatedReceiver, txRecord };
    });

    return res.json({ success: true, data: result, message: 'Transfer successful' });
  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(500).json({ success: false, error: 'Failed to transfer' });
  }
};
