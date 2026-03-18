# Implementation Plan: Creator Platform

## Overview

Incrementally layer the Creator Platform on top of the existing faceless video codebase. Foundation first (schema + types + Supabase clients), then routing, then layout, then feature pages, then API routes, then background sync, then OAuth (phased), then tests. Each step wires into the previous so there is no orphaned code.

## Tasks

- [x] 1. Foundation — Database schema, TypeScript types, and Supabase client refactor
  - [x] 1.1 Write and apply Supabase SQL migration
    - Create `projects`, `accounts`, `videos`, `analytics_summary` tables with all constraints, check constraints, and the `unique (project_id, platform)` constraint on `videos`
    - Add all six indexes from the schema (idx_projects_user_id, idx_projects_updated_at, idx_videos_project_id, idx_videos_platform, idx_analytics_video_id, idx_analytics_video_time)
    - Add `update_updated_at()` trigger function and attach to `projects` and `accounts`
    - Create `analytics_summary_daily` table for data retention aggregates
    - _Requirements: 9.1, 9.2, 9.3, 13.1, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [x] 1.2 Create `src/types/db.ts` with TypeScript interfaces
    - Define `Project`, `StudioStatePayload`, `Account`, `Video`, `AnalyticsSummary`, `AnalyticsSummaryDaily` interfaces matching the SQL schema exactly
    - _Requirements: 13.3, 9.1, 9.2, 9.3_

  - [x] 1.3 Refactor `src/lib/supabase.ts` to export three client factories
    - Export `createSupabaseServerClient()` (SSR, cookie-based, for Server Components and user-authenticated API routes)
    - Export `createSupabaseBrowserClient()` (browser, cookie-based, for Client Components)
    - Export `createSupabaseServiceClient()` (service role key, no cookies, for cron endpoint only)
    - Install `@supabase/ssr` package
    - _Requirements: 14.1_

  - [x] 1.4 Write unit tests for schema existence
    - Verify all four tables exist via Supabase introspection
    - Verify all six indexes exist
    - _Requirements: 9.1, 9.2, 9.3, 13.1, 18.1–18.6_

- [x] 2. Route restructuring and redirects
  - [x] 2.1 Move Studio to `/studio` route
    - Create `src/app/studio/page.tsx` by relocating the current `src/app/page.tsx` Studio content
    - Add `src/app/studio/error.tsx` error boundary (Client Component with `reset` callback)
    - _Requirements: 1.1_

  - [x] 2.2 Move Planner to `/planner` route
    - Create `src/app/planner/page.tsx` by relocating `src/app/projects/page.tsx`
    - Add redirect from `/projects` → `/planner` in `src/app/projects/page.tsx`
    - _Requirements: 1.3, 6.1, 6.3_

  - [x] 2.3 Add root redirect and stub routes
    - Update `src/app/page.tsx` to redirect to `/dashboard`
    - Create stub `src/app/dashboard/page.tsx`, `src/app/analytics/page.tsx`, `src/app/settings/page.tsx`
    - Add `src/app/dashboard/loading.tsx`, `src/app/dashboard/error.tsx`
    - Add `src/app/analytics/loading.tsx`, `src/app/analytics/error.tsx`
    - _Requirements: 1.2, 1.4, 1.5, 1.6_

  - [x] 2.4 Write unit tests for route existence and redirects
    - Test that `/` redirects to `/dashboard`
    - Test that `/projects` redirects to `/planner`
    - _Requirements: 1.6, 6.3_

- [x] 3. Layout — AppSidebar and AppShell
  - [x] 3.1 Create `src/components/layout/AppSidebar.tsx`
    - Use shadcn `Sidebar` component; links to `/dashboard`, `/studio`, `/planner`, `/analytics`, `/settings`
    - Highlight active route via `usePathname()`
    - _Requirements: 1.7_

  - [x] 3.2 Create `src/components/layout/AppShell.tsx`
    - Wraps children with the sidebar layout
    - _Requirements: 1.7_

  - [x] 3.3 Integrate AppShell into `src/app/layout.tsx`
    - Wrap the root layout body with `AppShell` so the sidebar renders on all routes
    - _Requirements: 1.7_


