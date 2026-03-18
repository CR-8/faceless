# Requirements Document

## Introduction

The Creator Platform expands the existing faceless video tool into a comprehensive content creation hub. It introduces a structured navigation system with dedicated routes for the Studio, Dashboard, Planner, Analytics, and Settings. The Dashboard acts as a "Control Tower" giving creators a high-level view of their pipeline and performance. The Analytics system integrates with YouTube and Instagram APIs (via Supabase OAuth) to surface per-platform metrics. The goal is a closed-loop UX: Dashboard → Create → Studio → Publish → Analytics → Dashboard.

## Glossary

- **Platform**: The full Next.js web application (this system).
- **Studio**: The existing video creation tool, relocated to `/studio`.
- **Dashboard**: The new `/dashboard` route serving as the creator's Control Tower.
- **Planner**: The existing Kanban-based video planner, relocated to `/planner`.
- **Analytics**: The new `/analytics` route for performance metrics.
- **Settings**: The new `/settings` route for account and integration management.
- **Project**: A single video creation session with associated script, assets, and render job.
- **Content_Pipeline**: The ordered stages a Project passes through: Draft → Scheduled → Published.
- **Analytics_Account**: A connected social platform account (YouTube or Instagram) stored in Supabase.
- **Analytics_Summary**: Aggregated performance metrics for a given Project and platform.
- **OAuth_Provider**: An external identity provider (YouTube via Google, Instagram via Meta) used for account connection.
- **Mock_Data**: Statically defined placeholder analytics data used before real API integration.
- **Studio_State**: The persisted JSON payload within a Project record containing script content, asset selections, and configuration values.
- **Partial_Publish**: A Project state where at least one but not all selected platform uploads have succeeded.

---

## Requirements

### Requirement 1: Route Restructuring

**User Story:** As a creator, I want a clear, dedicated URL for each major section of the platform, so that I can navigate directly to any tool without confusion.

#### Acceptance Criteria

1. THE Platform SHALL serve the Studio interface at the `/studio` route.
2. THE Platform SHALL serve the Dashboard interface at the `/dashboard` route.
3. THE Platform SHALL serve the Planner interface at the `/planner` route.
4. THE Platform SHALL serve the Analytics interface at the `/analytics` route.
5. THE Platform SHALL serve the Settings interface at the `/settings` route.
6. WHEN a user navigates to the root path `/`, THE Platform SHALL redirect the user to `/dashboard`.
7. THE Platform SHALL render a persistent navigation sidebar on all routes that links to `/dashboard`, `/studio`, `/planner`, `/analytics`, and `/settings`.

---

### Requirement 2: Dashboard — Quick Actions

**User Story:** As a creator, I want one-click shortcuts to my most common tasks, so that I can start working immediately without hunting through menus.

#### Acceptance Criteria

1. THE Dashboard SHALL display a "Create Video" action that navigates the user to `/studio`.
2. THE Dashboard SHALL display an "Open Planner" action that navigates the user to `/planner`.
3. THE Dashboard SHALL display a "View Analytics" action that navigates the user to `/analytics`.

---

### Requirement 3: Dashboard — Recent Projects

**User Story:** As a creator, I want to see my most recently worked-on projects, so that I can quickly resume work without searching.

#### Acceptance Criteria

1. THE Dashboard SHALL display the 5 most recently modified Projects.
2. WHEN a Project is displayed, THE Dashboard SHALL show the project title, last-modified timestamp, and current Content_Pipeline stage.
3. WHEN a user clicks the "Resume" button on a Project, THE Platform SHALL navigate the user to `/studio?projectId={id}`.
4. WHEN the Studio is opened with a `projectId` query parameter, THE Platform SHALL fetch the corresponding Project record from Supabase and hydrate the Studio state with the stored script, asset selections, and configuration values.
5. IF the Project record cannot be fetched, THEN THE Platform SHALL display an error message and load the Studio with default state.
6. IF no Projects exist, THEN THE Dashboard SHALL display an empty state message prompting the user to create their first video.

---

### Requirement 4: Dashboard — Performance Snapshot

**User Story:** As a creator, I want a quick summary of my recent performance, so that I can gauge how my content is doing at a glance.

#### Acceptance Criteria

1. THE Dashboard SHALL display total views accumulated in the last 7 days.
2. THE Dashboard SHALL display the overall engagement rate as a percentage.
3. THE Dashboard SHALL display the title of the top-performing video by view count.
4. WHILE real Analytics_Account data is unavailable, THE Dashboard SHALL populate the Performance Snapshot using Mock_Data.
5. WHEN real Analytics_Account data is available, THE Dashboard SHALL replace Mock_Data with live metrics.

