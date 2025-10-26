# Backend Structure Document

# Backend Structure Document

## 1. Backend Architecture

Our backend is built as a modular Node.js application using the Express framework. It follows the classic Model-View-Controller (MVC) pattern, which breaks the code into three main parts:

*   **Models** handle data and business logic (using Sequelize ORM).
*   **Controllers** receive requests, talk to models, and send back responses.
*   **Routes** map incoming URL paths to controller methods.

Key architecture and design choices:

*   **Modularity**: Features are grouped into folders (`controllers/`, `models/`, `routes/`, `middlewares/`) so each part of the application stays focused on a single responsibility.
*   **Middleware-centric design**: Common tasks such as logging, authentication, and file parsing are implemented as reusable middleware components.
*   **Scalability**: The clear separation of concerns lets us scale horizontally. We can deploy multiple backend instances behind a load balancer without code changes.
*   **Maintainability**: With each layer (routes, controllers, models) isolated, new features and bug fixes can be implemented without touching unrelated parts of the code.
*   **Performance**: We use connection pooling for the database, caching for frequent data, and efficient JSON APIs to keep response times low.

## 2. Database Management

We use PostgreSQL as our relational database, accessed via the Sequelize ORM.

*   **Database Type**: SQL (PostgreSQL)

*   **ORM**: Sequelize, which:

    *   Maps JavaScript objects to database tables.
    *   Handles common tasks like connection pooling, migrations, and schema synchronization.

*   **Data practices**:

    *   **Connection Pooling**: Limits open database connections and reuses them efficiently.
    *   **Migrations**: Version-controlled schema changes ensure consistent deployments across environments.
    *   **Data Validation**: Models enforce field types and constraints before writing to the database.
    *   **Backups & Retention**: Automated nightly snapshots of the database.

## 3. Database Schema

Below is a high-level, human-readable description of our main tables, followed by the SQL definitions for each.

### Human-Readable Table Definitions

*   **Users**: Stores registered users, their credentials, roles, and timestamps.
*   **Campaigns**: Holds campaign metadata (name, description, dates, status) and links to the creator.
*   **BaseCampaignData**: Tracks files uploaded to seed campaign data (file path, status, timestamps).
*   **Agents**: Contains agent profiles who can be assigned to campaigns.
*   **CampaignAssignments**: Joins agents to campaigns, recording assignment times.

### PostgreSQL Schema Definition

`CREATE TABLE users ( id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, password_hash VARCHAR(200) NOT NULL, role VARCHAR(50) NOT NULL DEFAULT 'user', created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE campaigns ( id SERIAL PRIMARY KEY, name VARCHAR(150) NOT NULL, description TEXT, status VARCHAR(50) NOT NULL DEFAULT 'draft', start_date DATE, end_date DATE, created_by INTEGER REFERENCES users(id), created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE base_campaign_data ( id SERIAL PRIMARY KEY, campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE, file_path TEXT NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'uploaded', uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, processed_at TIMESTAMP WITH TIME ZONE ); CREATE TABLE agents ( id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE campaign_assignments ( id SERIAL PRIMARY KEY, campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE, agent_id INTEGER REFERENCES agents(id) ON DELETE CASCADE, assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP );`

## 4. API Design and Endpoints

We follow RESTful design principles. All endpoints return JSON (except views rendered by EJS) and use standard HTTP methods.

*   **Authentication & User Management**

    *   `POST /api/auth/register` — Create a new user account
    *   `POST /api/auth/login` — Log in and receive a session token
    *   `POST /api/auth/logout` — Invalidate the current session
    *   `GET /api/users/:id` — Retrieve profile information
    *   `PATCH /api/users/:id` — Update user details (email, name)

*   **Campaign Management**

    *   `GET /api/campaigns` — List all campaigns
    *   `POST /api/campaigns` — Create a new campaign
    *   `GET /api/campaigns/:id` — Get details of one campaign
    *   `PATCH /api/campaigns/:id` — Update campaign settings
    *   `DELETE /api/campaigns/:id` — Remove a campaign

*   **Data Upload & Processing**

    *   `POST /api/campaigns/:id/data` — Upload a CSV or Excel file (multipart/form-data)
    *   `GET /api/campaigns/:id/data/status` — Check processing status

*   **Agent Assignment**

    *   `GET /api/agents` — List available agents
    *   `POST /api/campaigns/:campaignId/assign` — Assign one or more agents to a campaign

