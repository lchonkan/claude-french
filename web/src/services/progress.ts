import { apiClient } from "./api";
import type { CEFRLevel, Skill } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillMasteryData {
  skill: Skill;
  mastery_percentage: number;
  total_exercises: number;
  total_correct: number;
  recent_trend: "improving" | "stable" | "declining";
  last_practiced: string | null;
}

export interface CEFRProgressData {
  current_level: CEFRLevel;
  overall_mastery: number;
  skills: SkillMasteryData[];
  unlock_threshold: number;
  exam_required: boolean;
  exam_available: boolean;
}

export interface BadgeData {
  id: string;
  badge_type: string;
  cefr_level: CEFRLevel | null;
  earned_at: string;
}

export interface DailyChallengeData {
  id: string;
  challenge_type: Skill;
  description_es: string;
  completed: boolean;
  xp_reward: number;
}

export interface RecentActivityData {
  activity_type: string;
  xp_earned: number;
  timestamp: string;
}

export interface UserDashboardInfo {
  display_name: string;
  current_cefr_level: CEFRLevel;
  xp_total: number;
  current_streak: number;
  longest_streak: number;
}

export interface DashboardData {
  user: UserDashboardInfo;
  cefr_progress: CEFRProgressData;
  badges: BadgeData[];
  daily_challenge: DailyChallengeData | null;
  recent_activity: RecentActivityData[];
}

export interface MasteryData {
  cefr_level: CEFRLevel;
  skills: SkillMasteryData[];
}

export interface SkillTreeNode {
  skill: Skill;
  status: "locked" | "in_progress" | "mastered";
  mastery: number;
}

export interface SkillTreeLevel {
  cefr_level: CEFRLevel;
  status: "locked" | "in_progress" | "completed";
  overall_mastery: number;
  skills: SkillTreeNode[];
  exam_status: "locked" | "available" | "passed";
}

export interface SkillTreeData {
  levels: SkillTreeLevel[];
}

export interface StreakDay {
  date: string;
  active: boolean;
  xp_earned: number;
}

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_history: StreakDay[];
}

export interface ChallengeCompleteData {
  challenge_id: string;
  completed: boolean;
  xp_awarded: number;
  new_xp_total: number;
}

export interface XPTransactionData {
  activity_type: string;
  xp_amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface XPHistoryData {
  transactions: XPTransactionData[];
  total: number;
  period_xp: number;
}

// ---------------------------------------------------------------------------
// Badge metadata (for display)
// ---------------------------------------------------------------------------

export interface BadgeMeta {
  type: string;
  nameEs: string;
  descriptionEs: string;
  icon: string;
}

export const BADGE_CATALOG: BadgeMeta[] = [
  { type: "cefr_completion", nameEs: "Nivel completado", descriptionEs: "Completa un nivel CEFR", icon: "trophy" },
  { type: "streak_7", nameEs: "Racha de 7 dias", descriptionEs: "Practica 7 dias seguidos", icon: "flame" },
  { type: "streak_30", nameEs: "Racha de 30 dias", descriptionEs: "Practica 30 dias seguidos", icon: "flame" },
  { type: "streak_100", nameEs: "Racha de 100 dias", descriptionEs: "Practica 100 dias seguidos", icon: "flame" },
  { type: "first_conversation", nameEs: "Primera conversacion", descriptionEs: "Completa tu primera conversacion", icon: "chat" },
  { type: "first_writing", nameEs: "Primera escritura", descriptionEs: "Envia tu primer texto", icon: "pen" },
  { type: "first_pronunciation", nameEs: "Primera pronunciacion", descriptionEs: "Practica tu primera pronunciacion", icon: "mic" },
  { type: "vocab_100", nameEs: "100 palabras", descriptionEs: "Aprende 100 palabras", icon: "book" },
  { type: "vocab_500", nameEs: "500 palabras", descriptionEs: "Aprende 500 palabras", icon: "book" },
  { type: "vocab_1000", nameEs: "1000 palabras", descriptionEs: "Aprende 1000 palabras", icon: "book" },
];

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the learner's full progress dashboard.
 */
export async function getDashboard(): Promise<{ data: DashboardData }> {
  return apiClient("/progress/dashboard");
}

/**
 * Fetch detailed mastery breakdown per skill.
 */
export async function getMastery(
  cefrLevel?: CEFRLevel,
): Promise<{ data: MasteryData }> {
  const query = cefrLevel ? `?cefr_level=${cefrLevel}` : "";
  return apiClient(`/progress/mastery${query}`);
}

/**
 * Fetch the visual skill tree data.
 */
export async function getSkillTree(): Promise<{ data: SkillTreeData }> {
  return apiClient("/progress/skill-tree");
}

/**
 * Fetch streak details and history.
 */
export async function getStreak(): Promise<{ data: StreakData }> {
  return apiClient("/progress/streak");
}

/**
 * Mark a daily challenge as completed.
 */
export async function completeDailyChallenge(
  challengeId: string,
): Promise<{ data: ChallengeCompleteData }> {
  return apiClient(`/progress/daily-challenge/${challengeId}/complete`, {
    method: "POST",
  });
}

/**
 * Fetch XP transaction history with optional date filtering.
 */
export async function getXPHistory(params?: {
  limit?: number;
  offset?: number;
  start_date?: string;
  end_date?: string;
}): Promise<{ data: XPHistoryData }> {
  const query = new URLSearchParams();
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  if (params?.start_date) query.set("start_date", params.start_date);
  if (params?.end_date) query.set("end_date", params.end_date);
  const qs = query.toString();
  return apiClient(`/progress/xp/history${qs ? `?${qs}` : ""}`);
}
