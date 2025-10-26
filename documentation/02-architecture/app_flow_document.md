# App Flow Document

# Welcomedly App Flow Document

## Onboarding and Sign-In/Sign-Up

When a new visitor arrives at the Welcomedly application, they land on a clean landing page that introduces the platform’s purpose and features. From this page, a “Get Started” button leads them to the account creation page. On the sign-up page, the user provides a valid email, chooses a secure password, and confirms the password. After submitting, they receive an email with a verification link. Clicking that link verifies their address and redirects them to the login screen. Users can also choose to reset a forgotten password by clicking the “Forgot Password” link on the login screen. They enter their registered email, receive a reset link, and follow it to set a new password. Social media logins are not supported at this stage, so the only option is email and password. Once the account is verified, the user can sign in by entering their email and password. From any page, a “Logout” button in the header ends the session and returns the user to the landing page.

## Main Dashboard or Home Page

After signing in, the user sees the Main Dashboard. Across the top is a header that shows the application name and the user’s display name with a small avatar. Below the header, the left side of the screen features a vertical navigation bar with entries for Dashboard, Campaigns, Agents, Reports, Real-Time Monitoring, and Settings. The main area shows an overview widget that lists active campaigns with their current status and performance summary, a quick action box to create a new campaign, and an alerts panel for recent system messages or errors. A footer at the bottom displays the current date and time in the user’s preferred timezone. Clicking any navigation entry takes the user directly to that section’s main page.

## Detailed Feature Flows and Page Transitions

When the user clicks “Campaigns” in the sidebar, they arrive at the Campaign List page. This page displays all existing campaigns in a table with columns for name, start date, end date, assigned agents count, and status. A “Create Campaign” button at the top right leads to the Campaign Creation form. In that form, the user enters a campaign name, description, selects start and end dates using a date picker localized to their timezone, and defines any custom fields. After filling these details and clicking “Save,” they see a confirmation message and are taken back to the campaign list where the new campaign appears.

To upload base data for a campaign, the user selects a campaign from the list and clicks “Upload Data.” This brings up a page with a file picker powered by Multer. The user chooses a CSV file containing contact information or other base data. Upon submission, the system validates the file format and content. If everything passes, the data is processed in the background, and the user is notified via a banner message that processing has started. Once processing is complete, the campaign status updates from “Pending Data” to “Ready.”

Assigning agents happens on the same campaign detail page under the “Agents” tab. The user clicks “Assign Agents,” which opens a modal listing available agents in a searchable dropdown. They select one or more agents and click “Assign.” The system updates the assignment and displays a success toast notification. The updated agent count appears immediately in the campaign list and in the sidebar summary widget.

The “Agents” section of the sidebar shows all agents in a table with their name, email, assigned campaigns, and current availability status. From here, the user can edit an agent’s profile by clicking the agent’s name. The Edit Agent page allows updating the display name, contact email, and availability. Saving changes returns the user to the Agents list with an updated record.

In the “Reports” section, the user finds a date-range filter at the top and a set of radio buttons to choose between campaign performance, agent productivity, or user activity. After selecting filters and clicking “Generate Report,” the page refreshes to show charts and tables summarizing the results. The user can download a CSV or PDF by clicking a download icon next to each chart.

The “Real-Time Monitoring” page shows live updates of user actions and campaign status changes. It uses server-sent events to push new log entries into a scrolling activity feed. A filter bar lets the user pause or resume streaming, and dropdowns allow filtering by campaign or agent. Pausing stops the feed temporarily and displays a “Streaming Paused” message until the user clicks “Resume.”

## Settings and Account Management

From the sidebar, clicking “Settings” opens the User Settings page. At the top is a “Profile” section where the user can update their display name, email, and password. Saving profile changes triggers a confirmation banner. Below that, a “Notifications” section lets the user toggle email alerts for data upload success or failure, campaign milestones, and daily summary reports. These preferences are saved by clicking the “Save Preferences” button at the bottom. There is no billing or subscription feature in the current version, so the user simply returns to any other section by clicking the sidebar links.

## Error States and Alternate Paths

If a user enters incorrect login credentials, an inline error message appears above the login form saying “Email or password is incorrect.” They can retry immediately. During campaign creation, if required fields are missing or dates are invalid (for example, the end date is before the start date), a red inline message appears next to the offending field explaining the problem. For file uploads, if the user selects a non-CSV file or the CSV contains invalid headers, a clear error banner appears stating the expected format. Connectivity issues display a full-page “Connection Lost” message with a “Retry” button that attempts to reconnect the client to the server. If the session expires due to inactivity, any user action shows a prompt that says “Session expired, please log in again” and redirects to the login page.

## Conclusion and Overall App Journey

From the moment a new user signs up and verifies their email, they navigate smoothly into the Main Dashboard. They can create, configure, and view campaigns, upload data, and assign agents all within a few clicks. The Agents and Reports sections provide detailed management and analytics, and the Real-Time Monitoring page keeps them informed of live events. Account settings are easy to update, and helpful error messages guide the user through any missteps. Logging out returns them neatly to the landing page, completing a full cycle from sign-up to daily campaign management.


---
**Document Details**
- **Project ID**: 85e6f36a-c515-44f0-bbe7-5ba76e4817a3
- **Document ID**: c30c3383-8c09-4169-b00f-cedb920d9e3e
- **Type**: custom
- **Custom Type**: app_flow_document
- **Status**: completed
- **Generated On**: 2025-10-18T18:51:10.105Z
- **Last Updated**: 2025-10-18T22:12:02.929Z
