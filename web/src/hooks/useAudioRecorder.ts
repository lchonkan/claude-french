/**
 * Audio recording hook using the MediaRecorder API.
 *
 * Records audio in WAV format at 16 kHz mono for Whisper compatibility.
 * Falls back to WebM if WAV is not natively supported by the browser,
 * with client-side conversion to WAV on stop.
 *
 * States: idle -> recording -> paused -> stopped (or recording -> stopped)
 *
 * Cleans up resources on unmount.
 */

import { useCallback, useEffect, useRef, useState } from "react";

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
  /** The recorded audio as a Blob (available after stop) */
  audioBlob: Blob | null;
  /** Object URL for the recorded audio (available after stop) */
  audioUrl: string | null;
  /** Recording duration in seconds */
  duration: number;
  /** Real-time audio level (0-1) for visualizers */
  audioLevel: number;
  /** Start recording */
  startRecording: () => Promise<void>;
  /** Stop recording */
  stopRecording: () => void;
  /** Pause recording */
  pauseRecording: () => void;
  /** Resume recording after pause */
  resumeRecording: () => void;
  /** Reset recorder to idle state */
  reset: () => void;
  /** Error message if recording fails */
  error: string | null;
}

// ---------------------------------------------------------------------------
// WAV encoding utilities
// ---------------------------------------------------------------------------

/**
 * Encode raw PCM samples (Float32) into a WAV Blob at the given sample rate.
 */
function encodeWav(
  samples: Float32Array,
  sampleRate: number,
  numChannels: number
): Blob {
  const byteRate = sampleRate * numChannels * 2; // 16-bit = 2 bytes
  const blockAlign = numChannels * 2;
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // PCM samples (clamp to 16-bit range)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Downsample audio from the source sample rate to the target rate.
 */
function downsample(
  buffer: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const length = Math.round(buffer.length / ratio);
  const result = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const srcIndex = Math.round(i * ratio);
    result[i] = buffer[Math.min(srcIndex, buffer.length - 1)];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_SAMPLE_RATE = 16000;
const TARGET_CHANNELS = 1;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for resources that need cleanup
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Clean up object URLs on unmount or when replaced
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Clean up all resources on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Release all media and audio resources.
   */
  const cleanup = useCallback(() => {
    // Stop media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect audio processing nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Clear timers
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  /**
   * Update the real-time audio level from the analyser node.
   */
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const data = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / data.length);
    setAudioLevel(Math.min(1, rms * 3)); // amplify for visual feedback

    animFrameRef.current = requestAnimationFrame(updateAudioLevel);
  }, []);

  // ---- startRecording ----
  const startRecording = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: TARGET_CHANNELS,
          sampleRate: TARGET_SAMPLE_RATE,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      // Create audio context and nodes
      const audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Analyser node for real-time audio level
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // ScriptProcessor for capturing PCM data
      // (AudioWorklet is more modern but ScriptProcessor works everywhere)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      audioChunksRef.current = [];

      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputData = event.inputBuffer.getChannelData(0);
        audioChunksRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Track recording duration
      startTimeRef.current = Date.now();
      pauseTimeRef.current = 0;
      setDuration(0);

      durationIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current - pauseTimeRef.current) / 1000;
        setDuration(Math.round(elapsed * 10) / 10);
      }, 100);

      // Start audio level monitoring
      updateAudioLevel();

      setState("recording");
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Permiso de microfono denegado. Por favor permite el acceso al microfono."
          : err instanceof DOMException && err.name === "NotFoundError"
            ? "No se encontro un microfono. Conecta un microfono e intenta de nuevo."
            : "Error al iniciar la grabacion. Intenta de nuevo.";
      setError(message);
      cleanup();
    }
  }, [cleanup, updateAudioLevel]);

  // ---- stopRecording ----
  const stopRecording = useCallback(() => {
    if (state !== "recording" && state !== "paused") return;

    // Stop the duration timer and level monitoring
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setAudioLevel(0);

    // Collect all recorded audio chunks
    const chunks = audioChunksRef.current;
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample if the audio context sample rate differs from target
    const contextRate = audioContextRef.current?.sampleRate ?? TARGET_SAMPLE_RATE;
    const finalSamples = downsample(merged, contextRate, TARGET_SAMPLE_RATE);

    // Encode to WAV
    const wavBlob = encodeWav(finalSamples, TARGET_SAMPLE_RATE, TARGET_CHANNELS);
    const url = URL.createObjectURL(wavBlob);

    // Clean up previous URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(wavBlob);
    setAudioUrl(url);

    // Release media resources
    cleanup();

    setState("stopped");
  }, [state, audioUrl, cleanup]);

  // ---- pauseRecording ----
  const pauseRecording = useCallback(() => {
    if (state !== "recording") return;

    if (audioContextRef.current && audioContextRef.current.state === "running") {
      audioContextRef.current.suspend();
    }

    pauseTimeRef.current -= Date.now(); // mark pause start (negative means "pausing")

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setAudioLevel(0);

    setState("paused");
  }, [state]);

  // ---- resumeRecording ----
  const resumeRecording = useCallback(() => {
    if (state !== "paused") return;

    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    pauseTimeRef.current += Date.now(); // mark pause end

    updateAudioLevel();

    setState("recording");
  }, [state, updateAudioLevel]);

  // ---- reset ----
  const reset = useCallback(() => {
    cleanup();

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }

    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setAudioLevel(0);
    setError(null);
    audioChunksRef.current = [];

    setState("idle");
  }, [audioUrl, cleanup]);

  return {
    state,
    isRecording: state === "recording",
    isPaused: state === "paused",
    audioBlob,
    audioUrl,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
    error,
  };
}
