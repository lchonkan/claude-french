import { useState } from "react";
import type { VocabularyRef } from "@/services/cultural";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface VocabularyHighlightProps {
  vocab: VocabularyRef;
  onAddToSRS: (vocabId: string) => Promise<void>;
}

export function VocabularyHighlight({
  vocab,
  onAddToSRS,
}: VocabularyHighlightProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(vocab.in_user_review_queue);

  const handleAdd = async () => {
    if (added || adding) return;
    setAdding(true);
    try {
      await onAddToSRS(vocab.id);
      setAdded(true);
    } catch {
      // Error handled by parent
    } finally {
      setAdding(false);
    }
  };

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((prev) => !prev)}
        className="rounded bg-blue-50 px-1 py-0.5 text-blue-700 underline decoration-blue-300 decoration-dotted underline-offset-2 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
        aria-label={`Vocabulario: ${vocab.french_text}`}
      >
        {vocab.french_text}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <span
          className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
          role="tooltip"
        >
          <span className="block text-sm font-semibold text-gray-900">
            {vocab.french_text}
          </span>
          <span className="mt-1 block text-sm text-gray-600">
            {vocab.spanish_translation}
          </span>

          {added ? (
            <span className="mt-2 block text-xs font-medium text-emerald-600">
              Ya esta en tu cola de repaso
            </span>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {adding ? "Agregando..." : "Agregar a repaso"}
            </button>
          )}

          {/* Tooltip arrow */}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-white" />
        </span>
      )}
    </span>
  );
}
