import { useState, useCallback } from "react";
import { useIntl } from "react-intl";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Card, ProgressBar, LoadingState, ErrorState } from "@/components/common";
import type { CEFRLevel } from "@/types/cefr";
import { CEFR_ORDER } from "@/types/cefr";
import {
  startExitExam,
  submitAnswer,
  getExamResult,
  type ExamQuestion,
  type ExamResult,
  type SkillScore,
} from "@/services/exams";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "select_level" | "testing" | "loading_result" | "result";

interface ExamState {
  examId: string;
  targetLevel: CEFRLevel;
  currentQuestion: ExamQuestion;
  questionNumber: number;
  totalQuestions: number;
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

const LEVEL_DESCRIPTIONS: Record<CEFRLevel, string> = {
  A1: "Principiante - Comprension y uso de expresiones basicas.",
  A2: "Elemental - Comunicacion en situaciones cotidianas simples.",
  B1: "Intermedio - Manejo de situaciones habituales de viaje y trabajo.",
  B2: "Intermedio alto - Interaccion fluida con hablantes nativos.",
  C1: "Avanzado - Uso flexible y efectivo del idioma.",
  C2: "Maestria - Comprension y expresion con facilidad nativa.",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

export default function ExitExam() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Allow pre-selecting a level via ?level=B1 query param
  const preselectedLevel = searchParams.get("level") as CEFRLevel | null;

  const [phase, setPhase] = useState<Phase>(
    preselectedLevel ? "select_level" : "select_level"
  );
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(
    preselectedLevel
  );
  const [examState, setExamState] = useState<ExamState | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------------------------------------------------
  // Start the exit exam
  // -----------------------------------------------------------------------

  const handleStart = useCallback(async () => {
    if (!selectedLevel) return;

    setLoading(true);
    setError(null);

    try {
      const response = await startExitExam(selectedLevel);
      setExamState({
        examId: response.exam_id,
        targetLevel: selectedLevel,
        currentQuestion: response.question,
        questionNumber: response.question_number,
        totalQuestions: response.total_questions ?? 10,
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
          : "No se pudo iniciar el examen."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedLevel]);

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
      });

      if (response.exam_complete) {
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
  // Render: Level selection phase
  // -----------------------------------------------------------------------

  if (phase === "select_level") {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <svg
              className="h-8 w-8 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Examen de Certificacion CEFR
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-gray-600">
            Demuestra tu dominio del frances en un nivel especifico.
            Necesitas un 70% o mas para aprobar y desbloquear el siguiente nivel.
          </p>
        </div>

        {/* Level selection grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CEFR_ORDER.map((level) => {
            const isSelected = selectedLevel === level;
            const colorClass =
              LEVEL_COLORS[level] ?? "bg-gray-100 text-gray-800 border-gray-300";

            return (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedLevel(level)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? `${colorClass} ring-2 ring-blue-500 ring-offset-2`
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold ${colorClass}`}
                  >
                    {level}
                  </span>
                  {isSelected && (
                    <svg
                      className="h-5 w-5 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {LEVEL_DESCRIPTIONS[level]}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate("/")}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={handleStart}
            disabled={!selectedLevel}
            loading={loading}
          >
            Comenzar Examen {selectedLevel ?? ""}
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
          message="Evaluando tus respuestas..."
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

    const passed = result.passed;

    return (
      <div className="mx-auto max-w-2xl py-12">
        {/* Pass/Fail header */}
        <div className="mb-8 text-center">
          <div
            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
              passed ? "bg-green-100" : "bg-orange-100"
            }`}
          >
            {passed ? (
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
            ) : (
              <svg
                className="h-10 w-10 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {passed ? "Examen Aprobado" : "Examen No Aprobado"}
          </h1>
          <p className="mt-2 text-gray-600">
            {passed
              ? `Has demostrado dominio del nivel ${result.assigned_level}.`
              : `Necesitas un 70% para aprobar el nivel ${result.assigned_level}. Obtuviste ${Math.round(result.score)}%.`}
          </p>
        </div>

        {/* Score summary */}
        <Card className="mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p
                className={`text-2xl font-bold ${
                  passed ? "text-green-600" : "text-orange-600"
                }`}
              >
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
              <p
                className={`text-2xl font-bold ${
                  passed ? "text-green-600" : "text-orange-600"
                }`}
              >
                {passed ? "APROBADO" : "NO APROBADO"}
              </p>
              <p className="text-sm text-gray-500">Resultado</p>
            </div>
          </div>
        </Card>

        {/* Skill breakdown */}
        <Card title="Desglose por Habilidad" className="mb-6">
          <SkillBreakdownChart skills={result.skill_breakdown} />
        </Card>

        {/* Weak areas and recommendations */}
        <Card title={passed ? "Proximos pasos" : "Areas de mejora"} className="mb-8">
          <div className="space-y-3 text-sm text-gray-600">
            {!passed && (
              <>
                {result.skill_breakdown
                  .filter((s) => s.score < 70)
                  .map((s) => (
                    <div
                      key={s.skill}
                      className="flex items-start gap-2 rounded-lg bg-orange-50 p-3"
                    >
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-orange-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                        />
                      </svg>
                      <p>
                        <span className="font-medium capitalize text-gray-900">
                          {s.skill}
                        </span>
                        : Practica mas ejercicios de{" "}
                        {s.skill === "vocabulary"
                          ? "vocabulario"
                          : s.skill === "grammar"
                            ? "gramatica"
                            : "comprension lectora"}{" "}
                        antes de volver a intentar el examen.
                      </p>
                    </div>
                  ))}
                <p className="mt-2">
                  Te recomendamos completar mas lecciones y ejercicios en nivel{" "}
                  {result.assigned_level} antes de volver a intentar el examen.
                </p>
              </>
            )}
            {passed && (
              <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
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
                <p>
                  Has desbloqueado el siguiente nivel. Continua aprendiendo para
                  fortalecer tus habilidades y prepararte para el proximo examen.
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="primary" size="lg" onClick={() => navigate("/")}>
            Ir al Dashboard
          </Button>
          {!passed && (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setPhase("select_level");
                setExamState(null);
                setResult(null);
                setError(null);
              }}
            >
              Reintentar Examen
            </Button>
          )}
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

  const {
    currentQuestion,
    questionNumber,
    totalQuestions,
    targetLevel,
    selectedAnswer,
    showFeedback,
  } = examState;

  const progressPercent = (questionNumber / totalQuestions) * 100;

  return (
    <div className="mx-auto max-w-2xl py-8">
      {/* Header with progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-500">
            Pregunta {questionNumber} de {totalQuestions}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${
              LEVEL_COLORS[targetLevel] ?? "bg-gray-100 text-gray-800 border-gray-300"
            }`}
          >
            Examen {targetLevel}
          </span>
        </div>
        <ProgressBar
          percent={progressPercent}
          cefrLevel={targetLevel}
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
