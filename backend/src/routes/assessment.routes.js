import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createAssessment, startAssessment, submitAssessment,
  submitProctoringEvent, getMyAssessments, getAssessmentById,
} from '../controllers/assessment.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',                         getMyAssessments);
router.post('/',                        createAssessment);
router.get('/:id',                      getAssessmentById);
router.post('/:id/start',               startAssessment);
router.post('/:id/proctor',             submitProctoringEvent);
router.post('/:id/submit',              submitAssessment);

export default router;
