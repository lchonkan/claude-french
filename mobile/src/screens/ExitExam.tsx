import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { apiClient } from "../services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "select_level" | "testing" | "loading_result" | "result";
type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

interface ExamQuestion {
  id: string;
  type: string;
  prompt_fr: string;
  prompt_es: string;
  options: string[] | null;
  skill: string;
  cefr_level: string;
}

interface SkillScore {
  skill: string;
  score: number;
  total_questions: number;
  correct: number;
}

interface ExamResult {
  exam_id: string;
  exam_type: string;
  assigned_level: string;
  score: number;
  passed: boolean;
  skill_breakdown: SkillScore[];
  total_questions: number;
  correct_answers: number;
}

interface StartExamResponse {
  exam_id: string;
  exam_type: string;
  current_level: string;
  question: ExamQuestion;
  question_number: number;
  total_questions: number | null;
}

interface AnswerResponse {
  correct: boolean;
  correct_answer: string;
  explanation: string | null;
  next_question: ExamQuestion | null;
  question_number: number;
  current_estimated_level: string;
  exam_complete: boolean;
}

interface ExamState {
  examId: string;
  targetLevel: CEFRLevel;
  currentQuestion: ExamQuestion;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  showFeedback: boolean;
  lastCorrect: boolean | null;
  lastCorrectAnswer: string | null;
  lastExplanation: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A1: { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  A2: { bg: "#A7F3D0", text: "#064E3B", border: "#34D399" },
  B1: { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  B2: { bg: "#BFDBFE", text: "#1E3A8A", border: "#60A5FA" },
  C1: { bg: "#E9D5FF", text: "#6B21A8", border: "#C084FC" },
  C2: { bg: "#DDD6FE", text: "#5B21B6", border: "#A78BFA" },
};

const LEVEL_DESCRIPTIONS: Record<CEFRLevel, string> = {
  A1: "Principiante",
  A2: "Elemental",
  B1: "Intermedio",
  B2: "Intermedio alto",
  C1: "Avanzado",
  C2: "Maestria",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ExitExamScreen({
  navigation,
  route,
}: {
  navigation: any;
  route?: { params?: { level?: CEFRLevel } };
}) {
  const preselectedLevel = route?.params?.level ?? null;

  const [phase, setPhase] = useState<Phase>("select_level");
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(
    preselectedLevel
  );
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Start exit exam
  // -----------------------------------------------------------------------

  const handleStart = useCallback(async () => {
    if (!selectedLevel) return;

    setLoading(true);
    try {
      const response = await apiClient<{ data: StartExamResponse }>(
        "/exams/exit/start",
        {
          method: "POST",
          body: JSON.stringify({ cefr_level: selectedLevel }),
        }
      );
      const data = response.data;
      setExamState({
        examId: data.exam_id,
        targetLevel: selectedLevel,
        currentQuestion: data.question,
        questionNumber: data.question_number,
        totalQuestions: data.total_questions ?? 10,
        selectedAnswer: null,
        showFeedback: false,
        lastCorrect: null,
        lastCorrectAnswer: null,
        lastExplanation: null,
      });
      setPhase("testing");
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error
          ? err.message
          : "No se pudo iniciar el examen."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedLevel]);

  // -----------------------------------------------------------------------
  // Submit answer
  // -----------------------------------------------------------------------

  const handleSubmitAnswer = useCallback(async () => {
    if (!examState || !examState.selectedAnswer) return;

    setSubmitting(true);
    try {
      const response = await apiClient<{ data: AnswerResponse }>(
        `/exams/${examState.examId}/answer`,
        {
          method: "POST",
          body: JSON.stringify({
            question_id: examState.currentQuestion.id,
            answer: examState.selectedAnswer,
          }),
        }
      );
      const data = response.data;

      setExamState({
        ...examState,
        showFeedback: true,
        lastCorrect: data.correct,
        lastCorrectAnswer: data.correct_answer,
        lastExplanation: data.explanation,
      });

      if (data.exam_complete) {
        setTimeout(async () => {
          setPhase("loading_result");
          try {
            const resultResponse = await apiClient<{ data: ExamResult }>(
              `/exams/${examState.examId}/result`
            );
            setResult(resultResponse.data);
            setPhase("result");
          } catch {
            Alert.alert("Error", "No se pudo cargar el resultado.");
            setPhase("result");
          }
        }, 1500);
      } else if (data.next_question) {
        setTimeout(() => {
          setExamState((prev) =>
            prev && data.next_question
              ? {
                  ...prev,
                  currentQuestion: data.next_question,
                  questionNumber: data.question_number + 1,
                  selectedAnswer: null,
                  showFeedback: false,
                  lastCorrect: null,
                  lastCorrectAnswer: null,
                  lastExplanation: null,
                }
              : prev
          );
        }, 1500);
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Error al enviar la respuesta."
      );
    } finally {
      setSubmitting(false);
    }
  }, [examState]);

  // -----------------------------------------------------------------------
  // Render: Level selection
  // -----------------------------------------------------------------------

  if (phase === "select_level") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.centerContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>CEFR</Text>
          </View>
          <Text style={styles.title}>Examen de Certificacion</Text>
          <Text style={styles.description}>
            Selecciona el nivel que deseas certificar. Necesitas 70% para aprobar.
          </Text>
        </View>

        {/* Level grid */}
        <View style={styles.levelGrid}>
          {CEFR_LEVELS.map((level) => {
            const isSelected = selectedLevel === level;
            const colors = LEVEL_COLORS[level];

            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.levelCard,
                  isSelected && {
                    borderColor: colors.border,
                    borderWidth: 2.5,
                    backgroundColor: colors.bg,
                  },
                ]}
                onPress={() => setSelectedLevel(level)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.levelBadge,
                    { backgroundColor: colors.bg },
                  ]}
                >
                  <Text style={[styles.levelBadgeText, { color: colors.text }]}>
                    {level}
                  </Text>
                </View>
                <Text style={styles.levelDescription}>
                  {LEVEL_DESCRIPTIONS[level]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { marginTop: 20 },
            (!selectedLevel || loading) && styles.disabledButton,
          ]}
          onPress={handleStart}
          disabled={!selectedLevel || loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Comenzar Examen {selectedLevel ?? ""}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 12 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Loading result
  // -----------------------------------------------------------------------

  if (phase === "loading_result") {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={[styles.description, { marginTop: 16 }]}>
          Evaluando tus respuestas...
        </Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Result
  // -----------------------------------------------------------------------

  if (phase === "result" && result) {
    const passed = result.passed;
    const levelColor = LEVEL_COLORS[result.assigned_level] ?? {
      bg: "#F3F4F6",
      text: "#374151",
      border: "#D1D5DB",
    };

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.centerContent}>
          <View
            style={[
              styles.resultIcon,
              {
                backgroundColor: passed ? "#D1FAE5" : "#FEF3C7",
              },
            ]}
          >
            <Text style={{ fontSize: 32 }}>
              {passed ? "\u2713" : "!"}
            </Text>
          </View>
          <Text style={styles.title}>
            {passed ? "Examen Aprobado" : "Examen No Aprobado"}
          </Text>
          <Text style={styles.description}>
            {passed
              ? `Has demostrado dominio del nivel ${result.assigned_level}.`
              : `Necesitas 70% para aprobar. Obtuviste ${Math.round(result.score)}%.`}
          </Text>
        </View>

        {/* Score */}
        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <Text
              style={[
                styles.scoreValue,
                { color: passed ? "#16A34A" : "#EA580C" },
              ]}
            >
              {Math.round(result.score)}%
            </Text>
            <Text style={styles.scoreLabel}>Puntuacion</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreValue}>
              {result.correct_answers}/{result.total_questions}
            </Text>
            <Text style={styles.scoreLabel}>Correctas</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text
              style={[
                styles.scoreValue,
                { color: passed ? "#16A34A" : "#EA580C", fontSize: 14 },
              ]}
            >
              {passed ? "APROBADO" : "NO APROBADO"}
            </Text>
            <Text style={styles.scoreLabel}>Resultado</Text>
          </View>
        </View>

        {/* Skill breakdown */}
        <Text style={styles.sectionTitle}>Desglose por Habilidad</Text>
        {result.skill_breakdown.map((skill) => (
          <View key={skill.skill} style={styles.skillRow}>
            <View style={styles.skillHeader}>
              <Text style={styles.skillName}>{skill.skill}</Text>
              <Text style={styles.skillScore}>
                {skill.correct}/{skill.total_questions} (
                {Math.round(skill.score)}%)
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, skill.score)}%`,
                    backgroundColor:
                      skill.score >= 70
                        ? "#22C55E"
                        : skill.score >= 40
                          ? "#EAB308"
                          : "#EF4444",
                  },
                ]}
              />
            </View>
          </View>
        ))}

        {/* Recommendations */}
        {!passed && (
          <View style={styles.recommendationBox}>
            <Text style={styles.recommendationTitle}>Areas de mejora</Text>
            {result.skill_breakdown
              .filter((s) => s.score < 70)
              .map((s) => (
                <Text key={s.skill} style={styles.recommendationText}>
                  - {s.skill}: Practica mas ejercicios antes de reintentar.
                </Text>
              ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 24 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Ir al Dashboard</Text>
        </TouchableOpacity>

        {!passed && (
          <TouchableOpacity
            style={[styles.secondaryButton, { marginTop: 12 }]}
            onPress={() => {
              setPhase("select_level");
              setExamState(null);
              setResult(null);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Reintentar Examen</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Testing
  // -----------------------------------------------------------------------

  if (!examState) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const {
    currentQuestion,
    questionNumber,
    totalQuestions,
    targetLevel,
    selectedAnswer,
    showFeedback,
  } = examState;

  const targetColors = LEVEL_COLORS[targetLevel] ?? {
    bg: "#F3F4F6",
    text: "#374151",
    border: "#D1D5DB",
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.questionCounter}>
          Pregunta {questionNumber} de {totalQuestions}
        </Text>
        <View
          style={[styles.levelBadge, { backgroundColor: targetColors.bg }]}
        >
          <Text
            style={[styles.levelBadgeText, { color: targetColors.text }]}
          >
            {targetLevel}
          </Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${(questionNumber / totalQuestions) * 100}%`,
              backgroundColor: "#7C3AED",
            },
          ]}
        />
      </View>

      {/* Skill tag */}
      <View style={styles.skillTag}>
        <Text style={styles.skillTagText}>{currentQuestion.skill}</Text>
      </View>

      {/* Question */}
      <Text style={styles.questionText}>{currentQuestion.prompt_fr}</Text>
      <Text style={styles.questionHint}>{currentQuestion.prompt_es}</Text>

      {/* Options */}
      {currentQuestion.options?.map((option, index) => {
        const isSelected = selectedAnswer === option;
        const isCorrectAnswer =
          showFeedback && option === examState.lastCorrectAnswer;
        const isWrongSelection =
          showFeedback && isSelected && !examState.lastCorrect;

        let borderColor = "#D1D5DB";
        let bgColor = "#FFFFFF";
        let textColor = "#111827";

        if (showFeedback) {
          if (isCorrectAnswer) {
            borderColor = "#22C55E";
            bgColor = "#F0FDF4";
            textColor = "#166534";
          } else if (isWrongSelection) {
            borderColor = "#EF4444";
            bgColor = "#FEF2F2";
            textColor = "#991B1B";
          } else {
            bgColor = "#F9FAFB";
            textColor = "#9CA3AF";
          }
        } else if (isSelected) {
          borderColor = "#7C3AED";
          bgColor = "#F5F3FF";
          textColor = "#5B21B6";
        }

        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              { borderColor, backgroundColor: bgColor },
            ]}
            onPress={() => {
              if (!showFeedback) {
                setExamState((prev) =>
                  prev ? { ...prev, selectedAnswer: option } : prev
                );
              }
            }}
            disabled={showFeedback}
            activeOpacity={0.7}
          >
            <View style={[styles.optionLetter, { borderColor }]}>
              <Text style={[styles.optionLetterText, { color: textColor }]}>
                {String.fromCharCode(65 + index)}
              </Text>
            </View>
            <Text style={[styles.optionText, { color: textColor }]}>
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Feedback */}
      {showFeedback && (
        <View
          style={[
            styles.feedbackBox,
            {
              backgroundColor: examState.lastCorrect ? "#F0FDF4" : "#FEF2F2",
            },
          ]}
        >
          <Text
            style={[
              styles.feedbackTitle,
              { color: examState.lastCorrect ? "#166534" : "#991B1B" },
            ]}
          >
            {examState.lastCorrect ? "Correcto" : "Incorrecto"}
          </Text>
          {examState.lastExplanation && (
            <Text
              style={[
                styles.feedbackText,
                { color: examState.lastCorrect ? "#15803D" : "#B91C1C" },
              ]}
            >
              {examState.lastExplanation}
            </Text>
          )}
        </View>
      )}

      {/* Submit */}
      {!showFeedback && (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { marginTop: 16 },
            (!selectedAnswer || submitting) && styles.disabledButton,
          ]}
          onPress={handleSubmitAnswer}
          disabled={!selectedAnswer || submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Confirmar Respuesta</Text>
          )}
        </TouchableOpacity>
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
  centerContent: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E9D5FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B21A8",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  levelGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  levelCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginBottom: 2,
  },
  levelBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  levelDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 48,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  questionCounter: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  skillTag: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  skillTagText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#374151",
    textTransform: "capitalize",
  },
  questionText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
    lineHeight: 26,
  },
  questionHint: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  optionLetter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  optionLetterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  optionText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  feedbackBox: {
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 19,
  },
  resultIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scoreItem: {
    alignItems: "center",
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  scoreLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  skillRow: {
    marginBottom: 12,
  },
  skillHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  skillName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    textTransform: "capitalize",
  },
  skillScore: {
    fontSize: 13,
    color: "#6B7280",
  },
  recommendationBox: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  recommendationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19,
    marginBottom: 2,
  },
});
