# Archived Code

This directory contains code that was implemented but not yet integrated into the active system.

## Contents

### `/services/` - Advanced AI Services
These services were developed but not fully integrated:
- **aiCoachingService.js** - Real-time AI coaching for agents
- **realtimeService.js** - WebSocket real-time communication service
- **sentimentAnalysisService.js** - Customer sentiment analysis
- **speechToTextService.js** - Speech-to-text transcription (Google Cloud)
- **voiceBiometricsService.js** - Voice biometric authentication

**Status**: Implemented but not connected to active routes/controllers
**Future**: Can be re-integrated when needed

### `/gateway/` - API Gateway
Enterprise API gateway with service mesh capabilities.

**Status**: Implemented but not connected to application
**Note**: Current app uses direct routes instead of gateway pattern

### Database
- **connectionOptimized.js** - Alternative connection configuration (duplicate of connection.js)

## Restoration

To use any of these files:
1. Move file from `_archive/` back to original location
2. Update imports in relevant controllers/routes
3. Test thoroughly before deploying
4. Update this README

## Date Archived
October 20, 2025 - FASE 1 cleanup
