import { ProgressBar } from "@/components/common";

export interface EvaluationSummaryProps {
  /** Vocabulary usage score (0-1) */
  vocabularyScore: number | null;
  /** Grammar accuracy score (0-1) */
  grammarScore: number | null;
  /** Communicative effectiveness score (0-1) */
  communicativeScore: number | null;
  /** Feedback text in Spanish */
  feedbackEs: string;
  /** Total number of messages in the session */
  messageCount?: number;
  /** Callback to start a new conversation */
  onNewConversation?: () => void;
  className?: string;
}

/** Score thresholds for qualitative labels */
function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 0.8) return { label: "Excelente", color: "text-green-700" };
  if (score >= 0.6) return { label: "Bien", color: "text-blue-700" };
  if (score >= 0.4) return { label: "Regular", color: "text-amber-700" };
  return { label: "Necesita practica", color: "text-red-700" };
}

/**
 * Post-conversation evaluation summary component.
 *
 * Displays three score bars (vocabulary, grammar, communication)
 * along with qualitative labels and textual feedback in Spanish.
 */
export function EvaluationSummary({
  vocabularyScore,
  grammarScore,
  communicativeScore,
  feedbackEs,
  messageCount,
  onNewConversation,
  className = "",
}: EvaluationSummaryProps) {
  const scores = [
    {
      label: "Vocabulario",
      score: vocabularyScore,
      icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    },
    {
      label: "Gramatica",
      score: grammarScore,
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
      label: "Comunicacion",
      score: communicativeScore,
      icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    },
  ];

  const overallScore =
    vocabularyScore != null && grammarScore != null && communicativeScore != null
      ? (vocabularyScore + grammarScore + communicativeScore) / 3
      : null;

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
      aria-label="Resumen de evaluacion"
    >
      {/* Header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Evaluacion de la conversacion
            </h3>
            {messageCount != null && (
              <p className="text-sm text-gray-500">
                {messageCount} mensajes intercambiados
              </p>
            )}
          </div>
        </div>

        {/* Overall score */}
        {overallScore != null && (
          <div className="mt-4 flex items-center gap-3">
            <div className="text-3xl font-bold text-gray-900">
              {Math.round(overallScore * 100)}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">
                Puntaje general
              </div>
              <div className={`text-xs font-medium ${getScoreLabel(overallScore).color}`}>
                {getScoreLabel(overallScore).label}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Score bars */}
      <div className="space-y-5 px-6 py-5">
        {scores.map(({ label, score, icon }) => {
          const pct = score != null ? score * 100 : 0;
          const scoreInfo = score != null ? getScoreLabel(score) : null;

          return (
            <div key={label}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={icon}
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {score != null ? (
                    <>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(pct)}%
                      </span>
                      {scoreInfo && (
                        <span className={`text-xs font-medium ${scoreInfo.color}`}>
                          {scoreInfo.label}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-400">
                      No disponible
                    </span>
                  )}
                </div>
              </div>
              <ProgressBar
                percent={pct}
                size="md"
                showPercent={false}
              />
            </div>
          );
        })}
      </div>

      {/* Feedback text */}
      <div className="border-t border-gray-100 px-6 py-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-700">
          Retroalimentacion
        </h4>
        <p className="text-sm leading-relaxed text-gray-600">
          {feedbackEs}
        </p>
      </div>

      {/* Action button */}
      {onNewConversation && (
        <div className="border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onNewConversation}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
            Nueva conversacion
          </button>
        </div>
      )}
    </div>
  );
}
