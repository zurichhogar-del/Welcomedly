/**
 * Components Showcase Routes - Sprint 3.0
 */

import express from 'express';
import componentsController from '../controllers/componentsController.js';
import { ensureAuthenticated } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * GET /components
 * Show components showcase page
 */
router.get('/', ensureAuthenticated, componentsController.showComponentsPage);

export default router;
