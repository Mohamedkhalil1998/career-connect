import { prisma } from '../utils/prisma.js';
import { generateAssessment, scoreAssessment } from '../services/gemini.service.js';
import { AppError } from '../middleware/error.middleware.js';

// ── Generate new assessment ──
export const createAssessment = async (req, res) => {
  const { jobTitle, skills } = req.body;

  if (!jobTitle || !skills?.length) {
    throw new AppError('jobTitle and skills are required');
  }

  // Check for existing incomplete assessment
  const existing = await prisma.assessment.findFirst({
    where: {
      userId: req.user.id,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });
  if (existing) {
    return res.json({ assessment: existing, existing: true });
  }

  const generated = await generateAssessment(jobTitle, skills);

  const assessment = await prisma.assessment.create({
    data: {
      userId:    req.user.id,
      jobTitle,
      skills,
      questions: generated.questions,
      status:    'PENDING',
    },
  });

  res.status(201).json({
    assessment: {
      ...assessment,
      meta: {
        title:            generated.title,
        estimatedMinutes: generated.estimatedMinutes,
        totalQuestions:   generated.questions.length,
      },
    },
  });
};

// ── Start assessment (mark as in progress) ──
export const startAssessment = async (req, res) => {
  const assessment = await prisma.assessment.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!assessment) throw new AppError('Assessment not found', 404);
  if (assessment.status === 'COMPLETED') throw new AppError('Assessment already completed');

  const updated = await prisma.assessment.update({
    where: { id: req.params.id },
    data: {
      status:    'IN_PROGRESS',
      startedAt: new Date(),
    },
  });

  // Return questions without correct answers
  const questions = (updated.questions).map(q => ({
    ...q,
    correctAnswer: undefined,
    explanation:   undefined,
    keyPoints:     undefined,
  }));

  res.json({ ...updated, questions });
};

// ── Submit proctoring event ──
export const submitProctoringEvent = async (req, res) => {
  const { event, data } = req.body;
  // event types: TAB_SWITCH, FACE_NOT_DETECTED, MULTIPLE_FACES, AUDIO_DETECTED, etc.

  const assessment = await prisma.assessment.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!assessment) throw new AppError('Assessment not found', 404);

  const currentProctoring = (assessment.proctoring || { events: [] });
  currentProctoring.events = currentProctoring.events || [];
  currentProctoring.events.push({
    type:      event,
    data,
    timestamp: new Date().toISOString(),
  });

  await prisma.assessment.update({
    where: { id: req.params.id },
    data:  { proctoring: currentProctoring },
  });

  res.json({ recorded: true });
};

// ── Submit answers ──
export const submitAssessment = async (req, res) => {
  const { answers, recordingId } = req.body;

  const assessment = await prisma.assessment.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!assessment) throw new AppError('Assessment not found', 404);
  if (assessment.status === 'COMPLETED') throw new AppError('Already submitted');

  // Score with AI
  const result = await scoreAssessment(assessment.questions, answers);

  const passed = result.totalScore >= 60;

  const updated = await prisma.assessment.update({
    where: { id: req.params.id },
    data: {
      answers:     answers,
      score:       result.totalScore,
      passed,
      recordingId: recordingId || null,
      status:      'COMPLETED',
      completedAt: new Date(),
    },
  });

  // Update profile with verified skills if passed
  if (passed && result.verifiedSkills?.length) {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.id },
    });
    const existingSkills = profile?.skills || [];
    const allSkills = [...new Set([...existingSkills, ...result.verifiedSkills])];

    await prisma.profile.update({
      where: { userId: req.user.id },
      data:  { skills: allSkills },
    });
  }

  res.json({
    score:          result.totalScore,
    passed,
    feedback:       result.feedback,
    strengths:      result.strengths,
    weaknesses:     result.weaknesses,
    verifiedSkills: result.verifiedSkills,
    skillScores:    result.skillScores,
  });
};

// ── Get user's assessments ──
export const getMyAssessments = async (req, res) => {
  const assessments = await prisma.assessment.findMany({
    where:   { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, jobTitle: true, skills: true, score: true,
      passed: true, status: true, createdAt: true, completedAt: true,
    },
  });
  res.json(assessments);
};

// ── Get single assessment ──
export const getAssessmentById = async (req, res) => {
  const assessment = await prisma.assessment.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!assessment) throw new AppError('Assessment not found', 404);

  // Don't expose answers if still in progress
  if (assessment.status === 'IN_PROGRESS') {
    const questions = (assessment.questions).map(q => ({
      ...q, correctAnswer: undefined, explanation: undefined,
    }));
    return res.json({ ...assessment, questions });
  }

  res.json(assessment);
};
