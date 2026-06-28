import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../utils/prisma.js';
import { enhanceCVWithAI } from '../services/openai.service.js';
import { AppError } from '../middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Multer config ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/cvs');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.doc', '.docx', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new AppError('Only PDF, DOC, DOCX, TXT files are allowed'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── Extract text from file ──
const extractTextFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.txt') {
    return fs.readFileSync(filePath, 'utf-8');
  }
  
  if (ext === '.pdf') {
    try {
      // Use dynamic import to avoid File API issue
      const { default: pdfParse } = await import('pdf-parse/lib/pdf-parse.js');
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text;
    } catch (err) {
      console.warn('PDF parse failed, reading as text:', err.message);
      // Fallback: read raw bytes and extract readable text
      const buffer = fs.readFileSync(filePath);
      const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ');
      return text.substring(0, 5000);
    }
  }
  
  // doc/docx fallback
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').substring(0, 5000);
  } catch {
    return 'Could not extract text from file';
  }
};

// ── Upload & process ──
export const uploadCV = async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded');
  const { jobTitle } = req.body;

  const cv = await prisma.cV.create({
    data: {
      userId:       req.user.id,
      originalPath: req.file.path,
      status:       'PROCESSING',
    },
  });

  // Process async
  processCV(cv.id, req.file.path, jobTitle).catch(console.error);

  res.status(202).json({ message: 'CV uploaded and processing started', cvId: cv.id });
};

const processCV = async (cvId, filePath, jobTitle) => {
  try {
    const rawText = await extractTextFromFile(filePath);
    const enhanced = await enhanceCVWithAI(rawText, jobTitle);

    await prisma.cV.update({
      where: { id: cvId },
      data: {
        enhancedContent: JSON.stringify(enhanced),
        parsedData:      enhanced,
        atsScore:        enhanced.atsScore || 0,
        status:          'READY',
      },
    });

    const cv = await prisma.cV.findUnique({ where: { id: cvId } });
    if (enhanced.extractedSkills?.length) {
      await prisma.profile.update({
        where: { userId: cv.userId },
        data: {
          skills:   enhanced.extractedSkills,
          jobTitle: jobTitle || enhanced.personalInfo?.title,
        },
      });
    }
  } catch (err) {
    console.error('CV processing failed:', err);
    await prisma.cV.update({
      where: { id: cvId },
      data: { status: 'FAILED' },
    });
  }
};

export const getMyCVs = async (req, res) => {
  const cvs = await prisma.cV.findMany({
    where:   { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    select:  { id: true, atsScore: true, status: true, createdAt: true, parsedData: true },
  });
  res.json(cvs);
};

export const getCVById = async (req, res) => {
  const cv = await prisma.cV.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!cv) throw new AppError('CV not found', 404);
  res.json(cv);
};

export const downloadEnhancedCV = async (req, res) => {
  const cv = await prisma.cV.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!cv || cv.status !== 'READY') throw new AppError('CV not ready', 404);
  res.json({ content: JSON.parse(cv.enhancedContent || '{}'), atsScore: cv.atsScore });
};
