# Frontend Guideline Document for Welcomedly

This document explains how the Welcomedly frontend is built, styled, and organized. It uses everyday language so anyone—technical or not—can understand how the pieces fit together.

## 1. Frontend Architecture

**Overview**
- The frontend is rendered on the server using EJS (Embedded JavaScript) templates. Express.js delivers HTML pages assembled from reusable partials (header, footer, navigation, etc.).
- Dynamic behavior (real-time updates, form handling, filtering) is handled by JavaScript modules loaded on each page.
- WebSocket communication (using Socket.io) keeps the dashboard and campaign pages in sync with live data (e.g., agent status, pause/resume events).

**How It Supports Scalability, Maintainability, and Performance**
- **Modularity**: EJS partials live in `views/partials`. This means you write a header or card component once and include it wherever needed.
- **Separation of Concerns**: HTML structure lives in EJS files, styling in CSS (under `public/css`), and behavior in JS modules (under `public/js`).
- **Caching & Minification**: Static assets (CSS/JS) are minified and served with far-future cache headers. This speeds up repeat visits.
- **Real-time Layer**: Socket.io connections are managed in a single module (`public/js/socket.js`), so adding new real-time events only requires updating that file.

## 2. Design Principles

1. **Usability**
   - Clear, consistent navigation at the top and side of every page.
   - Prominent action buttons (e.g., "Start Campaign", "Upload Data").
2. **Accessibility**
   - Semantic HTML (headings, landmarks, form labels).
   - ARIA roles on dynamic widgets (modals, dropdowns).
   - Keyboard-friendly interactions.
3. **Responsiveness**
   - Mobile-first CSS grid and flexbox layouts.
   - Breakpoints at 480px, 768px, and 1200px to adapt forms, tables, and dashboards.
4. **Feedback & Affordance**
   - Loading spinners on data fetch.
   - Disabled state on buttons while processing.

## 3. Styling and Theming

### Styling Approach
- **CSS Methodology**: BEM (Block__Element--Modifier) naming keeps class names descriptive and avoids conflicts.
- **Organization**: All CSS lives in `public/css/`:
  - `base/` for resets and typography.
  - `components/` for buttons, cards, modals.
  - `layouts/` for grid and page wrappers.
  - `pages/` for page-specific tweaks.
- **PostCSS**: We use Autoprefixer to add vendor prefixes automatically.

### Theming
- **CSS Variables**: Defined in `:root` so colors and font sizes can change easily.
- **Light & Dark Mode**: Toggle class on `<body>` (`.theme-light` or `.theme-dark`). Each theme overrides CSS variables.

### Visual Style
- **Style**: Modern flat design (no heavy shadows, clean lines, clear spacing).
- **Color Palette**:
  • Primary: #0052CC (deep blue)
  • Secondary: #F4F6FF (off-white)
  • Accent: #FF4081 (vibrant pink)
  • Success: #28A745 (green)
  • Warning: #FFC107 (amber)
  • Danger: #DC3545 (red)
  • Text: #333333 (dark gray), #666666 (medium gray)
  • Backgrounds: #FFFFFF (white)
- **Fonts**: "Inter" for body text; sans-serif fallback. Headers use "Inter" Bold.

## 4. Component Structure

- **File Layout**:
  • `views/partials/` – EJS pieces like header.ejs, sidebar.ejs, campaign-card.ejs
  • `public/js/components/` – JS modules named after components (e.g., `filter-panel.js`, `upload-widget.js`)
  • `public/css/components/` – matching CSS files (e.g., `_filter-panel.css`, `_upload-widget.css`)

- **Reuse**: Each component has its own EJS partial + CSS + JS. To add a new card, you:
  1. Create `views/partials/new-card.ejs`.
  2. Create `public/css/components/_new-card.css` and include it in `main.css`.
  3. Create `public/js/components/new-card.js` for interactivity.
  4. Import the JS in the page’s main script file.

**Benefits of Component-Based Architecture**
- Changes to one card or widget don’t affect others.
- Teams can work in parallel on different components.
- Easier to test and debug isolated pieces.

## 5. State Management

- **Local State**: Each component’s JS module manages its own state (e.g., current filter settings, form values) via private variables.
- **Global State & Events**: A simple event bus (`public/js/event-bus.js`) allows components to share updates. For example, when the filter-panel emits a "filterChanged" event, the campaign-list module listens and reloads data.
- **Real-time Updates**: Socket.io client (`public/js/socket.js`) pushes server events (e.g., `agentStatusUpdated`). Modules subscribe to those events to update UI.

## 6. Routing and Navigation

- **Server-Side Routing**: Express Router defines routes in `routes/`. Each route renders an EJS template with the data needed.
- **Navigation Structure**:
  - Top nav bar with links: Dashboard, Campaigns, Agents, Reports, Settings.
  - Sidebar (on larger screens) replicates main sections for quick access.
- **Page Transitions**: Full page reloads on navigation. For certain interactive areas, we use AJAX calls to fetch and replace portions of the page without a reload (e.g., filtering a table).

## 7. Performance Optimization

1. **Asset Minification & Bundling**
   - CSS and JS are concatenated and minified at build time (using a simple Gulp or npm script).
2. **Lazy Loading**
   - Heavy assets (charts, large tables) load only when scrolled into view.
   - Images use the `loading="lazy"` attribute.
3. **Code Splitting**
   - Component JS files are imported on-demand rather than in one big bundle.
4. **Caching & Compression**
   - Static files served with gzip or brotli compression.
   - Browser caching set via HTTP headers (cache-control).
5. **CDN**
   - Third-party libraries (e.g., Socket.io client, Inter font) are loaded from reliable CDNs.

## 8. Testing and Quality Assurance

- **Linting**:
  • ESLint for JavaScript. Style rules enforce consistent quotes, semicolons, and spacing.
  • Stylelint for CSS. Ensures BEM naming and property order.
- **Unit Tests**:
  • Jest for isolated JS modules (event bus, filter logic).
- **Integration Tests**:
  • SuperTest can hit Express endpoints and check rendered HTML for expected elements.
- **End-to-End Tests**:
  • Cypress for workflows like logging in, creating a campaign, uploading data, and filtering results.
- **Accessibility Checks**:
  • axe-core integration in Cypress to flag a11y issues automatically.

## 9. Conclusion and Overall Frontend Summary

Welcomedly’s frontend is built for clarity and growth. By combining server-rendered EJS templates with modular CSS/JS, we ensure pages load quickly and components stay easy to maintain. Real-time features via Socket.io keep dashboards up to date, while BEM-based styling, CSS variables, and a flat design give the app a clean, professional look. Testing at every level—and an event-driven architecture—keep quality high and make future enhancements straightforward. This setup aligns perfectly with Welcomedly’s goal of a responsive, user-friendly platform for managing commercial campaigns.