- [x] 4. Mock data layer
  - [x] 4.1 Create `src/lib/mock-analytics.ts`
    - Export `isMockMode` boolean helper (`process.env.NEXT_PUBLIC_MOCK_ANALYTICS === 'true'`)
    - Export `MOCK_VIDEOS`, `MOCK_ANALYTICS_SUMMARY`, `MOCK_PERFORMANCE_SNAPSHOT` constants matching the exact TypeScript types from `src/types/db.ts`
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 4.2 Create `src/lib/get-analytics.ts` abstraction
    - Export `getAnalyticsSummaries(videoId)`, `getVideosForUser(userId)`, `getPerformanceSnapshot(userId)` functions
    - Each function checks `isMockMode` and returns mock constants or queries Supabase accordingly
    - _Requirements: 17.2, 17.3_

  - [x] 4.3 Create `src/components/analytics/DemoBadge.tsx`
    - Renders a visible "Demo Data" badge; only shown when `isMockMode` is true
    - _Requirements: 17.4_

  - [x] 4.4 Write property test for mock data structure (Property 24)
    - **Property 24: Mock Data Structure Matches Real API Shape**
    - **Validates: Requirements 17.3**

  - [x] 4.5 Write property test for mock mode returns mock constants (Property 7)
    - **Property 7: Mock Mode Returns Mock Constants**
    - **Validates: Requirements 4.4, 7.5, 17.2**

- [x] 5. Projects API routes
  - [x] 5.1 Create `src/app/api/projects/route.ts` (GET + POST)
    - GET: query `projects` ordered by `updated_at DESC LIMIT 5` (dashboard) or all (planner); use `createSupabaseServerClient()`
    - POST: insert new project row, return created record
    - _Requirements: 3.1, 13.2_

  - [x] 5.2 Create `src/app/api/projects/[id]/route.ts` (GET + PATCH + DELETE)
    - GET: return full project row including `studio_state` JSON
    - PATCH: accept partial update; `updated_at` handled by DB trigger
    - DELETE: remove project row
    - _Requirements: 3.4, 13.2, 13.3, 13.4_

  - [x] 5.3 Write property test for studio state round-trip (Property 3)
    - **Property 3: Studio State Round-Trip**
    - **Validates: Requirements 3.4, 13.2, 13.3**

- [x] 6. Studio state persistence
  - [x] 6.1 Extend `StudioContext` with project persistence fields
    - Add `projectId: string | null`, `projectTitle: string`, `setProjectTitle`, `saveProject: () => Promise<void>`, `isSaving: boolean`, `saveError: string | null` to the `StudioState` interface and `StudioProvider`
    - On mount, read `?projectId=` from `useSearchParams()`; if present, call `GET /api/projects/[id]` and hydrate state from `studio_state`; on fetch failure show toast error and load default state
    - `saveProject` serializes current context values into `StudioStatePayload` and calls `PATCH /api/projects/[id]` (or `POST /api/projects` if no `projectId` yet); updates URL with `?projectId=` after first save
    - _Requirements: 3.3, 3.4, 3.5, 13.2, 13.3_

  - [x] 6.2 Write unit tests for Studio hydration
    - Test that loading `/studio?projectId=X` fetches and hydrates state
    - Test that a 404 response loads default state and shows error
    - _Requirements: 3.4, 3.5_

