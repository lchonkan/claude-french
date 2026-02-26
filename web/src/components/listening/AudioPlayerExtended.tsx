/**
 * Enhanced audio player for listening comprehension exercises.
 *
 * Features:
 * - Play/pause toggle
 * - Seek bar with time display
 * - Playback speed control (0.5x - 2x)
 * - Replay last 5 seconds button
 * - Segment replay buttons (replay a specific timed segment)
 * - Current time / duration display
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AudioSegment } from "@/services/listening";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;

export interface AudioPlayerExtendedProps {
  src: string;
  segments?: AudioSegment[];
  /** Called when the current time changes, for transcript highlighting */
  onTimeUpdate?: (currentTime: number) => void;
  /** Autoplay when src changes */
  autoPlay?: boolean;
  className?: string;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AudioPlayerExtended({
  src,
  segments = [],
  onTimeUpdate,
  autoPlay = false,
  className = "",
}: AudioPlayerExtendedProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // ---- Audio event listeners ----
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdateEvent = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdateEvent);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdateEvent);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [onTimeUpdate]);

  // ---- Sync playback rate ----
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = speed;
    }
  }, [speed]);

  // ---- Play / Pause ----
  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      await audio.play();
    }
  }, [isPlaying]);

  // ---- Seek ----
  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const newTime = (parseFloat(e.target.value) / 100) * duration;
      audio.currentTime = newTime;
      setCurrentTime(newTime);
    },
    [duration]
  );

  // ---- Speed control ----
  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  }, []);

  // ---- Replay last 5 seconds ----
  const replayLast5s = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 5);
    if (!isPlaying) {
      audio.play();
    }
  }, [isPlaying]);

  // ---- Replay specific segment ----
  const replaySegment = useCallback(
    async (segment: AudioSegment) => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = segment.start;
      await audio.play();

      // Stop at segment end
      const checkEnd = () => {
        if (audio.currentTime >= segment.end) {
          audio.pause();
          audio.removeEventListener("timeupdate", checkEnd);
        }
      };
      audio.addEventListener("timeupdate", checkEnd);
    },
    []
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        autoPlay={autoPlay}
      />

      {/* Main controls row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Play/Pause button */}
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          aria-label={isPlaying ? "Pausar" : "Reproducir"}
        >
          {isPlaying ? (
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg
              className="ml-0.5 h-5 w-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Time display */}
        <span className="shrink-0 text-xs text-gray-500 tabular-nums">
          {formatTime(currentTime)}
        </span>

        {/* Seek bar */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSeek}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600"
          aria-label="Posicion de reproduccion"
        />

        {/* Duration */}
        <span className="shrink-0 text-xs text-gray-500 tabular-nums">
          {formatTime(duration)}
        </span>

        {/* Replay last 5s */}
        <button
          type="button"
          onClick={replayLast5s}
          className="flex h-8 shrink-0 items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Repetir ultimos 5 segundos"
          title="Repetir ultimos 5 segundos"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
            />
          </svg>
          5s
        </button>

        {/* Speed control */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="shrink-0 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label={`Velocidad de reproduccion: ${speed}x`}
        >
          {speed}x
        </button>
      </div>

      {/* Segment replay buttons (only when segments are provided) */}
      {segments.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-2">
          <p className="mb-2 text-xs font-medium text-gray-500">
            Repetir segmento:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {segments.map((seg, idx) => {
              const isActive =
                currentTime >= seg.start && currentTime < seg.end;
              return (
                <button
                  key={seg.id}
                  type="button"
                  onClick={() => replaySegment(seg)}
                  className={[
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isActive
                      ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                  ].join(" ")}
                  aria-label={`Reproducir segmento ${idx + 1}: ${seg.speaker ?? ""}`}
                  title={
                    seg.speaker
                      ? `${seg.speaker} (${formatTime(seg.start)} - ${formatTime(seg.end)})`
                      : `Segmento ${idx + 1}`
                  }
                >
                  {seg.speaker
                    ? `${seg.speaker} (${formatTime(seg.start)})`
                    : `#${idx + 1}`}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
