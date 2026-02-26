/**
 * Listening Comprehension API service layer.
 *
 * Provides typed functions for interacting with the listening practice
 * endpoints: listing exercises, fetching exercise detail, submitting
 * answers, and revealing transcripts.
 */

import { apiClient } from "./api";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListeningExerciseSummary {
  id: string;
  title_es: string;
  title_fr: string;
  description_es: string | null;
  cefr_level: CEFRLevel;
  order_index: number;
  duration_seconds: number | null;
  question_count: number;
}

export interface ListeningExerciseListResponse {
  exercises: ListeningExerciseSummary[];
  total: number;
}

export interface AudioSegment {
  id: string;
  start: number;
  end: number;
  text_fr: string;
  speaker: string | null;
}

export interface ComprehensionQuestion {
  id: string;
  question_fr: string;
  question_es: string;
  options: string[];
  order_index: number;
  difficulty_tier: number;
}

export interface ListeningExerciseDetail {
  id: string;
  title_es: string;
  title_fr: string;
  description_es: string | null;
  cefr_level: CEFRLevel;
  order_index: number;
  audio_url: string;
  duration_seconds: number | null;
  segments: AudioSegment[];
  questions: ComprehensionQuestion[];
}

export interface AnswerSubmission {
  question_id: string;
  answer: string;
}

export interface QuestionFeedback {
  question_id: string;
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  explanation_es: string;
}

export interface MasteryUpdateData {
  skill: string;
  new_mastery_percentage: number;
}

export interface SubmitAnswersResponse {
  score: number;
  correct_count: number;
  total_count: number;
  feedback: QuestionFeedback[];
  xp_awarded: number;
  mastery_update: MasteryUpdateData | null;
}

export interface TranscriptData {
  exercise_id: string;
  dialogue_text_fr: string;
  dialogue_text_es: string;
  segments: AudioSegment[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the list of listening exercises for a given CEFR level.
 */
export async function getListeningExercises(
  cefrLevel: CEFRLevel = "A1",
  limit = 20,
  offset = 0
): Promise<ListeningExerciseListResponse> {
  const params = new URLSearchParams({
    cefr_level: cefrLevel,
    limit: String(limit),
    offset: String(offset),
  });
  const result = await apiClient<{ data: ListeningExerciseListResponse }>(
    `/listening/exercises?${params.toString()}`
  );
  return result.data;
}

/**
 * Fetch the detail of a single listening exercise including questions.
 * Does NOT include the transcript text (use revealTranscript for that).
 */
export async function getListeningExerciseDetail(
  exerciseId: string
): Promise<ListeningExerciseDetail> {
  const result = await apiClient<{ data: ListeningExerciseDetail }>(
    `/listening/exercises/${exerciseId}`
  );
  return result.data;
}

/**
 * Submit answers to comprehension questions for a listening exercise.
 */
export async function submitListeningAnswers(
  exerciseId: string,
  answers: AnswerSubmission[]
): Promise<SubmitAnswersResponse> {
  const result = await apiClient<{ data: SubmitAnswersResponse }>(
    `/listening/exercises/${exerciseId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({ answers }),
    }
  );
  return result.data;
}

/**
 * Reveal the full transcript for a listening exercise.
 * This action is tracked for analytics.
 */
export async function revealTranscript(
  exerciseId: string
): Promise<TranscriptData> {
  const result = await apiClient<{ data: TranscriptData }>(
    `/listening/exercises/${exerciseId}/transcript`,
    { method: "POST" }
  );
  return result.data;
}
