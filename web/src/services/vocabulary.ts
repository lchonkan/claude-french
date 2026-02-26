import { apiClient } from "./api";
import type {
  VocabularyItem,
  ReviewResponse,
  PaginatedResponse,
} from "@/types";

/**
 * Fetch a paginated list of vocabulary items, optionally filtered by CEFR level.
 */
export async function getVocabularyItems(params: {
  cefr_level?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<VocabularyItem>> {
  const query = new URLSearchParams();
  if (params.cefr_level) query.set("cefr_level", params.cefr_level);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  return apiClient(`/vocabulary/items?${query}`);
}

/**
 * Fetch the list of vocabulary items due for spaced-repetition review.
 */
export async function getReviewItems(): Promise<VocabularyItem[]> {
  return apiClient("/vocabulary/review");
}

/**
 * Submit a review rating for a vocabulary item.
 *
 * @param vocabularyItemId - The UUID of the vocabulary item.
 * @param rating - SRS quality rating: 1 (again), 2 (hard), 3 (good), 4 (easy).
 */
export async function submitReview(
  vocabularyItemId: string,
  rating: 1 | 2 | 3 | 4,
): Promise<ReviewResponse> {
  return apiClient("/vocabulary/review", {
    method: "POST",
    body: JSON.stringify({ vocabulary_item_id: vocabularyItemId, rating }),
  });
}

/**
 * Fetch vocabulary items similar to the given item (e.g. cognates, same category).
 */
export async function getSimilarItems(id: string): Promise<VocabularyItem[]> {
  return apiClient(`/vocabulary/items/${id}/similar`);
}
