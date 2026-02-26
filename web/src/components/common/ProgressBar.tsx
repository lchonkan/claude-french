import type { CEFRLevel } from "@/types/cefr";

export interface ProgressBarProps {
  /** Progress percentage from 0 to 100 */
  percent: number;
  /** Optional CEFR level for color coding */
  cefrLevel?: CEFRLevel;
  /** Optional label displayed above the bar */
  label?: string;
  /** Show the percentage number */
  showPercent?: boolean;
  /** Height variant */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const cefrColors: Record<CEFRLevel, string> = {
  A1: "bg-green-400",
  A2: "bg-green-600",
  B1: "bg-blue-400",
  B2: "bg-blue-600",
  C1: "bg-purple-400",
  C2: "bg-purple-600",
};

const sizeClasses = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

export function ProgressBar({
  percent,
  cefrLevel,
  label,
  showPercent = false,
  size = "md",
  className = "",
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const barColor = cefrLevel ? cefrColors[cefrLevel] : "bg-blue-600";

  return (
    <div className={className}>
      {(label || showPercent) && (
        <div className="mb-1 flex items-center justify-between text-sm">
          {label && <span className="font-medium text-gray-700">{label}</span>}
          {showPercent && (
            <span className="text-gray-500">{Math.round(clamped)}%</span>
          )}
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-gray-200 ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${Math.round(clamped)}% completado`}
      >
        <div
          className={`${barColor} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