- [x] 7. Dashboard page
  - [x] 7.1 Create `src/components/dashboard/QuickActions.tsx`
    - Three action buttons: "Create Video" → `/studio`, "Open Planner" → `/planner`, "View Analytics" → `/analytics`
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 7.2 Create `src/components/dashboard/RecentProjects.tsx`
    - Fetch top 5 projects via `GET /api/projects`; render project title, last-modified timestamp, pipeline status
    - "Resume" button navigates to `/studio?projectId={id}`
    - Empty state message when no projects exist
    - _Requirements: 3.1, 3.2, 3.3, 3.6_

  - [x] 7.3 Create `src/components/dashboard/PerformanceSnapshot.tsx`
    - Display total views (7-day), engagement rate %, top video title
    - Use `getPerformanceSnapshot()` from `src/lib/get-analytics.ts` (mock or live)
    - Render `DemoBadge` when `isMockMode` is true
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 17.4_

  - [x] 7.4 Create `src/components/dashboard/ContentPipeline.tsx`
    - Display Draft / Scheduled / Published counts from projects query
    - Each stage is clickable and navigates to `/planner` (filtered by stage)
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 7.5 Wire dashboard components into `src/app/dashboard/page.tsx`
    - Compose `QuickActions`, `RecentProjects`, `PerformanceSnapshot`, `ContentPipeline`
    - Add Suspense boundaries with skeleton loaders from `loading.tsx`
    - _Requirements: 2.1–2.3, 3.1–3.6, 4.1–4.5, 5.1–5.3_

  - [x] 7.6 Write property tests for dashboard data logic (Properties 1, 2, 4, 5, 6, 8)
    - **Property 1: Recent Projects Query Returns Top 5 by Updated At** — Validates: Requirements 3.1
    - **Property 2: Project Card Renders Required Fields** — Validates: Requirements 3.2
    - **Property 4: 7-Day View Count Aggregation** — Validates: Requirements 4.1
    - **Property 5: Engagement Rate Calculation** — Validates: Requirements 4.2
    - **Property 6: Top Video Is Maximum View Count** — Validates: Requirements 4.3
    - **Property 8: Pipeline Stage Counts Are Accurate** — Validates: Requirements 5.2

  - [x] 7.7 Write unit tests for dashboard
    - Test empty state renders when no projects exist
    - Test "Demo Data" badge presence when mock mode is on
    - Test quick action link targets
    - _Requirements: 2.1–2.3, 3.6, 17.4_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Analytics pages
  - [x] 9.1 Create `src/components/analytics/AnalyticsOverview.tsx`
    - Display total views, growth %, best platform, posts per week
    - Use `get-analytics.ts` abstraction; render `DemoBadge` when mock mode active
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 9.2 Create `src/components/analytics/RetentionGraph.tsx`
    - Render audience retention curve from analytics data; show "retention data unavailable" message when data is absent
    - _Requirements: 8.1, 8.4_

  - [x] 9.3 Create `src/components/analytics/EngagementBreakdown.tsx`
    - Display likes, comments, shares as individual values for a given video
    - _Requirements: 8.2_

  - [x] 9.4 Create `src/components/analytics/VideoAnalyticsDetail.tsx`
    - Compose `RetentionGraph`, `EngagementBreakdown`, and performance comparison ratio display
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 9.5 Wire analytics overview into `src/app/analytics/page.tsx`
    - Render `AnalyticsOverview` with Suspense + skeleton loader
    - Add "Refresh Data" button (wired to `/api/analytics/refresh`); show loading indicator while in-flight; show cooldown message on 429; show error on failure
    - _Requirements: 7.1–7.5, 19.1, 19.4, 19.5, 19.7_

  - [x] 9.6 Create `src/app/analytics/[videoId]/page.tsx`
    - Render `VideoAnalyticsDetail` for the given video ID
    - _Requirements: 8.1–8.4_

  - [x] 9.7 Write property tests for analytics aggregation (Properties 10, 11, 12, 13, 14, 15)
    - **Property 10: Analytics Total Views Aggregation Across Accounts** — Validates: Requirements 7.1
    - **Property 11: Growth Percentage Calculation** — Validates: Requirements 7.2
    - **Property 12: Best Platform Is Maximum Total Views** — Validates: Requirements 7.3
    - **Property 13: Posts Per Week Calculation** — Validates: Requirements 7.4
    - **Property 14: Per-Video Engagement Breakdown Contains All Fields** — Validates: Requirements 8.2
    - **Property 15: Performance Comparison Is Ratio of Video Views to Average** — Validates: Requirements 8.3

- [x] 10. Settings page
  - [x] 10.1 Create `src/components/settings/AccountInfo.tsx`
    - Display current user account information from Supabase session
    - _Requirements: 12.1_

  - [x] 10.2 Create `src/components/settings/OAuthProviderCard.tsx`
    - Reusable card component accepting `provider`, `connected`, `displayName`, `onConnect`, `onDisconnect` props
    - Shows connect button when not connected; shows account identifier + disconnect button when connected
    - _Requirements: 12.2, 12.3, 12.4_

  - [x] 10.3 Wire settings into `src/app/settings/page.tsx`
    - Compose `AccountInfo` and two `OAuthProviderCard` instances (YouTube, Instagram)
    - Read `?connected=` and `?error=` query params to show success/error toasts
    - _Requirements: 10.1, 10.5, 11.1, 11.5, 12.1–12.4, 15.1_

  - [x] 10.4 Write unit tests for settings page
    - Test OAuth error redirect renders descriptive message
    - Test connect/disconnect button visibility based on account state
    - _Requirements: 12.2–12.4, 15.1_

- [x] 11. Planner relocation and Planner board component
  - [x] 11.1 Create `src/components/planner/PlannerBoard.tsx`
    - Extract the Kanban board JSX from the old `projects/page.tsx` into this component
    - Preserve all existing functionality: card creation, deletion, drag-and-drop column movement, localStorage persistence
    - _Requirements: 6.1, 6.2_

  - [x] 11.2 Wire `PlannerBoard` into `src/app/planner/page.tsx`
    - _Requirements: 6.1_

  - [x] 11.3 Write property test for planner card operations (Property 9)
    - **Property 9: Planner Card Operations Preserve Invariants**
    - **Validates: Requirements 6.2**

