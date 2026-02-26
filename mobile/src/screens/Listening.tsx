/**
 * Mobile Listening Comprehension screen (simplified).
 *
 * A streamlined version of the web listening module adapted for
 * React Native. Includes exercise list, audio controls, comprehension
 * questions, and result summary.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useIntl } from "react-intl";
import { apiClient } from "../services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ListeningExerciseSummary {
  id: string;
  title_es: string;
  title_fr: string;
  description_es: string | null;
  cefr_level: string;
  order_index: number;
  duration_seconds: number | null;
  question_count: number;
}

interface AudioSegment {
  id: string;
  start: number;
  end: number;
  text_fr: string;
  speaker: string | null;
}

interface ComprehensionQuestion {
  id: string;
  question_fr: string;
  question_es: string;
  options: string[];
  order_index: number;
  difficulty_tier: number;
}

interface ListeningExerciseDetail {
  id: string;
  title_es: string;
  title_fr: string;
  description_es: string | null;
  cefr_level: string;
  order_index: number;
  audio_url: string;
  duration_seconds: number | null;
  segments: AudioSegment[];
  questions: ComprehensionQuestion[];
}

interface QuestionFeedback {
  question_id: string;
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  explanation_es: string;
}

interface MasteryUpdateData {
  skill: string;
  new_mastery_percentage: number;
}

interface SubmitAnswersResponse {
  score: number;
  correct_count: number;
  total_count: number;
  feedback: QuestionFeedback[];
  xp_awarded: number;
  mastery_update: MasteryUpdateData | null;
}

interface TranscriptData {
  exercise_id: string;
  dialogue_text_fr: string;
  dialogue_text_es: string;
  segments: AudioSegment[];
}

type ScreenView = "list" | "player" | "summary";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QuestionCard({
  question,
  index,
  selectedAnswer,
  feedback,
  onSelect,
  disabled,
}: {
  question: ComprehensionQuestion;
  index: number;
  selectedAnswer: string | null;
  feedback: QuestionFeedback | null;
  onSelect: (questionId: string, answer: string) => void;
  disabled: boolean;
}) {
  const [showExplanation, setShowExplanation] = useState(false);
  const isAnswered = feedback != null;

  return (
    <View
      style={[
        styles.questionCard,
        isAnswered && feedback.correct && styles.questionCardCorrect,
        isAnswered && !feedback.correct && styles.questionCardIncorrect,
      ]}
    >
      {/* Question header */}
      <View style={styles.questionHeader}>
        <View
          style={[
            styles.questionNumber,
            isAnswered &&
              (feedback.correct
                ? styles.questionNumberCorrect
                : styles.questionNumberIncorrect),
          ]}
        >
          <Text
            style={[
              styles.questionNumberText,
              isAnswered &&
                (feedback.correct
                  ? styles.questionNumberTextCorrect
                  : styles.questionNumberTextIncorrect),
            ]}
          >
            {index + 1}
          </Text>
        </View>
        <View style={styles.questionTextContainer}>
          <Text style={styles.questionTextFr}>{question.question_fr}</Text>
          <Text style={styles.questionTextEs}>{question.question_es}</Text>
        </View>
      </View>

      {/* Options */}
      <View style={styles.optionsList}>
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option;
          const isCorrectOption =
            isAnswered && option === feedback.correct_answer;
          const isWrongSelection =
            isAnswered && isSelected && !feedback.correct;

          return (
            <Pressable
              key={option}
              style={[
                styles.optionButton,
                isSelected && !isAnswered && styles.optionSelected,
                isCorrectOption && styles.optionCorrect,
                isWrongSelection && styles.optionWrong,
                isAnswered &&
                  !isCorrectOption &&
                  !isWrongSelection &&
                  styles.optionDisabled,
              ]}
              onPress={() => !disabled && !isAnswered && onSelect(question.id, option)}
              disabled={disabled || isAnswered}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={option}
            >
              <View
                style={[
                  styles.optionRadio,
                  isSelected && !isAnswered && styles.optionRadioSelected,
                  isCorrectOption && styles.optionRadioCorrect,
                  isWrongSelection && styles.optionRadioWrong,
                ]}
              >
                {(isSelected || isCorrectOption) && (
                  <View
                    style={[
                      styles.optionRadioDot,
                      isCorrectOption && styles.optionRadioDotCorrect,
                      isWrongSelection && styles.optionRadioDotWrong,
                      isSelected &&
                        !isAnswered &&
                        styles.optionRadioDotSelected,
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.optionText,
                  isAnswered &&
                    !isCorrectOption &&
                    !isWrongSelection &&
                    styles.optionTextDisabled,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Feedback */}
      {isAnswered && (
        <View
          style={[
            styles.feedbackContainer,
            feedback.correct
              ? styles.feedbackCorrect
              : styles.feedbackIncorrect,
          ]}
        >
          <Text
            style={
              feedback.correct
                ? styles.feedbackTextCorrect
                : styles.feedbackTextIncorrect
            }
          >
            {feedback.correct ? "Correcto!" : "Incorrecto"}
          </Text>

          {!feedback.correct && !showExplanation && (
            <Pressable
              onPress={() => setShowExplanation(true)}
              accessibilityRole="button"
              accessibilityLabel="Ver explicacion"
            >
              <Text style={styles.showExplanationLink}>
                Ver explicacion
              </Text>
            </Pressable>
          )}

          {!feedback.correct && showExplanation && (
            <Text style={styles.explanationText}>
              {feedback.explanation_es}
            </Text>
          )}

          {feedback.correct && feedback.explanation_es && (
            <Text style={styles.explanationTextCorrect}>
              {feedback.explanation_es}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const barColor = pct >= 60 ? "#16A34A" : pct >= 40 ? "#F59E0B" : "#DC2626";

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text style={styles.scoreBarValue}>
          {value}/{max} ({pct}%)
        </Text>
      </View>
      <View style={styles.scoreBarBg}>
        <View
          style={[
            styles.scoreBarFill,
            { width: `${pct}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function ListeningScreen() {
  const intl = useIntl();

  // View state
  const [view, setView] = useState<ScreenView>("list");

  // List state
  const [exercises, setExercises] = useState<ListeningExerciseSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Player state
  const [exerciseDetail, setExerciseDetail] =
    useState<ListeningExerciseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Answers
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] =
    useState<SubmitAnswersResponse | null>(null);

  // Transcript
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ---- Load exercises ----
  useEffect(() => {
    async function load() {
      setListLoading(true);
      try {
        const result = await apiClient<{
          data: { exercises: ListeningExerciseSummary[]; total: number };
        }>("/listening/exercises?cefr_level=A1");
        setExercises(result.data.exercises);
      } catch {
        setError("Error al cargar ejercicios");
        setExercises([]);
      } finally {
        setListLoading(false);
      }
    }
    load();
  }, []);

  // ---- Select exercise ----
  const handleSelectExercise = useCallback(
    async (exercise: ListeningExerciseSummary) => {
      setDetailLoading(true);
      setError(null);
      setSelectedAnswers({});
      setSubmitResult(null);
      setTranscript(null);
      setShowTranscript(false);

      try {
        const result = await apiClient<{ data: ListeningExerciseDetail }>(
          `/listening/exercises/${exercise.id}`
        );
        setExerciseDetail(result.data);
        setView("player");
      } catch {
        setError("Error al cargar el ejercicio");
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  // ---- Answer selection ----
  const handleAnswer = useCallback(
    (questionId: string, answer: string) => {
      setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));
    },
    []
  );

  // ---- Submit answers ----
  const handleSubmit = useCallback(async () => {
    if (!exerciseDetail) return;

    const answers = Object.entries(selectedAnswers).map(
      ([question_id, answer]) => ({ question_id, answer })
    );
    if (answers.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await apiClient<{ data: SubmitAnswersResponse }>(
        `/listening/exercises/${exerciseDetail.id}/submit`,
        {
          method: "POST",
          body: JSON.stringify({ answers }),
        }
      );
      setSubmitResult(result.data);
      setView("summary");
    } catch {
      setError("Error al enviar respuestas");
    } finally {
      setSubmitting(false);
    }
  }, [exerciseDetail, selectedAnswers]);

  // ---- Toggle transcript ----
  const handleToggleTranscript = useCallback(async () => {
    if (!exerciseDetail) return;

    if (transcript) {
      setShowTranscript((prev) => !prev);
      return;
    }

    setTranscriptLoading(true);
    try {
      const result = await apiClient<{ data: TranscriptData }>(
        `/listening/exercises/${exerciseDetail.id}/transcript`,
        { method: "POST" }
      );
      setTranscript(result.data);
      setShowTranscript(true);
    } catch {
      setError("Error al cargar la transcripcion");
    } finally {
      setTranscriptLoading(false);
    }
  }, [exerciseDetail, transcript]);

  // ---- Reset ----
  const handleBackToList = useCallback(() => {
    setView("list");
    setExerciseDetail(null);
    setSelectedAnswers({});
    setSubmitResult(null);
    setTranscript(null);
    setShowTranscript(false);
    setError(null);
  }, []);

  // Build feedback lookup
  const feedbackMap: Record<string, QuestionFeedback> = {};
  if (submitResult) {
    for (const fb of submitResult.feedback) {
      feedbackMap[fb.question_id] = fb;
    }
  }

  const totalQuestions = exerciseDetail?.questions.length ?? 0;
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === totalQuestions && totalQuestions > 0;

  // ======== Summary view ========
  if (view === "summary" && submitResult && exerciseDetail) {
    const pct = Math.round(submitResult.score * 100);

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          style={styles.backButton}
          onPress={handleBackToList}
          accessibilityRole="button"
          accessibilityLabel="Volver a ejercicios"
        >
          <Text style={styles.backButtonText}>Volver a ejercicios</Text>
        </Pressable>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Resultado</Text>
          <Text style={styles.summarySubtitle}>
            {exerciseDetail.title_fr}
          </Text>

          {/* Score */}
          <Text
            style={[
              styles.summaryScore,
              pct >= 50
                ? styles.summaryScorePass
                : styles.summaryScoreFail,
            ]}
          >
            {pct}%
          </Text>
          <Text style={styles.summaryDetail}>
            {submitResult.correct_count} de {submitResult.total_count}{" "}
            correctas
          </Text>

          <ScoreBar
            label="Puntaje"
            value={submitResult.correct_count}
            max={submitResult.total_count}
          />

          {/* XP */}
          {submitResult.xp_awarded > 0 && (
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>
                +{submitResult.xp_awarded} XP
              </Text>
            </View>
          )}

          {/* Mastery */}
          {submitResult.mastery_update && (
            <View style={styles.masteryBadge}>
              <Text style={styles.masteryBadgeText}>
                Dominio de escucha:{" "}
                {submitResult.mastery_update.new_mastery_percentage}%
              </Text>
            </View>
          )}

          {/* Per-question results */}
          <Text style={styles.detailTitle}>Detalle:</Text>
          {submitResult.feedback.map((fb, idx) => (
            <View
              key={fb.question_id}
              style={[
                styles.feedbackRow,
                fb.correct
                  ? styles.feedbackRowCorrect
                  : styles.feedbackRowIncorrect,
              ]}
            >
              <View style={styles.feedbackRowHeader}>
                <View
                  style={[
                    styles.feedbackDot,
                    fb.correct
                      ? styles.feedbackDotCorrect
                      : styles.feedbackDotIncorrect,
                  ]}
                >
                  <Text style={styles.feedbackDotText}>{idx + 1}</Text>
                </View>
                <Text
                  style={
                    fb.correct
                      ? styles.feedbackLabelCorrect
                      : styles.feedbackLabelIncorrect
                  }
                >
                  {fb.correct ? "Correcto" : "Incorrecto"}
                </Text>
              </View>
              {!fb.correct && (
                <View style={styles.feedbackDetails}>
                  <Text style={styles.feedbackDetailText}>
                    Tu respuesta: {fb.user_answer}
                  </Text>
                  <Text style={styles.feedbackDetailText}>
                    Correcta: {fb.correct_answer}
                  </Text>
                  <Text style={styles.feedbackExplanation}>
                    {fb.explanation_es}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {/* New exercise button */}
          <Pressable
            style={styles.primaryButton}
            onPress={handleBackToList}
            accessibilityRole="button"
            accessibilityLabel="Volver a la lista"
          >
            <Text style={styles.primaryButtonText}>
              Volver a la lista
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ======== Player view ========
  if (view === "player" && exerciseDetail) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back button */}
        <Pressable
          style={styles.backButton}
          onPress={handleBackToList}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.playerHeader}>
          <Text style={styles.playerTitle}>
            {exerciseDetail.title_fr}
          </Text>
          <Text style={styles.playerSubtitle}>
            {exerciseDetail.title_es}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>
              {exerciseDetail.cefr_level}
            </Text>
          </View>
        </View>

        {/* Audio placeholder (simplified for mobile) */}
        <View style={styles.audioPlaceholder}>
          <Text style={styles.audioPlaceholderIcon}>
            {">>"}
          </Text>
          <Text style={styles.audioPlaceholderText}>
            Reproduce el audio para comenzar
          </Text>
          {exerciseDetail.duration_seconds && (
            <Text style={styles.audioPlaceholderDuration}>
              Duracion: {formatDuration(exerciseDetail.duration_seconds)}
            </Text>
          )}
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Transcript toggle */}
        <Pressable
          style={styles.transcriptToggle}
          onPress={handleToggleTranscript}
          disabled={transcriptLoading}
          accessibilityRole="button"
          accessibilityLabel={
            showTranscript
              ? "Ocultar transcripcion"
              : "Mostrar transcripcion"
          }
        >
          {transcriptLoading ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text style={styles.transcriptToggleText}>
              {showTranscript
                ? "Ocultar transcripcion"
                : "Mostrar transcripcion"}
            </Text>
          )}
        </Pressable>

        {/* Transcript */}
        {showTranscript && transcript && (
          <View style={styles.transcriptContainer}>
            <Text style={styles.transcriptLabel}>
              Transcripcion (Frances)
            </Text>
            <Text style={styles.transcriptText}>
              {transcript.dialogue_text_fr}
            </Text>
            <View style={styles.transcriptDivider} />
            <Text style={styles.transcriptLabel}>
              Traduccion (Espanol)
            </Text>
            <Text style={styles.transcriptTextEs}>
              {transcript.dialogue_text_es}
            </Text>
          </View>
        )}

        {/* Questions */}
        <Text style={styles.questionsTitle}>
          Preguntas de comprension ({answeredCount}/{totalQuestions})
        </Text>

        {exerciseDetail.questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={idx}
            selectedAnswer={selectedAnswers[q.id] ?? null}
            feedback={feedbackMap[q.id] ?? null}
            onSelect={handleAnswer}
            disabled={submitting || submitResult != null}
          />
        ))}

        {/* Submit */}
        {!submitResult && (
          <Pressable
            style={[
              styles.primaryButton,
              (!allAnswered || submitting) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!allAnswered || submitting}
            accessibilityRole="button"
            accessibilityLabel="Enviar respuestas"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {allAnswered
                  ? "Enviar respuestas"
                  : `Responde las ${totalQuestions} preguntas`}
              </Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    );
  }

  // ======== List view ========
  if (detailLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando ejercicio...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={styles.pageTitle}>Comprension auditiva</Text>
      <Text style={styles.pageSubtitle}>
        Mejora tu escucha con situaciones reales
      </Text>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {listLoading ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 32 }}
        />
      ) : exercises.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No hay ejercicios disponibles.
          </Text>
        </View>
      ) : (
        <View style={styles.exerciseList}>
          {exercises.map((exercise) => (
            <Pressable
              key={exercise.id}
              style={styles.exerciseCard}
              onPress={() => handleSelectExercise(exercise)}
              accessibilityRole="button"
              accessibilityLabel={exercise.title_fr}
            >
              <View style={styles.exerciseCardHeader}>
                <Text
                  style={styles.exerciseCardTitle}
                  numberOfLines={2}
                >
                  {exercise.title_fr}
                </Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>
                    {exercise.cefr_level}
                  </Text>
                </View>
              </View>

              <Text style={styles.exerciseCardSubtitle}>
                {exercise.title_es}
              </Text>

              {exercise.description_es && (
                <Text
                  style={styles.exerciseCardDescription}
                  numberOfLines={2}
                >
                  {exercise.description_es}
                </Text>
              )}

              <View style={styles.exerciseCardMeta}>
                <Text style={styles.exerciseCardMetaText}>
                  {formatDuration(exercise.duration_seconds)}
                </Text>
                <Text style={styles.exerciseCardMetaText}>
                  {exercise.question_count} preguntas
                </Text>
              </View>
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
    paddingBottom: 40,
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
    marginBottom: 24,
  },

  // Exercise list
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  exerciseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  exerciseCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  exerciseCardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  exerciseCardDescription: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
    lineHeight: 17,
  },
  exerciseCardMeta: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
  },
  exerciseCardMetaText: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  levelBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },

  // Player
  playerHeader: {
    marginBottom: 16,
  },
  playerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  playerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  audioPlaceholder: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  audioPlaceholderIcon: {
    fontSize: 24,
    color: "#2563EB",
    marginBottom: 8,
  },
  audioPlaceholderText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  audioPlaceholderDuration: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },

  // Back button
  backButton: {
    paddingVertical: 8,
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },

  // Transcript
  transcriptToggle: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  transcriptToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  transcriptContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  transcriptLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  transcriptText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 20,
  },
  transcriptTextEs: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  transcriptDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },

  // Questions
  questionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  questionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
  },
  questionCardCorrect: {
    borderColor: "#BBF7D0",
  },
  questionCardIncorrect: {
    borderColor: "#FECACA",
  },
  questionHeader: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  questionNumberCorrect: {
    backgroundColor: "#DCFCE7",
  },
  questionNumberIncorrect: {
    backgroundColor: "#FEE2E2",
  },
  questionNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E40AF",
  },
  questionNumberTextCorrect: {
    color: "#166534",
  },
  questionNumberTextIncorrect: {
    color: "#991B1B",
  },
  questionTextContainer: {
    flex: 1,
  },
  questionTextFr: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 2,
  },
  questionTextEs: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  // Options
  optionsList: {
    gap: 8,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionSelected: {
    borderColor: "#60A5FA",
    backgroundColor: "#EFF6FF",
  },
  optionCorrect: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },
  optionWrong: {
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  optionDisabled: {
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    opacity: 0.6,
  },
  optionRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  optionRadioSelected: {
    borderColor: "#2563EB",
  },
  optionRadioCorrect: {
    borderColor: "#16A34A",
  },
  optionRadioWrong: {
    borderColor: "#DC2626",
  },
  optionRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D1D5DB",
  },
  optionRadioDotSelected: {
    backgroundColor: "#2563EB",
  },
  optionRadioDotCorrect: {
    backgroundColor: "#16A34A",
  },
  optionRadioDotWrong: {
    backgroundColor: "#DC2626",
  },
  optionText: {
    fontSize: 14,
    color: "#111827",
    flex: 1,
  },
  optionTextDisabled: {
    color: "#9CA3AF",
  },

  // Feedback
  feedbackContainer: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  feedbackCorrect: {
    backgroundColor: "#F0FDF4",
  },
  feedbackIncorrect: {
    backgroundColor: "#FEF2F2",
  },
  feedbackTextCorrect: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },
  feedbackTextIncorrect: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
  },
  showExplanationLink: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
    textDecorationLine: "underline",
    marginTop: 4,
  },
  explanationText: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
    marginTop: 6,
  },
  explanationTextCorrect: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 18,
    marginTop: 4,
  },

  // Primary button
  primaryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  // Summary
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  summarySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  summaryScore: {
    fontSize: 48,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  summaryScorePass: {
    color: "#16A34A",
  },
  summaryScoreFail: {
    color: "#DC2626",
  },
  summaryDetail: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  xpBadge: {
    backgroundColor: "#FFFBEB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 12,
  },
  xpBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
  },
  masteryBadge: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 8,
  },
  masteryBadgeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1E40AF",
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  feedbackRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  feedbackRowCorrect: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  feedbackRowIncorrect: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  feedbackRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  feedbackDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackDotCorrect: {
    backgroundColor: "#DCFCE7",
  },
  feedbackDotIncorrect: {
    backgroundColor: "#FEE2E2",
  },
  feedbackDotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
  },
  feedbackLabelCorrect: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
  },
  feedbackLabelIncorrect: {
    fontSize: 13,
    fontWeight: "600",
    color: "#991B1B",
  },
  feedbackDetails: {
    marginTop: 8,
    paddingLeft: 30,
  },
  feedbackDetailText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  feedbackExplanation: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
    lineHeight: 17,
  },

  // Score bar
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

  // Empty / loading
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
});
