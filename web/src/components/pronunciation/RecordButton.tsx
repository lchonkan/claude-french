/**
 * RecordButton -- Circular record button with animated ring when recording.
 *
 * States:
 * - **idle**: Large red circle, ready to start recording
 * - **recording**: Animated pulsing ring around a smaller stop square
 * - **paused**: Static ring with a resume indicator
 * - **stopped**: Reset button (secondary style)
 *
 * The button size meets the minimum 44x44px touch target for accessibility.
 */

import type { RecorderState } from "@/hooks/useAudioRecorder";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordButtonProps {
  /** Current recorder state */
  state: RecorderState;
  /** Called when the user wants to start recording */
  onStart: () => void;
  /** Called when the user wants to stop recording */
  onStop: () => void;
  /** Called when the user wants to pause recording */
  onPause?: () => void;
  /** Called when the user wants to resume recording */
  onResume?: () => void;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Optional size override (default 80px) */
  size?: number;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecordButton({
  state,
  onStart,
  onStop,
  onPause,
  onResume,
  disabled = false,
  size = 80,
  className = "",
}: RecordButtonProps) {
  const innerSize = size * 0.6;
  const ringSize = size + 16;

  // Determine the action and label
  let onClick: () => void;
  let ariaLabel: string;

  switch (state) {
    case "idle":
    case "stopped":
      onClick = onStart;
      ariaLabel = "Iniciar grabacion";
      break;
    case "recording":
      onClick = onStop;
      ariaLabel = "Detener grabacion";
      break;
    case "paused":
      onClick = onResume ?? onStop;
      ariaLabel = onResume ? "Reanudar grabacion" : "Detener grabacion";
      break;
    default:
      onClick = onStart;
      ariaLabel = "Grabar";
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: ringSize, height: ringSize }}
    >
      {/* Animated ring (visible when recording) */}
      {state === "recording" && (
        <div
          className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping"
          style={{ animationDuration: "1.5s" }}
          aria-hidden="true"
        />
      )}

      {/* Static ring (visible when recording or paused) */}
      {(state === "recording" || state === "paused") && (
        <div
          className={[
            "absolute inset-0 rounded-full border-4",
            state === "recording" ? "border-red-500" : "border-yellow-500",
          ].join(" ")}
          aria-hidden="true"
        />
      )}

      {/* Main button */}
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "relative z-10 flex items-center justify-center rounded-full",
          "transition-all duration-200 ease-in-out",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          state === "idle" || state === "stopped"
            ? "bg-red-500 hover:bg-red-600 active:bg-red-700 shadow-lg hover:shadow-xl"
            : state === "recording"
              ? "bg-red-600"
              : "bg-yellow-500 hover:bg-yellow-600",
        ].join(" ")}
        style={{ width: size, height: size }}
        aria-label={ariaLabel}
      >
        {/* Icon: circle for idle/stopped, square for recording/paused */}
        {state === "idle" || state === "stopped" ? (
          <div
            className="rounded-full bg-white"
            style={{ width: innerSize * 0.5, height: innerSize * 0.5 }}
          />
        ) : state === "recording" ? (
          <div
            className="rounded-sm bg-white"
            style={{ width: innerSize * 0.4, height: innerSize * 0.4 }}
          />
        ) : (
          /* Paused: play triangle */
          <svg
            className="text-white"
            style={{ width: innerSize * 0.5, height: innerSize * 0.5 }}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Pause button (small, next to main button) */}
      {state === "recording" && onPause && (
        <button
          type="button"
          onClick={onPause}
          className={[
            "absolute -right-2 -bottom-2 z-20",
            "flex h-8 w-8 items-center justify-center rounded-full",
            "bg-gray-700 text-white shadow-md",
            "hover:bg-gray-800 active:bg-gray-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500",
          ].join(" ")}
          aria-label="Pausar grabacion"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </button>
      )}
    </div>
  );
}
