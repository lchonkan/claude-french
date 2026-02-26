import { useCallback, useEffect, useState } from "react";
import { useIntl } from "react-intl";
import { Button, Card, ProgressBar, LoadingState, ErrorState } from "@/components/common";
import { FillBlank } from "@/components/grammar/FillBlank";
import { SentenceReorder } from "@/components/grammar/SentenceReorder";
import { ConjugationPractice } from "@/components/grammar/ConjugationPractice";
import { ErrorCorrection } from "@/components/grammar/ErrorCorrection";
import type { CEFRLevel, Module, ExerciseType } from "@/types";
import {
  getLessons,
  getLesson,
  submitExercise,
  type LessonSummary,
  type LessonDetail,
  type LessonExerciseDetail,
  type ExerciseSubmitResult,
} from "@/services/grammar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "list" | "lesson" | "complete";

interface ExerciseAttempt {
  exerciseId: string;
  result: ExerciseSubmitResult;
}

// ---------------------------------------------------------------------------
// CEFR level selector
// ---------------------------------------------------------------------------

const CEFR_LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

function CEFRSelector({
  selected,
  onSelect,
}: {
  selected: CEFRLevel;
  onSelect: (level: CEFRLevel) => void;
}) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Nivel CEFR">
      {CEFR_LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          role="radio"
          aria-checked={selected === level}
          onClick={() => onSelect(level)}
          className={[
            "min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
            selected === level
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          ].join(" ")}
        >
          {level}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson list view
// ---------------------------------------------------------------------------

function LessonList({
  lessons,
  onSelect,
}: {
  lessons: LessonSummary[];
  onSelect: (lesson: LessonSummary) => void;
}) {
  if (lessons.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        No hay lecciones disponibles para este nivel.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lessons.map((lesson) => (
        <Card
          key={lesson.id}
          hoverable
          onClick={() => onSelect(lesson)}
          className="cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">
                {lesson.title_es}
              </h3>
              <p className="mt-0.5 text-sm text-blue-600">
                {lesson.title_fr}
              </p>
              {lesson.description_es && (
                <p className="mt-1 text-sm text-gray-500">
                  {lesson.description_es}
                </p>
              )}
            </div>
            <div className="ml-4 flex flex-col items-end gap-1">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {lesson.exercise_count} ejercicios
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Concept explanation panel
// ---------------------------------------------------------------------------

function ConceptExplanation({ lesson }: { lesson: LessonDetail }) {
  const content = lesson.content;

  return (
    <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50 p-6">
      <h3 className="text-lg font-semibold text-blue-900">
        {lesson.title_fr}
      </h3>

      {content.explanation_es && (
        <div className="whitespace-pre-line text-sm text-gray-800">
          {content.explanation_es}
        </div>
      )}

      {content.examples && content.examples.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-blue-800">Ejemplos:</h4>
          {content.examples.map((ex, i) => (
            <div
              key={i}
              className="rounded-lg bg-white p-3 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-900">{ex.fr}</p>
              <p className="text-sm text-gray-500">{ex.es}</p>
            </div>
          ))}
        </div>
      )}

      {content.notes_es && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Nota:</strong> {content.notes_es}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercise renderer (dispatches to the appropriate component)
// ---------------------------------------------------------------------------

function ExerciseRenderer({
  exercise,
  onSubmit,
  submitting,
  result,
}: {
  exercise: LessonExerciseDetail;
  onSubmit: (answer: string | string[] | Record<string, string>) => void;
  submitting: boolean;
  result: ExerciseSubmitResult | null;
}) {
  const type = exercise.exercise_type as ExerciseType;
  const content = exercise.content;

  switch (type) {
    case "fill_blank":
    case "multiple_choice":
      return (
        <FillBlank
          promptEs={exercise.prompt_es}
          sentence={content.sentence ?? content.question ?? ""}
          options={content.options ?? []}
          correctAnswer={result?.correct_answer ?? undefined}
          onSubmit={onSubmit}
          submitting={submitting}
          result={result}
        />
      );

    case "reorder":
      return (
        <SentenceReorder
          promptEs={exercise.prompt_es}
          words={content.correct_order ?? []}
          onSubmit={(ordered) => onSubmit(ordered)}
          submitting={submitting}
          result={result}
        />
      );

    case "conjugate":
      return (
        <ConjugationPractice
          promptEs={exercise.prompt_es}
          verb={content.verb ?? ""}
          translation={content.translation ?? ""}
          expectedForms={content.expected ?? {}}
          onSubmit={(forms) => onSubmit(forms)}
          submitting={submitting}
          result={result}
        />
      );

    case "error_correct":
      return (
        <ErrorCorrection
          promptEs={exercise.prompt_es}
          sentence={content.sentence ?? ""}
          errorWord={content.error_word ?? ""}
          onSubmit={onSubmit}
          submitting={submitting}
          result={result}
        />
      );

    default:
      return (
        <div className="rounded-lg bg-gray-50 p-4 text-gray-500">
          Tipo de ejercicio no soportado: {type}
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Lesson complete summary
// ---------------------------------------------------------------------------

function LessonComplete({
  lesson,
  attempts,
  onBack,
}: {
  lesson: LessonDetail;
  attempts: ExerciseAttempt[];
  onBack: () => void;
}) {
  const totalCorrect = attempts.filter((a) => a.result.correct).length;
  const totalExercises = attempts.length;
  const percentage =
    totalExercises > 0
      ? Math.round((totalCorrect / totalExercises) * 100)
      : 0;
  const totalXp = attempts.reduce(
    (sum, a) => sum + (a.result.xp_awarded ?? 0),
    0,
  );

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="rounded-xl border border-green-200 bg-green-50 p-8">
        <h2 className="text-2xl font-bold text-green-800">
          Leccion completada
        </h2>
        <p className="mt-2 text-lg text-green-700">{lesson.title_es}</p>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div>
            <p className="text-3xl font-bold text-green-800">{percentage}%</p>
            <p className="text-sm text-green-600">Acierto</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-800">
              {totalCorrect}/{totalExercises}
            </p>
            <p className="text-sm text-green-600">Correctas</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-800">+{totalXp}</p>
            <p className="text-sm text-green-600">XP</p>
          </div>
        </div>

        <ProgressBar
          percent={percentage}
          size="lg"
          className="mt-6"
          cefrLevel={lesson.cefr_level as CEFRLevel}
        />
      </div>

      {/* Per-exercise review */}
      <div className="space-y-2 text-left">
        <h3 className="text-sm font-semibold text-gray-700">
          Resumen de ejercicios:
        </h3>
        {attempts.map((attempt, idx) => (
          <div
            key={attempt.exerciseId}
            className={[
              "flex items-start gap-3 rounded-lg p-3 text-sm",
              attempt.result.correct
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800",
            ].join(" ")}
          >
            <span className="mt-0.5 font-bold">
              {idx + 1}.
            </span>
            <div className="flex-1">
              <span className="font-medium">
                {attempt.result.correct ? "Correcto" : "Incorrecto"}
              </span>
              <p className="mt-0.5 text-xs opacity-80">
                {attempt.result.feedback_es}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Button variant="primary" onClick={onBack}>
        Volver a lecciones
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function GrammarLesson() {
  const intl = useIntl();

  // State
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>("A1");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonDetail | null>(
    null,
  );
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(true);
  const [attempts, setAttempts] = useState<ExerciseAttempt[]>([]);
  const [currentResult, setCurrentResult] =
    useState<ExerciseSubmitResult | null>(null);

  // Loading / error
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch lesson list
  // ---------------------------------------------------------------------------

  const fetchLessons = useCallback(async () => {
    setLoadingLessons(true);
    setError(null);
    try {
      const resp = await getLessons({
        module: "grammar" as Module,
        cefr_level: cefrLevel,
      });
      setLessons(resp.data.lessons);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar lecciones",
      );
    } finally {
      setLoadingLessons(false);
    }
  }, [cefrLevel]);

  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);

  // ---------------------------------------------------------------------------
  // Select and load a lesson
  // ---------------------------------------------------------------------------

  const handleSelectLesson = useCallback(async (summary: LessonSummary) => {
    setLoadingLesson(true);
    setError(null);
    try {
      const resp = await getLesson(summary.id);
      setCurrentLesson(resp.data);
      setCurrentExerciseIndex(0);
      setAttempts([]);
      setCurrentResult(null);
      setShowExplanation(true);
      setViewMode("lesson");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar la leccion",
      );
    } finally {
      setLoadingLesson(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Submit exercise
  // ---------------------------------------------------------------------------

  const handleSubmitExercise = useCallback(
    async (answer: string | string[] | Record<string, string>) => {
      if (!currentLesson) return;
      const exercise = currentLesson.exercises[currentExerciseIndex];
      if (!exercise) return;

      setSubmitting(true);
      try {
        const resp = await submitExercise(
          currentLesson.id,
          exercise.id,
          answer,
        );
        setCurrentResult(resp.data);
        setAttempts((prev) => [
          ...prev,
          { exerciseId: exercise.id, result: resp.data },
        ]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al enviar respuesta",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [currentLesson, currentExerciseIndex],
  );

  // ---------------------------------------------------------------------------
  // Navigate exercises
  // ---------------------------------------------------------------------------

  const handleNextExercise = useCallback(() => {
    if (!currentLesson) return;

    const nextIdx = currentExerciseIndex + 1;
    if (nextIdx >= currentLesson.exercises.length) {
      setViewMode("complete");
    } else {
      setCurrentExerciseIndex(nextIdx);
      setCurrentResult(null);
    }
  }, [currentLesson, currentExerciseIndex]);

  const handleBackToList = useCallback(() => {
    setViewMode("list");
    setCurrentLesson(null);
    setAttempts([]);
    setCurrentResult(null);
    setShowExplanation(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Lesson list view
  if (viewMode === "list") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: "grammar.lesson.title" })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Selecciona un nivel y una leccion de gramatica para comenzar.
          </p>
        </div>

        <CEFRSelector selected={cefrLevel} onSelect={setCefrLevel} />

        {loadingLessons ? (
          <LoadingState message="Cargando lecciones..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchLessons} />
        ) : (
          <LessonList lessons={lessons} onSelect={handleSelectLesson} />
        )}
      </div>
    );
  }

  // Lesson complete view
  if (viewMode === "complete" && currentLesson) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <LessonComplete
          lesson={currentLesson}
          attempts={attempts}
          onBack={handleBackToList}
        />
      </div>
    );
  }

  // Active lesson view
  if (!currentLesson || loadingLesson) {
    return (
      <div className="mx-auto max-w-3xl">
        <LoadingState message="Cargando leccion..." />
      </div>
    );
  }

  const exercises = currentLesson.exercises;
  const currentExercise = exercises[currentExerciseIndex];
  const progressPercent =
    exercises.length > 0
      ? Math.round((currentExerciseIndex / exercises.length) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={handleBackToList}
            className="mb-1 text-sm text-blue-600 hover:text-blue-800"
          >
            &larr; Volver a lecciones
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {currentLesson.title_es}
          </h1>
          <p className="text-sm text-blue-600">{currentLesson.title_fr}</p>
        </div>
        <div className="text-right text-sm text-gray-500">
          Ejercicio {currentExerciseIndex + 1} de {exercises.length}
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar
        percent={progressPercent}
        size="sm"
        cefrLevel={currentLesson.cefr_level as CEFRLevel}
      />

      {/* Concept explanation toggle */}
      {showExplanation && currentExerciseIndex === 0 && (
        <div>
          <ConceptExplanation lesson={currentLesson} />
          <div className="mt-3 text-center">
            <Button
              variant="primary"
              onClick={() => setShowExplanation(false)}
            >
              Comenzar ejercicios
            </Button>
          </div>
        </div>
      )}

      {/* Exercise */}
      {(!showExplanation || currentExerciseIndex > 0) && currentExercise && (
        <div className="space-y-4">
          <ExerciseRenderer
            exercise={currentExercise}
            onSubmit={handleSubmitExercise}
            submitting={submitting}
            result={currentResult}
          />

          {/* Feedback display */}
          {currentResult && (
            <div
              className={[
                "rounded-lg p-4 text-sm",
                currentResult.correct
                  ? "border border-green-200 bg-green-50 text-green-800"
                  : "border border-red-200 bg-red-50 text-red-800",
              ].join(" ")}
            >
              <p className="font-medium">
                {currentResult.correct ? "Correcto!" : "Incorrecto"}
              </p>
              <p className="mt-1">{currentResult.feedback_es}</p>
              {currentResult.xp_awarded > 0 && (
                <p className="mt-1 font-medium">
                  +{currentResult.xp_awarded} XP
                </p>
              )}
            </div>
          )}

          {/* Next button (shown after answer) */}
          {currentResult && (
            <div className="text-center">
              <Button variant="primary" onClick={handleNextExercise}>
                {currentExerciseIndex + 1 >= exercises.length
                  ? "Ver resumen"
                  : "Siguiente ejercicio"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
