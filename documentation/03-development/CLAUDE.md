# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Welcomedly** is a call center management platform for commercial campaigns. It provides campaign management, lead tracking, agent monitoring, and reporting capabilities.

**Tech Stack:**
- **Backend:** Node.js with Express 5, ES Modules
- **Database:** PostgreSQL with Sequelize ORM
- **Frontend:** EJS templates, Bootstrap 5, jQuery, SweetAlert2
- **Security:** Helmet, rate limiting, session-based auth, CSRF protection, XSS prevention
- **AI Integration:** OpenAI API for agent assistance features
- **Development Tools:** CodeGuide CLI for documentation and task management

## Development Commands

```bash
# Start development server (auto-reload on changes)
npm run dev

# Database operations (PostgreSQL CLI)
psql -U postgres -d miappdb

# Seed dispositions
node src/database/seedDisposiciones.js

# Seed test data (creates campaign, forms, and sample records)
node src/database/seedTestData.js

# Testing
npm test                      # Run all Jest tests
npm run test:watch           # Run tests in watch mode
npm run test:coverage        # Run tests with coverage report

# Code quality
npm run lint                 # Check ESLint rules
npm run lint:fix             # Fix auto-fixable ESLint issues
npm run format               # Format code with Prettier
npm run format:check         # Check Prettier formatting

# FASE 4 validation tests (comprehensive testing)
./test-fase4.sh

# CodeGuide documentation management
codeguide --help
codeguide agent:create [name]    # Create new agent documentation
codeguide task:create [name]     # Create task documentation
codeguide status                 # Show current status
```

## Architecture

### MVC + Services Pattern

The application follows **MVC with a Service Layer**:
- **Models** (`src/models/`): Sequelize ORM models with associations
- **Controllers** (`src/controllers/`): HTTP request handlers, render views or redirect
- **Services** (`src/services/`): Business logic, database operations, reusable functions
- **Routes** (`src/routes/`): Express routers, apply middleware and rate limiters
- **Views** (`src/views/`): EJS templates with layouts

**Key principle:** Controllers should be thin—delegate complex logic to services.

### Database Models & Associations

**Core Models:**
- `User` (usuarios): Agents and admins (ENUM: ADMIN, AGENTE)
- `Campana` (campanas): Campaigns with assigned agents and forms
- `Formulario` (Formularios): Custom typification forms (array of fields)
- `BaseCampana` (base_campanas): Campaign leads/records with JSONB for flexible fields
- `Disposicion` (disposiciones): Call disposition codes (ENUM: EXITOSA, NO_CONTACTO, SEGUIMIENTO, NO_EXITOSA)

**Key Associations:**
- `Campana` belongsTo `Formulario`
- `Campana` belongsToMany `Disposicion` (through `campana_disposiciones`)
- `BaseCampana` belongsTo `Campana` (CASCADE delete)
- `BaseCampana` belongsTo `User` as `agente` (SET NULL on delete)
- `BaseCampana` belongsTo `Disposicion` (SET NULL on delete)

**Important Fields:**
- `BaseCampana.otrosCampos`: JSONB for dynamic campaign-specific data
- `BaseCampana.disposicionId`: Links to disposition (call outcome)
- `BaseCampana.callbackDate/callbackNotas`: For scheduled follow-ups
- `BaseCampana.intentosLlamada`: Call attempt counter
- `Disposicion.requiereCallback`: Boolean flag for callback requirement

### Layouts System

Two main layouts control the overall page structure:

1. **`layouts/authLayout.ejs`**: For login, registration (minimal, no sidebar)
2. **`layouts/generalLayout.ejs`**: For authenticated users (includes sidebar, header)

**When creating new views:**
- Specify layout in controller: `res.render('view', { layout: 'layouts/generalLayout', ... })`
- Default layout is set in `src/index.js` as `authLayout`

### Session & Messages

Session-based flash messages are used for user feedback:
- `req.session.mensajeExito`: Success message (green SweetAlert)
- `req.session.swalError`: Error message (red SweetAlert)

**Pattern:**
```javascript
req.session.mensajeExito = "✅ Operación exitosa";
res.redirect('/some-route');
```

Messages are displayed by `generalLayout.ejs` and automatically cleared.

### Security Configuration

**CSP (Content Security Policy):** Configured in `src/middlewares/securityMiddleware.js`
- Currently allows: `cdn.jsdelivr.net` (Bootstrap, SweetAlert), `code.jquery.com` (jQuery)
- **When adding new CDNs**, update `helmetConfig` directives

**Rate Limiters:**
- `generalLimiter`: 100 requests/15 min (app-wide)
- `loginLimiter`: 5 attempts/15 min (auth routes)
- `createResourceLimiter`: 10 creations/1 min
- `uploadLimiter`: 3 uploads/1 min

