import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { upload, uploadCV, getMyCVs, getCVById, downloadEnhancedCV } from '../controllers/cv.controller.js';

const router = Router();

router.use(authenticate);

router.post('/',                    upload.single('cv'), uploadCV);
router.get('/',                     getMyCVs);
router.get('/:id',                  getCVById);
router.get('/:id/download',         downloadEnhancedCV);

export default router;
