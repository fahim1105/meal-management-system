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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
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
      details: error.message 
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/meal', mealRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/bazar-schedule', bazarScheduleRoutes);

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

// Export for Vercel serverless
export default app;

// Only listen if not in serverless environment
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
