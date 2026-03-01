import { useState, useRef, useEffect } from "react";

export interface InlineCorrectionProps {
  /** The original (incorrect) text span */
  original: string;
  /** The corrected text */
  corrected: string;
  /** Grammar explanation in Spanish */
  explanation: string;
  className?: string;
}

/**
 * Highlighted text with a tooltip showing the grammar correction
 * and explanation. The incorrect text is shown with a red underline,
 * and hovering/clicking reveals a tooltip with the correction details.
 */
export function InlineCorrection({
  original,
  corrected,
  explanation,
  className = "",
}: InlineCorrectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <span className={`relative inline ${className}`}>
      <span
        ref={triggerRef}
        className="cursor-pointer border-b-2 border-red-400 bg-red-50 px-0.5 text-red-700 transition-colors hover:bg-red-100"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        role="button"
        tabIndex={0}
        aria-label={`Correccion: ${original} deberia ser ${corrected}`}
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
      >
        {original}
      </span>

      {isOpen && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          role="tooltip"
        >
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-gray-200 bg-white" />

          {/* Correction */}
          <div className="mb-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-red-600 line-through">{original}</span>
              <svg
                className="h-3 w-3 shrink-0 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
              <span className="font-medium text-green-700">{corrected}</span>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-xs leading-relaxed text-gray-600">
            {explanation}
          </p>
        </div>
      )}
    </span>
  );
}