---

### Requirement 5: Dashboard — Content Pipeline

**User Story:** As a creator, I want to see how many videos are in each stage of my pipeline, so that I can manage my publishing schedule.

#### Acceptance Criteria

1. THE Dashboard SHALL display a Content_Pipeline view with three columns: Draft, Scheduled, and Published.
2. THE Dashboard SHALL display the count of Projects in each Content_Pipeline stage.
3. WHEN a user clicks on a Content_Pipeline stage, THE Platform SHALL navigate the user to `/planner` filtered to that stage.

---

### Requirement 6: Planner Relocation

**User Story:** As a creator, I want the video planner accessible at a dedicated `/planner` route, so that it fits within the unified navigation structure.

#### Acceptance Criteria

1. THE Platform SHALL serve the existing Kanban-based planner interface at `/planner`.
2. THE Planner SHALL preserve all existing functionality including card creation, deletion, and drag-and-drop column movement.
3. WHEN a user navigates to the legacy projects path, THE Platform SHALL redirect the user to `/planner`.

---

### Requirement 7: Analytics — Overview Page

**User Story:** As a creator, I want a high-level analytics overview, so that I can understand my total reach and growth across platforms.

#### Acceptance Criteria

1. THE Analytics page SHALL display total views aggregated across all connected Analytics_Accounts.
2. THE Analytics page SHALL display a growth percentage comparing the current 30-day period to the previous 30-day period.
3. THE Analytics page SHALL display the best-performing platform by total views.
4. THE Analytics page SHALL display the creator's average posting frequency as posts per week.
5. WHILE no Analytics_Account is connected, THE Analytics page SHALL display Mock_Data with a visible indicator that the data is not live.

---

### Requirement 8: Analytics — Per-Video Page

**User Story:** As a creator, I want detailed metrics for each individual video, so that I can understand what content resonates with my audience.

#### Acceptance Criteria

1. WHEN a user selects a video from the Analytics page, THE Analytics page SHALL display a retention graph showing audience drop-off over the video's duration.
2. WHEN a user selects a video, THE Analytics page SHALL display an engagement breakdown showing likes, comments, and shares as individual values.
3. WHEN a user selects a video, THE Analytics page SHALL display a performance comparison showing the video's view count relative to the creator's average view count.
4. IF retention data is unavailable for a video, THEN THE Analytics page SHALL display a message indicating that retention data is not available for that video.

---

### Requirement 9: Analytics — Data Models

**User Story:** As a developer, I want well-defined Supabase data models for analytics, so that platform data is stored and queried consistently.

#### Acceptance Criteria

1. THE Platform SHALL maintain an `accounts` table in Supabase with fields for: user ID, OAuth provider name, OAuth access token, OAuth refresh token, and token expiry timestamp.
2. THE Platform SHALL maintain a `videos` table in Supabase with fields for: video ID, associated user ID, associated project ID (nullable foreign key to `projects`), platform name, platform-specific video ID, title, publish timestamp, and duration in seconds.
3. THE Platform SHALL maintain an `analytics_summary` table in Supabase with fields for: summary ID, associated video ID, snapshot timestamp, view count, like count, comment count, share count, and average view duration in seconds.
4. WHEN an OAuth access token is within 5 minutes of expiry, THE Platform SHALL refresh the token using the stored OAuth refresh token before making API requests.
5. WHEN a Project is published to multiple platforms, THE Platform SHALL create one `videos` record per platform upload, each referencing the same project ID.

---

### Requirement 10: YouTube Integration (Phase 2)

**User Story:** As a creator, I want to connect my YouTube channel, so that I can see real YouTube performance data in the Analytics section.

#### Acceptance Criteria

1. THE Settings page SHALL display a "Connect YouTube" button when no YouTube Analytics_Account is connected.
2. WHEN a user clicks "Connect YouTube", THE Platform SHALL initiate the Google OAuth 2.0 authorization flow with the `youtube.readonly` scope.
3. WHEN the OAuth flow completes successfully, THE Platform SHALL store the resulting credentials as an Analytics_Account record in Supabase.
4. WHEN a YouTube Analytics_Account is connected, THE Platform SHALL fetch video list and view metrics from the YouTube Data API v3.
5. WHEN a YouTube Analytics_Account is connected, THE Settings page SHALL display the connected channel name and a "Disconnect" button.
6. WHEN a user clicks "Disconnect" for a YouTube account, THE Platform SHALL delete the associated Analytics_Account record from Supabase.

