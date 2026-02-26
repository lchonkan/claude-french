import { useCallback, useEffect, useState } from "react";
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

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface LessonSummary {
  id: string;
  module: string;
  cefr_level: CEFRLevel;
  title_es: string;
  title_fr: string;
  description_es: string | null;
  order_index: number;
  exercise_count: number;
}

interface LessonExerciseContent {
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
  correct_order?: string[];
  [key: string]: unknown;
}

interface LessonExerciseDetail {
  id: string;
  lesson_id: string;
  exercise_type: string;
  prompt_es: string;
  content: LessonExerciseContent;
  difficulty_tier: number;
  order_index: number;
}

interface LessonContent {
  explanation_es?: string;
  examples?: Array<{ fr: string; es: string }>;
  notes_es?: string;
  [key: string]: unknown;
}

interface LessonDetail {
  id: string;
  module: string;
  cefr_level: CEFRLevel;
  title_es: string;
  title_fr: string;
  description_es: string | null;
  content: LessonContent;
  exercises: LessonExerciseDetail[];
}

interface ExerciseSubmitResult {
  correct: boolean;
  correct_answer: string | null;
  feedback_es: string;
  xp_awarded: number;
}

interface LessonListResponse {
  lessons: LessonSummary[];
  total: number;
}

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

// ---------------------------------------------------------------------------
// CEFR level filter
// ---------------------------------------------------------------------------

