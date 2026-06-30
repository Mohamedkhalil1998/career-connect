import { prisma } from '../utils/prisma.js';
import { generateCoverLetter } from '../services/gemini.service.js';
import { AppError } from '../middleware/error.middleware.js';

// ── Apply to job ──
export const applyToJob = async (req, res) => {
  const { jobId, coverLetter } = req.body;
  if (!jobId) throw new AppError('jobId is required');

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError('Job not found', 404);

  const application = await prisma.application.create({
    data: { userId: req.user.id, jobId, coverLetter },
    include: { job: { select: { title: true, company: true, sourceUrl: true } } },
  });

  res.status(201).json(application);
};

// ── Get all applications (dashboard) ──
export const getMyApplications = async (req, res) => {
  const { status } = req.query;

  const applications = await prisma.application.findMany({
    where: {
      userId: req.user.id,
      ...(status && { status }),
    },
    include: {
      job: {
        select: {
          title: true, company: true, location: true,
          type: true, salary: true, sourceUrl: true, source: true,
        },
      },
    },
    orderBy: { appliedAt: 'desc' },
  });

  // Stats
  const stats = {
    total:     applications.length,
    applied:   applications.filter(a => a.status === 'APPLIED').length,
    viewed:    applications.filter(a => a.status === 'VIEWED').length,
    interview: applications.filter(a => a.status === 'INTERVIEW').length,
    offer:     applications.filter(a => a.status === 'OFFER').length,
    rejected:  applications.filter(a => a.status === 'REJECTED').length,
  };

  res.json({ applications, stats });
};

// ── Update application status ──
export const updateApplicationStatus = async (req, res) => {
  const { status, notes, responseAt } = req.body;

  const validStatuses = ['APPLIED', 'VIEWED', 'INTERVIEW', 'REJECTED', 'OFFER', 'ACCEPTED'];
  if (!validStatuses.includes(status)) throw new AppError('Invalid status');

  const application = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!application) throw new AppError('Application not found', 404);

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: {
      status,
      notes:      notes || application.notes,
      responseAt: responseAt ? new Date(responseAt) : application.responseAt,
      updatedAt:  new Date(),
    },
    include: {
      job: { select: { title: true, company: true } },
    },
  });

  res.json(updated);
};

// ── Generate cover letter ──
export const generateCoverLetterForJob = async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) throw new AppError('jobId is required');

  const [job, profile, latestCV] = await Promise.all([
    prisma.job.findUnique({ where: { id: jobId } }),
    prisma.profile.findUnique({ where: { userId: req.user.id } }),
    prisma.cV.findFirst({
      where:   { userId: req.user.id, status: 'READY' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!job)     throw new AppError('Job not found', 404);
  if (!profile) throw new AppError('Profile not found', 404);

  const cvData = latestCV?.parsedData || null;
  const fullProfile = {
    ...profile,
    firstName: req.user.firstName,
    lastName:  req.user.lastName,
  };

  const coverLetter = await generateCoverLetter(fullProfile, cvData, job);
  res.json({ coverLetter, jobTitle: job.title, company: job.company });
};

// ── Delete application ──
export const deleteApplication = async (req, res) => {
  const application = await prisma.application.findFirst({
    where: { id: req.params.id, userId: req.user.id },
  });
  if (!application) throw new AppError('Application not found', 404);

  await prisma.application.delete({ where: { id: req.params.id } });
  res.json({ message: 'Application removed' });
};