---

### Requirement 11: Instagram Integration (Phase 3)

**User Story:** As a creator, I want to connect my Instagram account, so that I can see real Instagram performance data in the Analytics section.

#### Acceptance Criteria

1. THE Settings page SHALL display a "Connect Instagram" button when no Instagram Analytics_Account is connected.
2. WHEN a user clicks "Connect Instagram", THE Platform SHALL initiate the Meta OAuth authorization flow with the `instagram_basic` and `instagram_manage_insights` scopes.
3. WHEN the Meta OAuth flow completes successfully, THE Platform SHALL store the resulting credentials as an Analytics_Account record in Supabase.
4. WHEN an Instagram Analytics_Account is connected, THE Platform SHALL fetch media list and engagement metrics from the Instagram Graph API.
5. WHEN an Instagram Analytics_Account is connected, THE Settings page SHALL display the connected account username and a "Disconnect" button.

---

### Requirement 12: Settings Page

**User Story:** As a creator, I want a dedicated settings page, so that I can manage my account and platform integrations in one place.

#### Acceptance Criteria

1. THE Settings page SHALL display the current user's account information.
2. THE Settings page SHALL display the connection status for each supported OAuth_Provider (YouTube, Instagram).
3. WHERE a supported OAuth_Provider is not connected, THE Settings page SHALL display a connect button for that provider.
4. WHERE a supported OAuth_Provider is connected, THE Settings page SHALL display the connected account identifier and a disconnect option.


---

### Requirement 13: Project Data Model

**User Story:** As a developer, I want a well-defined `projects` table in Supabase, so that Dashboard, Planner, Analytics, and Studio resume functionality all share a single source of truth for project state.

#### Acceptance Criteria

1. THE Platform SHALL maintain a `projects` table in Supabase with the following fields: `id` (uuid, primary key), `user_id` (uuid, foreign key to auth users), `title` (text), `description` (text), `status` (enum: "draft" | "scheduled" | "published"), `created_at` (timestamp), `updated_at` (timestamp), `scheduled_at` (nullable timestamp), `published_at` (nullable timestamp), and `thumbnail_url` (text, nullable).
2. WHEN a new Studio session is saved, THE Platform SHALL create or update the corresponding `projects` record in Supabase.
3. THE Platform SHALL store the Studio session state (script content, asset selections, and configuration values) as a JSON payload within the `projects` record.
4. WHEN a Project's Content_Pipeline stage changes, THE Platform SHALL update the `status` field and the corresponding timestamp (`scheduled_at` or `published_at`) in the `projects` record.
5. THE Dashboard, Planner, and Analytics pages SHALL read Project data exclusively from the `projects` table.

---

### Requirement 14: Background Analytics Sync

**User Story:** As a creator, I want analytics data to load instantly without hitting external APIs on every page visit, so that the Dashboard and Analytics pages are fast and reliable.

#### Acceptance Criteria

1. THE Platform SHALL provide a background sync job that fetches analytics data from all connected Analytics_Accounts at a maximum interval of every 6 hours.
2. WHEN the sync job runs, THE Platform SHALL write the fetched metrics as new snapshot records into the `analytics_summary` table.
3. THE Dashboard Performance Snapshot SHALL read exclusively from stored `analytics_summary` records, not from live platform APIs.
4. THE Analytics page SHALL read exclusively from stored `analytics_summary` records, not from live platform APIs.
5. WHEN the sync job completes, THE Platform SHALL update a `last_synced_at` timestamp associated with each Analytics_Account record.
6. IF the sync job fails for a given Analytics_Account, THEN THE Platform SHALL retain the most recent successful snapshot data and log the failure.

---

### Requirement 15: Error Handling

**User Story:** As a creator, I want the platform to handle integration failures gracefully, so that I always understand what went wrong and can continue using the platform.

#### Acceptance Criteria

