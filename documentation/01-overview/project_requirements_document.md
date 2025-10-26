# Project Requirements Document

# Project Requirements Document (PRD)

## 1. Project Overview

Welcomedly is a web application designed to help businesses plan, execute, and monitor commercial campaigns in one centralized platform. It solves the common problem of scattered campaign management—where teams juggle multiple spreadsheets, documents, and tools—by offering user authentication, campaign configuration, data uploads, agent assignments, and real-time reporting all under one roof.

We’re building Welcomedly to streamline campaign workflows, reduce manual errors, and give stakeholders instant visibility into performance metrics. Key success criteria include: 1) a secure, easy-to-use interface for campaign creation and management; 2) robust data handling that validates and processes bulk uploads without failures; and 3) real-time dashboards that update instantly as agents work on campaigns.

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1.0)

• User Authentication & Authorization (registration, login, session management) • Campaign Management (create, edit, deactivate campaigns) • Data Upload & Processing (CSV/Excel uploads, validation, database storage) • Agent Assignment (linking users to campaigns) • Reporting Dashboard (aggregate metrics, filters by campaign/agent/date) • Real-Time Monitoring (live updates on user activity, campaign status) • Role-Based Access Control (admin vs. agent permissions) • File Upload Handling (using Multer & Busboy with size/type checks) • Server-Side Rendering (EJS templates for primary UI)

### Out-of-Scope (Later Phases)

• Mobile App or Native Client • Advanced Analytics (predictive models, machine learning) • Third-Party CRM/Marketing Tool Integrations • Multi-language UI (beyond default locale) • API for External Consumer Access • Offline Mode or Local Caching • Automated Campaign Scheduling or Recurring Jobs

## 3. User Flow

A new user visits Welcomedly’s homepage and clicks **Sign Up**. They fill out a registration form (name, email, password) and confirm their email address. Once verified, they land on the **Dashboard**, which shows an overview of existing campaigns (if any) and a prominent **Create Campaign** button. A left sidebar lets them navigate between pages: Dashboard, Campaigns, Agents, and Reports.

When creating a campaign, the user enters campaign details (name, dates, description), uploads a data file (CSV or Excel), and assigns agents from a searchable list. After submission, the system validates the file, stores records in PostgreSQL, and updates the Dashboard. Agents log in, see their assigned campaigns, and perform actions. Throughout, the Reports page provides charts and tables that reflect real-time activity and performance metrics.

## 4. Core Features

• **Authentication & Authorization**: Secure sign-up, login, logout, password hashing with bcrypt, session handling. • **Campaign Lifecycle**: Create, update, pause, resume, and delete campaigns with status tracking. • **Data Upload & Validation**: CSV/Excel parsing via Multer & Busboy, field-level validation, error reporting. • **Agent Management**: Add/edit agents, assign/unassign them to campaigns, role assignment. • **Real-Time Monitoring**: WebSocket or polling for live updates on campaign progress and user actions. • **Reporting & Analytics**: Filterable reports by agent, campaign, and date; export data as CSV. • **Middleware Stack**: Morgan for logging, custom auth middleware, file upload middleware, error-handling middleware. • **Templating & Static Assets**: EJS for dynamic HTML, Express static middleware for CSS/JS/images.

## 5. Tech Stack & Tools

• **Frontend:** EJS (server-side HTML templates), vanilla JavaScript, CSS • **Backend:** Node.js (v14+), Express.js • **Database:** PostgreSQL accessed via Sequelize ORM • **File Handling:** Multer & Busboy for multipart/form-data uploads • **Authentication:** bcrypt for password hashing, Express sessions or JWT • **Date/Time:** moment.js & moment-timezone for formatting and locale support • **Utilities:** lodash & lodash/fp for functional helpers • **Logging:** morgan for HTTP request logs • **Dev Tools:** nodemon for hot reload, ESLint & Prettier for code style • **Deployment:** Docker (optional), environment variables via dotenv, optional Cloudflare Workers (pg-cloudflare)

## 6. Non-Functional Requirements

• **Performance:** API responses under 200ms; handle at least 100 concurrent users; database queries under 100ms average. • **Scalability:** Connection pooling via pg-pool; horizontal scaling of Express instances behind a load balancer. • **Security:** HTTPS only; OWASP Top 10 protections (input sanitization, parameterized queries); CSRF/XSS prevention; secure password storage; helmet for HTTP headers. • **Reliability:** Automatic retries for transient DB errors; proper error handling and user-friendly error pages. • **Usability:** Responsive layout for common screen sizes; clear form validations and inline error messages; ARIA attributes for accessibility. • **Compliance:** GDPR-ready (user data deletion, consent logging); logging retention policy.

## 7. Constraints & Assumptions

• Node.js 14+ and PostgreSQL 12+ are available in the target environment. • Environment variables (DB credentials, session secret) are managed securely via `.env` or a secrets manager. • Users have a modern browser with WebSocket support. • No external AI models are needed in version 1.0. • Mail service (SMTP) is configured externally for email verification. • TypeScript type definitions (`@types`) are present, but full TS migration may occur later.

## 8. Known Issues & Potential Pitfalls

• **Large File Uploads:** May exceed memory limits; mitigate with streaming parsers and file size caps. • **DB Connection Limits:** Ensure pool size matches database capacity; monitor for timeouts. • **Real-Time Scaling:** WebSocket sessions can overwhelm a single server; consider sticky sessions or pub/sub layer (Redis) later. • **Race Conditions:** Simultaneous updates to same campaign or agent; use database transactions or optimistic locking. • **Validation Gaps:** Edge-case data formats may slip through; maintain a comprehensive validation schema. • **Error Logging Overhead:** Excessive logs can fill disks; implement log rotation and severity filtering.

This PRD is the single source of truth for subsequent technical documentation. It captures all required details for an AI-driven development workflow without ambiguity, ensuring consistent implementation across frontend, backend, and deployment phases.


---
**Document Details**
- **Project ID**: 85e6f36a-c515-44f0-bbe7-5ba76e4817a3
- **Document ID**: 414f505d-1732-4b6c-aa0e-1bd39aec33af
- **Type**: custom
- **Custom Type**: project_requirements_document
- **Status**: completed
- **Generated On**: 2025-10-18T18:50:43.606Z
- **Last Updated**: 2025-10-18T22:31:25.063Z
