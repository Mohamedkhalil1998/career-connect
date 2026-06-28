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
  const allowed = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new AppError('Only PDF, DOC, DOCX files are allowed'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ── Parse PDF text ──
const extractTextFromFile = async (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') {
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
  // For doc/docx — return placeholder (production would use mammoth)
  return fs.readFileSync(filePath, 'utf-8').replace(/[^\x20-\x7E\n]/g, ' ');
};

// ── Upload & Enhance ──
export const uploadCV = async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded');

  const { jobTitle } = req.body;

  // Create DB record
  const cv = await prisma.cV.create({
    data: {
      userId:       req.user.id,
      originalPath: req.file.path,
      status:       'PROCESSING',
    },
  });

  // Process async
  processCV(cv.id, req.file.path, jobTitle).catch(console.error);

  res.status(202).json({
    message: 'CV uploaded and processing started',
    cvId: cv.id,
  });
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

    // Update profile skills from CV
    const cv = await prisma.cV.findUnique({ where: { id: cvId } });
    if (enhanced.extractedSkills?.length) {
      await prisma.profile.update({
        where: { userId: cv.userId },
        data: {
          skills:   enhanced.extractedSkills,
          jobTitle: enhanced.personalInfo?.title || jobTitle,
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

// ── Get user CVs ──
export const getMyCVs = async (req, res) => {
  const cvs = await prisma.cV.findMany({
    where:   { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, atsScore: true, status: true, createdAt: true,
      parsedData: true,
    },
  });
  res.json(cvs);
};

// ── Get single CV ──
export const getCVById = async (req, res) => {
  const cv = await prisma.cV.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!cv) throw new AppError('CV not found', 404);
  res.json(cv);
};

// ── Download enhanced CV ──
export const downloadEnhancedCV = async (req, res) => {
  const cv = await prisma.cV.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!cv || cv.status !== 'READY') throw new AppError('CV not ready', 404);

  // In production: generate PDF from enhanced content
  // For now return the JSON data
  res.json({
    content: JSON.parse(cv.enhancedContent || '{}'),
    atsScore: cv.atsScore,
  });
};
