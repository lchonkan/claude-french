import { useState, useCallback } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router-dom";
import { Button, Card, ProgressBar, LoadingState, ErrorState } from "@/components/common";
import type { CEFRLevel } from "@/types/cefr";
import { CEFR_ORDER } from "@/types/cefr";
import {
  startPlacementTest,
  submitAnswer,
  getExamResult,
  type ExamQuestion,
  type ExamResult,
  type SkillScore,
} from "@/services/exams";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "welcome" | "testing" | "loading_result" | "result";

interface ExamState {
  examId: string;
  currentQuestion: ExamQuestion;
  questionNumber: number;
  currentLevel: string;
  answers: Array<{ questionId: string; correct: boolean }>;
  selectedAnswer: string | null;
  showFeedback: boolean;
  lastCorrect: boolean | null;
  lastCorrectAnswer: string | null;
  lastExplanation: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-green-100 text-green-800 border-green-300",
  A2: "bg-green-200 text-green-900 border-green-400",
  B1: "bg-blue-100 text-blue-800 border-blue-300",
  B2: "bg-blue-200 text-blue-900 border-blue-400",
  C1: "bg-purple-100 text-purple-800 border-purple-300",
  C2: "bg-purple-200 text-purple-900 border-purple-400",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LevelIndicator({ level }: { level: string }) {
  const colorClass = LEVEL_COLORS[level] ?? "bg-gray-100 text-gray-800 border-gray-300";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${colorClass}`}
    >
      {level}
    </span>
  );
}

function SkillBreakdownChart({ skills }: { skills: SkillScore[] }) {
  return (
    <div className="space-y-3">
      {skills.map((skill) => (
        <div key={skill.skill}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium capitalize text-gray-700">
              {skill.skill}
            </span>
            <span className="text-gray-500">
              {skill.correct}/{skill.total_questions} ({Math.round(skill.score)}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                skill.score >= 70
                  ? "bg-green-500"
                  : skill.score >= 40
                    ? "bg-yellow-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, skill.score)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PlacementTest() {
  const intl = useIntl();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("welcome");
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Start the placement test
  // -----------------------------------------------------------------------

  const handleStart = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await startPlacementTest();
      setExamState({
        examId: response.exam_id,
        currentQuestion: response.question,
        questionNumber: response.question_number,
        currentLevel: response.current_level,
        answers: [],
        selectedAnswer: null,
        showFeedback: false,
        lastCorrect: null,
        lastCorrectAnswer: null,
        lastExplanation: null,
      });
      setPhase("testing");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar la prueba de nivel."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // -----------------------------------------------------------------------
  // Select an answer option
  // -----------------------------------------------------------------------

  const handleSelectAnswer = useCallback((answer: string) => {
    setExamState((prev) =>
      prev && !prev.showFeedback ? { ...prev, selectedAnswer: answer } : prev
    );
  }, []);

  // -----------------------------------------------------------------------
  // Submit the selected answer
  // -----------------------------------------------------------------------

  const handleSubmitAnswer = useCallback(async () => {
    if (!examState || !examState.selectedAnswer) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await submitAnswer(
        examState.examId,
        examState.currentQuestion.id,
        examState.selectedAnswer
      );

      const newAnswers = [
        ...examState.answers,
        {
          questionId: examState.currentQuestion.id,
          correct: response.correct,
        },
      ];

      setExamState({
        ...examState,
        answers: newAnswers,
        showFeedback: true,
        lastCorrect: response.correct,
        lastCorrectAnswer: response.correct_answer,
        lastExplanation: response.explanation,
        currentLevel: response.current_estimated_level,
      });

      if (response.exam_complete) {
        // Short delay to show feedback, then load result
        setTimeout(async () => {
          setPhase("loading_result");
          try {
            const examResult = await getExamResult(examState.examId);
            setResult(examResult);
            setPhase("result");
          } catch {
            setError("No se pudo cargar el resultado del examen.");
            setPhase("result");
          }
        }, 2000);
      } else if (response.next_question) {
        // Show feedback briefly, then move to next question
        setTimeout(() => {
          setExamState((prev) =>
            prev && response.next_question
              ? {
                  ...prev,
                  currentQuestion: response.next_question,
                  questionNumber: response.question_number + 1,
                  selectedAnswer: null,
                  showFeedback: false,
                  lastCorrect: null,
                  lastCorrectAnswer: null,
                  lastExplanation: null,
                }
              : prev
          );
        }, 2000);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al enviar la respuesta."
      );
    } finally {
      setSubmitting(false);
    }
  }, [examState]);

  // -----------------------------------------------------------------------
  // Render: Welcome phase
  // -----------------------------------------------------------------------

  if (phase === "welcome") {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Prueba de Nivel
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-gray-600">
            Esta prueba adaptativa determinara tu nivel actual de frances.
            Las preguntas se ajustaran automaticamente a tu nivel de conocimiento.
          </p>
        </div>

        <Card className="mx-auto max-w-md text-left">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Preguntas adaptativas</p>
                <p className="text-sm text-gray-500">
                  Comenzamos en nivel A2 y ajustamos segun tus respuestas.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">3 rondas de 5 preguntas</p>
                <p className="text-sm text-gray-500">
                  Maximo 15 preguntas de vocabulario, gramatica y comprension lectora.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Resultado inmediato</p>
                <p className="text-sm text-gray-500">
                  Recibiras tu nivel CEFR asignado con un desglose por habilidad.
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={handleStart}
            loading={loading}
          >
            Comenzar Prueba
          </Button>
        </div>

        {error && (
          <ErrorState
            message={error}
            onRetry={handleStart}
            className="mt-6"
          />
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Loading result phase
  // -----------------------------------------------------------------------

  if (phase === "loading_result") {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <LoadingState
          message="Calculando tu nivel..."
          estimatedDuration="unos segundos"
        />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Result phase
  // -----------------------------------------------------------------------

  if (phase === "result") {
    if (error && !result) {
      return (
        <div className="mx-auto max-w-2xl py-12">
          <ErrorState message={error} onRetry={() => navigate(0)} />
        </div>
      );
    }

    if (!result) {
      return (
        <div className="mx-auto max-w-2xl py-12">
          <LoadingState message="Cargando resultado..." />
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-10 w-10 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Prueba Completada
          </h1>
          <p className="mt-2 text-gray-600">Tu nivel de frances estimado es:</p>
          <div className="mt-4">
            <span
              className={`inline-flex items-center rounded-xl border-2 px-6 py-3 text-3xl font-bold ${
                LEVEL_COLORS[result.assigned_level] ?? "bg-gray-100 text-gray-800 border-gray-300"
              }`}
            >
              {result.assigned_level}
            </span>
          </div>
        </div>

        {/* Score summary */}
        <Card className="mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(result.score)}%
              </p>
              <p className="text-sm text-gray-500">Puntuacion</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {result.correct_answers}/{result.total_questions}
              </p>
              <p className="text-sm text-gray-500">Correctas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {result.assigned_level}
              </p>
              <p className="text-sm text-gray-500">Nivel asignado</p>
            </div>
          </div>
        </Card>

        {/* Skill breakdown */}
        <Card title="Desglose por Habilidad" className="mb-6">
          <SkillBreakdownChart skills={result.skill_breakdown} />
        </Card>

        {/* Recommendations */}
        <Card title="Recomendaciones" className="mb-8">
          <div className="space-y-2 text-sm text-gray-600">
            {result.skill_breakdown
              .filter((s) => s.score < 70)
              .map((s) => (
                <p key={s.skill}>
                  <span className="font-medium text-gray-900 capitalize">
                    {s.skill}
                  </span>
                  : Te recomendamos practicar mas ejercicios de{" "}
                  {s.skill === "vocabulary"
                    ? "vocabulario"
                    : s.skill === "grammar"
                      ? "gramatica"
                      : "comprension lectora"}{" "}
                  en nivel {result.assigned_level}.
                </p>
              ))}
            {result.skill_breakdown.every((s) => s.score >= 70) && (
              <p>
                Excelente resultado en todas las habilidades. Puedes continuar
                avanzando al siguiente nivel.
              </p>
            )}
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="primary" size="lg" onClick={() => navigate("/")}>
            Ir al Dashboard
          </Button>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setPhase("welcome");
              setExamState(null);
              setResult(null);
              setError(null);
            }}
          >
            Repetir Prueba
          </Button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Render: Testing phase
  // -----------------------------------------------------------------------

  if (!examState) {
    return <LoadingState message="Cargando..." />;
  }

  const { currentQuestion, questionNumber, currentLevel, selectedAnswer, showFeedback } =
    examState;

  // Progress: approximate based on max 15 questions
  const progressPercent = Math.min(100, (questionNumber / 15) * 100);

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header with progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            Pregunta {questionNumber}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Nivel estimado:</span>
            <LevelIndicator level={currentLevel} />
          </div>
        </div>
        <ProgressBar
          percent={progressPercent}
          cefrLevel={currentLevel as CEFRLevel}
          size="sm"
        />
      </div>

      {/* Question card */}
      <Card className="mb-6">
        {/* Skill badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium capitalize text-gray-700">
            {currentQuestion.skill}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {currentQuestion.cefr_level}
          </span>
        </div>

        {/* Question prompt */}
        <p className="mb-2 text-lg font-medium text-gray-900">
          {currentQuestion.prompt_fr}
        </p>
        <p className="mb-6 text-sm text-gray-500">
          {currentQuestion.prompt_es}
        </p>

        {/* Answer options */}
        {currentQuestion.options && (
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer =
                showFeedback && option === examState.lastCorrectAnswer;
              const isWrongSelection =
                showFeedback && isSelected && !examState.lastCorrect;

              let optionClass =
                "flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors cursor-pointer";

              if (showFeedback) {
                if (isCorrectAnswer) {
                  optionClass +=
                    " border-green-500 bg-green-50 text-green-800";
                } else if (isWrongSelection) {
                  optionClass += " border-red-500 bg-red-50 text-red-800";
                } else {
                  optionClass +=
                    " border-gray-200 bg-gray-50 text-gray-400 cursor-default";
                }
              } else if (isSelected) {
                optionClass += " border-blue-500 bg-blue-50 text-blue-800";
              } else {
                optionClass +=
                  " border-gray-200 hover:border-blue-300 hover:bg-blue-50";
              }

              return (
                <button
                  key={index}
                  type="button"
                  className={optionClass}
                  onClick={() => handleSelectAnswer(option)}
                  disabled={showFeedback}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current text-sm font-medium">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-sm font-medium">{option}</span>
                  {showFeedback && isCorrectAnswer && (
                    <svg
                      className="ml-auto h-5 w-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                  {showFeedback && isWrongSelection && (
                    <svg
                      className="ml-auto h-5 w-5 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback message */}
        {showFeedback && (
          <div
            className={`mt-4 rounded-lg p-4 ${
              examState.lastCorrect
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            <p className="font-medium">
              {examState.lastCorrect ? "Correcto" : "Incorrecto"}
            </p>
            {examState.lastExplanation && (
              <p className="mt-1 text-sm opacity-80">
                {examState.lastExplanation}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Submit button */}
      {!showFeedback && (
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmitAnswer}
            disabled={!selectedAnswer}
            loading={submitting}
          >
            Confirmar Respuesta
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <ErrorState
          message={error}
          onRetry={() => setError(null)}
          className="mt-4"
        />
      )}
    </div>
  );
}