- [x] 12. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Manual analytics refresh API
  - [x] 13.1 Create `src/app/api/analytics/refresh/route.ts`
    - Authenticate via Supabase session cookie
    - Query `accounts.last_manual_refresh_at` for the user; if any account was refreshed within 10 minutes return 429 with `nextRefreshAt`
    - Otherwise update `last_manual_refresh_at = now()` and call `runSync(userId)` (stub for now)
    - Return `{ success: true, last_synced_at }` on success
    - _Requirements: 19.2, 19.3, 19.4, 19.6, 19.7_

  - [x] 13.2 Write property test for manual refresh rate limit (Property 23)
    - **Property 23: Manual Refresh Rate Limit Enforced**
    - **Validates: Requirements 19.3**

- [x] 14. Background analytics sync service
  - [x] 14.1 Create `src/lib/analytics-sync.ts` with `runSync(userId?: string)`
    - Fetch all `accounts` with `status = 'connected'` (filtered by `userId` if provided)
    - For each account: check `token_expires_at`; if within 5 minutes call platform token refresh endpoint and update `accounts` row
    - Call platform adapter to fetch metrics; insert new `analytics_summary` rows; update `accounts.last_synced_at`
    - After all inserts: run aggregation + prune SQL for data retention (aggregate rows older than 30 days into `analytics_summary_daily`, delete raw rows older than 30 days)
    - On 429 from platform: skip account, set `quota_reset_at`, log warning; do not make further requests to that platform in this run
    - On token refresh failure: set `accounts.status = 'disconnected'`
    - _Requirements: 14.1, 14.2, 14.5, 14.6, 9.4, 15.2, 15.3_

  - [x] 14.2 Create `src/lib/platforms/youtube.ts` YouTube adapter (Phase 2)
    - `fetchMetrics(account, videoIds)`: batch video IDs in groups of 50, call `videos.list` with `part=statistics`, return `AnalyticsSummary[]`
    - `refreshToken(account)`: exchange refresh token for new access token via Google token endpoint
    - `fetchVideoList(account)`: return all video IDs for the channel
    - _Requirements: 10.4, 14.1_

  - [x] 14.3 Create `src/lib/platforms/instagram.ts` Instagram adapter (Phase 3)
    - `fetchMetrics(account, mediaIds)`: fetch media insights from Instagram Graph API
    - `refreshToken(account)`: exchange token via Meta endpoint
    - `fetchMediaList(account)`: return all media IDs for the account
    - _Requirements: 11.4, 14.1_

  - [x] 14.4 Create `src/app/api/analytics/sync/route.ts` cron endpoint
    - Layer 1: check `Authorization: Bearer ${CRON_SECRET}` header; reject with 403 if missing/wrong
    - Layer 2: validate `x-vercel-forwarded-for` / `x-forwarded-for` against `VERCEL_CRON_IP_ALLOWLIST`; reject with 403 if not allowlisted
    - Layer 3: read `last_triggered_at` from Supabase `sync_state` row; reject with 403 if < 1 minute ago; update `last_triggered_at` before proceeding
    - Call `runSync()` using `createSupabaseServiceClient()`; return `{ synced, errors }`
    - _Requirements: 14.1, 14.2_

  - [x] 14.5 Create `vercel.json` with cron configuration
    - Schedule `/api/analytics/sync` at `0 */6 * * *`
    - _Requirements: 14.1_

  - [x] 14.6 Write property tests for sync service (Properties 16, 17, 18, 19, 20, 21, 22)
    - **Property 16: Token Refresh Triggered Before Expiry Window** — Validates: Requirements 9.4
    - **Property 17: One Videos Record Per Platform Per Publish** — Validates: Requirements 9.5, 16.1, 16.2
    - **Property 18: Project Status Published Only After At Least One Success** — Validates: Requirements 16.3
    - **Property 19: Token Refresh Failure Marks Account Disconnected** — Validates: Requirements 15.2
    - **Property 20: Quota Exceeded Halts Further Requests to That Platform** — Validates: Requirements 15.3
    - **Property 21: Sync Run Inserts New Analytics Summary Rows** — Validates: Requirements 14.2, 19.2
    - **Property 22: Sync Updates last_synced_at** — Validates: Requirements 14.5, 19.6

  - [x] 14.7 Wire `runSync` into `src/app/api/analytics/refresh/route.ts`
    - Replace the stub from task 13.1 with the real `runSync(userId)` call
    - _Requirements: 19.2_

