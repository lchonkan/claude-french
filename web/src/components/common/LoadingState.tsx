export interface LoadingStateProps {
  /** Optional message displayed below the spinner */
  message?: string;
  /** Estimated duration hint (e.g., "unos segundos") */
  estimatedDuration?: string;
  /** Use skeleton lines instead of spinner */
  skeleton?: boolean;
  /** Number of skeleton lines to show */
  skeletonLines?: number;
  className?: string;
}

function SkeletonLine({ width }: { width: string }) {
  return (
    <div
      className={`h-4 animate-pulse rounded bg-gray-200 ${width}`}
      aria-hidden="true"
    />
  );
}

const SKELETON_WIDTHS = ["w-full", "w-5/6", "w-4/6", "w-3/4", "w-full", "w-2/3"];

export function LoadingState({
  message,
  estimatedDuration,
  skeleton = false,
  skeletonLines = 4,
  className = "",
}: LoadingStateProps) {
  if (skeleton) {
    return (
      <div
        className={`space-y-3 ${className}`}
        role="status"
        aria-label={message ?? "Cargando contenido"}
      >
        {Array.from({ length: skeletonLines }, (_, i) => (
          <SkeletonLine
            key={i}
            width={SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]}
          />
        ))}
        <span className="sr-only">{message ?? "Cargando..."}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}
      role="status"
      aria-label={message ?? "Cargando"}
    >
      <svg
        className="h-8 w-8 animate-spin text-blue-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>

      {message && <p className="text-sm font-medium text-gray-600">{message}</p>}

      {estimatedDuration && (
        <p className="text-xs text-gray-400">
          Tiempo estimado: {estimatedDuration}
        </p>
      )}
    </div>
  );
}
