# AI Development Agent Guidelines

## Project Overview
**Project:** Welcomedly
**** The Welcomedly repository appears to be a Node.js web application designed for managing commercial campaigns. It features both a backend and a frontend, with functionalities covering user authentication, campaign management (form creation, data upload, agent assignment), and reporting. The project emphasizes a modular and structured approach, leveraging a rich ecosystem of Node.js libraries.

**1. What this codebase does (purpose and functionality)**

The core purpose of Welcomedly is to provide a platform for managing commercial campaigns. This includes:

*   **User Management:** Handling user registration, login, session management, and potentially user status updates.
*   **Campaign Management:** Allowing the creation and configuration of campaigns, uploading base data for campaigns, and assigning agents to specific campaigns.
*   **Data Processing:** Likely involves processing uploaded campaign data, which might include validation and transformation.
*   **Reporting:** Providing insights into campaign performance and user activity.
*   **Real-time Features (Frontend):** The `README.md` mentions real-time user auditing, pause management, and campaign/agent filtering, suggesting an interactive frontend.

**2. Key Architecture and Technology Choices**

The project is built on a robust Node.js stack, indicating a server-side JavaScript application with a clear separation of concerns.

*   **Backend:**
    *   **Node.js & Express.js:** The foundation of the server-side logic, providing a fast and scalable environment for web application development.
    *   **PostgreSQL with Sequelize ORM:** A powerful relational database for data persistence, accessed through Sequelize, which simplifies database interactions and provides an object-relational mapping layer. This is evident from `pg`, `sequelize`, `pg-pool`, `pg-hstore`, `pg-protocol` dependencies.
    *   **Authentication & Authorization:** Implemented using `bcrypt` for password hashing and likely session/token-based mechanisms (implied by `authController.js`, `authMiddleware.js`).
    *   **File Uploads:** `multer` is used for handling `multipart/form-data` requests, essential for uploading campaign base data.
    *   **Logging:** `morgan` is used for HTTP request logging.
    *   **Time & Date Management:** `moment.js` and `moment-timezone` are heavily utilized for handling dates, times, and localization.
    *   **Validation:** The `@types/validator` package indicates strong input validation practices.
    *   **HTTP Utilities:** `busboy` for parsing multipart forms, `forwarded` for handling proxy headers, `negotiator` for content negotiation.
    *   **Functional Programming Utilities:** `lodash` and `lodash/fp` are used for various utility functions and a functional programming style.
    *   **Serverless Deployment (Potential):** The presence of `pg-cloudflare` suggests an intention or capability to deploy parts of the application on Cloudflare Workers.
*   **Frontend:**
    *   **EJS (Embedded JavaScript templates):** Used for rendering dynamic HTML content on the server-side.
    *   **Static Assets:** `public` directory for CSS, fonts, and images.
*   **Development Tools:**
    *   **nodemon:** For automatic server restarts during development.
    *   **TypeScript:** While the core application code is not explicitly shown in `.ts` files, the presence of numerous `@types` packages (e.g., `@types/node`, `@types/validator`) strongly suggests that TypeScript is used for type safety and improved developer experience in at least parts of the project, or that the project is set up to consume TypeScript-typed libraries.
    *   **Source Maps:** `.map` files (e.g., `sequelize/lib/data-types.js.map`, `underscore-umd.js.map`) are present for debugging minified production code.

**3. Main Components and How They Interact**

The codebase follows a common MVC (Model-View-Controller) pattern, complemented by middleware and dedicated service layers.

*   **`index.js`:** The application entry point, setting up the Express server, middleware, and routes.
*   **`routes/`:** Defines API endpoints and maps them to corresponding controller functions (e.g., `authRoutes.js`, `campaignsRoutes.js`, `agentsRoutes.js`).
*   **`controllers/`:** Contains the business logic for handling requests, interacting with models, and preparing data for views (e.g., `authController.js`, `campaignController.js`).
*   **`models/`:** Defines the data structures and interactions with the PostgreSQL database via Sequelize (e.g., `User.js`, `Campana.js`, `BaseCampana.js`).
*   **`middlewares/`:** Houses reusable functions that process requests before they reach controllers, such as `authMiddleware.js` for authentication and `multerMiddleware.js` for file uploads.
*   **`views/`:** Contains EJS templates for rendering the user interface.
*   **`public/`:** Stores static assets like CSS, JavaScript, images, and fonts.
*   **`database/`:** Contains database configuration and connection setup.
*   **`node_modules/`:** A vast collection of third-party libraries providing core functionalities like HTTP server, database ORM, validation, file handling, and utility functions. These modules are integrated into the application via `require` or `import` statements.

