import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Database Schema Migration', () => {
  let migrationSql: string;

  beforeAll(() => {
    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20260317000000_creator_platform.sql'
    );
    migrationSql = fs.readFileSync(migrationPath, 'utf-8');
  });

  describe('Tables', () => {
    it('should define the projects table', () => {
      expect(migrationSql).toMatch(/create table projects/i);
    });

    it('should define the accounts table', () => {
      expect(migrationSql).toMatch(/create table accounts/i);
    });

    it('should define the videos table', () => {
      expect(migrationSql).toMatch(/create table videos/i);
    });

    it('should define the analytics_summary table', () => {
      expect(migrationSql).toMatch(/create table analytics_summary/i);
    });

    it('should define the analytics_summary_daily table', () => {
      expect(migrationSql).toMatch(/create table analytics_summary_daily/i);
    });
  });

  describe('Indexes', () => {
    it('should define idx_projects_user_id index', () => {
      expect(migrationSql).toMatch(/idx_projects_user_id/i);
    });

    it('should define idx_projects_updated_at index', () => {
      expect(migrationSql).toMatch(/idx_projects_updated_at/i);
    });

    it('should define idx_videos_project_id index', () => {
      expect(migrationSql).toMatch(/idx_videos_project_id/i);
    });

    it('should define idx_videos_platform index', () => {
      expect(migrationSql).toMatch(/idx_videos_platform/i);
    });

    it('should define idx_analytics_video_id index', () => {
      expect(migrationSql).toMatch(/idx_analytics_video_id/i);
    });

    it('should define idx_analytics_video_time composite index', () => {
      expect(migrationSql).toMatch(/idx_analytics_video_time/i);
    });
  });

  describe('Constraints', () => {
    it('should have unique constraint on (project_id, platform) in videos', () => {
      expect(migrationSql).toMatch(/unique\s*\(\s*project_id\s*,\s*platform\s*\)/i);
    });

    it('should have unique constraint on (user_id, provider) in accounts', () => {
      expect(migrationSql).toMatch(/unique\s*\(\s*user_id\s*,\s*provider\s*\)/i);
    });
  });

  describe('Triggers', () => {
    it('should define update_updated_at trigger function', () => {
      expect(migrationSql).toMatch(/create or replace function update_updated_at/i);
    });

    it('should attach trigger to projects table', () => {
      expect(migrationSql).toMatch(/trg_projects_updated_at/i);
    });

    it('should attach trigger to accounts table', () => {
      expect(migrationSql).toMatch(/trg_accounts_updated_at/i);
    });
  });
});
