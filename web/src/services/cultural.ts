import { apiClient } from "./api";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CulturalNotePreview {
  id: string;
  cefr_level: CEFRLevel;
  title_es: string;
  title_fr: string;
  category: string;
  preview_es: string;
  vocabulary_count: number;
  reviewed: boolean;
}

export interface CulturalNoteListResponse {
  notes: CulturalNotePreview[];
  total: number;
}

export interface VocabularyRef {
  id: string;
  french_text: string;
  spanish_translation: string;
  in_user_review_queue: boolean;
}

export interface CulturalNoteDetail {
  id: string;
  cefr_level: CEFRLevel;
  title_es: string;
  title_fr: string;
  content_fr: string;
  content_es: string;
  vocabulary: VocabularyRef[];
  category: string;
  is_generated: boolean;
  reviewed: boolean;
  created_at: string;
}

export interface AddVocabularyResponse {
  vocabulary_item_id: string;
  added_to_review: boolean;
  first_review_date: string;
}

export interface GenerateRequest {
  cefr_level: CEFRLevel;
  category: string;
  topic_hint?: string;
  align_with_vocabulary?: string[];
}

export interface GenerateResponse {
  generation_id: string;
  status: string;
  ai_platform: string;
  estimated_completion_seconds: number;
}

// ---------------------------------------------------------------------------
// Cultural category metadata
// ---------------------------------------------------------------------------

export type CulturalCategory =
  | "history"
  | "neighborhoods"
  | "etiquette"
  | "cuisine"
  | "daily_life";

export const CULTURAL_CATEGORIES: {
  key: CulturalCategory;
  labelEs: string;
  icon: string;
}[] = [
  { key: "history", labelEs: "Historia", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { key: "neighborhoods", labelEs: "Barrios", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { key: "etiquette", labelEs: "Etiqueta", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { key: "cuisine", labelEs: "Gastronomia", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" },
  { key: "daily_life", labelEs: "Vida cotidiana", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
];

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of cultural notes, filtered by CEFR level and optional category.
 */
export async function getCulturalNotes(params: {
  cefr_level: CEFRLevel;
  category?: CulturalCategory;
  limit?: number;
  offset?: number;
}): Promise<{ data: CulturalNoteListResponse }> {
  const query = new URLSearchParams();
  query.set("cefr_level", params.cefr_level);
  if (params.category) query.set("category", params.category);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return apiClient(`/cultural/notes?${query}`);
}

/**
 * Fetch the full content of a cultural note by ID.
 */
export async function getCulturalNote(
  id: string,
): Promise<{ data: CulturalNoteDetail }> {
  return apiClient(`/cultural/notes/${id}`);
}

/**
 * Add a vocabulary item from a cultural note to the user's SRS review queue.
 */
export async function addVocabularyFromNote(
  noteId: string,
  vocabId: string,
): Promise<{ data: AddVocabularyResponse }> {
  return apiClient(`/cultural/notes/${noteId}/vocabulary/${vocabId}/add`, {
    method: "POST",
  });
}

/**
 * Trigger asynchronous generation of a new cultural note.
 */
export async function generateCulturalContent(
  params: GenerateRequest,
): Promise<{ data: GenerateResponse }> {
  return apiClient("/cultural/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
