/**
 * Telephony Routes - Sprint 3.1.3
 * API endpoints for telephony operations
 */

import express from 'express';
import telephonyController from '../controllers/telephonyController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createResourceLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Call Control
router.post('/call/originate', createResourceLimiter, telephonyController.originateCall);
router.post('/call/hangup', telephonyController.hangupCall);

// Call Information
router.get('/calls/active', telephonyController.getActiveCalls);
router.get('/calls/history', telephonyController.getCallHistory);
router.get('/calls/stats', telephonyController.getCallStats);

// SIP Peer Management
router.get('/sip/status', telephonyController.getSIPStatus);
router.get('/sip/credentials', telephonyController.getSIPCredentials);
router.post('/sip/create', telephonyController.createSIPPeer);

// Trunk Management
router.get('/trunks', telephonyController.getTrunks);

// Service Status
router.get('/status', telephonyController.getServiceStatus);

// Customer Lookup - Sprint 3.2.5
router.get('/lookup/customer/:phone', telephonyController.lookupCustomer);

// Call Transfer - Sprint 3.2.5
router.post('/call/transfer', telephonyController.transferCall);

export default router;