- [x] 15. Publish workflow API
  - [x] 15.1 Create `src/app/api/publish/route.ts`
    - Accept `{ projectId, platforms, outputUrl }`
    - For each platform: query `videos` for existing `(project_id, platform)` row; if found, skip upload and return existing video ID
    - Run uploads in parallel for platforms with no existing record; on success insert `videos` row
    - If ≥1 upload succeeded: update `projects.status = 'published'`, set `published_at`
    - If all failed: leave project status unchanged
    - Return `{ results: [{ platform, success, videoId?, error?, existing? }] }`
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 15.2 Write unit tests for publish workflow
    - Test partial publish: one platform succeeds, one fails → project status = published, per-platform status shown
    - Test all-fail: project status unchanged
    - Test idempotency: second publish call for same project+platform returns existing video ID
    - _Requirements: 16.3, 16.4, 16.5_

- [x] 16. YouTube OAuth flow (Phase 2)
  - [x] 16.1 Create `src/app/api/oauth/youtube/route.ts`
    - Generate CSRF `state` param, store in HTTP-only cookie
    - Redirect to Google OAuth consent screen with `youtube.readonly` scope
    - _Requirements: 10.2_

  - [x] 16.2 Create `src/app/api/oauth/youtube/callback/route.ts`
    - Verify `state` param against cookie; on mismatch redirect to `/settings?error=oauth_failed`
    - Exchange `code` for tokens via Google token endpoint
    - Fetch channel info; upsert `accounts` row with tokens and `provider_account_id`
    - Redirect to `/settings?connected=youtube`
    - _Requirements: 10.3, 15.1_

  - [x] 16.3 Wire YouTube connect/disconnect into `OAuthProviderCard` on settings page
    - Connect button → `GET /api/oauth/youtube`
    - Disconnect button → delete `accounts` row for YouTube, refresh settings page
    - _Requirements: 10.1, 10.5, 10.6_

- [x] 17. Instagram OAuth flow (Phase 3)
  - [x] 17.1 Create `src/app/api/oauth/instagram/route.ts`
    - Generate CSRF `state` param, store in HTTP-only cookie
    - Redirect to Meta OAuth consent screen with `instagram_basic` and `instagram_manage_insights` scopes
    - _Requirements: 11.2_

  - [x] 17.2 Create `src/app/api/oauth/instagram/callback/route.ts`
    - Verify `state` param; on mismatch redirect to `/settings?error=oauth_failed`
    - Exchange `code` for tokens via Meta token endpoint
    - Fetch Instagram account info; upsert `accounts` row
    - Redirect to `/settings?connected=instagram`
    - _Requirements: 11.3, 15.1_

  - [x] 17.3 Wire Instagram connect/disconnect into `OAuthProviderCard` on settings page
    - Connect button → `GET /api/oauth/instagram`
    - Disconnect button → delete `accounts` row for Instagram, refresh settings page
    - _Requirements: 11.1, 11.5_

- [x] 18. Error handling and edge states
  - [x] 18.1 Add stale-data warning banner to analytics and dashboard pages
    - When sync has failed but a prior snapshot exists, render a warning banner with `last_synced_at` timestamp
    - When no snapshot exists at all, render an error state ("Analytics data unavailable")
    - _Requirements: 15.5, 15.6_

  - [x] 18.2 Add quota warning display to analytics page
    - When an account has `quota_reset_at` set, display a quota warning with the reset time
    - _Requirements: 15.3_

  - [x] 18.3 Write unit tests for error states
    - Test sync failure with no cached data renders error state
    - Test sync failure with cached data renders warning banner with timestamp
    - _Requirements: 15.5, 15.6_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Phase 2 tasks (YouTube OAuth): tasks 16.1–16.3 and 14.2
- Phase 3 tasks (Instagram OAuth): tasks 17.1–17.3 and 14.3
- Property tests use **fast-check** (`npm install --save-dev fast-check`) and run a minimum of 100 iterations each
- Unit tests and property tests live in `src/__tests__/unit/` and `src/__tests__/property/` respectively
- The cron endpoint (`/api/analytics/sync`) uses the service role Supabase client — never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- `analytics-sync.ts` is a pure server-side module — no `"use client"` directive
