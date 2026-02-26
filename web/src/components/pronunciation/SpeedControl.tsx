/**
 * SpeedControl -- Playback speed selector for reference audio.
 *
 * Provides a horizontal set of speed options (0.5x, 0.75x, 1x, 1.25x).
 * The currently selected speed is visually highlighted.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpeedControlProps {
  /** Currently selected playback speed */
  speed: number;
  /** Called when the user selects a different speed */
  onSpeedChange: (speed: number) => void;
  /** Available speed options */
  options?: number[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS = [0.5, 0.75, 1, 1.25];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SpeedControl({
  speed,
  onSpeedChange,
  options = DEFAULT_OPTIONS,
  className = "",
}: SpeedControlProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 ${className}`}
      role="radiogroup"
      aria-label="Velocidad de reproduccion"
    >
      {options.map((option) => {
        const isSelected = Math.abs(speed - option) < 0.01;
        const label = option === 1 ? "1x" : `${option}x`;

        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSpeedChange(option)}
            className={[
              "rounded-md px-2.5 py-1.5 text-xs font-semibold",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isSelected
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-200",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