**Pre-approved Bash Commands:** See `src/index.js` tool configuration for commands that don't require user approval.

### Dispositions System (FASE 4)

The dispositions system tracks call outcomes and manages callbacks:

**Disposition Types:**
- `EXITOSA`: Successful outcomes (sales, objectives met)
- `NO_CONTACTO`: No contact (busy, wrong number, no answer)
- `SEGUIMIENTO`: Follow-up required (send info, callback, quote)
- `NO_EXITOSA`: Unsuccessful (not interested, already has service)

**Callback Flow:**
1. Agent selects disposition with `requiereCallback: true`
2. System shows callback form (date/time + notes)
3. `BaseCampana` record updated with `callbackDate` and `callbackNotas`
4. Agent ID assigned, `intentosLlamada` incremented

**Service Methods:**
- `disposicionService.getAllDisposiciones()`: Get all dispositions
- `disposicionService.getActivasDisposiciones()`: Active only
- `campaignService.saveDisposicion(registroId, data)`: Save disposition + callback

### AI Agent Service

The AI Agent Service provides intelligent assistance to call center agents using OpenAI API:

**Features:**
- **Call Summaries**: Automatically generate call summaries from transcript data
- **Response Suggestions**: Get AI-powered suggested responses based on customer context
- **Customer Analysis**: Extract and analyze customer information for better service

**Service Methods:**
- `aiService.generateCallSummary(callData)`: Generate call summary from transcript
- `aiService.suggestResponses(context, customerMessage)`: Get response suggestions
- `aiService.lookupCustomerInfo(customerInfo, query)`: Analyze customer data
- `aiService.isConfigured()`: Check if OpenAI is properly configured

**Usage Pattern:**
```javascript
// In controller
const result = await aiService.generateCallSummary({
    customerName: 'John Doe',
    callDuration: '5:23',
    keyPoints: ['interested in product X', 'concern about price'],
    outcome: 'follow-up required'
});
```

**Configuration:**
Add to `.env` file:
```
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500
```

### Security Enhancements

**XSS Protection:**
- DOMPurify integration for HTML sanitization (`src/public/js/sanitize.js`)
- Automatic sanitization of user inputs in forms and displays
- Configurable allowed tags and attributes for different contexts

**CSRF Protection:**
- Token-based CSRF protection for all state-changing requests
- Secure token generation and validation (`src/middlewares/csrfMiddleware.js`)
- Automatic token injection in forms via EJS

**Secure Session Management:**
- HttpOnly cookies with secure flag in production
- Session-based authentication with proper timeout
- Flash message system with automatic cleanup

### Error Handling

**Middleware Chain:** `sequelizeErrorHandler` → `errorHandler` → `notFoundHandler`

**Error Types:**
- `SequelizeValidationError`: Mapped to 400 with validation messages
- `SequelizeUniqueConstraintError`: Mapped to 409
- `404`: Renders `error.ejs` view
- Other errors: Redirect to referer with session error message

**Custom Error View:** `src/views/error.ejs` displays user-friendly error pages.

## Database Setup

PostgreSQL database name: `miappdb`

