/**
 * MasteryMeter -- Circular or bar progress meter for a single skill.
 *
 * Renders either a circular SVG meter (when `variant="circular"`) or a
 * horizontal bar (default). Color changes based on mastery percentage.
 */

interface MasteryMeterProps {
  skill: string;
  percentage: number;
  variant?: "bar" | "circular";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const skillLabels: Record<string, string> = {
  vocabulary: "Vocabulario",
  grammar: "Gramatica",
  writing: "Escritura",
  listening: "Comprension auditiva",
  pronunciation: "Pronunciacion",
  conversation: "Conversacion",
};

function getMeterColor(pct: number): string {
  if (pct >= 80) return "text-emerald-500";
  if (pct >= 50) return "text-blue-500";
  if (pct >= 25) return "text-amber-500";
  return "text-red-400";
}

function getBarColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-blue-500";
  if (pct >= 25) return "bg-amber-500";
  return "bg-red-400";
}

const sizeMap = {
  sm: { circleSize: 48, strokeWidth: 4, fontSize: "text-xs" },
  md: { circleSize: 64, strokeWidth: 5, fontSize: "text-sm" },
  lg: { circleSize: 80, strokeWidth: 6, fontSize: "text-base" },
};

export function MasteryMeter({
  skill,
  percentage,
  variant = "bar",
  size = "md",
  showLabel = true,
  className = "",
}: MasteryMeterProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const label = skillLabels[skill] ?? skill;

  if (variant === "circular") {
    const { circleSize, strokeWidth, fontSize } = sizeMap[size];
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
      <div
        className={`flex flex-col items-center gap-1 ${className}`}
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${Math.round(clamped)}%`}
      >
        <div className="relative" style={{ width: circleSize, height: circleSize }}>
          <svg
            width={circleSize}
            height={circleSize}
            className="-rotate-90"
          >
            {/* Background circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx={circleSize / 2}
              cy={circleSize / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className={`transition-all duration-500 ${getMeterColor(clamped)}`}
            />
          </svg>
          {/* Percentage label in center */}
          <span
            className={`absolute inset-0 flex items-center justify-center font-bold ${fontSize} text-gray-900`}
          >
            {Math.round(clamped)}
          </span>
        </div>
        {showLabel && (
          <span className="text-xs font-medium text-gray-600 text-center">
            {label}
          </span>
        )}
      </div>
    );
  }

  // Bar variant
  return (
    <div
      className={className}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label}: ${Math.round(clamped)}%`}
    >
      {showLabel && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${getBarColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
