import { apiClient } from "./api";
import type { CEFRLevel, Module, ExerciseType } from "@/types";

// ---------------------------------------------------------------------------
// Grammar check types
// ---------------------------------------------------------------------------

export interface GrammarCorrection {
  start: number;
  end: number;
  original: string;
  suggestion: string;
  error_type: string;
  explanation_es: string;
  confidence: number;
}

export interface GrammarCheckResult {
  original_text: string;
  corrections: GrammarCorrection[];
  corrected_text: string;
  ai_platform: string;
  latency_ms: number;
}

export interface GrammarCheckRequest {
  text: string;
  cefr_level?: CEFRLevel;
}

// ---------------------------------------------------------------------------
// Complexity scoring types
// ---------------------------------------------------------------------------

export interface ComplexityFeatures {
  sentence_length: number;
  subordinate_clauses: number;
  subjunctive_usage: boolean;
  vocabulary_difficulty_avg: number;
}

export interface ComplexityResult {
  text: string;
  complexity_score: number;
  estimated_cefr: string;
  features: ComplexityFeatures;
  ai_platform: string;
  latency_ms: number;
}

export interface ComplexityRequest {
  text: string;
  cefr_level?: CEFRLevel;
}

// ---------------------------------------------------------------------------
// Lesson types
// ---------------------------------------------------------------------------

export interface LessonSummary {
  id: string;
  module: Module;
  cefr_level: CEFRLevel;
  title_es: string;
  title_fr: string;
  description_es: string | null;
  order_index: number;
  exercise_count: number;
}

export interface LessonListResponse {
  lessons: LessonSummary[];
  total: number;
}

export interface LessonExerciseContent {
  sentence?: string;
  correct_answer?: string;
  options?: string[];
  hint?: string;
  question?: string;
  explanation_es?: string;
  verb?: string;
  translation?: string;
  expected?: Record<string, string>;
  error_word?: string;
  correct_word?: string;
  error_position?: number;
  correct_order?: string[];
  [key: string]: unknown;
}

export interface LessonExerciseDetail {
  id: string;
  lesson_id: string;
  exercise_type: ExerciseType;
  prompt_es: string;
  content: LessonExerciseContent;
  difficulty_tier: number;
  order_index: number;
}

export interface LessonContent {
  explanation_es?: string;
  examples?: Array<{ fr: string; es: string }>;
  grammar_table?: Record<string, unknown>;
  notes_es?: string;
  [key: string]: unknown;
}

export interface LessonDetail {
  id: string;
  module: Module;
  cefr_level: CEFRLevel;
  title_es: string;
  title_fr: string;
  description_es: string | null;
  content: LessonContent;
  order_index: number;
  exercises: LessonExerciseDetail[];
}

export interface MasteryUpdate {
  skill: string;
  new_mastery_percentage: number;
}

export interface ExerciseSubmitResult {
  correct: boolean;
  user_answer?: string | string[] | Record<string, string> | null;
  correct_answer: string | null;
  feedback_es: string;
  error_type?: string | null;
  error_category?: string | null;
  xp_awarded: number;
  mastery_update?: MasteryUpdate | null;
}

// ---------------------------------------------------------------------------
// Grammar API functions
// ---------------------------------------------------------------------------

/**
 * Check French text for grammar errors.
 */
export async function checkGrammar(
  params: GrammarCheckRequest,
): Promise<{ data: GrammarCheckResult }> {
  return apiClient("/grammar/check", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Score the linguistic complexity of a French sentence.
 */
export async function scoreComplexity(
  params: ComplexityRequest,
): Promise<{ data: ComplexityResult }> {
  return apiClient("/grammar/complexity", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

// ---------------------------------------------------------------------------
// Lessons API functions
// ---------------------------------------------------------------------------

/**
 * Fetch a list of lessons filtered by module and CEFR level.
 */
export async function getLessons(params: {
  module: Module;
  cefr_level: CEFRLevel;
  limit?: number;
  offset?: number;
}): Promise<{ data: LessonListResponse }> {
  const query = new URLSearchParams();
  query.set("module", params.module);
  query.set("cefr_level", params.cefr_level);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return apiClient(`/lessons/?${query}`);
}

/**
 * Fetch a single lesson with all its exercises.
 */
export async function getLesson(
  lessonId: string,
): Promise<{ data: LessonDetail }> {
  return apiClient(`/lessons/${lessonId}`);
}

/**
 * Submit an answer for a lesson exercise.
 */
export async function submitExercise(
  lessonId: string,
  exerciseId: string,
  answer: string | string[] | Record<string, string>,
): Promise<{ data: ExerciseSubmitResult }> {
  return apiClient(`/lessons/${lessonId}/exercises/${exerciseId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}
