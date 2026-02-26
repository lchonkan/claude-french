import { useState } from "react";
import { Button } from "./Button";

export interface ErrorStateProps {
  /** Primary error message shown to the user (in Spanish) */
  message?: string;
  /** Optional technical error details (shown behind a toggle) */
  details?: string;
  /** Retry callback; if omitted the retry button is hidden */
  onRetry?: () => void;
  /** Whether a retry is currently in progress */
  retrying?: boolean;
  className?: string;
}

export function ErrorState({
  message = "Algo salio mal. Por favor intenta de nuevo.",
  details,
  onRetry,
  retrying = false,
  className = "",
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center ${className}`}
      role="alert"
    >
      {/* Error icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg
          className="h-6 w-6 text-red-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>

      <p className="text-sm font-medium text-red-800">{message}</p>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          loading={retrying}
        >
          Reintentar
        </Button>
      )}

      {details && (
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="text-xs text-red-500 underline hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            {showDetails ? "Ocultar detalles" : "Mostrar detalles"}
          </button>
          {showDetails && (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-red-100 p-3 text-left text-xs text-red-700">
              {details}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
