# Architecture Documentation

## System Overview

Welcomedly uses a **session-based MVC architecture** with a service layer for business logic. The application is designed for call center management with campaign tracking, lead management, and agent monitoring.

## Active Authentication System

### Session-Based Authentication (ACTIVE)
**Location**: `src/services/authService.js`, `src/controllers/authController.js`

**Status**: ✅ **ACTIVELY USED**

**How it works**:
- Users log in via `/auth/login` with email and password
- Password verification using `bcrypt`
- Session stored in `express-session` with secure cookies
- Session data: `{ usuario: { id, correo, username, rol } }`
- Protected routes use `asegurarAutenticacion` middleware

**Security features**:
- HttpOnly secure cookies in production
- 2-hour session timeout
- CSRF protection via tokens
- Rate limiting (5 attempts/15min)
- Bcrypt password hashing (10 rounds)

**Files**:
- `src/middlewares/authMiddleware.js` - Session validation middleware
- `src/services/authService.js` - Login/logout logic
- `src/controllers/authController.js` - Auth route handlers
- `src/routes/authRoutes.js` - Auth endpoints

---

## Alternative Authentication Systems (NOT ACTIVE)

### JWT Authentication System
**Location**: `src/services/jwtService.js`, `src/middlewares/jwtMiddleware.js`, `src/routes/authJwtRoutes.js`

**Status**: ⚠️ **IMPLEMENTED BUT NOT ACTIVE**

**Why it exists**:
Developed as an enterprise-grade alternative for API authentication with access/refresh token patterns, token rotation, and session management.

**How it would work** (if activated):
- Login generates access token (15min) + refresh token (7 days)
- Tokens stored in memory with revocation list
- Bearer token authentication via `Authorization` header
- Token refresh endpoint for seamless re-authentication

**To activate**:
1. Uncomment `router.use("/api/auth", authJwtRoutes)` in `src/routes/index.js:16`
2. Update frontend to handle JWT tokens
3. Decide if coexisting with session-based auth or replacing it

**Files**:
- `src/services/jwtService.js` - JWT generation, validation, rotation
- `src/middlewares/jwtMiddleware.js` - JWT authentication middleware
- `src/routes/authJwtRoutes.js` - JWT-based auth endpoints
- Integration in: `src/_archive/services/realtimeService.js`, `src/_archive/gateway/apiGateway.js`

---

### API Gateway
**Location**: `src/_archive/gateway/apiGateway.js`

**Status**: ⚠️ **IMPLEMENTED BUT NOT ACTIVE**

**Why it exists**:
Enterprise service mesh pattern for routing requests to microservices with authentication, rate limiting, and circuit breaker patterns.

**How it would work** (if activated):
- Central entry point for all API requests
- Route requests to backend services
- JWT authentication enforcement
- Request/response transformation
- Service health monitoring

**Current state**:
Archived because the application uses direct routing instead of a gateway pattern. The current architecture is monolithic, making a gateway unnecessary overhead.

**To activate**:
1. Move from `src/_archive/gateway/` to `src/gateway/`
2. Mount gateway in `src/index.js`
3. Configure service routes and endpoints
4. Activate JWT authentication

**Files**:
- `src/_archive/gateway/apiGateway.js` - Complete gateway implementation

---

## Advanced Features (NOT ACTIVE)

### Real-time Communication Service
**Location**: `src/_archive/services/realtimeService.js`

**Status**: ⚠️ **IMPLEMENTED BUT NOT INTEGRATED**

**Features**:
- Socket.io WebSocket connections
- Real-time call status updates
- Agent presence tracking
- Campaign metrics broadcasting
- JWT authentication for WebSocket connections

**To integrate**:
1. Move from `src/_archive/services/` to `src/services/`
2. Initialize in `src/index.js` with `io` instance
3. Add WebSocket connection handlers to views
4. Configure Socket.io client in frontend

---

### AI Coaching Service
**Location**: `src/_archive/services/aiCoachingService.js`

**Status**: ⚠️ **IMPLEMENTED BUT NOT INTEGRATED**

**Features**:
- Real-time AI coaching for agents during calls
- Speech-to-text transcription (Google Cloud Speech)
- Sentiment analysis (natural + sentiment libraries)
- Voice biometric authentication
- Call quality scoring
- Suggested responses based on context

**Dependencies**:
- `src/_archive/services/speechToTextService.js`
- `src/_archive/services/sentimentAnalysisService.js`
- `src/_archive/services/voiceBiometricsService.js`

