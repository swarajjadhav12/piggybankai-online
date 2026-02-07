import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables BEFORE importing routes/services that use them
dotenv.config();

import { connectDatabase, disconnectDatabase } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import goalsRoutes from './routes/goals.js';
import expensesRoutes from './routes/expenses.js';
import savingsRoutes from './routes/savings.js';
import insightsRoutes from './routes/insights.js';
import dashboardRoutes from './routes/dashboard.js';
import paymentsRoutes from './routes/payments.js';
import chatRoutes from './routes/chat.js';

// (env already loaded above)

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile apps / server-to-server requests
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS not allowed'));
  },
  credentials: true,
}));


// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'PiggyBank AI API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'PiggyBank AI API Documentation',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    ai: {
      provider: 'Gemini',
      configured: Boolean(process.env.GEMINI_API_KEY),
    },
    endpoints: {
      auth: {
        base: '/api/auth',
        endpoints: [
          { method: 'POST', path: '/register', description: 'Register a new user' },
          { method: 'POST', path: '/login', description: 'Login user' },
          { method: 'GET', path: '/profile', description: 'Get user profile (requires auth)' },
          { method: 'PUT', path: '/profile', description: 'Update user profile (requires auth)' }
        ]
      },
      goals: {
        base: '/api/goals',
        endpoints: [
          { method: 'GET', path: '/', description: 'Get all goals (requires auth)' },
          { method: 'POST', path: '/', description: 'Create a new goal (requires auth)' },
          { method: 'GET', path: '/:id', description: 'Get goal by ID (requires auth)' },
          { method: 'PUT', path: '/:id', description: 'Update goal (requires auth)' },
          { method: 'DELETE', path: '/:id', description: 'Delete goal (requires auth)' }
        ]
      },
      expenses: {
        base: '/api/expenses',
        endpoints: [
          { method: 'GET', path: '/', description: 'Get all expenses (requires auth)' },
          { method: 'POST', path: '/', description: 'Create a new expense (requires auth)' },
          { method: 'GET', path: '/:id', description: 'Get expense by ID (requires auth)' },
          { method: 'PUT', path: '/:id', description: 'Update expense (requires auth)' },
          { method: 'DELETE', path: '/:id', description: 'Delete expense (requires auth)' }
        ]
      },
      savings: {
        base: '/api/savings',
        endpoints: [
          { method: 'GET', path: '/', description: 'Get all savings (requires auth)' },
          { method: 'POST', path: '/', description: 'Create a new saving (requires auth)' },
          { method: 'GET', path: '/:id', description: 'Get saving by ID (requires auth)' },
          { method: 'PUT', path: '/:id', description: 'Update saving (requires auth)' },
          { method: 'DELETE', path: '/:id', description: 'Delete saving (requires auth)' }
        ]
      },
      insights: {
        base: '/api/insights',
        endpoints: [
          { method: 'GET', path: '/', description: 'Get all AI insights (requires auth)' },
          { method: 'POST', path: '/', description: 'Generate new AI insight (requires auth)' },
          { method: 'GET', path: '/:id', description: 'Get insight by ID (requires auth)' },
          { method: 'PUT', path: '/:id', description: 'Update insight (requires auth)' },
          { method: 'DELETE', path: '/:id', description: 'Delete insight (requires auth)' }
        ]
      },
      dashboard: {
        base: '/api/dashboard',
        endpoints: [
          { method: 'GET', path: '/', description: 'Get dashboard data (requires auth)' },
          { method: 'GET', path: '/analytics', description: 'Get analytics data (requires auth)' }
        ]
      },
      payments: {
        base: '/api/payments',
        endpoints: [
          { method: 'GET', path: '/wallet', description: 'Get wallet info (requires auth)' },
          { method: 'GET', path: '/transactions', description: 'List transactions (requires auth)' },
          { method: 'POST', path: '/deposit', description: 'Deposit funds (requires auth)' },
          { method: 'POST', path: '/withdraw', description: 'Withdraw funds (requires auth)' },
          { method: 'POST', path: '/transfer', description: 'Transfer to another user by email (requires auth)' }
        ]
      }
      ,
      chat: {
        base: '/api/chat',
        endpoints: [
          { method: 'POST', path: '/', description: 'Send a chat message to AI (requires auth)' }
        ]
      }
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      note: 'Most endpoints require authentication. Get token from /api/auth/login'
    },
    demo: {
      email: 'test@example.com',
      password: 'password123'
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/chat', chatRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);

  // Handle Prisma errors
  if (error.code === 'P2002') {
    return res.status(400).json({
      success: false,
      error: 'A record with this information already exists',
    });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }

  // Handle validation errors
  if (error.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors,
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
    });
  }

  // Default error response
  return res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await disconnectDatabase();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 PiggyBank AI API server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: /health`);
      console.log(`📚 API Documentation: /api`);      
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
