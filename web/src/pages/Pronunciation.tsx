/**
 * Pronunciation practice page.
 *
 * Flow:
 * 1. Exercise selection -- choose a phrase to practice at the user's CEFR level.
 * 2. Practice view -- listen to reference audio, record your attempt, submit.
 * 3. Evaluation view -- view phoneme accuracy map, scores, and suggestions.
 *
 * Integrates:
 * - `useAudioRecorder` for microphone capture (WAV 16kHz mono)
 * - Pronunciation API service for exercises, upload, evaluation
 * - Pronunciation components (RecordButton, WaveformVisualizer, PhonemeMap, etc.)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Button, Card, LoadingState } from "@/components/common";
import {
  PhonemeMap,
  WaveformVisualizer,
  RecordButton,
  SpeedControl,
  FluencyScore,
} from "@/components/pronunciation";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import {
  getExercises,
  getUploadUrl,
  uploadAudio,
  startEvaluation,
  pollEvaluation,
  getHistory,
  type PronunciationExercise,
  type EvaluationDetail,
  type HistoryAttempt,
} from "@/services/pronunciation";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Page views
// ---------------------------------------------------------------------------

type PageView = "exercises" | "practice" | "evaluating" | "results" | "history";

// ---------------------------------------------------------------------------
// Default CEFR level (in a real app, from user profile)
// ---------------------------------------------------------------------------

const DEFAULT_CEFR_LEVEL: CEFRLevel = "A1";

// ---------------------------------------------------------------------------
// Pronunciation page
// ---------------------------------------------------------------------------

export default function Pronunciation() {
  const intl = useIntl();

  // View state
  const [view, setView] = useState<PageView>("exercises");

  // Exercises
  const [exercises, setExercises] = useState<PronunciationExercise[]>([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<PronunciationExercise | null>(null);
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>(DEFAULT_CEFR_LEVEL);

  // Audio playback
  const [playbackSpeed, setPlaybackSpeed] = useState(0.75);
  const referenceAudioRef = useRef<HTMLAudioElement | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Recorder
  const recorder = useAudioRecorder();

  // Evaluation
  const [evaluationResult, setEvaluationResult] = useState<EvaluationDetail | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryAttempt[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ---- Load exercises on mount / level change ----
  useEffect(() => {
    async function load() {
      setExercisesLoading(true);
      try {
        const result = await getExercises(cefrLevel, 20);
        setExercises(result.exercises);
      } catch {
        setError("No se pudieron cargar los ejercicios de pronunciacion.");
      } finally {
        setExercisesLoading(false);
      }
    }
    load();
  }, [cefrLevel]);

  // ---- Select an exercise ----
  const handleSelectExercise = useCallback(
    (exercise: PronunciationExercise) => {
      setSelectedExercise(exercise);
      setPlaybackSpeed(exercise.recommended_speed);
      setEvaluationResult(null);
      recorder.reset();
      setError(null);
      setView("practice");
    },
    [recorder]
  );

  // ---- Play reference audio ----
  const handlePlayReference = useCallback(() => {
    if (!selectedExercise) return;

    if (referenceAudioRef.current) {
      referenceAudioRef.current.pause();
    }

    const audio = new Audio(selectedExercise.reference_audio_url);
    audio.playbackRate = playbackSpeed;
    referenceAudioRef.current = audio;
    audio.play().catch(() => {
      // Reference audio may not be available in dev
    });
  }, [selectedExercise, playbackSpeed]);

  // ---- Play recorded audio ----
  const handlePlayRecording = useCallback(() => {
    if (!recorder.audioUrl) return;

    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }

    const audio = new Audio(recorder.audioUrl);
    playbackAudioRef.current = audio;
    audio.play().catch(() => {});
  }, [recorder.audioUrl]);

  // ---- Submit for evaluation ----
  const handleSubmit = useCallback(async () => {
    if (!selectedExercise || !recorder.audioBlob) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Get signed upload URL
      const uploadData = await getUploadUrl(
        selectedExercise.id,
        `recording-${Date.now()}.wav`,
        "audio/wav"
      );

      // 2. Upload the audio file
      await uploadAudio(
        uploadData.upload_url,
        uploadData.storage_path,
        recorder.audioBlob,
        "audio/wav"
      );

      // 3. Start evaluation
      const evalResponse = await startEvaluation(
        selectedExercise.id,
        uploadData.storage_path,
        selectedExercise.target_text
      );

      setView("evaluating");
      setEvaluating(true);

      // 4. Poll for results
      try {
        const result = await pollEvaluation(evalResponse.evaluation_id);
        setEvaluationResult(result);
        setView("results");
      } catch {
        setError("La evaluacion no se completo a tiempo. Intenta de nuevo.");
        setView("practice");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al enviar la grabacion. Intenta de nuevo."
      );
    } finally {
      setSubmitting(false);
      setEvaluating(false);
    }
  }, [selectedExercise, recorder.audioBlob]);

  // ---- Try again ----
  const handleTryAgain = useCallback(() => {
    recorder.reset();
    setEvaluationResult(null);
    setError(null);
    setView("practice");
  }, [recorder]);

  // ---- Back to exercises ----
  const handleBackToExercises = useCallback(() => {
    recorder.reset();
    setSelectedExercise(null);
    setEvaluationResult(null);
    setError(null);
    setView("exercises");
  }, [recorder]);

  // ---- Show history ----
  const handleShowHistory = useCallback(async () => {
    setHistoryLoading(true);
    setError(null);
    try {
      const result = await getHistory(20, 0);
      setHistory(result.attempts);
      setHistoryTotal(result.total);
      setView("history");
    } catch {
      setError("No se pudo cargar el historial.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // ---- Clean up audio on unmount ----
  useEffect(() => {
    return () => {
      referenceAudioRef.current?.pause();
      playbackAudioRef.current?.pause();
    };
  }, []);

  // ======================================================================
  // Render: Exercise selection
  // ======================================================================
  if (view === "exercises") {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {intl.formatMessage({ id: "pronunciation.title" })}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Practica la pronunciacion francesa con analisis de audio IA.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleShowHistory}>
              Historial
            </Button>
            <select
              value={cefrLevel}
              onChange={(e) => setCefrLevel(e.target.value as CEFRLevel)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Seleccionar nivel CEFR"
            >
              {(["A1", "A2", "B1", "B2", "C1", "C2"] as CEFRLevel[]).map(
                (level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {exercisesLoading ? (
          <LoadingState
            message="Cargando ejercicios..."
            skeleton
            skeletonLines={4}
          />
        ) : exercises.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-gray-500">
              No hay ejercicios disponibles para el nivel {cefrLevel}.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {exercises.map((exercise) => (
              <Card
                key={exercise.id}
                hoverable
                onClick={() => handleSelectExercise(exercise)}
                className="cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {exercise.target_text}
                    </p>
                    <p className="mt-1 font-mono text-xs text-gray-500">
                      {exercise.phonetic_ipa}
                    </p>
                  </div>
                  <span className="ml-3 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    {exercise.cefr_level}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {exercise.focus_phonemes.map((phoneme) => (
                    <span
                      key={phoneme}
                      className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600"
                    >
                      /{phoneme}/
                    </span>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ======================================================================
  // Render: History view
  // ======================================================================
  if (view === "history") {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Historial de pronunciacion
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {historyTotal} intentos totales
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBackToExercises}
          >
            Volver a ejercicios
          </Button>
        </div>

        {historyLoading ? (
          <LoadingState message="Cargando historial..." skeleton skeletonLines={5} />
        ) : history.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-gray-500">
              Aun no tienes intentos de pronunciacion.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((attempt) => (
              <div
                key={attempt.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {attempt.target_text}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(attempt.created_at).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="ml-4 flex items-center gap-4 text-sm">
                  {attempt.overall_score != null && (
                    <span
                      className={`font-semibold ${
                        attempt.overall_score >= 0.7
                          ? "text-green-600"
                          : attempt.overall_score >= 0.4
                            ? "text-amber-600"
                            : "text-red-600"
                      }`}
                    >
                      {Math.round(attempt.overall_score * 100)}%
                    </span>
                  )}
                  {attempt.phoneme_accuracy_score != null && (
                    <span className="text-xs text-gray-500">
                      Fonemas: {Math.round(attempt.phoneme_accuracy_score * 100)}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ======================================================================
  // Render: Evaluating (loading state)
  // ======================================================================
  if (view === "evaluating") {
    return (
      <div className="mx-auto max-w-2xl">
        <LoadingState
          message="Evaluando tu pronunciacion..."
          estimatedDuration="unos 8 segundos"
        />
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            Pipeline: Whisper STT &rarr; Wav2Vec2 fonemas &rarr; Gemini evaluacion
          </p>
        </div>
      </div>
    );
  }

  // ======================================================================
  // Render: Results
  // ======================================================================
  if (view === "results" && evaluationResult && selectedExercise) {
    const pipeline = evaluationResult.pipeline_results;
    const multimodal = pipeline?.multimodal_evaluation;
    const phonemeData = pipeline?.phoneme_alignment;

    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Resultados
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {selectedExercise.target_text}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleTryAgain}>
              Intentar de nuevo
            </Button>
            <Button variant="ghost" size="sm" onClick={handleBackToExercises}>
              Otros ejercicios
            </Button>
          </div>
        </div>

        {/* Transcription comparison */}
        {evaluationResult.transcription && (
          <Card className="mb-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Texto objetivo
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedExercise.target_text}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Tu pronunciacion (transcripcion)
                </p>
                <p className="text-sm font-medium text-gray-700">
                  {evaluationResult.transcription}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Fluency score card */}
        {multimodal && phonemeData && (
          <FluencyScore
            overallScore={multimodal.overall_score}
            phonemeAccuracy={phonemeData.phoneme_accuracy_score}
            prosodyScore={multimodal.prosody_score}
            fluencyScore={multimodal.fluency_score}
            suggestions={multimodal.improvement_suggestions_es}
            className="mb-6"
          />
        )}

        {/* Phoneme map */}
        {phonemeData && phonemeData.phonemes.length > 0 && (
          <Card className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Mapa de fonemas
            </h3>
            <PhonemeMap phonemes={phonemeData.phonemes} />
          </Card>
        )}

        {/* Timing info */}
        {evaluationResult.total_latency_ms != null && (
          <p className="text-center text-xs text-gray-400">
            Tiempo de evaluacion: {(evaluationResult.total_latency_ms / 1000).toFixed(1)}s
            {evaluationResult.xp_awarded != null && (
              <> | +{evaluationResult.xp_awarded} XP</>
            )}
          </p>
        )}
      </div>
    );
  }

  // ======================================================================
  // Render: Practice view (recording)
  // ======================================================================
  if (!selectedExercise) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleBackToExercises}>
          &larr; Ejercicios
        </Button>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
          {selectedExercise.cefr_level}
        </span>
      </div>

      {/* Error banner */}
      {(error || recorder.error) && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error || recorder.error}
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Target phrase */}
      <Card className="mb-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">
            {selectedExercise.target_text}
          </p>
          <p className="mt-2 font-mono text-sm text-gray-500">
            {selectedExercise.phonetic_ipa}
          </p>
          {selectedExercise.focus_phonemes.length > 0 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {selectedExercise.focus_phonemes.map((phoneme) => (
                <span
                  key={phoneme}
                  className="rounded bg-amber-100 px-2 py-0.5 font-mono text-xs font-medium text-amber-800"
                >
                  /{phoneme}/
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Reference audio playback */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <Button variant="secondary" size="sm" onClick={handlePlayReference}>
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
            />
          </svg>
          Escuchar referencia
        </Button>
        <SpeedControl speed={playbackSpeed} onSpeedChange={setPlaybackSpeed} />
      </div>

      {/* Recording area */}
      <div className="flex flex-col items-center gap-6">
        {/* Waveform visualizer */}
        <WaveformVisualizer
          audioLevel={recorder.audioLevel}
          isRecording={recorder.isRecording}
          width={320}
          height={56}
          barColor={recorder.isRecording ? "#EF4444" : "#2563EB"}
        />

        {/* Record button */}
        <RecordButton
          state={recorder.state}
          onStart={recorder.startRecording}
          onStop={recorder.stopRecording}
          onPause={recorder.pauseRecording}
          onResume={recorder.resumeRecording}
          disabled={submitting || evaluating}
        />

        {/* Duration */}
        {(recorder.isRecording || recorder.isPaused) && (
          <p className="text-sm font-mono text-gray-600">
            {recorder.duration.toFixed(1)}s
            {recorder.isPaused && (
              <span className="ml-2 text-yellow-600">(pausado)</span>
            )}
          </p>
        )}

        {/* Playback + Submit (after recording) */}
        {recorder.state === "stopped" && recorder.audioBlob && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePlayRecording}
              >
                Escuchar grabacion
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={recorder.reset}
              >
                Volver a grabar
              </Button>
            </div>

            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={submitting}
              disabled={submitting}
            >
              Evaluar pronunciacion
            </Button>
          </div>
        )}

        {/* Recording instructions */}
        {recorder.state === "idle" && (
          <p className="text-center text-xs text-gray-400">
            Presiona el boton rojo para grabar.
            <br />
            Pronuncia la frase claramente.
          </p>
        )}
      </div>
    </div>
  );
}
