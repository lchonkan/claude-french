/**
 * Writing evaluation API service layer.
 *
 * Provides typed functions for interacting with the writing practice
 * endpoints: fetching prompts, submitting writing, polling evaluation
 * status, and listing evaluation history.
 */

import { apiClient } from "./api";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WritingPrompt {
  id: string;
  title: string;
  prompt_fr: string;
  prompt_es: string;
  min_words: number;
  max_words: number;
}

export interface PromptsResponse {
  cefr_level: CEFRLevel;
  prompts: WritingPrompt[];
}

export interface SubmitWritingRequest {
  prompt_id: string;
  prompt_text: string;
  submitted_text: string;
  cefr_level: CEFRLevel;
  lesson_id?: string;
}

export interface SubmitWritingResponse {
  evaluation_id: string;
  status: string;
  message: string;
}

export interface WritingEvaluationResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  cefr_level: CEFRLevel;
  prompt_text: string;
  submitted_text: string;
  grammar_score: number | null;
  vocabulary_score: number | null;
  coherence_score: number | null;
  task_completion_score: number | null;
  overall_cefr_score: CEFRLevel | null;
  feedback_es: string | null;
  evaluation_json: WritingEvaluationDetail | null;
  ai_platform: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface WritingEvaluationDetail {
  grammar_score: number;
  vocabulary_score: number;
  coherence_score: number;
  task_completion_score: number;
  overall_cefr: CEFRLevel;
  feedback_es: string;
  details: WritingErrorDetail[];
}

export interface WritingErrorDetail {
  position: number;
  error_type: string;
  original: string;
  correction: string;
  explanation_es: string;
}

export interface EvaluationHistoryResponse {
  evaluations: WritingEvaluationResult[];
  total: number;
  page: number;
  page_size: number;
}

export interface GrammarCheckResult {
  original_text: string;
  corrections: GrammarCorrection[];
  corrected_text: string;
  ai_platform: string;
  latency_ms: number;
}

export interface GrammarCorrection {
  start: number;
  end: number;
  original: string;
  suggestion: string;
  error_type: string;
  explanation_es: string;
  confidence: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch writing prompts for a given CEFR level.
 */
export async function getWritingPrompts(
  cefrLevel: CEFRLevel
): Promise<PromptsResponse> {
  const result = await apiClient<{ data: PromptsResponse }>(
    `/writing/prompts?cefr_level=${cefrLevel}`
  );
  return result.data;
}

/**
 * Submit a writing sample for CEFR-aligned evaluation.
 * Returns the pending evaluation ID for subsequent polling.
 */
export async function submitWriting(
  params: SubmitWritingRequest
): Promise<SubmitWritingResponse> {
  const result = await apiClient<{ data: SubmitWritingResponse }>(
    "/writing/submit",
    {
      method: "POST",
      body: JSON.stringify(params),
    }
  );
  return result.data;
}

/**
 * Poll the status of a writing evaluation.
 * Returns full details including scores when status is 'completed'.
 */
export async function getEvaluationStatus(
  evaluationId: string
): Promise<WritingEvaluationResult> {
  const result = await apiClient<{ data: WritingEvaluationResult }>(
    `/writing/evaluations/${evaluationId}`
  );
  return result.data;
}

/**
 * Fetch the user's writing evaluation history with pagination.
 */
export async function getEvaluationHistory(params: {
  page?: number;
  pageSize?: number;
  cefrLevel?: CEFRLevel;
}): Promise<EvaluationHistoryResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.pageSize) query.set("page_size", String(params.pageSize));
  if (params.cefrLevel) query.set("cefr_level", params.cefrLevel);

  const queryStr = query.toString();
  const path = queryStr ? `/writing/evaluations?${queryStr}` : "/writing/evaluations";

  const result = await apiClient<{ data: EvaluationHistoryResponse }>(path);
  return result.data;
}

/**
 * Quick grammar check for preview before submitting writing.
 * Uses the /grammar/check endpoint.
 */
export async function quickGrammarCheck(
  text: string,
  cefrLevel: CEFRLevel
): Promise<GrammarCheckResult> {
  const result = await apiClient<{ data: GrammarCheckResult }>(
    "/grammar/check",
    {
      method: "POST",
      body: JSON.stringify({ text, cefr_level: cefrLevel }),
    }
  );
  return result.data;
}

// ---------------------------------------------------------------------------
// Polling helper
// ---------------------------------------------------------------------------

/**
 * Poll for evaluation completion with exponential backoff.
 *
 * Resolves with the completed evaluation, or rejects if max retries
 * are exceeded or the evaluation fails.
 */
export async function pollEvaluation(
  evaluationId: string,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onStatusChange?: (status: string) => void;
  } = {}
): Promise<WritingEvaluationResult> {
  const {
    maxRetries = 30,
    initialDelayMs = 2000,
    maxDelayMs = 10000,
    onStatusChange,
  } = options;

  let delay = initialDelayMs;
  let lastStatus = "";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await getEvaluationStatus(evaluationId);

    if (result.status !== lastStatus) {
      lastStatus = result.status;
      onStatusChange?.(result.status);
    }

    if (result.status === "completed") {
      return result;
    }

    if (result.status === "failed") {
      throw new EvaluationError(
        result.feedback_es ?? "La evaluacion ha fallado.",
        result
      );
    }

    // Wait with exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, maxDelayMs);
  }

  throw new EvaluationError(
    "Se agoto el tiempo de espera para la evaluacion.",
    null
  );
}

/**
 * Custom error class for evaluation failures.
 */
export class EvaluationError extends Error {
  constructor(
    message: string,
    public readonly evaluation: WritingEvaluationResult | null
  ) {
    super(message);
    this.name = "EvaluationError";
  }
}
