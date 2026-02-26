/**
 * Listening Comprehension page.
 *
 * Views:
 * 1. Exercise list  - Cards showing title, description, difficulty, duration
 * 2. Exercise player - Audio player, comprehension questions, transcript toggle
 * 3. Session summary - Score, feedback per question, mastery update
 */

import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Button, Card, LoadingState, ProgressBar } from "@/components/common";
import {
  AudioPlayerExtended,
  ComprehensionQuestion,
  TranscriptView,
} from "@/components/listening";
import type { QuestionFeedbackData } from "@/components/listening";
import {
  getListeningExercises,
  getListeningExerciseDetail,
  submitListeningAnswers,
  revealTranscript,
  type ListeningExerciseSummary,
  type ListeningExerciseDetail,
  type SubmitAnswersResponse,
  type TranscriptData,
  type AudioSegment,
} from "@/services/listening";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PageView = "list" | "player" | "summary";

const DEFAULT_CEFR_LEVEL: CEFRLevel = "A1";

// ---------------------------------------------------------------------------
// Helper: format duration
// ---------------------------------------------------------------------------

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

// ---------------------------------------------------------------------------
// Exercise list view
// ---------------------------------------------------------------------------

function ExerciseListView({
  exercises,
  loading,
  cefrLevel,
  onCefrChange,
  onSelectExercise,
}: {
  exercises: ListeningExerciseSummary[];
  loading: boolean;
  cefrLevel: CEFRLevel;
  onCefrChange: (level: CEFRLevel) => void;
  onSelectExercise: (exercise: ListeningExerciseSummary) => void;
}) {
  const cefrLevels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

  return (
    <div>
      {/* CEFR level tabs */}
      <div className="mb-6 flex gap-2">
        {cefrLevels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onCefrChange(level)}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              cefrLevel === level
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200",
            ].join(" ")}
          >
            {level}
          </button>
        ))}
      </div>

      {/* Exercise cards */}
      {loading ? (
        <LoadingState
          message="Cargando ejercicios de escucha..."
          skeleton
          skeletonLines={4}
        />
      ) : exercises.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.536 8.464a5 5 0 010 7.072M12 12h.01M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500">
            No hay ejercicios de escucha disponibles para el nivel {cefrLevel}.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exercises.map((exercise) => (
            <Card
              key={exercise.id}
              hoverable
              onClick={() => onSelectExercise(exercise)}
              className="transition-transform hover:-translate-y-0.5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {exercise.title_fr}
                  </h3>
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {exercise.cefr_level}
                  </span>
                </div>

                <p className="text-sm text-gray-600">
                  {exercise.title_es}
                </p>

                {exercise.description_es && (
                  <p className="text-xs text-gray-500">
                    {exercise.description_es}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {formatDuration(exercise.duration_seconds)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                      />
                    </svg>
                    {exercise.question_count} preguntas
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Session summary view
// ---------------------------------------------------------------------------

function SessionSummaryView({
  result,
  exerciseTitle,
  onBackToList,
}: {
  result: SubmitAnswersResponse;
  exerciseTitle: string;
  onBackToList: () => void;
}) {
  const scorePercent = Math.round(result.score * 100);
  const isPassing = result.score >= 0.5;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Score card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5 text-center">
          <h2 className="text-xl font-bold text-gray-900">
            Resultado de comprension
          </h2>
          <p className="mt-1 text-sm text-gray-500">{exerciseTitle}</p>
        </div>

        <div className="px-6 py-6">
          {/* Big score display */}
          <div className="mb-6 text-center">
            <span
              className={`text-5xl font-bold ${
                isPassing ? "text-green-600" : "text-red-500"
              }`}
            >
              {scorePercent}%
            </span>
            <p className="mt-1 text-sm text-gray-500">
              {result.correct_count} de {result.total_count} respuestas
              correctas
            </p>
          </div>

          {/* Progress bar */}
          <ProgressBar
            percent={scorePercent}
            label="Puntaje"
            showPercent
            size="lg"
            className="mb-6"
          />

          {/* XP earned */}
          {result.xp_awarded > 0 && (
            <div className="mb-6 flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-3">
              <svg
                className="h-5 w-5 text-amber-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path d="M10 1l2.928 6.472L20 8.236l-5 5.28L16.18 20 10 16.472 3.82 20 5 13.516 0 8.236l7.072-.764L10 1z" />
              </svg>
              <span className="text-sm font-semibold text-amber-700">
                +{result.xp_awarded} XP ganados
              </span>
            </div>
          )}

          {/* Mastery update */}
          {result.mastery_update && (
            <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">
                  Dominio de escucha:
                </span>{" "}
                {result.mastery_update.new_mastery_percentage}%
              </p>
            </div>
          )}

          {/* Per-question feedback */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Detalle por pregunta:
            </h3>
            {result.feedback.map((fb, idx) => (
              <div
                key={fb.question_id}
                className={`rounded-lg border px-4 py-3 ${
                  fb.correct
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      fb.correct
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      fb.correct ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {fb.correct ? "Correcto" : "Incorrecto"}
                  </span>
                </div>
                {!fb.correct && (
                  <div className="mt-2 space-y-1 pl-8">
                    <p className="text-xs text-gray-600">
                      Tu respuesta:{" "}
                      <span className="font-medium text-red-600">
                        {fb.user_answer}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600">
                      Respuesta correcta:{" "}
                      <span className="font-medium text-green-600">
                        {fb.correct_answer}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {fb.explanation_es}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 text-center rounded-b-xl">
          <Button variant="primary" onClick={onBackToList}>
            Volver a la lista de ejercicios
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main listening page
// ---------------------------------------------------------------------------

export default function Listening() {
  const intl = useIntl();

  // View state
  const [view, setView] = useState<PageView>("list");

  // List state
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>(DEFAULT_CEFR_LEVEL);
  const [exercises, setExercises] = useState<ListeningExerciseSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Player state
  const [exerciseDetail, setExerciseDetail] =
    useState<ListeningExerciseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState(0);

  // Answers state
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] =
    useState<SubmitAnswersResponse | null>(null);

  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ---- Load exercise list ----
  useEffect(() => {
    async function loadExercises() {
      setListLoading(true);
      setError(null);
      try {
        const result = await getListeningExercises(cefrLevel);
        setExercises(result.exercises);
      } catch {
        setError("Error al cargar los ejercicios de escucha.");
        setExercises([]);
      } finally {
        setListLoading(false);
      }
    }
    loadExercises();
  }, [cefrLevel]);

  // ---- Select exercise ----
  const handleSelectExercise = useCallback(
    async (exercise: ListeningExerciseSummary) => {
      setDetailLoading(true);
      setError(null);
      setSelectedAnswers({});
      setSubmitResult(null);
      setTranscript(null);
      setShowTranscript(false);
      setCurrentAudioTime(0);

      try {
        const detail = await getListeningExerciseDetail(exercise.id);
        setExerciseDetail(detail);
        setView("player");
      } catch {
        setError("Error al cargar el ejercicio.");
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  // ---- Handle answer selection ----
  const handleAnswer = useCallback(
    (questionId: string, answer: string) => {
      setSelectedAnswers((prev) => ({
        ...prev,
        [questionId]: answer,
      }));
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
      const result = await submitListeningAnswers(
        exerciseDetail.id,
        answers
      );
      setSubmitResult(result);
      setView("summary");
    } catch {
      setError("Error al enviar las respuestas.");
    } finally {
      setSubmitting(false);
    }
  }, [exerciseDetail, selectedAnswers]);

  // ---- Reveal transcript ----
  const handleRevealTranscript = useCallback(async () => {
    if (!exerciseDetail) return;

    setTranscriptLoading(true);
    try {
      const data = await revealTranscript(exerciseDetail.id);
      setTranscript(data);
      setShowTranscript(true);
    } catch {
      setError("Error al cargar la transcripcion.");
    } finally {
      setTranscriptLoading(false);
    }
  }, [exerciseDetail]);

  // ---- Toggle transcript visibility ----
  const handleToggleTranscript = useCallback(() => {
    if (!transcript) {
      handleRevealTranscript();
    } else {
      setShowTranscript((prev) => !prev);
    }
  }, [transcript, handleRevealTranscript]);

  // ---- Handle segment replay from transcript ----
  const handleSegmentClick = useCallback((_segment: AudioSegment) => {
    // The AudioPlayerExtended handles segment replay internally
    // This is a placeholder for potential additional functionality
  }, []);

  // ---- Navigate back to list ----
  const handleBackToList = useCallback(() => {
    setView("list");
    setExerciseDetail(null);
    setSelectedAnswers({});
    setSubmitResult(null);
    setTranscript(null);
    setShowTranscript(false);
    setCurrentAudioTime(0);
    setError(null);
  }, []);

  // ---- Build feedback map for submitted answers ----
  const feedbackMap: Record<string, QuestionFeedbackData> = {};
  if (submitResult) {
    for (const fb of submitResult.feedback) {
      feedbackMap[fb.question_id] = {
        correct: fb.correct,
        correct_answer: fb.correct_answer,
        explanation_es: fb.explanation_es,
      };
    }
  }

  // ---- Determine how many questions are answered ----
  const totalQuestions = exerciseDetail?.questions.length ?? 0;
  const answeredCount = Object.keys(selectedAnswers).length;
  const allAnswered = answeredCount === totalQuestions && totalQuestions > 0;

  // ========================================================================
  // Render: Summary view
  // ========================================================================
  if (view === "summary" && submitResult && exerciseDetail) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Volver a ejercicios
          </button>
        </div>

        <SessionSummaryView
          result={submitResult}
          exerciseTitle={`${exerciseDetail.title_fr} - ${exerciseDetail.title_es}`}
          onBackToList={handleBackToList}
        />
      </div>
    );
  }

  // ========================================================================
  // Render: Exercise player view
  // ========================================================================
  if (view === "player" && exerciseDetail) {
    return (
      <div className="mx-auto max-w-4xl">
        {/* Back button */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBackToList}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
            Volver a ejercicios
          </button>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {exerciseDetail.title_fr}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {exerciseDetail.title_es}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
              {exerciseDetail.cefr_level}
            </span>
          </div>
          {exerciseDetail.description_es && (
            <p className="mt-2 text-sm text-gray-600">
              {exerciseDetail.description_es}
            </p>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button
              type="button"
              className="ml-2 font-medium underline"
              onClick={() => setError(null)}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Audio player */}
        <AudioPlayerExtended
          src={exerciseDetail.audio_url}
          segments={exerciseDetail.segments}
          onTimeUpdate={setCurrentAudioTime}
          className="mb-6"
        />

        {/* Transcript toggle */}
        <div className="mb-6">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleToggleTranscript}
            loading={transcriptLoading}
            icon={
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            }
          >
            {showTranscript
              ? "Ocultar transcripcion"
              : "Mostrar transcripcion"}
          </Button>
        </div>

        {/* Transcript (collapsible) */}
        {showTranscript && transcript && (
          <TranscriptView
            dialogueTextFr={transcript.dialogue_text_fr}
            dialogueTextEs={transcript.dialogue_text_es}
            segments={transcript.segments}
            currentTime={currentAudioTime}
            onSegmentClick={handleSegmentClick}
            className="mb-6"
          />
        )}

        {/* Comprehension questions */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Preguntas de comprension
            </h2>
            <span className="text-sm text-gray-500">
              {answeredCount} / {totalQuestions} respondidas
            </span>
          </div>

          <div className="space-y-4">
            {exerciseDetail.questions.map((q, idx) => (
              <ComprehensionQuestion
                key={q.id}
                question={{
                  id: q.id,
                  question_fr: q.question_fr,
                  question_es: q.question_es,
                  options: q.options,
                }}
                questionNumber={idx + 1}
                selectedAnswer={selectedAnswers[q.id] ?? null}
                feedback={feedbackMap[q.id] ?? null}
                onAnswer={handleAnswer}
                disabled={submitting || submitResult != null}
              />
            ))}
          </div>
        </div>

        {/* Submit button */}
        {!submitResult && (
          <div className="sticky bottom-4 flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              loading={submitting}
              disabled={!allAnswered || submitting}
            >
              {allAnswered
                ? "Enviar respuestas"
                : `Responde las ${totalQuestions} preguntas para continuar`}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ========================================================================
  // Render: Exercise list view (default)
  // ========================================================================
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "listening.title" })}
        </h1>
        <p className="mt-2 text-gray-500">
          Mejora tu comprension auditiva con ejercicios de escucha en
          situaciones reales de la vida cotidiana en Francia.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Loading detail overlay */}
      {detailLoading && (
        <LoadingState
          message="Cargando ejercicio..."
          estimatedDuration="unos segundos"
        />
      )}

      {/* Exercise list */}
      {!detailLoading && (
        <ExerciseListView
          exercises={exercises}
          loading={listLoading}
          cefrLevel={cefrLevel}
          onCefrChange={setCefrLevel}
          onSelectExercise={handleSelectExercise}
        />
      )}
    </div>
  );
}