1. IF an OAuth authorization flow fails or is cancelled by the user, THEN THE Platform SHALL display a descriptive error message on the Settings page and leave the Analytics_Account connection state unchanged.
2. IF an OAuth token refresh attempt fails (e.g., refresh token revoked or expired), THEN THE Platform SHALL mark the associated Analytics_Account `status` as "disconnected" in Supabase AND display a re-connect prompt on the Settings page.
3. IF a platform API returns a quota-exceeded error (HTTP 429 or equivalent), THEN THE Platform SHALL pause further requests to that platform until the quota reset window has elapsed and display a quota warning to the user.
4. IF a platform API returns an empty video list for a connected Analytics_Account, THEN THE Analytics page SHALL display a message indicating no videos were found for that account.
5. IF the background analytics sync fails and no cached snapshot exists, THEN THE Dashboard and Analytics pages SHALL display an error state indicating that analytics data is currently unavailable.
6. IF the background analytics sync fails but a prior snapshot exists, THEN THE Dashboard and Analytics pages SHALL display the cached data alongside a visible warning banner indicating the data may be outdated and showing the `last_synced_at` timestamp.

---

### Requirement 16: Publishing Workflow

**User Story:** As a creator, I want a clear publishing flow that uploads my video to each selected platform and tracks the result, so that I always know where my content was successfully published.

#### Acceptance Criteria

1. WHEN a user publishes a Project, THE Platform SHALL upload the rendered video to each selected platform (YouTube, Instagram).
2. WHEN a platform upload succeeds, THE Platform SHALL receive and store the platform-specific video ID and create one `videos` record per platform upload.
3. THE Platform SHALL update the Project `status` to "published" and set `published_at` only after at least one platform upload succeeds.
4. IF an upload fails for one platform but succeeds for another, THEN THE Platform SHALL mark the Project as Partial_Publish, log the failure, and display a per-platform status notification to the user.
5. IF all platform uploads fail, THEN THE Platform SHALL leave the Project `status` unchanged and display an error message to the user.

---

### Requirement 17: Mock/Dev Mode

**User Story:** As a developer, I want a global mock data mode controlled by an environment variable, so that I can build and demo the UI without requiring live platform API connections.

#### Acceptance Criteria

1. THE Platform SHALL support a `NEXT_PUBLIC_MOCK_ANALYTICS` environment variable that, when set to `true`, enables Mock_Data mode globally.
2. WHEN Mock_Data mode is enabled, THE Dashboard Performance Snapshot, Analytics overview, and all per-video pages SHALL use statically defined Mock_Data instead of Supabase queries.
3. Mock_Data SHALL mirror the exact response structure of real platform API responses so that UI components require no code changes when switching to live data.
4. WHEN Mock_Data mode is enabled, THE Platform SHALL display a visible "Demo Data" badge on any page rendering Mock_Data.

---

### Requirement 18: Database Indexing

**User Story:** As a developer, I want database indexes defined on high-traffic query columns, so that dashboard and analytics queries remain performant as data grows.

#### Acceptance Criteria

1. THE Platform SHALL create an index on `projects.user_id` to support per-user project queries.
2. THE Platform SHALL create an index on `projects.updated_at` to support ORDER BY updated_at DESC queries for Recent Projects.
3. THE Platform SHALL create an index on `videos.project_id` to support joins between projects and platform uploads.
4. THE Platform SHALL create an index on `videos.platform` to support per-platform filtering queries.
5. THE Platform SHALL create an index on `analytics_summary.video_id` to support per-video analytics lookups.
6. THE Platform SHALL create a composite index on `analytics_summary(video_id, snapshot_timestamp)` to support time-series analytics queries.
7. THE Platform SHALL ensure that Dashboard Recent Projects queries (ORDER BY updated_at DESC LIMIT 5) execute within 200ms under normal load.
8. THE Platform SHALL ensure that Analytics time-series queries over a 30-day window execute within 200ms under normal load.

---

### Requirement 19: Manual Analytics Refresh

**User Story:** As a creator, I want to manually trigger an analytics refresh, so that I can see the latest performance data without waiting for the next scheduled background sync.

#### Acceptance Criteria

1. THE Analytics page SHALL display a "Refresh Data" button.
2. WHEN a user clicks "Refresh Data", THE Platform SHALL immediately fetch fresh analytics data for all connected Analytics_Accounts belonging to that user and update the corresponding `analytics_summary` records.
3. THE Platform SHALL enforce a per-user rate limit of one manual refresh per 10 minutes.
4. IF a user attempts a manual refresh within the 10-minute cooldown window, THEN THE Platform SHALL display a message indicating when the next refresh will be available.
5. WHILE a manual refresh is in progress, THE Platform SHALL display a loading indicator on the "Refresh Data" button and disable further refresh requests.
6. WHEN the manual refresh completes successfully, THE Platform SHALL update the `last_synced_at` timestamp and re-render the Analytics page with the latest data.
7. IF the manual refresh fails, THE Platform SHALL display an error message and retain the previously cached snapshot data.