function CEFRFilter({
  selected,
  onSelect,
}: {
  selected: CEFRLevel;
  onSelect: (level: CEFRLevel) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {CEFR_LEVELS.map((level) => {
        const isActive = selected === level;
        return (
          <Pressable
            key={level}
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={() => onSelect(level)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[
                styles.filterChipText,
                isActive && styles.filterChipTextActive,
              ]}
            >
              {level}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Fill blank exercise (mobile)
// ---------------------------------------------------------------------------

function FillBlankExercise({
  exercise,
  onSubmit,
  submitting,
  result,
}: {
  exercise: LessonExerciseDetail;
  onSubmit: (answer: string) => void;
  submitting: boolean;
  result: ExerciseSubmitResult | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const options = exercise.content.options ?? [];
  const hasOptions = options.length > 0;
  const isAnswered = result !== null;

  function getOptionBg(option: string) {
    if (!isAnswered) {
      return selected === option ? "#DBEAFE" : "#F9FAFB";
    }
    const isCorrectOption =
      option.toLowerCase().trim() ===
      (result?.correct_answer ?? "").toLowerCase().trim();
    if (isCorrectOption) return "#DCFCE7";
    if (selected === option && !result?.correct) return "#FEE2E2";
    return "#F3F4F6";
  }

  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.promptText}>{exercise.prompt_es}</Text>
      <Text style={styles.sentenceText}>
        {exercise.content.sentence ?? exercise.content.question ?? ""}
      </Text>

      {hasOptions ? (
        <View style={styles.optionsGrid}>
          {options.map((option) => (
            <Pressable
              key={option}
              disabled={isAnswered}
              onPress={() => setSelected(option)}
              style={[
                styles.optionButton,
                { backgroundColor: getOptionBg(option) },
                selected === option &&
                  !isAnswered && { borderColor: "#2563EB", borderWidth: 2 },
              ]}
            >
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <TextInput
          style={styles.textInput}
          value={textInput}
          onChangeText={setTextInput}
          editable={!isAnswered}
          placeholder="Escribe tu respuesta..."
          returnKeyType="done"
          onSubmitEditing={() => {
            if (textInput.trim() && !isAnswered) {
              onSubmit(textInput.trim());
            }
          }}
        />
      )}

      {!isAnswered && (
        <Pressable
          style={[
            styles.submitButton,
            (hasOptions ? !selected : !textInput.trim()) &&
              styles.submitButtonDisabled,
          ]}
          disabled={
            submitting || (hasOptions ? !selected : !textInput.trim())
          }
          onPress={() => {
            const answer = hasOptions ? selected! : textInput.trim();
            onSubmit(answer);
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Verificar</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Conjugation exercise (mobile)
// ---------------------------------------------------------------------------

function ConjugationExercise({
  exercise,
  onSubmit,
  submitting,
  result,
}: {
  exercise: LessonExerciseDetail;
  onSubmit: (forms: Record<string, string>) => void;
  submitting: boolean;
  result: ExerciseSubmitResult | null;
}) {
  const expected = exercise.content.expected ?? {};
  const pronouns = Object.keys(expected);
  const [forms, setForms] = useState<Record<string, string>>(
    Object.fromEntries(pronouns.map((p) => [p, ""])),
  );
  const isAnswered = result !== null;

  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.promptText}>{exercise.prompt_es}</Text>
      <View style={styles.verbHeader}>
        <Text style={styles.verbText}>{exercise.content.verb}</Text>
        <Text style={styles.verbTranslation}>
          {exercise.content.translation}
        </Text>
      </View>

      {pronouns.map((pronoun) => (
        <View key={pronoun} style={styles.conjugationRow}>
          <Text style={styles.pronounLabel}>{pronoun}</Text>
          <TextInput
            style={[
              styles.conjugationInput,
              isAnswered &&
                (forms[pronoun]?.trim().toLowerCase() ===
                expected[pronoun]?.trim().toLowerCase()
                  ? styles.inputCorrect
                  : styles.inputIncorrect),
            ]}
            value={forms[pronoun] ?? ""}
            onChangeText={(v) =>
              setForms((prev) => ({ ...prev, [pronoun]: v }))
            }
            editable={!isAnswered}
            placeholder="..."
            autoCapitalize="none"
          />
          {isAnswered &&
            forms[pronoun]?.trim().toLowerCase() !==
              expected[pronoun]?.trim().toLowerCase() && (
              <Text style={styles.correctAnswer}>{expected[pronoun]}</Text>
            )}
        </View>
      ))}

      {!isAnswered && (
        <Pressable
          style={[
            styles.submitButton,
            !pronouns.every((p) => forms[p]?.trim()) &&
              styles.submitButtonDisabled,
          ]}
          disabled={submitting || !pronouns.every((p) => forms[p]?.trim())}
          onPress={() => onSubmit(forms)}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Verificar</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Error correction exercise (mobile)
// ---------------------------------------------------------------------------

function ErrorCorrectionExercise({
  exercise,
  onSubmit,
  submitting,
  result,
}: {
  exercise: LessonExerciseDetail;
  onSubmit: (answer: string) => void;
  submitting: boolean;
  result: ExerciseSubmitResult | null;
}) {
  const [correction, setCorrection] = useState("");
  const isAnswered = result !== null;
  const words = (exercise.content.sentence ?? "").split(/\s+/);
  const errorWord = exercise.content.error_word ?? "";

  return (
    <View style={styles.exerciseCard}>
      <Text style={styles.promptText}>{exercise.prompt_es}</Text>

      {/* Sentence with highlighted error */}
      <View style={styles.sentenceRow}>
        {words.map((word, i) => {
          const clean = word.replace(/[.,!?;:'"]/g, "");
          const isError =
            clean.toLowerCase() === errorWord.replace(/[.,!?;:'"]/g, "").toLowerCase();
          return (
            <Text
              key={i}
              style={[
                styles.sentenceWord,
                isError && (isAnswered
                  ? result?.correct
                    ? styles.wordCorrect
                    : styles.wordError
                  : styles.wordHighlight),
              ]}
            >
              {word}{" "}
            </Text>
          );
        })}
      </View>

      {!isAnswered && (
        <>
          <TextInput
            style={styles.textInput}
            value={correction}
            onChangeText={setCorrection}
            placeholder="Escribe la correccion..."
            returnKeyType="done"
            onSubmitEditing={() => {
              if (correction.trim()) onSubmit(correction.trim());
            }}
          />
          <Pressable
            style={[
              styles.submitButton,
              !correction.trim() && styles.submitButtonDisabled,
            ]}
            disabled={submitting || !correction.trim()}
            onPress={() => onSubmit(correction.trim())}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Verificar</Text>
            )}
          </Pressable>
        </>
      )}

      {isAnswered && result?.correct_answer && (
        <View style={styles.correctionBox}>
          <Text style={styles.correctionLabel}>Correccion:</Text>
          <Text style={styles.correctionValue}>{result.correct_answer}</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function GrammarLessonScreen() {
  const intl = useIntl();

  // State
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("A1");
  const [viewMode, setViewMode] = useState<"list" | "lesson" | "complete">(
    "list",
  );
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonDetail | null>(
    null,
  );
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentResult, setCurrentResult] =
    useState<ExerciseSubmitResult | null>(null);
  const [attempts, setAttempts] = useState<ExerciseSubmitResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch lessons
  // ---------------------------------------------------------------------------

  const fetchLessons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient<{ data: LessonListResponse }>(
        `/lessons/?module=grammar&cefr_level=${cefrLevel}`,
      );
      setLessons(resp.data.lessons);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, [cefrLevel]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  // ---------------------------------------------------------------------------
  // Select lesson
  // ---------------------------------------------------------------------------

  const handleSelectLesson = useCallback(async (summary: LessonSummary) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await apiClient<{ data: LessonDetail }>(
        `/lessons/${summary.id}`,
      );
      setCurrentLesson(resp.data);
      setExerciseIndex(0);
      setAttempts([]);
      setCurrentResult(null);
      setViewMode("lesson");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar leccion");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Submit exercise
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (answer: string | string[] | Record<string, string>) => {
      if (!currentLesson) return;
      const exercise = currentLesson.exercises[exerciseIndex];
      if (!exercise) return;

      setSubmitting(true);
      try {
        const resp = await apiClient<{ data: ExerciseSubmitResult }>(
          `/lessons/${currentLesson.id}/exercises/${exercise.id}/submit`,
          {
            method: "POST",
            body: JSON.stringify({ answer }),
          },
        );
        setCurrentResult(resp.data);
        setAttempts((prev) => [...prev, resp.data]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al enviar respuesta",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [currentLesson, exerciseIndex],
  );

  // ---------------------------------------------------------------------------
  // Next / complete
  // ---------------------------------------------------------------------------

  const handleNext = useCallback(() => {
    if (!currentLesson) return;
    const next = exerciseIndex + 1;
    if (next >= currentLesson.exercises.length) {
      setViewMode("complete");
    } else {
      setExerciseIndex(next);
      setCurrentResult(null);
    }
  }, [currentLesson, exerciseIndex]);

  const handleBackToList = useCallback(() => {
    setViewMode("list");
    setCurrentLesson(null);
    setAttempts([]);
    setCurrentResult(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: error
  // ---------------------------------------------------------------------------

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchLessons}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: complete
  // ---------------------------------------------------------------------------

  if (viewMode === "complete" && currentLesson) {
    const totalCorrect = attempts.filter((a) => a.correct).length;
    const total = attempts.length;
    const pct = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;
    const totalXp = attempts.reduce((s, a) => s + (a.xp_awarded ?? 0), 0);

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.completeContent}
      >
        <View style={styles.completeCard}>
          <Text style={styles.completeTitle}>Leccion completada</Text>
          <Text style={styles.completeLessonTitle}>
            {currentLesson.title_es}
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{pct}%</Text>
              <Text style={styles.statLabel}>Acierto</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {totalCorrect}/{total}
              </Text>
              <Text style={styles.statLabel}>Correctas</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>+{totalXp}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <View
              style={[styles.progressBarFill, { width: `${pct}%` }]}
            />
          </View>
        </View>

        <Pressable style={styles.submitButton} onPress={handleBackToList}>
          <Text style={styles.submitButtonText}>Volver a lecciones</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: lesson list
  // ---------------------------------------------------------------------------

  if (viewMode === "list") {
    return (
      <View style={styles.container}>
        <Text style={styles.screenTitle}>Gramatica</Text>
        <Text style={styles.screenSubtitle}>
          Selecciona un nivel y una leccion.
        </Text>

        <CEFRFilter selected={cefrLevel} onSelect={setCefrLevel} />

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
        >
          {lessons.length === 0 ? (
            <Text style={styles.emptyText}>
              No hay lecciones para este nivel.
            </Text>
          ) : (
            lessons.map((lesson) => (
              <Pressable
                key={lesson.id}
                style={styles.lessonCard}
                onPress={() => handleSelectLesson(lesson)}
                accessibilityRole="button"
              >
                <View style={styles.lessonCardLeft}>
                  <Text style={styles.lessonTitle}>{lesson.title_es}</Text>
                  <Text style={styles.lessonTitleFr}>{lesson.title_fr}</Text>
                  {lesson.description_es && (
                    <Text style={styles.lessonDesc} numberOfLines={2}>
                      {lesson.description_es}
                    </Text>
                  )}
                </View>
                <View style={styles.exerciseBadge}>
                  <Text style={styles.exerciseBadgeText}>
                    {lesson.exercise_count}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: active lesson
  // ---------------------------------------------------------------------------

  if (!currentLesson) return null;

  const exercises = currentLesson.exercises;
  const currentExercise = exercises[exerciseIndex];
  const progressPct =
    exercises.length > 0
      ? Math.round((exerciseIndex / exercises.length) * 100)
      : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.lessonContent}
    >
      {/* Header */}
      <Pressable onPress={handleBackToList}>
        <Text style={styles.backLink}>&larr; Volver</Text>
      </Pressable>
      <Text style={styles.lessonTitle}>{currentLesson.title_es}</Text>
      <Text style={styles.lessonTitleFr}>{currentLesson.title_fr}</Text>

      {/* Progress */}
      <View style={styles.progressRow}>
        <View style={styles.progressBarBg}>
          <View
            style={[styles.progressBarFill, { width: `${progressPct}%` }]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {exerciseIndex + 1}/{exercises.length}
        </Text>
      </View>

      {/* Exercise */}
      {currentExercise && (
        <>
          {(currentExercise.exercise_type === "fill_blank" ||
            currentExercise.exercise_type === "multiple_choice") && (
            <FillBlankExercise
              exercise={currentExercise}
              onSubmit={(a) => handleSubmit(a)}
              submitting={submitting}
              result={currentResult}
            />
          )}
          {currentExercise.exercise_type === "conjugate" && (
            <ConjugationExercise
              exercise={currentExercise}
              onSubmit={(forms) => handleSubmit(forms)}
              submitting={submitting}
              result={currentResult}
            />
          )}
          {currentExercise.exercise_type === "error_correct" && (
            <ErrorCorrectionExercise
              exercise={currentExercise}
              onSubmit={(a) => handleSubmit(a)}
              submitting={submitting}
              result={currentResult}
            />
          )}
        </>
      )}

      {/* Feedback */}
      {currentResult && (
        <View
          style={[
            styles.feedbackBox,
            currentResult.correct ? styles.feedbackCorrect : styles.feedbackIncorrect,
          ]}
        >
          <Text
            style={[
              styles.feedbackTitle,
              { color: currentResult.correct ? "#166534" : "#991B1B" },
            ]}
          >
            {currentResult.correct ? "Correcto!" : "Incorrecto"}
          </Text>
          <Text style={styles.feedbackText}>
            {currentResult.feedback_es}
          </Text>
          {currentResult.xp_awarded > 0 && (
            <Text style={styles.xpText}>+{currentResult.xp_awarded} XP</Text>
          )}
        </View>
      )}

      {/* Next button */}
      {currentResult && (
        <Pressable style={styles.submitButton} onPress={handleNext}>
          <Text style={styles.submitButtonText}>
            {exerciseIndex + 1 >= exercises.length
              ? "Ver resumen"
              : "Siguiente"}
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F9FAFB",
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  screenSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },

  // Filter
  filterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipActive: { backgroundColor: "#2563EB" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#FFFFFF" },

  // List
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  lessonCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 8,
    alignItems: "center",
  },
  lessonCardLeft: { flex: 1 },
  lessonTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  lessonTitleFr: { fontSize: 13, color: "#2563EB", marginTop: 2 },
  lessonDesc: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  exerciseBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  exerciseBadgeText: { fontSize: 11, fontWeight: "700", color: "#2563EB" },

  // Lesson content
  lessonContent: { padding: 16, paddingBottom: 32 },
  backLink: { fontSize: 13, color: "#2563EB", marginBottom: 8 },

  // Progress
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginVertical: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    backgroundColor: "#2563EB",
    borderRadius: 3,
  },
  progressLabel: { fontSize: 12, color: "#6B7280", minWidth: 36 },

  // Exercise card
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  promptText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  sentenceText: { fontSize: 16, color: "#111827", lineHeight: 24 },

  // Options
  optionsGrid: { gap: 8 },
  optionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  optionText: { fontSize: 14, fontWeight: "500", color: "#374151" },

  // Text input
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },

  // Submit
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    minHeight: 48,
    justifyContent: "center",
  },
  submitButtonDisabled: { backgroundColor: "#93C5FD" },
  submitButtonText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },

  // Conjugation
  verbHeader: {
    backgroundColor: "#EFF6FF",
    borderRadius: 10,
    padding: 12,
  },
  verbText: { fontSize: 18, fontWeight: "700", color: "#1E40AF" },
  verbTranslation: { fontSize: 13, color: "#2563EB", marginTop: 2 },
  conjugationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pronounLabel: {
    width: 80,
    textAlign: "right",
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  conjugationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  inputCorrect: { borderColor: "#4ADE80", backgroundColor: "#F0FDF4" },
  inputIncorrect: { borderColor: "#F87171", backgroundColor: "#FEF2F2" },
  correctAnswer: { fontSize: 12, color: "#166534", minWidth: 60 },

  // Error correction
  sentenceRow: { flexDirection: "row", flexWrap: "wrap", gap: 2 },
  sentenceWord: { fontSize: 16, lineHeight: 28 },
  wordHighlight: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    borderRadius: 4,
    overflow: "hidden",
  },
  wordError: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
    textDecorationLine: "line-through",
    borderRadius: 4,
    overflow: "hidden",
  },
  wordCorrect: {
    backgroundColor: "#DCFCE7",
    color: "#166534",
    borderRadius: 4,
    overflow: "hidden",
  },
  correctionBox: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  correctionLabel: { fontSize: 13, fontWeight: "500", color: "#6B7280" },
  correctionValue: { fontSize: 14, fontWeight: "600", color: "#166534" },

  // Feedback
  feedbackBox: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  feedbackCorrect: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  feedbackIncorrect: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  feedbackTitle: { fontSize: 14, fontWeight: "700" },
  feedbackText: { fontSize: 13, color: "#374151", marginTop: 4 },
  xpText: { fontSize: 13, fontWeight: "600", color: "#166534", marginTop: 4 },

  // Complete
  completeContent: { padding: 16, paddingBottom: 32, alignItems: "center" },
  completeCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 24,
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  completeTitle: { fontSize: 22, fontWeight: "700", color: "#166534" },
  completeLessonTitle: {
    fontSize: 15,
    color: "#15803D",
    marginTop: 4,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 20,
  },
  statBox: { alignItems: "center" },
  statValue: { fontSize: 24, fontWeight: "700", color: "#166534" },
  statLabel: { fontSize: 11, color: "#15803D", marginTop: 2 },

  // Misc
  loadingText: { fontSize: 13, color: "#6B7280", marginTop: 8 },
  errorText: { fontSize: 14, color: "#991B1B", textAlign: "center", marginBottom: 16 },
  retryButton: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", paddingTop: 32 },
});