**Interaction Flow:**
1.  A client request hits the Express server (`index.js`).
2.  Middleware (`morgan`, `authMiddleware`, `multerMiddleware`) processes the request (logging, authentication, file parsing).
3.  The request is routed by `routes/` to the appropriate `controllers/` function.
4.  The controller interacts with `models/` to perform database operations (CRUD).
5.  Models use Sequelize and `pg-pool` to communicate with the PostgreSQL database.
6.  For file uploads, `multer` and `busboy` parse the `multipart/form-data`.
7.  Validation (`@types/validator`) is applied to incoming data.
8.  The controller prepares data and renders an EJS `view/` or sends a JSON response.

**4. Notable Patterns, Configurations, or Design Decisions**

*   **MVC Pattern:** A classic and well-understood architectural pattern, promoting separation of concerns.
*   **Middleware-centric Design:** Extensive use of middleware for cross-cutting concerns like logging, authentication, and file parsing.
*   **ORM Usage (Sequelize):** Abstracts SQL queries, making database interactions more object-oriented and potentially reducing boilerplate.
*   **Strong Typing (Implied TypeScript):** The heavy reliance on `@types` packages suggests a commitment to type safety, which improves code quality and maintainability, even if the primary application code isn't fully in TypeScript yet.
*   **Functional Programming Utilities:** The inclusion of `lodash/fp` indicates an adoption of functional programming paradigms for data manipulation.
*   **Internationalization (Moment.js Locales):** The presence of numerous `moment/locale/*.js` files signifies a design decision to support multiple languages for date and time formatting.
*   **Database Connection Pooling (`pg-pool`):** Improves performance and resource management for database connections.
*   **Source Maps:** Essential for debugging minified code in production, indicating a professional deployment strategy.
*   **Environment Variables:** Implied by common Node.js practices for configuration (though not explicitly shown in the provided chunks).

**5. Overall Code Structure and Organization**

The repository exhibits a clear and logical structure:

*   **Top-level directories:** `controllers`, `database`, `middlewares`, `models`, `public`, `routes`, `views` clearly segment the application's concerns.
*   **`node_modules/`:** Contains all third-party dependencies, as expected in a Node.js project. The large number of modules (e.g., `lodash`, `moment`, `sequelize`, `pg-protocol`, `busboy`, `multer`) indicates a feature-rich application.
*   **`package.json`:** (Implied from `node_modules` content) Would define project metadata, scripts, and direct dependencies.
*   **`README.md`:** Provides a high-level overview of the project's purpose and features.

This organization promotes modularity, making it easier for developers to locate specific functionalities, understand component responsibilities, and onboard new team members.

**6. Code Quality Observations and Recommendations**

*   **Strengths:**
    *   **Modular and Structured:** The clear directory structure and use of patterns like MVC are excellent for maintainability.
    *   **Dependency Management:** npm is correctly used for managing dependencies.
    *   **Type Safety (Potential):** The presence of `@types` suggests a good practice towards type safety.
    *   **Robust Database Interaction:** Use of Sequelize and `pg-pool` indicates a solid approach to database management.
    *   **Comprehensive Testing (Implied for `busboy`):** Chunk 4 showed an extensive test suite for `busboy`, indicating a commitment to quality in at least some dependencies.
    *   **Localization:** Good support for multiple locales via `moment.js`.
*   **Observations/Recommendations:**
    *   **Consistency in TypeScript Adoption:** If TypeScript is used, ensure it's applied consistently across the entire application code, not just for consuming typed libraries. This would maximize its benefits.
    *   **Error Handling:** While `sequelize` provides error classes, ensure the application-level error handling is robust, consistent, and provides informative messages to clients while logging detailed errors internally.
    *   **Security:** Given the nature of campaign management and user data, a thorough security review is crucial, especially for input validation, authentication flows, and file uploads. `bcrypt` is a good start for passwords.
    *   **Documentation:** Beyond the `README.md`, internal code comments, especially for complex logic in controllers or custom middleware, would be beneficial. JSDoc for functions and classes is recommended.
    *   **Testing:** While `busboy` tests were seen, it's critical to have comprehensive unit, integration, and end-to-end tests for the application's core business logic, controllers, and routes.

