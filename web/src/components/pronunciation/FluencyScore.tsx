/**
 * FluencyScore -- Overall fluency display with 3 sub-scores.
 *
 * Shows a large overall score with a circular progress indicator, plus
 * three sub-score bars for phoneme accuracy, prosody, and fluency.
 *
 * Color coding follows the platform convention:
 *   - >= 70%: Green (good)
 *   - >= 40%: Yellow/amber (fair)
 *   - < 40%:  Red (needs work)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FluencyScoreProps {
  /** Overall pronunciation score (0-1) */
  overallScore: number;
  /** Phoneme accuracy score (0-1) */
  phonemeAccuracy: number;
  /** Prosody / intonation score (0-1) */
  prosodyScore: number;
  /** Fluency / pacing score (0-1) */
  fluencyScore: number;
  /** Optional improvement suggestions */
  suggestions?: string[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 0.7) return "text-green-600";
  if (score >= 0.4) return "text-amber-600";
  return "text-red-600";
}

function getBarColor(score: number): string {
  if (score >= 0.7) return "bg-green-500";
  if (score >= 0.4) return "bg-amber-500";
  return "bg-red-500";
}

function getBarBg(score: number): string {
  if (score >= 0.7) return "bg-green-100";
  if (score >= 0.4) return "bg-amber-100";
  return "bg-red-100";
}

function getLabel(score: number): string {
  if (score >= 0.8) return "Excelente";
  if (score >= 0.7) return "Muy bien";
  if (score >= 0.5) return "Bien";
  if (score >= 0.4) return "Regular";
  return "Necesita practica";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const pct = Math.round(score * 100);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
          {pct}%
        </span>
      </div>
      <div
        className={`h-2.5 overflow-hidden rounded-full ${getBarBg(score)}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${pct}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CircularScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-gray-200"
        />
        {/* Progress arc */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={
            score >= 0.7
              ? "stroke-green-500"
              : score >= 0.4
                ? "stroke-amber-500"
                : "stroke-red-500"
          }
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {pct}
        </span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function FluencyScore({
  overallScore,
  phonemeAccuracy,
  prosodyScore,
  fluencyScore,
  suggestions = [],
  className = "",
}: FluencyScoreProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-6 ${className}`}
      role="region"
      aria-label="Resultados de pronunciacion"
    >
      {/* Header with circular score */}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
        <CircularScore score={overallScore} />
        <div className="text-center sm:text-left">
          <h3 className="text-lg font-semibold text-gray-900">
            Puntuacion general
          </h3>
          <p className={`text-sm font-medium ${getScoreColor(overallScore)}`}>
            {getLabel(overallScore)}
          </p>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="mt-6 space-y-4">
        <ScoreBar label="Precision fonemica" score={phonemeAccuracy} />
        <ScoreBar label="Prosodia" score={prosodyScore} />
        <ScoreBar label="Fluidez" score={fluencyScore} />
      </div>

      {/* Improvement suggestions */}
      {suggestions.length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            Sugerencias de mejora
          </h4>
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800"
              >
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                  />
                </svg>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