**Environment Variables Required:**
- `DB_PASSWORD`: PostgreSQL password
- `SESSION_SECRET`: Session encryption key (generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `OPENAI_API_KEY`: OpenAI API key for AI features (optional)
- `OPENAI_MODEL`: OpenAI model to use (default: gpt-3.5-turbo)
- `OPENAI_MAX_TOKENS`: Maximum tokens for AI responses (default: 500)

**Environment Setup:**
Copy `.env.example` to `.env` and configure the required variables. The application will validate critical environment variables on startup and exit if missing.

**Schema Sync:** Sequelize auto-syncs on startup (development). For production, use migrations.

**Note on Sequelize Queries:** When using COUNT with joins, qualify column names with table alias to avoid ambiguity:
```javascript
[db.sequelize.fn('COUNT', db.sequelize.col('ModelName.id')), 'total']
```

## Common Patterns

### Creating a New Feature Module

1. **Model** (`src/models/NewModel.js`): Define schema, validations, associations
2. **Service** (`src/services/newService.js`): Business logic methods
3. **Controller** (`src/controllers/newController.js`): Import service, handle requests
4. **Routes** (`src/routes/newRoutes.js`): Define endpoints, apply rate limiters
5. **Views** (`src/views/newViews/`): Create EJS templates
6. **Register Routes** in `src/routes/index.js`: `router.use("/new", newRoutes)`

### Working with Views

**EJS Partials:**
- `partials/generalHeader.ejs`: Top navigation bar
- `partials/generalCard.ejs`: Left sidebar (add new menu items here)

**Adding Sidebar Menu Item:**
Edit `src/views/partials/generalCard.ejs` and add within `<nav id="top-lat-bar">`:
```html
<a href="/new-route" style="text-decoration: none;" class="d-flex flex-column justify-content-center align-items-center flex-grow-1 gap-1 h-100">
    <img src="/images/icon.svg" alt="Feature" class="img-fluid m-0">
    <p class="m-1">Label</p>
</a>
```

**Existing Menu Items:** Market, Magicians, Campañas, Disposiciones, Reportes (Agentes/Campañas), Asistente IA

### Service Layer Example

```javascript
// src/services/exampleService.js
import db from '../models/index.js';
const { Model } = db;

class ExampleService {
    async getAll() {
        return await Model.findAll({ where: { activa: true } });
    }

    async create(data) {
        return await Model.create(data);
    }
}

export default new ExampleService();
```

## Test Data

**Default Test User:**
- Email: `admin@test.com`
- Password: `admin123`
- Role: ADMIN

**Test Campaign:** ID 1 (`Campaña Test FASE 4`)
- 5 records (3 with dispositions, 1 with callback)

## File Organization Notes

- Static files are served from `src/public/`
- CSS variables defined in `src/public/css/styles.css` (e.g., `--corporate-blue`, `--light-grey`)
- Database connection: `src/database/connection.js`
- Constants: `src/config/constants.js` (messages, enums)
- Models index: `src/models/index.js` (registers all models and associations)

## Known Issues & Fixes

**Issue:** Views appear distorted without Bootstrap styles.
**Fix:** Ensure view uses `layout: 'layouts/generalLayout'` in controller render.

**Issue:** CSP blocks external resources.
**Fix:** Add domain to `src/middlewares/securityMiddleware.js` → `helmetConfig` directives.

**Issue:** "Column 'id' is ambiguous" in Sequelize queries with COUNT and joins.
**Fix:** Qualify column with table alias: `db.sequelize.col('TableAlias.id')`

**Issue:** Rate limiting middleware causing "undefined request.ip" errors.
**Fix:** Temporarily disable rate limiting during development or configure trust proxy.

**Issue:** CSRF token validation failures in AJAX requests.
**Fix:** Include token in request headers: `headers: { 'X-CSRF-Token': csrfToken }`

## Code Quality Tools

**Jest Testing Framework:**
- Test configuration: `jest.config.js`
- Test files location: `tests/**/*.test.js`
- Coverage reports: Generated in `coverage/` directory
- Current tests: Authentication schemas and services (16 tests passing)

**ESLint Configuration:**
- Config file: `eslint.config.js`
- Modern flat config format with Prettier integration
- Rules include ES6+, async/await, and Node.js best practices
- Current status: 87 issues (42 errors, 45 warnings) - use `npm run lint:fix`

**Prettier Configuration:**
- Config file: `.prettierrc`
- Style: 4 spaces, single quotes, trailing commas
- Current status: 48 files need formatting - use `npm run format`

## CodeGuide Integration

The project includes CodeGuide CLI for enhanced development workflow:

**Available Commands:**
- `codeguide agent:create [name]` - Create documentation for new AI agents
- `codeguide task:create [name]` - Create task-specific documentation
- `codeguide status` - Show current development status and tasks

**Documentation Files:**
- `AGENTS.md` - AI agent implementation guides and patterns
- `TASKS.md` - Task-specific documentation and workflows
- `CodeGuide` configuration in project root

**Benefits:**
- Standardized documentation patterns
- Task tracking and status management
- AI development best practices
- Consistent code organization across features

## Current Project Status

**Code Quality:**
- ✅ Jest tests: 16/16 passing
- ⚠️ ESLint issues: 87 problems (42 errors, 45 warnings)
- ⚠️ Prettier formatting: 48 files need formatting

**FASE 4 Implementation:**
- ✅ Dispositions system with 4 types (EXITOSA, NO_CONTACTO, SEGUIMIENTO, NO_EXITOSA)
- ✅ Callback scheduling functionality
- ✅ Test validation suite (test-fase4.sh)
- ✅ Database seeded with 15 dispositions and sample data

**Security Features:**
- ✅ Helmet.js with CSP configuration
- ✅ Express-rate-limit with multiple tiers
- ✅ CSRF protection with token injection
- ✅ XSS prevention with DOMPurify
- ✅ Secure session management

**AI Integration:**
- ✅ OpenAI API service implementation
- ✅ Call summary generation
- ✅ Response suggestions
- ⚠️ Requires OPENAI_API_KEY in environment
