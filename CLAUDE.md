# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Welcomedly** is a call center management platform for commercial campaigns. It provides campaign management, lead tracking, agent monitoring, and reporting capabilities.

**Tech Stack:**
- **Backend:** Node.js with Express 5, ES Modules
- **Database:** PostgreSQL with Sequelize ORM
- **Frontend:** EJS templates, Bootstrap 5, jQuery, SweetAlert2
- **Security:** Helmet, rate limiting, session-based auth

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

# Run FASE 4 validation tests
./test-fase4.sh
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
<a href="/new-route" style="text-decoration: none;" class="d-flex flex-column...">
    <img src="/images/icon.svg" alt="Feature" class="img-fluid m-0">
    <p class="m-1">Label</p>
</a>
```

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
