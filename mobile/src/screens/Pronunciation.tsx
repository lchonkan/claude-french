/**
 * Mobile pronunciation screen (simplified).
 *
 * Provides a streamlined pronunciation practice flow on mobile:
 * 1. Select an exercise phrase
 * 2. Listen to reference audio, record your attempt
 * 3. Submit for evaluation and view results
 *
 * Uses expo-av for audio recording and playback.
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
import { Audio } from "expo-av";
import { apiClient } from "../services/api";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PronunciationExercise {
  id: string;
  target_text: string;
  phonetic_ipa: string;
  reference_audio_url: string;
  cefr_level: string;
  focus_phonemes: string[];
  recommended_speed: number;
}

interface PhonemeDetail {
  target: string;
  actual: string;
  score: number;
  issue?: string | null;
}

interface EvaluationResult {
  evaluation_id: string;
  status: string;
  target_text: string;
  transcription: string | null;
  pipeline_results: {
    stt: { transcription: string; confidence: number } | null;
    phoneme_alignment: {
      phonemes: PhonemeDetail[];
      phoneme_accuracy_score: number;
    } | null;
    multimodal_evaluation: {
      prosody_score: number;
      fluency_score: number;
      overall_score: number;
      improvement_suggestions_es: string[];
    } | null;
  } | null;
  total_latency_ms: number | null;
  xp_awarded: number | null;
}

type ScreenView = "exercises" | "practice" | "evaluating" | "results";

// ---------------------------------------------------------------------------
// Fallback exercises
// ---------------------------------------------------------------------------

const FALLBACK_EXERCISES: PronunciationExercise[] = [
  {
    id: "a1-001",
    target_text: "Bonjour, je m'appelle Marie.",
    phonetic_ipa: "/b\u0254\u0303.\u0292u\u0281, \u0292\u0259 ma.p\u025bl ma.\u0281i/",
    reference_audio_url: "",
    cefr_level: "A1",
    focus_phonemes: ["\u0254\u0303", "\u0292", "\u0281"],
    recommended_speed: 0.75,
  },
  {
    id: "a1-002",
    target_text: "Comment allez-vous ?",
    phonetic_ipa: "/k\u0254.m\u0251\u0303 a.le vu/",
    reference_audio_url: "",
    cefr_level: "A1",
    focus_phonemes: ["\u0254", "\u0251\u0303"],
    recommended_speed: 0.75,
  },
  {
    id: "a1-003",
    target_text: "Je voudrais un croissant, s'il vous pla\u00eet.",
    phonetic_ipa: "/\u0292\u0259 vu.d\u0281\u025b \u0153\u0303 k\u0281wa.s\u0251\u0303, sil vu pl\u025b/",
    reference_audio_url: "",
    cefr_level: "A1",
    focus_phonemes: ["\u0281", "\u0153\u0303", "\u0251\u0303"],
    recommended_speed: 0.75,
  },
  {
    id: "a1-004",
    target_text: "Merci beaucoup.",
    phonetic_ipa: "/m\u025b\u0281.si bo.ku/",
    reference_audio_url: "",
    cefr_level: "A1",
    focus_phonemes: ["\u0281", "u"],
    recommended_speed: 0.75,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score * 100);
  const barColor =
    score >= 0.7 ? "#22C55E" : score >= 0.4 ? "#F59E0B" : "#EF4444";

  return (
    <View style={styles.scoreBarContainer}>
      <View style={styles.scoreBarHeader}>
        <Text style={styles.scoreBarLabel}>{label}</Text>
        <Text
          style={[
            styles.scoreBarValue,
            { color: barColor },
          ]}
        >
          {pct}%
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

function PhonemePill({ phoneme }: { phoneme: PhonemeDetail }) {
  const pct = Math.round(phoneme.score * 100);
  const bgColor =
    phoneme.score >= 0.7
      ? "#DCFCE7"
      : phoneme.score >= 0.4
        ? "#FEF9C3"
        : "#FEE2E2";
  const textColor =
    phoneme.score >= 0.7
      ? "#166534"
      : phoneme.score >= 0.4
        ? "#854D0E"
        : "#991B1B";

  return (
    <View
      style={[styles.phonemePill, { backgroundColor: bgColor }]}
      accessibilityLabel={`Fonema ${phoneme.target}: ${pct}%`}
    >
      <Text style={[styles.phonemePillText, { color: textColor }]}>
        {phoneme.target}
      </Text>
      <Text style={[styles.phonemePillScore, { color: textColor }]}>
        {pct}%
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function PronunciationScreen() {
  // View state
  const [view, setView] = useState<ScreenView>("exercises");

  // Exercises
  const [exercises, setExercises] = useState<PronunciationExercise[]>(
    FALLBACK_EXERCISES
  );
  const [loadingExercises, setLoadingExercises] = useState(true);
  const [selectedExercise, setSelectedExercise] =
    useState<PronunciationExercise | null>(null);

  // Recorder
  const recorder = useAudioRecorder();

  // Evaluation
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Playback
  const soundRef = useRef<Audio.Sound | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ---- Load exercises ----
  useEffect(() => {
    async function load() {
      try {
        const result = await apiClient<{
          data: { exercises: PronunciationExercise[] };
        }>("/pronunciation/exercises?cefr_level=A1&limit=10");
        if (result.data.exercises.length > 0) {
          setExercises(result.data.exercises);
        }
      } catch {
        // Keep fallback exercises
      } finally {
        setLoadingExercises(false);
      }
    }
    load();
  }, []);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  // ---- Select exercise ----
  const handleSelectExercise = useCallback(
    (exercise: PronunciationExercise) => {
      setSelectedExercise(exercise);
      setEvaluationResult(null);
      recorder.reset();
      setError(null);
      setView("practice");
    },
    [recorder]
  );

  // ---- Play recorded audio ----
  const handlePlayRecording = useCallback(async () => {
    if (!recorder.audioUri) return;

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: recorder.audioUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch {
      // Ignore playback errors
    }
  }, [recorder.audioUri]);

  // ---- Submit for evaluation ----
  const handleSubmit = useCallback(async () => {
    if (!selectedExercise || !recorder.audioUri) return;

    setSubmitting(true);
    setError(null);

    try {
      // 1. Get upload URL
      const uploadResult = await apiClient<{
        data: {
          upload_url: string;
          storage_path: string;
        };
      }>("/pronunciation/upload", {
        method: "POST",
        body: JSON.stringify({
          exercise_id: selectedExercise.id,
          file_name: `recording-${Date.now()}.wav`,
          content_type: "audio/wav",
        }),
      });

      // 2. Upload audio file
      const response = await fetch(recorder.audioUri);
      const blob = await response.blob();

      await fetch(uploadResult.data.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "audio/wav" },
        body: blob,
      });

      // 3. Start evaluation
      const evalResult = await apiClient<{
        data: { evaluation_id: string; status: string };
      }>("/pronunciation/evaluate", {
        method: "POST",
        body: JSON.stringify({
          exercise_id: selectedExercise.id,
          audio_storage_path: uploadResult.data.storage_path,
          target_text: selectedExercise.target_text,
        }),
      });

      setView("evaluating");

      // 4. Poll for results
      const evaluationId = evalResult.data.evaluation_id;
      let attempts = 0;
      let interval = 1000;

      while (attempts < 30) {
        await new Promise((resolve) => setTimeout(resolve, interval));
        attempts++;
        interval = Math.min(interval * 1.5, 5000);

        try {
          const pollResult = await apiClient<{
            data: EvaluationResult;
          }>(`/pronunciation/evaluations/${evaluationId}`);

          if (
            pollResult.data.status === "completed" ||
            pollResult.data.status === "failed"
          ) {
            setEvaluationResult(pollResult.data);
            setView("results");
            return;
          }
        } catch {
          // Continue polling
        }
      }

      setError("La evaluacion no se completo a tiempo.");
      setView("practice");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al enviar la grabacion."
      );
      setView("practice");
    } finally {
      setSubmitting(false);
    }
  }, [selectedExercise, recorder.audioUri]);

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

  // ======== Exercises view ========
  if (view === "exercises") {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.pageTitle}>Pronunciacion</Text>
        <Text style={styles.pageSubtitle}>
          Practica la pronunciacion francesa
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {loadingExercises ? (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginTop: 32 }}
          />
        ) : (
          <View style={styles.exerciseList}>
            {exercises.map((exercise) => (
              <Pressable
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => handleSelectExercise(exercise)}
                accessibilityRole="button"
                accessibilityLabel={exercise.target_text}
              >
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseText} numberOfLines={2}>
                    {exercise.target_text}
                  </Text>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>
                      {exercise.cefr_level}
                    </Text>
                  </View>
                </View>
                <Text style={styles.exerciseIpa}>
                  {exercise.phonetic_ipa}
                </Text>
                <View style={styles.phonemeTagsRow}>
                  {exercise.focus_phonemes.map((p) => (
                    <View key={p} style={styles.phonemeTag}>
                      <Text style={styles.phonemeTagText}>/{p}/</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // ======== Evaluating view ========
  if (view === "evaluating") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          Evaluando tu pronunciacion...
        </Text>
        <Text style={styles.loadingSubtext}>
          Whisper STT &gt; Wav2Vec2 &gt; Gemini
        </Text>
      </View>
    );
  }

  // ======== Results view ========
  if (view === "results" && evaluationResult && selectedExercise) {
    const pipeline = evaluationResult.pipeline_results;
    const multimodal = pipeline?.multimodal_evaluation;
    const phonemeData = pipeline?.phoneme_alignment;

    const overallPct = multimodal
      ? Math.round(multimodal.overall_score * 100)
      : 0;
    const overallColor =
      multimodal && multimodal.overall_score >= 0.7
        ? "#22C55E"
        : multimodal && multimodal.overall_score >= 0.4
          ? "#F59E0B"
          : "#EF4444";

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.resultsHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Resultados</Text>
            <Text style={styles.pageSubtitle} numberOfLines={2}>
              {selectedExercise.target_text}
            </Text>
          </View>
        </View>

        {/* Overall score */}
        {multimodal && (
          <View style={styles.overallScoreCard}>
            <Text
              style={[styles.overallScoreNumber, { color: overallColor }]}
            >
              {overallPct}
            </Text>
            <Text style={styles.overallScoreLabel}>
              Puntuacion general
            </Text>
          </View>
        )}

        {/* Sub-scores */}
        {multimodal && phonemeData && (
          <View style={styles.scoresCard}>
            <ScoreBar
              label="Precision fonemica"
              score={phonemeData.phoneme_accuracy_score}
            />
            <ScoreBar label="Prosodia" score={multimodal.prosody_score} />
            <ScoreBar label="Fluidez" score={multimodal.fluency_score} />
          </View>
        )}

        {/* Transcription comparison */}
        {evaluationResult.transcription && (
          <View style={styles.transcriptionCard}>
            <Text style={styles.cardTitle}>Transcripcion</Text>
            <View style={styles.transcriptionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.transcriptionLabel}>Objetivo</Text>
                <Text style={styles.transcriptionText}>
                  {selectedExercise.target_text}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.transcriptionLabel}>
                  Tu pronunciacion
                </Text>
                <Text style={styles.transcriptionText}>
                  {evaluationResult.transcription}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Phoneme map */}
        {phonemeData && phonemeData.phonemes.length > 0 && (
          <View style={styles.phonemeMapCard}>
            <Text style={styles.cardTitle}>Mapa de fonemas</Text>
            <View style={styles.phonemePillsRow}>
              {phonemeData.phonemes.map((p, i) => (
                <PhonemePill key={i} phoneme={p} />
              ))}
            </View>
          </View>
        )}

        {/* Suggestions */}
        {multimodal &&
          multimodal.improvement_suggestions_es.length > 0 && (
            <View style={styles.suggestionsCard}>
              <Text style={styles.cardTitle}>Sugerencias</Text>
              {multimodal.improvement_suggestions_es.map(
                (suggestion, i) => (
                  <View key={i} style={styles.suggestionItem}>
                    <Text style={styles.suggestionBullet}>*</Text>
                    <Text style={styles.suggestionText}>
                      {suggestion}
                    </Text>
                  </View>
                )
              )}
            </View>
          )}

        {/* Action buttons */}
        <View style={styles.resultsActions}>
          <Pressable
            style={styles.tryAgainButton}
            onPress={handleTryAgain}
            accessibilityRole="button"
          >
            <Text style={styles.tryAgainButtonText}>
              Intentar de nuevo
            </Text>
          </Pressable>
          <Pressable
            style={styles.backButton}
            onPress={handleBackToExercises}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>
              Otros ejercicios
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ======== Practice view ========
  if (!selectedExercise) return null;

  return (
    <View style={styles.practiceContainer}>
      {/* Header */}
      <View style={styles.practiceHeader}>
        <Pressable
          onPress={handleBackToExercises}
          accessibilityRole="button"
          accessibilityLabel="Volver a ejercicios"
          style={styles.backPressable}
        >
          <Text style={styles.backArrow}>&lt; Ejercicios</Text>
        </Pressable>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>
            {selectedExercise.cefr_level}
          </Text>
        </View>
      </View>

      {/* Error */}
      {(error || recorder.error) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error || recorder.error}</Text>
        </View>
      )}

      {/* Target phrase */}
      <View style={styles.targetCard}>
        <Text style={styles.targetText}>
          {selectedExercise.target_text}
        </Text>
        <Text style={styles.targetIpa}>
          {selectedExercise.phonetic_ipa}
        </Text>
        <View style={styles.phonemeTagsRow}>
          {selectedExercise.focus_phonemes.map((p) => (
            <View key={p} style={styles.focusPhonemeTag}>
              <Text style={styles.focusPhonemeTagText}>/{p}/</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Content area */}
      <View style={styles.recordingArea}>
        {/* Duration display */}
        {(recorder.isRecording || recorder.isPaused) && (
          <Text style={styles.durationText}>
            {recorder.duration.toFixed(1)}s
            {recorder.isPaused ? " (pausado)" : ""}
          </Text>
        )}

        {/* Audio level indicator (simple bar) */}
        {recorder.isRecording && (
          <View style={styles.levelBarContainer}>
            <View
              style={[
                styles.levelBarFill,
                { width: `${Math.round(recorder.audioLevel * 100)}%` },
              ]}
            />
          </View>
        )}

        {/* Record button */}
        <Pressable
          style={[
            styles.recordButton,
            recorder.isRecording && styles.recordButtonActive,
            recorder.isPaused && styles.recordButtonPaused,
          ]}
          onPress={
            recorder.state === "idle" || recorder.state === "stopped"
              ? recorder.startRecording
              : recorder.state === "recording"
                ? recorder.stopRecording
                : recorder.resumeRecording
          }
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={
            recorder.isRecording
              ? "Detener grabacion"
              : "Iniciar grabacion"
          }
        >
          {recorder.isRecording ? (
            <View style={styles.stopIcon} />
          ) : recorder.isPaused ? (
            <Text style={styles.playIcon}>&#9654;</Text>
          ) : (
            <View style={styles.recordCircle} />
          )}
        </Pressable>

        {/* Recording state label */}
        <Text style={styles.recordingLabel}>
          {recorder.state === "idle"
            ? "Presiona para grabar"
            : recorder.isRecording
              ? "Grabando..."
              : recorder.isPaused
                ? "En pausa"
                : "Grabacion completada"}
        </Text>

        {/* Post-recording actions */}
        {recorder.state === "stopped" && recorder.audioUri && (
          <View style={styles.postRecordActions}>
            <Pressable
              style={styles.playbackButton}
              onPress={handlePlayRecording}
              accessibilityRole="button"
              accessibilityLabel="Escuchar grabacion"
            >
              <Text style={styles.playbackButtonText}>
                Escuchar
              </Text>
            </Pressable>
            <Pressable
              style={styles.rerecordButton}
              onPress={recorder.reset}
              accessibilityRole="button"
            >
              <Text style={styles.rerecordButtonText}>
                Volver a grabar
              </Text>
            </Pressable>
          </View>
        )}

        {/* Submit button */}
        {recorder.state === "stopped" && recorder.audioUri && (
          <Pressable
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Evaluar pronunciacion"
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                Evaluar pronunciacion
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
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
    marginBottom: 20,
  },

  // Exercises
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  exerciseText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    marginRight: 8,
  },
  exerciseIpa: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#6B7280",
    marginBottom: 8,
  },
  phonemeTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  phonemeTag: {
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  phonemeTagText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: "#6B7280",
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

  // Practice
  practiceContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  practiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backPressable: {
    paddingVertical: 4,
  },
  backArrow: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "500",
  },
  targetCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    margin: 16,
    padding: 20,
    alignItems: "center",
  },
  targetText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  targetIpa: {
    fontSize: 13,
    fontFamily: "monospace",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 12,
  },
  focusPhonemeTag: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  focusPhonemeTagText: {
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "600",
    color: "#92400E",
  },

  // Recording area
  recordingArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 16,
  },
  durationText: {
    fontSize: 16,
    fontFamily: "monospace",
    color: "#374151",
  },
  levelBarContainer: {
    width: "80%",
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
  },
  levelBarFill: {
    height: 4,
    backgroundColor: "#EF4444",
    borderRadius: 2,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  recordButtonActive: {
    backgroundColor: "#DC2626",
    borderWidth: 4,
    borderColor: "#FCA5A5",
  },
  recordButtonPaused: {
    backgroundColor: "#F59E0B",
  },
  recordCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  playIcon: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  recordingLabel: {
    fontSize: 13,
    color: "#6B7280",
  },

  // Post-recording
  postRecordActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  playbackButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  playbackButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  rerecordButton: {
    backgroundColor: "transparent",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rerecordButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: "80%",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
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

  // Error
  errorBanner: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#991B1B",
  },

  // Results
  resultsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  overallScoreCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  overallScoreNumber: {
    fontSize: 48,
    fontWeight: "800",
  },
  overallScoreLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  scoresCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  scoreBarContainer: {
    marginBottom: 2,
  },
  scoreBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  transcriptionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  transcriptionRow: {
    flexDirection: "row",
  },
  transcriptionLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 4,
  },
  transcriptionText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 18,
  },
  phonemeMapCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  phonemePillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  phonemePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  phonemePillText: {
    fontSize: 12,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  phonemePillScore: {
    fontSize: 10,
    fontFamily: "monospace",
  },
  suggestionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
  },
  suggestionItem: {
    flexDirection: "row",
    paddingVertical: 4,
    gap: 8,
  },
  suggestionBullet: {
    fontSize: 13,
    color: "#2563EB",
    fontWeight: "600",
  },
  suggestionText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 19,
    flex: 1,
  },
  resultsActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  tryAgainButton: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  tryAgainButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  backButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  backButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
});
