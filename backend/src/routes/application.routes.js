import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  applyToJob, getMyApplications, updateApplicationStatus,
  generateCoverLetterForJob, deleteApplication,
} from '../controllers/application.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',                    getMyApplications);
router.post('/',                   applyToJob);
router.patch('/:id',               updateApplicationStatus);
router.delete('/:id',              deleteApplication);
router.post('/cover-letter',       generateCoverLetterForJob);

export default router;
