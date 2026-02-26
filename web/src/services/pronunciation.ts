/**
 * Pronunciation API service layer.
 *
 * Provides typed functions for interacting with the pronunciation practice
 * endpoints: listing exercises, uploading audio, starting evaluations,
 * polling results, and viewing history.
 */

import { apiClient, supabase } from "./api";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PronunciationExercise {
  id: string;
  target_text: string;
  phonetic_ipa: string;
  reference_audio_url: string;
  cefr_level: CEFRLevel;
  focus_phonemes: string[];
  recommended_speed: number;
}

export interface ExercisesResponse {
  exercises: PronunciationExercise[];
}

export interface UploadUrlResponse {
  upload_url: string;
  storage_path: string;
  expires_in_seconds: number;
}

export interface EvaluateResponse {
  evaluation_id: string;
  status: EvalStatus;
  pipeline_steps: string[];
  estimated_completion_seconds: number;
}

export type EvalStatus = "pending" | "processing" | "completed" | "failed";

export interface PhonemeDetail {
  target: string;
  actual: string;
  score: number;
  issue?: string | null;
}

export interface PipelineSTTResult {
  transcription: string;
  confidence: number;
  ai_platform: string;
  latency_ms: number;
}

export interface PipelinePhonemeResult {
  phonemes: PhonemeDetail[];
  phoneme_accuracy_score: number;
  ai_platform: string;
  latency_ms: number;
}

export interface PipelineMultimodalResult {
  prosody_score: number;
  fluency_score: number;
  overall_score: number;
  improvement_suggestions_es: string[];
  ai_platform: string;
  latency_ms: number;
}

export interface PipelineResults {
  stt: PipelineSTTResult | null;
  phoneme_alignment: PipelinePhonemeResult | null;
  multimodal_evaluation: PipelineMultimodalResult | null;
}

export interface EvaluationDetail {
  evaluation_id: string;
  status: EvalStatus;
  target_text: string;
  transcription: string | null;
  pipeline_results: PipelineResults | null;
  total_latency_ms: number | null;
  xp_awarded: number | null;
}

export interface HistoryAttempt {
  id: string;
  target_text: string;
  overall_score: number | null;
  phoneme_accuracy_score: number | null;
  created_at: string;
}

export interface HistoryResponse {
  attempts: HistoryAttempt[];
  total: number;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch pronunciation exercises for the given CEFR level.
 */
export async function getExercises(
  cefrLevel: CEFRLevel,
  limit = 10
): Promise<ExercisesResponse> {
  const params = new URLSearchParams({
    cefr_level: cefrLevel,
    limit: String(limit),
  });
  const result = await apiClient<{ data: ExercisesResponse }>(
    `/pronunciation/exercises?${params}`
  );
  return result.data;
}

/**
 * Generate a signed upload URL for uploading an audio recording.
 */
export async function getUploadUrl(
  exerciseId: string,
  fileName: string,
  contentType = "audio/wav"
): Promise<UploadUrlResponse> {
  const result = await apiClient<{ data: UploadUrlResponse }>(
    "/pronunciation/upload",
    {
      method: "POST",
      body: JSON.stringify({
        exercise_id: exerciseId,
        file_name: fileName,
        content_type: contentType,
      }),
    }
  );
  return result.data;
}

/**
 * Upload an audio blob directly to Supabase Storage using a signed URL.
 *
 * Falls back to a direct Supabase storage upload if the signed URL
 * approach fails.
 */
export async function uploadAudio(
  uploadUrl: string,
  storagePath: string,
  audioBlob: Blob,
  contentType = "audio/wav"
): Promise<void> {
  try {
    // Try the signed upload URL first
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: audioBlob,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
  } catch {
    // Fallback: upload directly via Supabase client
    const { error } = await supabase.storage
      .from("audio")
      .upload(storagePath, audioBlob, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }
}

/**
 * Start a pronunciation evaluation.
 *
 * Returns immediately with the evaluation ID; the actual evaluation
 * runs asynchronously.
 */
export async function startEvaluation(
  exerciseId: string,
  audioStoragePath: string,
  targetText: string
): Promise<EvaluateResponse> {
  const result = await apiClient<{ data: EvaluateResponse }>(
    "/pronunciation/evaluate",
    {
      method: "POST",
      body: JSON.stringify({
        exercise_id: exerciseId,
        audio_storage_path: audioStoragePath,
        target_text: targetText,
      }),
    }
  );
  return result.data;
}

/**
 * Poll for evaluation results.
 *
 * Call this periodically until `status` is "completed" or "failed".
 */
export async function getEvaluation(
  evaluationId: string
): Promise<EvaluationDetail> {
  const result = await apiClient<{ data: EvaluationDetail }>(
    `/pronunciation/evaluations/${evaluationId}`
  );
  return result.data;
}

/**
 * Poll for evaluation until completion, with exponential backoff.
 *
 * Returns the final evaluation result or throws after timeout.
 */
export async function pollEvaluation(
  evaluationId: string,
  {
    maxAttempts = 30,
    initialIntervalMs = 1000,
    maxIntervalMs = 5000,
  } = {}
): Promise<EvaluationDetail> {
  let interval = initialIntervalMs;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await getEvaluation(evaluationId);

    if (result.status === "completed" || result.status === "failed") {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
    interval = Math.min(interval * 1.5, maxIntervalMs);
  }

  throw new Error("Evaluation timed out");
}

/**
 * Fetch the user's pronunciation history with pagination.
 */
export async function getHistory(
  limit = 10,
  offset = 0
): Promise<HistoryResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  const result = await apiClient<{ data: HistoryResponse }>(
    `/pronunciation/history?${params}`
  );
  return result.data;
}
