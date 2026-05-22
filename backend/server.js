import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import authRoutes from './routes/auth.js';
import groupRoutes from './routes/group.js';
import mealRoutes from './routes/meal.js';
import financeRoutes from './routes/finance.js';
import reportRoutes from './routes/report.js';
import bazarScheduleRoutes from './routes/bazarSchedule.js';
import emailRoutes from './routes/email.js';
import fineRoutes from './routes/fine.js';
import mealConfigRoutes from './routes/mealConfig.js';
import { initializeCronJobs, stopCronJobs } from './services/cronScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://meal-management-five.vercel.app',
    'https://meal-manager.pages.dev',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
};

app.use(cors(corsOptions));

// Additional CORS headers for Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.header('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Connect to MongoDB before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      error: 'Database connection failed. Please try again later.',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/meal', mealRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/bazar-schedule', bazarScheduleRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/fine', fineRoutes);
app.use('/api/meal-config', mealConfigRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Mess Manager API',
    status: 'running',
    version: '1.0.0',
    mongodb: process.env.MONGODB_URI ? 'configured' : 'not configured'
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await connectDB();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Global error handler — must be AFTER all routes
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
});

// Export for Vercel serverless
export default app;

// Local / non-Vercel: start HTTP server + node-cron reminders
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeCronJobs();
  });

  const shutdown = () => {
    stopCronJobs();
    server.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
