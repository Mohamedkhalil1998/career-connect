import { prisma } from '../utils/prisma.js';
import { matchJobsWithAI } from '../services/openai.service.js';
import { scrapeAndSaveJobs, seedDemoJobs } from '../services/scraper.service.js';
import { AppError } from '../middleware/error.middleware.js';

// ── Get all jobs with filters ──
export const getJobs = async (req, res) => {
  const { search, location, type, source, page = 1, limit = 20 } = req.query;

  const where = {
    isActive: true,
    ...(search   && { OR: [
      { title: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ]}),
    ...(location && { location: { contains: location, mode: 'insensitive' } }),
    ...(type     && { type: { contains: type, mode: 'insensitive' } }),
    ...(source   && { source }),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { scrapedAt: 'desc' },
      skip:    (parseInt(page) - 1) * parseInt(limit),
      take:    parseInt(limit),
      select: {
        id: true, title: true, company: true, location: true,
        type: true, salary: true, source: true, sourceUrl: true,
        requirements: true, postedAt: true, scrapedAt: true,
        description: true,
      },
    }),
    prisma.job.count({ where }),
  ]);

  res.json({
    jobs,
    pagination: {
      total,
      page:       parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
};

// ── Get AI-matched jobs for current user ──
export const getMatchedJobs = async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });

  if (!profile?.skills?.length) {
    throw new AppError('Complete your profile and pass an assessment first to get matched jobs', 400);
  }

  // Check for cached matches (less than 6 hours old)
  const recentMatches = await prisma.jobMatch.findMany({
    where: {
      userId:    req.user.id,
      createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    },
    include: { job: true },
    orderBy: { score: 'desc' },
    take:    10,
  });

  if (recentMatches.length >= 3) {
    return res.json({
      matches: recentMatches.map(m => ({
        ...m.job,
        matchScore: m.score,
        reasons:    m.reasons,
      })),
      cached: true,
    });
  }

  // Get candidate jobs
  const jobs = await prisma.job.findMany({
    where:   { isActive: true },
    orderBy: { scrapedAt: 'desc' },
    take:    50,
    select: {
      id: true, title: true, company: true, location: true,
      requirements: true, description: true,
    },
  });

  if (!jobs.length) {
    await seedDemoJobs();
    return res.json({ matches: [], message: 'Jobs seeded, please try again' });
  }

  // AI matching
  const aiMatches = await matchJobsWithAI(profile.skills, profile, jobs);

  // Save matches & return top 10
  const results = [];
  for (const match of aiMatches.slice(0, 10)) {
    const job = jobs[match.jobIndex];
    if (!job) continue;

    await prisma.jobMatch.upsert({
      where:  { userId_jobId: { userId: req.user.id, jobId: job.id } },
      update: { score: match.score, reasons: match.reasons },
      create: {
        userId:  req.user.id,
        jobId:   job.id,
        score:   match.score,
        reasons: match.reasons || [],
      },
    });

    results.push({
      ...job,
      matchScore:     match.score,
      matchedSkills:  match.matchedSkills,
      missingSkills:  match.missingSkills,
      reasons:        match.reasons,
    });
  }

  res.json({ matches: results.sort((a, b) => b.matchScore - a.matchScore) });
};

// ── Get single job ──
export const getJobById = async (req, res) => {
  const job = await prisma.job.findUnique({ where: { id: req.params.id } });
  if (!job) throw new AppError('Job not found', 404);

  // Check if user applied
  const application = await prisma.application.findUnique({
    where: { userId_jobId: { userId: req.user.id, jobId: job.id } },
  });

  res.json({ ...job, applied: !!application, application });
};

// ── Trigger manual scrape ──
export const triggerScrape = async (req, res) => {
  scrapeAndSaveJobs().catch(console.error);
  res.json({ message: 'Scraping started in background' });
};

// ── Seed demo data ──
export const seedJobs = async (req, res) => {
  await seedDemoJobs();
  res.json({ message: 'Demo jobs seeded successfully' });
};
