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

type Phase = "welcome" | "testing" | "loading_result" | "result";

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
  currentQuestion: ExamQuestion;
  questionNumber: number;
  currentLevel: string;
  selectedAnswer: string | null;
  showFeedback: boolean;
  lastCorrect: boolean | null;
  lastCorrectAnswer: string | null;
  lastExplanation: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  A1: { bg: "#D1FAE5", text: "#065F46" },
  A2: { bg: "#A7F3D0", text: "#064E3B" },
  B1: { bg: "#DBEAFE", text: "#1E40AF" },
  B2: { bg: "#BFDBFE", text: "#1E3A8A" },
  C1: { bg: "#E9D5FF", text: "#6B21A8" },
  C2: { bg: "#DDD6FE", text: "#5B21B6" },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PlacementTestScreen({
  navigation,
}: {
  navigation: any;
}) {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Start placement test
  // -----------------------------------------------------------------------

  const handleStart = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient<{ data: StartExamResponse }>(
        "/exams/placement/start",
        { method: "POST" }
      );
      const data = response.data;
      setExamState({
        examId: data.exam_id,
        currentQuestion: data.question,
        questionNumber: data.question_number,
        currentLevel: data.current_level,
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
          : "No se pudo iniciar la prueba de nivel."
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
        currentLevel: data.current_estimated_level,
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
  // Render: Welcome
  // -----------------------------------------------------------------------

  if (phase === "welcome") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.centerContent}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>FR</Text>
        </View>
        <Text style={styles.title}>Prueba de Nivel</Text>
        <Text style={styles.description}>
          Esta prueba adaptativa determinara tu nivel actual de frances.
          Comenzamos en A2 y ajustamos segun tus respuestas.
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoItem}>
            - Preguntas adaptativas (vocabulario, gramatica, lectura)
          </Text>
          <Text style={styles.infoItem}>
            - Maximo 15 preguntas en 3 rondas
          </Text>
          <Text style={styles.infoItem}>
            - Resultado inmediato con desglose por habilidad
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleStart}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Comenzar Prueba</Text>
          )}
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
          Calculando tu nivel...
        </Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Result
  // -----------------------------------------------------------------------

  if (phase === "result" && result) {
    const levelColor = LEVEL_COLORS[result.assigned_level] ?? {
      bg: "#F3F4F6",
      text: "#374151",
    };

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.centerContent}>
          <View
            style={[styles.levelBadgeLarge, { backgroundColor: levelColor.bg }]}
          >
            <Text style={[styles.levelBadgeLargeText, { color: levelColor.text }]}>
              {result.assigned_level}
            </Text>
          </View>
          <Text style={styles.title}>Prueba Completada</Text>
          <Text style={styles.description}>
            Tu nivel estimado de frances es {result.assigned_level}
          </Text>
        </View>

        {/* Score summary */}
        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreValue}>{Math.round(result.score)}%</Text>
            <Text style={styles.scoreLabel}>Puntuacion</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreValue}>
              {result.correct_answers}/{result.total_questions}
            </Text>
            <Text style={styles.scoreLabel}>Correctas</Text>
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

        <TouchableOpacity
          style={[styles.primaryButton, { marginTop: 24 }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Ir al Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 12 }]}
          onPress={() => {
            setPhase("welcome");
            setExamState(null);
            setResult(null);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Repetir Prueba</Text>
        </TouchableOpacity>
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
    currentLevel,
    selectedAnswer,
    showFeedback,
  } = examState;

  const levelColor = LEVEL_COLORS[currentLevel] ?? {
    bg: "#F3F4F6",
    text: "#374151",
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.questionCounter}>Pregunta {questionNumber}</Text>
        <View style={[styles.levelBadge, { backgroundColor: levelColor.bg }]}>
          <Text style={[styles.levelBadgeText, { color: levelColor.text }]}>
            {currentLevel}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(100, (questionNumber / 15) * 100)}%`,
              backgroundColor: "#2563EB",
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
          borderColor = "#2563EB";
          bgColor = "#EFF6FF";
          textColor = "#1E40AF";
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

      {/* Submit button */}
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
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2563EB",
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
  infoBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoItem: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
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
  levelBadge: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  levelBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  levelBadgeLarge: {
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 16,
  },
  levelBadgeLargeText: {
    fontSize: 32,
    fontWeight: "700",
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
    fontSize: 22,
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
});