**To integrate**:
1. Move all AI services from `src/_archive/services/` to `src/services/`
2. Configure Google Cloud Speech API credentials
3. Create controllers and routes for AI endpoints
4. Integrate with call recording system
5. Add real-time streaming endpoints

---

## Active Features

### Input Validation
**Status**: ✅ **ACTIVE** (as of FASE 2 implementation)

**Location**: `src/validators/schemas.js`

**Technology**: Joi validation library

**Coverage**:
- ✅ Authentication (login, register)
- ✅ Campaigns (create, update)
- ✅ Forms (create, update, field validation)
- ✅ Dispositions (create, update, callback tracking)
- ✅ ID parameter validation

**How it works**:
- Centralized schemas in `src/validators/schemas.js`
- Middleware functions: `validate(schema)` for body, `validateParams(schema)` for params
- Applied in routes before controller execution
- Returns 400 with detailed error messages on validation failure

---

## Security Features (ACTIVE)

### CSRF Protection
**Location**: `src/middlewares/csrfMiddleware.js`

**Status**: ✅ **ACTIVE**

**How it works**:
- Token generation using `crypto.randomBytes()`
- Token injection in all views via `res.locals.csrfToken`
- Validation middleware checks `_csrf` field in POST requests
- Secure session storage

---

### Rate Limiting
**Location**: `src/middlewares/securityMiddleware.js`

**Status**: ✅ **ACTIVE**

**Configuration**:
- **General**: 100 requests/15min (app-wide)
- **Login**: 5 attempts/15min (brute force prevention)
- **Resource Creation**: 10 creations/1min
- **File Upload**: 3 uploads/1min

---

### Content Security Policy (CSP)
**Location**: `src/middlewares/securityMiddleware.js`

**Status**: ✅ **ACTIVE**

**Allowed sources**:
- Scripts: `self`, cdn.jsdelivr.net, code.jquery.com, cdnjs.cloudflare.com
- Styles: `self` (inline allowed), cdn.jsdelivr.net, cdnjs.cloudflare.com
- Fonts: `self`, https:, cdnjs.cloudflare.com
- Images: `self`, data:, https:
- Connect: `self`, localhost WebSocket, CDNs

---

## Decision: Which Auth to Use?

### Use Session-Based Auth (current) if:
- ✅ Traditional web app with server-rendered views
- ✅ Simple authentication needs
- ✅ No mobile app or third-party API consumers
- ✅ Users access via web browser only

### Switch to JWT Auth if:
- Mobile app development planned
- API-first architecture needed
- Third-party integrations required
- Stateless authentication preferred
- Multiple frontend clients (web + mobile + desktop)

### Use Both (Hybrid) if:
- Web app uses sessions
- Mobile/API clients use JWT
- Requires careful middleware ordering

---

## Archived Code Location

All non-integrated features are stored in:
```
src/_archive/
├── services/
│   ├── aiCoachingService.js
│   ├── realtimeService.js
│   ├── sentimentAnalysisService.js
│   ├── speechToTextService.js
│   └── voiceBiometricsService.js
├── gateway/
│   └── apiGateway.js
└── connectionOptimized.js
```

See `src/_archive/README.md` for restoration instructions.

---

## Integration Checklist

When activating archived features:

**For JWT Authentication**:
- [ ] Uncomment route in `src/routes/index.js`
- [ ] Update frontend to handle tokens
- [ ] Configure token storage (localStorage/sessionStorage)
- [ ] Add token refresh logic
- [ ] Update API calls to include `Authorization` header
- [ ] Test token expiration and refresh flow

**For API Gateway**:
- [ ] Move from archive to `src/gateway/`
- [ ] Configure service endpoints
- [ ] Mount in `src/index.js`
- [ ] Test routing and authentication
- [ ] Configure circuit breaker thresholds
- [ ] Set up health check endpoints

**For AI Services**:
- [ ] Move all AI services from archive
- [ ] Install Google Cloud SDK
- [ ] Configure API credentials in `.env`
- [ ] Create controllers for AI endpoints
- [ ] Add routes for AI features
- [ ] Integrate with call recording
- [ ] Test real-time streaming
- [ ] Configure error handling for API failures

---

## Migration Notes

**Last Updated**: October 20, 2025 - FASE 2
**Architecture Version**: 2.0 (Session-based with Joi validation)
**Next Steps**: FASE 3 - Testing, linting, modularization
