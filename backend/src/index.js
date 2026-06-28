import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes        from './routes/auth.routes.js';
import cvRoutes          from './routes/cv.routes.js';
import assessmentRoutes  from './routes/assessment.routes.js';
import jobRoutes         from './routes/job.routes.js';
import applicationRoutes from './routes/application.routes.js';
import profileRoutes     from './routes/profile.routes.js';
import { errorHandler }  from './middleware/error.middleware.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    // Allow all vercel.app and render.com in production
    if (origin.includes('vercel.app') || origin.includes('render.com') || origin.includes('netlify.app')) {
      return cb(null, true);
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ──
app.use('/api/auth',         authRoutes);
app.use('/api/cv',           cvRoutes);
app.use('/api/assessments',  assessmentRoutes);
app.use('/api/jobs',         jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/profile',      profileRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Career Connect API → http://0.0.0.0:${PORT}`);
});

export default app;
