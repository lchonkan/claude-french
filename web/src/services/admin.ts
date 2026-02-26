/**
 * Admin API service layer (T124).
 *
 * Provides typed functions for communicating with the admin analytics
 * backend endpoints under /api/v1/admin.
 */

import { apiClient } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DateRange {
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

/** Per-platform AI usage stats. */
export interface PlatformStats {
  total_requests: number;
  success_rate: number;
  avg_latency_ms: number;
  total_estimated_cost_usd: number;
  fallback_count: number;
}

/** Response from GET /admin/analytics/ai/overview */
export interface AIOverview {
  period: { start: string; end: string };
  total_requests: number;
  by_platform: Record<string, PlatformStats>;
  cost_per_user_per_day_usd: number;
}

/** Single task-type breakdown row. */
export interface TaskBreakdownItem {
  task_type: string;
  platform: string;
  request_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  avg_cost_usd: number;
  total_cost_usd: number;
  success_rate: number;
  fallback_count: number;
}

/** Response from GET /admin/analytics/ai/by-task */
export interface TaskBreakdownResponse {
  tasks: TaskBreakdownItem[];
}

/** A single trend data point. */
export interface TrendDataPoint {
  date: string;
  value: number;
}

/** Response from GET /admin/analytics/ai/trends */
export interface TrendsResponse {
  metric: string;
  platform: string | null;
  data_points: TrendDataPoint[];
}

/** Response from GET /admin/analytics/users */
export interface UserEngagement {
  total_users: number;
  active_users: number;
  new_users: number;
  avg_daily_active: number;
  avg_session_minutes: number;
  streak_distribution: Record<string, number>;
  cefr_distribution: Record<string, number>;
}

export interface ContentStat {
  total: number;
  reviewed?: number;
  pending_review?: number;
  ai_generated?: number;
  active?: number;
  draft?: number;
}

/** Response from GET /admin/analytics/content */
export interface ContentMetrics {
  vocabulary_items: ContentStat;
  cultural_notes: ContentStat;
  lessons: ContentStat;
}

/** Trend metric options. */
export type TrendMetric = "latency" | "cost" | "requests" | "errors";

/** AI platform options. */
export type AIPlatform = "huggingface" | "gemini";

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Fetch aggregate AI metrics overview.
 */
export async function getAIOverview(
  range: DateRange,
): Promise<{ data: AIOverview }> {
  const params = new URLSearchParams({
    start_date: range.start_date,
    end_date: range.end_date,
  });
  return apiClient(`/admin/analytics/ai/overview?${params}`);
}

/**
 * Fetch AI metrics broken down by task type.
 */
export async function getAIByTask(
  range: DateRange,
): Promise<{ data: TaskBreakdownResponse }> {
  const params = new URLSearchParams({
    start_date: range.start_date,
    end_date: range.end_date,
  });
  return apiClient(`/admin/analytics/ai/by-task?${params}`);
}

/**
 * Fetch daily trend data for a specific AI metric.
 */
export async function getAITrends(
  range: DateRange,
  metric: TrendMetric,
  platform?: AIPlatform,
): Promise<{ data: TrendsResponse }> {
  const params = new URLSearchParams({
    start_date: range.start_date,
    end_date: range.end_date,
    metric,
  });
  if (platform) {
    params.set("platform", platform);
  }
  return apiClient(`/admin/analytics/ai/trends?${params}`);
}

/**
 * Fetch user engagement analytics.
 */
export async function getUserEngagement(
  range: DateRange,
): Promise<{ data: UserEngagement }> {
  const params = new URLSearchParams({
    start_date: range.start_date,
    end_date: range.end_date,
  });
  return apiClient(`/admin/analytics/users?${params}`);
}

/**
 * Fetch content metrics (vocabulary, cultural notes, lessons).
 */
export async function getContentMetrics(): Promise<{ data: ContentMetrics }> {
  return apiClient("/admin/analytics/content");
}
