/**
 * Bilingual transcript view for listening exercises.
 *
 * Features:
 * - French text as primary display
 * - Spanish translation toggle
 * - Current-segment highlighting during audio playback
 * - Speaker labels with visual differentiation
 */

import { useCallback, useMemo, useState } from "react";
import type { AudioSegment } from "@/services/listening";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptViewProps {
  /** Full French dialogue text */
  dialogueTextFr: string;
  /** Full Spanish dialogue text */
  dialogueTextEs: string;
  /** Timed segments for per-line highlighting */
  segments: AudioSegment[];
  /** Current audio playback time in seconds (for highlighting) */
  currentTime?: number;
  /** Called when user clicks a segment to replay it */
  onSegmentClick?: (segment: AudioSegment) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Speaker colors (cycle through for visual distinction)
// ---------------------------------------------------------------------------

const SPEAKER_COLORS: Record<string, { bg: string; text: string; border: string }> = {};

function getSpeakerStyle(speaker: string | null): {
  bg: string;
  text: string;
  border: string;
} {
  if (!speaker) {
    return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
  }

  if (SPEAKER_COLORS[speaker]) {
    return SPEAKER_COLORS[speaker];
  }

  const palette = [
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  ];

  const index = Object.keys(SPEAKER_COLORS).length % palette.length;
  SPEAKER_COLORS[speaker] = palette[index];
  return SPEAKER_COLORS[speaker];
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TranscriptView({
  dialogueTextFr,
  dialogueTextEs,
  segments,
  currentTime = 0,
  onSegmentClick,
  className = "",
}: TranscriptViewProps) {
  const [showSpanish, setShowSpanish] = useState(false);

  const toggleSpanish = useCallback(() => {
    setShowSpanish((prev) => !prev);
  }, []);

  // Find the currently active segment based on playback time
  const activeSegmentId = useMemo(() => {
    for (const seg of segments) {
      if (currentTime >= seg.start && currentTime < seg.end) {
        return seg.id;
      }
    }
    return null;
  }, [segments, currentTime]);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {/* Header with language toggle */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-gray-500"
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
          <h3 className="text-sm font-semibold text-gray-900">
            Transcripcion
          </h3>
        </div>

        <button
          type="button"
          onClick={toggleSpanish}
          className={[
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            showSpanish
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200",
          ].join(" ")}
          aria-pressed={showSpanish}
          aria-label={
            showSpanish
              ? "Ocultar traduccion al espanol"
              : "Mostrar traduccion al espanol"
          }
        >
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
              d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802"
            />
          </svg>
          {showSpanish ? "ES" : "ES"}
        </button>
      </div>

      {/* Segment-by-segment transcript */}
      {segments.length > 0 ? (
        <div className="divide-y divide-gray-50 px-5 py-2">
          {segments.map((seg) => {
            const isActive = activeSegmentId === seg.id;
            const speakerStyle = getSpeakerStyle(seg.speaker);

            return (
              <button
                key={seg.id}
                type="button"
                onClick={() => onSegmentClick?.(seg)}
                className={[
                  "flex w-full gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isActive
                    ? "bg-blue-50 ring-1 ring-blue-200"
                    : "hover:bg-gray-50",
                ].join(" ")}
                aria-label={`Reproducir segmento de ${seg.speaker ?? "hablante"} en ${formatTimestamp(seg.start)}`}
              >
                {/* Timestamp */}
                <span className="shrink-0 pt-0.5 text-xs tabular-nums text-gray-400">
                  {formatTimestamp(seg.start)}
                </span>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {/* Speaker label */}
                  {seg.speaker && (
                    <span
                      className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${speakerStyle.bg} ${speakerStyle.text}`}
                    >
                      {capitalize(seg.speaker)}
                    </span>
                  )}

                  {/* French text */}
                  <p
                    className={`text-sm leading-relaxed ${
                      isActive
                        ? "font-medium text-blue-900"
                        : "text-gray-800"
                    }`}
                  >
                    {seg.text_fr}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Fallback: plain text transcript */
        <div className="px-5 py-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">
            {dialogueTextFr}
          </p>
        </div>
      )}

      {/* Spanish translation (expandable) */}
      {showSpanish && (
        <div className="border-t border-gray-100 bg-amber-50/50 px-5 py-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
            Traduccion al espanol
          </p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
            {dialogueTextEs}
          </p>
        </div>
      )}
    </div>
  );
}
