import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CognateHighlightProps {
  /** The text to display (the French word). */
  text: string;
  /** The language of the cognate equivalent ("es" for Spanish, "pt" for Portuguese). */
  cognateLanguage: string;
  /** The equivalent word in the cognate language. */
  cognateText: string;
  /** Optional additional class names. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Language label mapping
// ---------------------------------------------------------------------------

const LANGUAGE_LABELS: Record<string, string> = {
  es: "Espanol",
  pt: "Portugues",
  spanish: "Espanol",
  portuguese: "Portugues",
  "french-spanish": "Espanol",
  "french-portuguese": "Portugues",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Wraps text that is a cognate with a highlighted background and a CSS-only
 * tooltip showing the equivalent in the learner's language.
 *
 * Usage:
 * ```tsx
 * <CognateHighlight text="famille" cognateLanguage="es" cognateText="familia" />
 * ```
 */
export function CognateHighlight({
  text,
  cognateLanguage,
  cognateText,
  className = "",
}: CognateHighlightProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const langLabel =
    LANGUAGE_LABELS[cognateLanguage.toLowerCase()] ?? cognateLanguage;

  const handleMouseEnter = useCallback(() => setShowTooltip(true), []);
  const handleMouseLeave = useCallback(() => setShowTooltip(false), []);
  const handleFocus = useCallback(() => setShowTooltip(true), []);
  const handleBlur = useCallback(() => setShowTooltip(false), []);

  return (
    <span
      className={[
        "relative inline-block cursor-help rounded px-0.5",
        "bg-yellow-100 text-yellow-900",
        "border-b border-dashed border-yellow-400",
        className,
      ].join(" ")}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
      role="note"
      aria-label={`Cognado: ${text} - ${langLabel}: ${cognateText}`}
    >
      {text}

      {/* CSS-based tooltip */}
      {showTooltip && (
        <span
          className={[
            "absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2",
            "whitespace-nowrap rounded-lg bg-gray-900 px-3 py-1.5",
            "text-xs font-medium text-white shadow-lg",
            "pointer-events-none",
          ].join(" ")}
          role="tooltip"
        >
          {langLabel}: <strong>{cognateText}</strong>
          {/* Tooltip arrow */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"
            aria-hidden="true"
          />
        </span>
      )}
    </span>
  );
}
