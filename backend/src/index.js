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

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads dir exists
fs.mkdirSync(path.join(__dirname, '../uploads/cvs'), { recursive: true });

// ── CORS ──
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (
      origin.includes('vercel.app') ||
      origin.includes('railway.app') ||
      origin.includes('netlify.app') ||
      origin.includes('localhost')
    ) return cb(null, true);
    const allowed = process.env.FRONTEND_URL;
    if (allowed && origin.startsWith(allowed)) return cb(null, true);
    cb(null, true); // allow all in production for now
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

app.get('/',           (req, res) => res.json({ message: 'Career Connect API', status: 'running' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Career Connect API running on port ${PORT}`);
});

export default app;
