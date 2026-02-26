/**
 * Conversation API service layer.
 *
 * Provides typed functions for interacting with the conversation practice
 * endpoints: creating sessions, sending messages, ending sessions, and
 * fetching evaluation results.
 */

import { apiClient } from "./api";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationScenario {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: string;
}

export interface ConversationMessageData {
  role: "user" | "assistant";
  content: string;
  corrections: CorrectionData[];
  has_spanish_fallback: boolean;
  timestamp: string;
}

export interface CorrectionData {
  original: string;
  corrected: string;
  explanation: string;
}

export interface StartSessionResponse {
  session_id: string;
  scenario_title: string;
  cefr_level: CEFRLevel;
  greeting: string;
  messages: ConversationMessageData[];
}

export interface MessageResponseData {
  role: "assistant";
  content: string;
  corrections: CorrectionData[];
  has_spanish_fallback: boolean;
}

export interface EndSessionResponseData {
  session_id: string;
  status: string;
  message_count: number;
  evaluation_pending: boolean;
}

export interface EvaluationData {
  session_id: string;
  vocabulary_score: number | null;
  grammar_score: number | null;
  communicative_score: number | null;
  feedback_es: string;
  status: string;
}

export interface ScenariosResponse {
  scenarios: ConversationScenario[];
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Fetch the list of predefined conversation scenarios.
 */
export async function getScenarios(): Promise<ScenariosResponse> {
  const result = await apiClient<{ data: ScenariosResponse }>(
    "/conversation/scenarios"
  );
  return result.data;
}

/**
 * Start a new conversation session with the given scenario and CEFR level.
 */
export async function startSession(
  cefrLevel: CEFRLevel,
  scenario: string
): Promise<StartSessionResponse> {
  const result = await apiClient<{ data: StartSessionResponse }>(
    "/conversation/sessions",
    {
      method: "POST",
      body: JSON.stringify({
        cefr_level: cefrLevel,
        scenario,
      }),
    }
  );
  return result.data;
}

/**
 * Send a message in an active conversation session and receive the AI response.
 */
export async function sendMessage(
  sessionId: string,
  content: string
): Promise<MessageResponseData> {
  const result = await apiClient<{ data: MessageResponseData }>(
    `/conversation/sessions/${sessionId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
  return result.data;
}

/**
 * End a conversation session and trigger evaluation.
 */
export async function endSession(
  sessionId: string
): Promise<EndSessionResponseData> {
  const result = await apiClient<{ data: EndSessionResponseData }>(
    `/conversation/sessions/${sessionId}/end`,
    { method: "POST" }
  );
  return result.data;
}

/**
 * Retrieve evaluation results for a completed conversation session.
 */
export async function getEvaluation(
  sessionId: string
): Promise<EvaluationData> {
  const result = await apiClient<{ data: EvaluationData }>(
    `/conversation/sessions/${sessionId}/evaluation`
  );
  return result.data;
}
