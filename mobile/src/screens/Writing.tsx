/**
 * Mobile Writing screen -- Simplified writing practice for React Native.
 *
 * Features:
 * - CEFR level selector
 * - Prompt selection
 * - Text input with word count
 * - Accent character buttons
 * - Submit + polling for evaluation
 * - Score display with feedback
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useIntl } from "react-intl";
import { apiClient } from "../services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WritingPrompt {
  id: string;
  title: string;
  prompt_fr: string;
  prompt_es: string;
  min_words: number;
  max_words: number;
}

interface PromptsResponse {
  cefr_level: string;
  prompts: WritingPrompt[];
}

interface SubmitResponse {
  evaluation_id: string;
  status: string;
  message: string;
}

interface EvaluationResult {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  cefr_level: string;
  prompt_text: string;
  submitted_text: string;
  grammar_score: number | null;
  vocabulary_score: number | null;
  coherence_score: number | null;
  task_completion_score: number | null;
  overall_cefr_score: string | null;
  feedback_es: string | null;
  created_at: string;
  completed_at: string | null;
}

type ScreenView = "prompts" | "editor" | "evaluating" | "result";
type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

// French accent characters
const ACCENT_CHARS = [
  "\u00e9", "\u00e8", "\u00ea", "\u00eb", "\u00e7",
  "\u00e0", "\u00f9", "\u00fb", "\u00ee", "\u00f4",
];

// ---------------------------------------------------------------------------
// Score bar sub-component
// ---------------------------------------------------------------------------

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const pct = score != null ? Math.round(score * 100) : 0;
  const barColor =
    score != null && score >= 0.6
      ? "#2563EB"
      : score != null && score >= 0.4
        ? "#F59E0B"
        : "#EF4444";

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={styles.scoreBarValue}>
          {score != null ? `${pct}%` : "N/A"}
        </Text>
      </View>
      <View style={styles.scoreBarBg}>
        <View
          style={[
            styles.scoreBarFill,
            {
              width: `${pct}%`,
              backgroundColor: score != null ? barColor : "#E5E7EB",
            },
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function WritingScreen() {
  const intl = useIntl();

  // Core state
  const [view, setView] = useState<ScreenView>("prompts");
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("A1");

  // Prompts
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(null);

  // Editor
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Submission / evaluation
  const [submitting, setSubmitting] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<string>("pending");
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // Word count
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  // ---- Load prompts ----
  useEffect(() => {
    async function load() {
      setPromptsLoading(true);
      setError(null);
      try {
        const result = await apiClient<{ data: PromptsResponse }>(
          `/writing/prompts?cefr_level=${cefrLevel}`
        );
        setPrompts(result.data.prompts);
      } catch {
        setError("Error al cargar las consignas.");
        setPrompts([]);
      } finally {
        setPromptsLoading(false);
      }
    }
    load();
  }, [cefrLevel]);

  // ---- Insert accent character ----
  const handleInsertAccent = useCallback(
    (char: string) => {
      setText((prev) => prev + char);
      inputRef.current?.focus();
    },
    []
  );

  // ---- Select prompt ----
  const handleSelectPrompt = useCallback((prompt: WritingPrompt) => {
    setSelectedPrompt(prompt);
    setText("");
    setEvaluationResult(null);
    setError(null);
    setView("editor");
  }, []);

  // ---- Submit writing ----
  const handleSubmit = useCallback(async () => {
    if (!selectedPrompt || !text.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setView("evaluating");
    setEvaluationStatus("pending");

    try {
      // Submit
      const submitResult = await apiClient<{ data: SubmitResponse }>(
        "/writing/submit",
        {
          method: "POST",
          body: JSON.stringify({
            prompt_id: selectedPrompt.id,
            prompt_text: selectedPrompt.prompt_fr,
            submitted_text: text,
            cefr_level: cefrLevel,
          }),
        }
      );

      const evalId = submitResult.data.evaluation_id;

      // Poll for completion
      let delay = 2000;
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, delay));
        delay = Math.min(delay * 1.5, 8000);

        const pollResult = await apiClient<{ data: EvaluationResult }>(
          `/writing/evaluations/${evalId}`
        );

        setEvaluationStatus(pollResult.data.status);

        if (pollResult.data.status === "completed") {
          setEvaluationResult(pollResult.data);
          setView("result");
          return;
        }

        if (pollResult.data.status === "failed") {
          setError(
            pollResult.data.feedback_es ?? "La evaluacion ha fallado."
          );
          setView("editor");
          return;
        }
      }

      setError("Se agoto el tiempo de espera.");
      setView("editor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error durante la evaluacion.");
      setView("editor");
    } finally {
      setSubmitting(false);
    }
  }, [selectedPrompt, text, cefrLevel, submitting]);

  // ---- Reset ----
  const handleNewWriting = useCallback(() => {
    setSelectedPrompt(null);
    setText("");
    setEvaluationResult(null);
    setError(null);
    setView("prompts");
  }, []);

  // ======== Evaluating view ========
  if (view === "evaluating") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          {evaluationStatus === "processing"
            ? "Evaluando tu escritura..."
            : "Enviando para evaluacion..."}
        </Text>
        <Text style={styles.loadingSubtext}>
          Esto puede tomar 30-60 segundos
        </Text>
      </View>
    );
  }

  // ======== Result view ========
  if (view === "result" && evaluationResult) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Escritura evaluada</Text>
        <Text style={styles.pageSubtitle}>{selectedPrompt?.title}</Text>

        {/* CEFR badge */}
        {evaluationResult.overall_cefr_score && (
          <View style={styles.cefrBadge}>
            <Text style={styles.cefrBadgeText}>
              {evaluationResult.overall_cefr_score}
            </Text>
          </View>
        )}

        {/* Scores */}
        <View style={styles.evalCard}>
          <Text style={styles.evalCardTitle}>Puntuaciones</Text>
          <View style={styles.evalScores}>
            <ScoreBar label="Gramatica" score={evaluationResult.grammar_score} />
            <ScoreBar label="Vocabulario" score={evaluationResult.vocabulary_score} />
            <ScoreBar label="Coherencia" score={evaluationResult.coherence_score} />
            <ScoreBar label="Tarea" score={evaluationResult.task_completion_score} />
          </View>

          {evaluationResult.feedback_es && (
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackTitle}>Retroalimentacion</Text>
              <Text style={styles.feedbackText}>
                {evaluationResult.feedback_es}
              </Text>
            </View>
          )}

          <Pressable
            style={styles.primaryButton}
            onPress={handleNewWriting}
            accessibilityRole="button"
            accessibilityLabel="Nueva escritura"
          >
            <Text style={styles.primaryButtonText}>Nueva escritura</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ======== Editor view ========
  if (view === "editor" && selectedPrompt) {
    const minW = selectedPrompt.min_words;
    const maxW = selectedPrompt.max_words;
    const canSubmitNow = wordCount >= minW && wordCount <= maxW + 50;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageTitle}>{selectedPrompt.title}</Text>
        <Text style={styles.pageSubtitle}>Nivel {cefrLevel}</Text>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Prompt */}
        <View style={styles.promptCard}>
          <Text style={styles.promptLabel}>Consigna:</Text>
          <Text style={styles.promptText}>{selectedPrompt.prompt_fr}</Text>
          <Text style={styles.promptTranslation}>{selectedPrompt.prompt_es}</Text>
        </View>

        {/* Accent buttons */}
        <View style={styles.accentToolbar}>
          {ACCENT_CHARS.map((char) => (
            <Pressable
              key={char}
              style={styles.accentButton}
              onPress={() => handleInsertAccent(char)}
              accessibilityLabel={`Insertar ${char}`}
            >
              <Text style={styles.accentButtonText}>{char}</Text>
            </Pressable>
          ))}
        </View>

        {/* Text input */}
        <TextInput
          ref={inputRef}
          style={styles.textArea}
          value={text}
          onChangeText={setText}
          placeholder={`Ecris en francais... (min ${minW} mots)`}
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          autoCorrect={false}
        />

        {/* Word count */}
        <View style={styles.counterRow}>
          <Text
            style={[
              styles.counterText,
              wordCount >= minW && wordCount <= maxW
                ? styles.counterGreen
                : wordCount > maxW
                  ? styles.counterRed
                  : styles.counterGray,
            ]}
          >
            {wordCount} palabras (min {minW}, max {maxW})
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <Pressable
            style={styles.secondaryButton}
            onPress={handleNewWriting}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Cambiar consigna</Text>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              (!canSubmitNow || submitting) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmitNow || submitting}
            accessibilityRole="button"
            accessibilityLabel="Enviar para evaluacion"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Enviar</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ======== Prompt selection view ========
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>Escritura</Text>
      <Text style={styles.pageSubtitle}>
        Practica la escritura en frances y recibe evaluacion con IA
      </Text>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* CEFR level selector */}
      <View style={styles.cefrSelector}>
        {CEFR_LEVELS.map((level) => (
          <Pressable
            key={level}
            style={[
              styles.cefrButton,
              cefrLevel === level && styles.cefrButtonActive,
            ]}
            onPress={() => setCefrLevel(level)}
            accessibilityRole="button"
            accessibilityLabel={`Nivel ${level}`}
            accessibilityState={{ selected: cefrLevel === level }}
          >
            <Text
              style={[
                styles.cefrButtonText,
                cefrLevel === level && styles.cefrButtonTextActive,
              ]}
            >
              {level}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Prompts list */}
      {promptsLoading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 32 }} />
      ) : prompts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No hay consignas para el nivel {cefrLevel}.
          </Text>
        </View>
      ) : (
        <View style={styles.promptsList}>
          {prompts.map((prompt) => (
            <Pressable
              key={prompt.id}
              style={styles.promptCard}
              onPress={() => handleSelectPrompt(prompt)}
              accessibilityRole="button"
              accessibilityLabel={prompt.title}
            >
              <View style={styles.promptCardHeader}>
                <Text style={styles.promptCardTitle}>{prompt.title}</Text>
                <View style={styles.wordRangeBadge}>
                  <Text style={styles.wordRangeText}>
                    {prompt.min_words}-{prompt.max_words} mots
                  </Text>
                </View>
              </View>
              <Text
                style={styles.promptCardDescription}
                numberOfLines={2}
              >
                {prompt.prompt_es}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 24,
  },

  // Page header
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },

  // CEFR selector
  cefrSelector: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
  },
  cefrButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  cefrButtonActive: {
    backgroundColor: "#2563EB",
  },
  cefrButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  cefrButtonTextActive: {
    color: "#FFFFFF",
  },

  // Prompts list
  promptsList: {
    gap: 12,
  },

  // Prompt card
  promptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
  },
  promptCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  promptCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  promptCardDescription: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  wordRangeBadge: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  wordRangeText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Prompt display in editor
  promptLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 4,
  },
  promptText: {
    fontSize: 14,
    color: "#1E3A8A",
    lineHeight: 20,
  },
  promptTranslation: {
    fontSize: 12,
    color: "#60A5FA",
    marginTop: 6,
  },

  // Accent toolbar
  accentToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
    marginTop: 12,
  },
  accentButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  accentButtonText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },

  // Text area
  textArea: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    minHeight: 180,
    textAlignVertical: "top",
  },

  // Counters
  counterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 6,
    marginBottom: 16,
  },
  counterText: {
    fontSize: 12,
  },
  counterGreen: {
    color: "#16A34A",
  },
  counterRed: {
    color: "#DC2626",
  },
  counterGray: {
    color: "#9CA3AF",
  },

  // Buttons
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 15,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Evaluation
  evalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    marginTop: 16,
  },
  evalCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  evalScores: {
    gap: 16,
    marginBottom: 20,
  },
  scoreBarContainer: {
    marginBottom: 4,
  },
  scoreBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  scoreBarLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  scoreBarValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  scoreBarBg: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: 8,
    borderRadius: 4,
  },

  // CEFR badge
  cefrBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
  },
  cefrBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E40AF",
  },

  // Feedback
  feedbackContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  feedbackTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
  },

  // Error
  errorBanner: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: "#991B1B",
  },

  // Loading
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "500",
    color: "#374151",
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#9CA3AF",
  },

  // Empty state
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 32,
    alignItems: "center",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