**7. Potential Areas for Improvement or Refactoring**

*   **Full TypeScript Migration:** If not already fully in TypeScript, a complete migration would significantly improve maintainability, reduce runtime errors, and enhance developer experience for a project of this scale.
*   **Centralized Configuration:** Consolidate environment-specific configurations (database credentials, API keys, etc.) into a central, secure mechanism (e.g., `.env` files with a configuration library) rather than hardcoding.
*   **Performance Optimization:**
    *   Profile database queries and API endpoints to identify bottlenecks.
    *   Consider caching strategies for frequently accessed data.
    *   Optimize static asset delivery.
*   **Scalability:**
    *   Review the application for potential bottlenecks if high traffic is expected.
    *   Consider message queues for asynchronous tasks (e.g., processing large campaign data uploads).
*   **API Documentation:** Implement API documentation (e.g., OpenAPI/Swagger) for the backend endpoints to facilitate frontend development and external integrations.
*   **Modular Service Layer:** For complex business logic, consider extracting it into a dedicated service layer, separating it from the controllers for better reusability and testability.
*   **Containerization:** Using Docker for development and deployment would ensure consistent environments and simplify scaling.
*   **Code Linting and Formatting:** Implement ESLint and Prettier to enforce consistent code style across the entire codebase, improving readability and reducing cognitive load.

**Limitation Acknowledgment:**
One chunk failed to process, meaning a small portion of the repository's content could not be analyzed. However, the 17 successfully processed chunks provided a substantial amount of information, allowing for a comprehensive overview of the project's purpose, architecture, and key technologies. The missing chunk is unlikely to significantly alter the overall assessment, as the patterns and dependencies are clearly established from the available data.

## CodeGuide CLI Usage Instructions

This project is managed using CodeGuide CLI. The AI agent should follow these guidelines when working on this project.

### Essential Commands

#### Project Setup & Initialization
```bash
# Login to CodeGuide (first time setup)
codeguide login

# Start a new project (generates title, outline, docs, tasks)
codeguide start "project description prompt"

# Initialize current directory with CLI documentation
codeguide init
```

#### Task Management
```bash
# List all tasks
codeguide task list

# List tasks by status
codeguide task list --status pending
codeguide task list --status in_progress
codeguide task list --status completed

# Start working on a task
codeguide task start <task_id>

# Update task with AI results
codeguide task update <task_id> "completion summary or AI results"

# Update task status
codeguide task update <task_id> --status completed
```

#### Documentation Generation
```bash
# Generate documentation for current project
codeguide generate

# Generate documentation with custom prompt
codeguide generate --prompt "specific documentation request"

# Generate documentation for current codebase
codeguide generate --current-codebase
```

#### Project Analysis
```bash
# Analyze current project structure
codeguide analyze

# Check API health
codeguide health
```

### Workflow Guidelines

1. **Before Starting Work:**
   - Run `codeguide task list` to understand current tasks
   - Identify appropriate task to work on
   - Use `codeguide task update <task_id> --status in_progress` to begin work

2. **During Development:**
   - Follow the task requirements and scope
   - Update progress using `codeguide task update <task_id>` when significant milestones are reached
   - Generate documentation for new features using `codeguide generate`

3. **Completing Work:**
   - Update task with completion summary: `codeguide task update <task_id> "completed work summary"`
   - Mark task as completed: `codeguide task update <task_id> --status completed`
   - Generate any necessary documentation

### AI Agent Best Practices

- **Task Focus**: Work on one task at a time as indicated by the task management system
- **Documentation**: Always generate documentation for new features and significant changes
- **Communication**: Provide clear, concise updates when marking task progress
- **Quality**: Follow existing code patterns and conventions in the project
- **Testing**: Ensure all changes are properly tested before marking tasks complete

### Project Configuration
This project includes:
- `codeguide.json`: Project configuration with ID and metadata
- `documentation/`: Generated project documentation
- `AGENTS.md`: AI agent guidelines

### Getting Help
Use `codeguide --help` or `codeguide <command> --help` for detailed command information.

---
*Generated by CodeGuide CLI on 2025-10-18T22:39:19.950Z*
