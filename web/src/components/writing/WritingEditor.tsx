/**
 * WritingEditor -- Textarea with word/character count and minimum height.
 *
 * Features:
 * - Adaptive counter that shows both word and character counts
 * - Color-coded counter (gray -> yellow -> red based on limits)
 * - Minimum height of 200px for comfortable writing
 * - Exposes the textarea ref for AccentToolbar integration
 */

import { useMemo, forwardRef, type ChangeEvent } from "react";

export interface WritingEditorProps {
  /** Current textarea value */
  value: string;
  /** Called when the text changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Disable the editor */
  disabled?: boolean;
  /** Minimum suggested word count */
  minWords?: number;
  /** Maximum suggested word count */
  maxWords?: number;
  /** Maximum character count (hard limit) */
  maxChars?: number;
  /** Additional CSS class */
  className?: string;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export const WritingEditor = forwardRef<HTMLTextAreaElement, WritingEditorProps>(
  function WritingEditor(
    {
      value,
      onChange,
      placeholder = "Ecris ton texte en francais ici...",
      disabled = false,
      minWords = 30,
      maxWords = 200,
      maxChars = 10000,
      className = "",
    },
    ref
  ) {
    const wordCount = useMemo(() => countWords(value), [value]);
    const charCount = value.length;

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      // Enforce max chars
      if (newValue.length <= maxChars) {
        onChange(newValue);
      }
    };

    // Determine counter color
    let wordCountColor = "text-gray-400";
    if (wordCount >= minWords && wordCount <= maxWords) {
      wordCountColor = "text-green-600";
    } else if (wordCount > maxWords) {
      wordCountColor = "text-red-500";
    }

    return (
      <div className={`space-y-2 ${className}`}>
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={8}
          className="w-full min-h-[200px] resize-y rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
          aria-label="Area de escritura en frances"
          spellCheck={false}
          autoComplete="off"
        />

        {/* Counters */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className={wordCountColor}>
              {wordCount} {wordCount === 1 ? "palabra" : "palabras"}
              {minWords > 0 && (
                <span className="text-gray-300">
                  {" "}
                  (min {minWords}, max {maxWords})
                </span>
              )}
            </span>
          </div>
          <span className={charCount > maxChars * 0.9 ? "text-yellow-500" : "text-gray-300"}>
            {charCount.toLocaleString()} / {maxChars.toLocaleString()} caracteres
          </span>
        </div>
      </div>
    );
  }
);
