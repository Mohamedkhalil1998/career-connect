import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

import authRoutes        from './routes/auth.routes.js';
import cvRoutes          from './routes/cv.routes.js';
import assessmentRoutes  from './routes/assessment.routes.js';
import jobRoutes         from './routes/job.routes.js';
import applicationRoutes from './routes/application.routes.js';
import profileRoutes     from './routes/profile.routes.js';
import { errorHandler }  from './middleware/error.middleware.js';
import { startCronJobs } from './utils/cron.js';
import { seedDemoJobs }  from './services/scraper.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 5000;

fs.mkdirSync(path.join(__dirname, '../uploads/cvs'), { recursive: true });

app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',         authRoutes);
app.use('/api/cv',           cvRoutes);
app.use('/api/assessments',  assessmentRoutes);
app.use('/api/jobs',         jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/profile',      profileRoutes);

app.get('/',           (req, res) => res.json({ message: 'Career Connect API 🚀', status: 'running' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Career Connect API running on port ${PORT}`);

  // Seed demo jobs on first start
  try {
    const { prisma } = await import('./utils/prisma.js');
    const count = await prisma.job.count();
    if (count === 0) {
      console.log('📦 No jobs found, seeding Egyptian demo jobs...');
      await seedDemoJobs();
    }
  } catch (err) {
    console.warn('Seed warning:', err.message);
  }

  // Start cron jobs
  startCronJobs();
});

export default app;
