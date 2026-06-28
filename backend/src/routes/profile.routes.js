import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);

// Get profile
router.get('/', async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { userId: req.user.id },
  });
  res.json(profile);
});

// Update profile
router.patch('/', async (req, res) => {
  const {
    jobTitle, location, bio, linkedinUrl,
    portfolioUrl, yearsExperience,
  } = req.body;

  const profile = await prisma.profile.upsert({
    where:  { userId: req.user.id },
    update: { jobTitle, location, bio, linkedinUrl, portfolioUrl, yearsExperience },
    create: { userId: req.user.id, jobTitle, location, bio, linkedinUrl, portfolioUrl, yearsExperience },
  });

  // Update user info too
  await prisma.user.update({
    where:  { id: req.user.id },
    data: {
      firstName: req.body.firstName || undefined,
      lastName:  req.body.lastName  || undefined,
      phone:     req.body.phone     || undefined,
    },
  });

  res.json(profile);
});

export default router;
