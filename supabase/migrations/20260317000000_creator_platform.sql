-- Creator Platform Schema Migration
-- Requirements: 9.1, 9.2, 9.3, 13.1, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Projects table (Requirement 13.1)
create table projects (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null default 'Untitled Project',
  description   text not null default '',
  status        text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  studio_state  jsonb,
  thumbnail_url text,
  scheduled_at  timestamptz,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Accounts table (OAuth connections) (Requirement 9.1)
create table accounts (
  id                     uuid primary key default uuid_generate_v4(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  provider               text not null check (provider in ('youtube', 'instagram')),
  provider_account_id    text not null,
  display_name           text,
  access_token           text not null,
  refresh_token          text,
  token_expires_at       timestamptz not null,
  status                 text not null default 'connected' check (status in ('connected', 'disconnected')),
  last_synced_at         timestamptz,
  last_manual_refresh_at timestamptz,
  quota_reset_at         timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (user_id, provider)
);

-- Videos table (published platform uploads) (Requirement 9.2)
create table videos (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  project_id        uuid references projects(id) on delete set null,
  platform          text not null check (platform in ('youtube', 'instagram')),
  platform_video_id text not null,
  title             text not null,
  published_at      timestamptz,
  duration_seconds  integer,
  created_at        timestamptz not null default now(),
  unique (project_id, platform)
);

-- Analytics summary table (snapshot per video per sync) (Requirement 9.3)
create table analytics_summary (
  id                     uuid primary key default uuid_generate_v4(),
  video_id               uuid not null references videos(id) on delete cascade,
  snapshot_timestamp     timestamptz not null default now(),
  view_count             bigint not null default 0,
  like_count             bigint not null default 0,
  comment_count          bigint not null default 0,
  share_count            bigint not null default 0,
  avg_view_duration_secs integer not null default 0
);

-- Analytics summary daily (data retention aggregates)
create table analytics_summary_daily (
  id                     uuid primary key default uuid_generate_v4(),
  video_id               uuid not null references videos(id) on delete cascade,
  day                    date not null,
  view_count             bigint not null default 0,
  like_count             bigint not null default 0,
  comment_count          bigint not null default 0,
  share_count            bigint not null default 0,
  avg_view_duration_secs integer not null default 0,
  unique (video_id, day)
);

-- Sync state table (for cron deduplication)
create table sync_state (
  id                uuid primary key default uuid_generate_v4(),
  last_triggered_at timestamptz
);
insert into sync_state (id) values (uuid_generate_v4());

-- Indexes (Requirement 18)
create index idx_projects_user_id     on projects(user_id);                                        -- Requirement 18.1
create index idx_projects_updated_at  on projects(updated_at desc);                                -- Requirement 18.2
create index idx_videos_project_id    on videos(project_id);                                       -- Requirement 18.3
create index idx_videos_platform      on videos(platform);                                         -- Requirement 18.4
create index idx_analytics_video_id   on analytics_summary(video_id);                             -- Requirement 18.5
create index idx_analytics_video_time on analytics_summary(video_id, snapshot_timestamp desc);    -- Requirement 18.6

-- Auto-update updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger trg_accounts_updated_at
  before update on accounts
  for each row execute function update_updated_at();
