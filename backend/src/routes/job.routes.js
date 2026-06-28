import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getJobs, getMatchedJobs, getJobById, triggerScrape, seedJobs } from '../controllers/job.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',         getJobs);
router.get('/matches',  getMatchedJobs);
router.get('/seed',     seedJobs);
router.get('/scrape',   triggerScrape);
router.get('/:id',      getJobById);

export default router;
