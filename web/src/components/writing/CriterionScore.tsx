/**
 * CriterionScore -- Displays a single evaluation criterion with a label,
 * progress bar, numeric score, and description.
 */

export interface CriterionScoreProps {
  /** Display label (e.g. "Gramatica") */
  label: string;
  /** Score from 0.0 to 1.0 */
  score: number | null;
  /** Brief description of what this criterion measures */
  description?: string;
  /** Optional CSS class */
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return "bg-green-500";
  if (score >= 0.6) return "bg-blue-500";
  if (score >= 0.4) return "bg-yellow-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 0.8) return "Excelente";
  if (score >= 0.6) return "Bueno";
  if (score >= 0.4) return "Regular";
  return "Necesita mejora";
}

export function CriterionScore({
  label,
  score,
  description,
  className = "",
}: CriterionScoreProps) {
  const displayScore = score != null ? score : 0;
  const percent = Math.round(displayScore * 100);
  const barColor = score != null ? getScoreColor(displayScore) : "bg-gray-300";
  const qualityLabel = score != null ? getScoreLabel(displayScore) : "N/A";

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Header with label, quality, and percentage */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          {score != null && (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                displayScore >= 0.6
                  ? "bg-green-50 text-green-700"
                  : displayScore >= 0.4
                    ? "bg-yellow-50 text-yellow-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              {qualityLabel}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-gray-900">
          {score != null ? `${percent}%` : "--"}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${percent}%`}
      >
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ease-out ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Description */}
      {description && (
        <p className="text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}
