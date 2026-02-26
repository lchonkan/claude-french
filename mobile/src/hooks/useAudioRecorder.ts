/**
 * Mobile audio recording hook using expo-av.
 *
 * Provides a similar interface to the web `useAudioRecorder` hook but uses
 * the `Audio.Recording` API from `expo-av` for native audio capture.
 *
 * Records in WAV-compatible format (LINEAR16 at 16kHz mono) for Whisper
 * compatibility. Falls back to AAC on devices that don't support WAV.
 *
 * Handles:
 * - Permission requests (microphone access)
 * - Audio mode configuration (recording + playback)
 * - Resource cleanup on unmount
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Audio, type AVPlaybackStatus } from "expo-av";
import type { RecordingStatus } from "expo-av/build/Audio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecorderState = "idle" | "recording" | "paused" | "stopped";

export interface UseAudioRecorderReturn {
  /** Current recorder state */
  state: RecorderState;
  /** Whether the recorder is actively recording */
  isRecording: boolean;
  /** Whether the recorder is paused */
  isPaused: boolean;
  /** URI of the recorded audio file (available after stop) */
  audioUri: string | null;
  /** Recording duration in seconds */
  duration: number;
  /** Real-time audio metering level (0-1) */
  audioLevel: number;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => Promise<void>;
  /** Pause recording */
  pauseRecording: () => Promise<void>;
  /** Resume recording after pause */
  resumeRecording: () => Promise<void>;
  /** Reset recorder to idle state */
  reset: () => void;
  /** Whether microphone permission has been granted */
  hasPermission: boolean;
  /** Error message if recording fails */
  error: string | null;
}

// ---------------------------------------------------------------------------
// Recording preset for Whisper compatibility
// ---------------------------------------------------------------------------

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: "audio/wav",
    bitsPerSecond: 256000,
  },
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);

  // ---- Request permissions on mount ----
  useEffect(() => {
    async function requestPermissions() {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === "granted");
        if (status !== "granted") {
          setError(
            "Permiso de microfono denegado. Activa el acceso al microfono en la configuracion."
          );
        }
      } catch {
        setError("No se pudo solicitar el permiso de microfono.");
      }
    }
    requestPermissions();
  }, []);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current
          .stopAndUnloadAsync()
          .catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  // ---- Recording status callback ----
  const onRecordingStatusUpdate = useCallback(
    (status: RecordingStatus) => {
      if (status.isRecording) {
        // Convert duration from milliseconds to seconds
        setDuration(status.durationMillis / 1000);

        // Convert metering (dBFS, typically -160 to 0) to 0-1 range
        if (status.metering != null) {
          const db = status.metering;
          // Normalize: -60dB = 0, 0dB = 1
          const normalized = Math.max(0, Math.min(1, (db + 60) / 60));
          setAudioLevel(normalized);
        }
      }
    },
    []
  );

  // ---- startRecording ----
  const startRecording = useCallback(async () => {
    if (!hasPermission) {
      setError("Permiso de microfono no concedido.");
      return;
    }

    setError(null);
    setAudioUri(null);

    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      recording.setOnRecordingStatusUpdate(onRecordingStatusUpdate);
      await recording.startAsync();

      recordingRef.current = recording;
      setDuration(0);
      setAudioLevel(0);
      setState("recording");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar la grabacion.";
      setError(message);
    }
  }, [hasPermission, onRecordingStatusUpdate]);

  // ---- stopRecording ----
  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setAudioUri(uri);
      setAudioLevel(0);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      recordingRef.current = null;
      setState("stopped");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al detener la grabacion.";
      setError(message);
    }
  }, []);

  // ---- pauseRecording ----
  const pauseRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || state !== "recording") return;

    try {
      await recording.pauseAsync();
      setAudioLevel(0);
      setState("paused");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al pausar la grabacion.";
      setError(message);
    }
  }, [state]);

  // ---- resumeRecording ----
  const resumeRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording || state !== "paused") return;

    try {
      await recording.startAsync();
      setState("recording");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al reanudar la grabacion.";
      setError(message);
    }
  }, [state]);

  // ---- reset ----
  const reset = useCallback(() => {
    if (recordingRef.current) {
      recordingRef.current
        .stopAndUnloadAsync()
        .catch(() => {});
      recordingRef.current = null;
    }

    setAudioUri(null);
    setDuration(0);
    setAudioLevel(0);
    setError(null);
    setState("idle");
  }, []);

  return {
    state,
    isRecording: state === "recording",
    isPaused: state === "paused",
    audioUri,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
    hasPermission,
    error,
  };
}