*   **Reporting & Analytics**

    *   `GET /api/reports/campaigns/:id` — Fetch performance stats for a campaign
    *   `GET /api/reports/agents/:id` — Fetch activity stats for an agent

Note: All protected routes require a valid session token in the request headers. File uploads are handled by Multer middleware.

## 5. Hosting Solutions

We deploy on a cloud environment for flexibility and cost-effectiveness.

*   **Primary Provider**: AWS

    *   **Compute**: EC2 instances managed by an Auto Scaling group
    *   **Database**: Amazon RDS for PostgreSQL with multi-AZ replication
    *   **File Storage**: S3 for uploaded campaign data files
    *   **Domain & DNS**: Route 53

Optional: A portion of lightweight API routes can be deployed to Cloudflare Workers to reduce latency globally (using `pg-cloudflare`).

Benefits:

*   Automatic scaling based on traffic
*   Built-in redundancy and failover
*   Pay-as-you-go pricing

## 6. Infrastructure Components

To ensure fast delivery and high availability, we use:

*   **Load Balancer**: AWS Elastic Load Balancer to distribute traffic across EC2 instances
*   **CDN**: CloudFront or Cloudflare for serving static assets (CSS, JS, images)
*   **Caching**: Redis cluster (ElastiCache) for session storage and hot data (e.g., recent reports)
*   **Message Queue**: AWS SQS for processing large uploads asynchronously (optional future enhancement)
*   **Containerization**: Docker images for consistent builds and deployments

These pieces work together to reduce response times, protect against spikes, and offload repeated work from the main application servers.

## 7. Security Measures

We follow industry-standard practices to keep data safe:

*   **Authentication**: Passwords are hashed with bcrypt before storage.
*   **Authorization**: Middleware checks user roles and permissions before allowing sensitive operations.
*   **Transport Security**: All traffic is secured by HTTPS with TLS certificates.
*   **Input Validation**: We validate and sanitize all user inputs (using Validator.js) to prevent injection attacks.
*   **Data Encryption**: Sensitive fields (e.g., password hashes) are stored encrypted at rest. Backups are encrypted as well.
*   **HTTP Hardening**: Use of Helmet middleware to set safe HTTP headers (CSP, HSTS, XSS protection).
*   **Rate Limiting**: Throttles repeated requests to public endpoints to reduce brute-force attacks.
*   **Audit Logging**: All login attempts and critical changes (campaign creation, assignment) are logged with timestamp and user ID.

## 8. Monitoring and Maintenance

We keep the system healthy with proactive monitoring and maintenance routines:

*   **Logging**:

    *   **Access logs**: Morgan records all HTTP requests.
    *   **Application logs**: Winston captures errors and warnings.

*   **Monitoring Tools**: Datadog/New Relic for:

    *   Server metrics (CPU, memory, disk)
    *   Database performance (slow queries, connection usage)
    *   API latency and error rates

*   **Alerts**: Automated alerts via Slack or email when thresholds are breached (e.g., CPU > 80%, error rate > 5%).

*   **Backups & Recovery**: Daily automated snapshots of the database and S3 data with 30-day retention.

*   **Maintenance Windows**: Regularly scheduled windows for applying OS updates, rotating TLS certificates, and performing schema migrations.

## 9. Conclusion and Overall Backend Summary

Our backend is a robust, scalable Node.js application powered by Express and PostgreSQL. It offers:

*   Clear, modular architecture (MVC + middleware)
*   Well-designed RESTful APIs for user, campaign, and reporting workflows
*   Reliable, managed hosting on AWS with optional serverless extensions on Cloudflare
*   A rich set of infrastructure components (load balancer, CDN, caching) to support high performance
*   Strong security measures, from password hashing to rate limiting
*   Proactive monitoring, alerting, and maintenance

Together, these elements ensure that Welcomedly can support growing campaign workloads, deliver responsive user experiences, and safeguard sensitive data—all while remaining easy to maintain and extend for future features.


---
**Document Details**
- **Project ID**: 85e6f36a-c515-44f0-bbe7-5ba76e4817a3
- **Document ID**: 03affbfb-cd40-4a22-ab7d-9a86472b95d8
- **Type**: custom
- **Custom Type**: backend_structure_document
- **Status**: completed
- **Generated On**: 2025-10-18T18:51:59.229Z
- **Last Updated**: 2025-10-18T22:12:44.595Z
