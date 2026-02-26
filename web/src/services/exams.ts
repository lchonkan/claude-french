/**
 * Exam API service layer for the French Learning Platform.
 *
 * Provides typed functions for interacting with the exam endpoints:
 * - Placement test start and answer submission
 * - CEFR exit exam start and answer submission
 * - Exam result retrieval
 * - Exam history listing
 */

import { apiClient } from "./api";
import type { CEFRLevel, Skill } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExamType = "placement" | "exit";

export interface ExamQuestion {
  id: string;
  type: string;
  prompt_fr: string;
  prompt_es: string;
  options: string[] | null;
  skill: string;
  cefr_level: string;
}

export interface StartExamResponse {
  exam_id: string;
  exam_type: ExamType;
  current_level: string;
  question: ExamQuestion;
  question_number: number;
  total_questions: number | null;
}

export interface AnswerResponse {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
  next_question: ExamQuestion | null;
  question_number: number;
  current_estimated_level: string;
  exam_complete: boolean;
}

export interface SkillScore {
  skill: string;
  score: number;
  total_questions: number;
  correct: number;
}

export interface ExamResult {
  exam_id: string;
  exam_type: ExamType;
  assigned_level: string;
  score: number;
  passed: boolean;
  skill_breakdown: SkillScore[];
  started_at: string;
  completed_at: string;
  total_questions: number;
  correct_answers: number;
}

export interface ExamHistoryItem {
  id: string;
  exam_type: ExamType;
  cefr_level: string;
  score: number | null;
  passed: boolean | null;
  status: string;
  started_at: string;
  completed_at: string | null;
}

export interface ExamHistoryResponse {
  items: ExamHistoryItem[];
  total: number;
}

// Generic API envelope matching the backend pattern
interface ApiEnvelope<T> {
  data: T;
}

// ---------------------------------------------------------------------------
// Placement Test
// ---------------------------------------------------------------------------

/**
 * Start a new adaptive placement test.
 * The test begins at A2 and adapts based on 5-question windows.
 */
export async function startPlacementTest(): Promise<StartExamResponse> {
  const response = await apiClient<ApiEnvelope<StartExamResponse>>(
    "/exams/placement/start",
    { method: "POST" }
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Exit Exam
// ---------------------------------------------------------------------------

/**
 * Start a CEFR exit exam for a specific level.
 * Requires >= 70% to pass.
 */
export async function startExitExam(
  cefrLevel: CEFRLevel
): Promise<StartExamResponse> {
  const response = await apiClient<ApiEnvelope<StartExamResponse>>(
    "/exams/exit/start",
    {
      method: "POST",
      body: JSON.stringify({ cefr_level: cefrLevel }),
    }
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Answer Submission
// ---------------------------------------------------------------------------

/**
 * Submit an answer for the current question in an exam.
 * Returns whether the answer was correct and the next question (if any).
 */
export async function submitAnswer(
  examId: string,
  questionId: string,
  answer: string
): Promise<AnswerResponse> {
  const response = await apiClient<ApiEnvelope<AnswerResponse>>(
    `/exams/${examId}/answer`,
    {
      method: "POST",
      body: JSON.stringify({ question_id: questionId, answer }),
    }
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

/**
 * Get the result of a completed exam with per-skill breakdown.
 */
export async function getExamResult(examId: string): Promise<ExamResult> {
  const response = await apiClient<ApiEnvelope<ExamResult>>(
    `/exams/${examId}/result`
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/**
 * Get the authenticated user's exam history.
 */
export async function getExamHistory(options?: {
  examType?: ExamType;
  limit?: number;
  offset?: number;
}): Promise<ExamHistoryResponse> {
  const params = new URLSearchParams();
  if (options?.examType) params.set("exam_type", options.examType);
  if (options?.limit != null) params.set("limit", String(options.limit));
  if (options?.offset != null) params.set("offset", String(options.offset));

  const queryString = params.toString();
  const path = `/exams/history${queryString ? `?${queryString}` : ""}`;

  const response = await apiClient<ApiEnvelope<ExamHistoryResponse>>(path);
  return response.data;
}
