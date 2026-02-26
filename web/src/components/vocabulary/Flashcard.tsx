import { useCallback, useState } from "react";
import { useIntl } from "react-intl";
import { AudioPlayer } from "@/components/common";
import type { VocabularyItem } from "@/types";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FlashcardProps {
  item: VocabularyItem;
  onFlip?: () => void;
}

// ---------------------------------------------------------------------------
// CEFR badge color mapping
// ---------------------------------------------------------------------------

const cefrBadgeColors: Record<CEFRLevel, string> = {
  A1: "bg-green-100 text-green-800",
  A2: "bg-green-200 text-green-900",
  B1: "bg-blue-100 text-blue-800",
  B2: "bg-blue-200 text-blue-900",
  C1: "bg-purple-100 text-purple-800",
  C2: "bg-purple-200 text-purple-900",
};

// ---------------------------------------------------------------------------
// Derive difficulty from CEFR level (1-5 scale)
// ---------------------------------------------------------------------------

const cefrToDifficulty: Record<CEFRLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 5,
};

function DifficultyDots({ level }: { level: CEFRLevel }) {
  const filled = cefrToDifficulty[level];
  return (
    <div className="flex items-center gap-0.5" aria-label={`Dificultad ${filled} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={[
            "inline-block h-2 w-2 rounded-full",
            i < filled ? "bg-blue-600" : "bg-gray-300",
          ].join(" ")}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Flashcard component
// ---------------------------------------------------------------------------

export function Flashcard({ item, onFlip }: FlashcardProps) {
  const intl = useIntl();
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    onFlip?.();
  }, [onFlip]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFlip();
      }
    },
    [handleFlip],
  );

  return (
    <div
      className="perspective-[1000px] mx-auto w-full max-w-lg"
      role="button"
      tabIndex={0}
      aria-label={
        isFlipped
          ? intl.formatMessage({ id: "vocab.flashcard.back" })
          : intl.formatMessage({ id: "vocab.flashcard.front" })
      }
      aria-roledescription="flashcard"
      onClick={handleFlip}
      onKeyDown={handleKeyDown}
    >
      <div
        className={[
          "relative h-80 w-full cursor-pointer transition-transform duration-500",
          "[transform-style:preserve-3d]",
          isFlipped ? "[transform:rotateY(180deg)]" : "",
        ].join(" ")}
      >
        {/* ----- Front face (French) ----- */}
        <div
          className={[
            "absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-gray-200",
            "bg-white px-8 py-6 shadow-lg [backface-visibility:hidden]",
          ].join(" ")}
          aria-hidden={isFlipped}
        >
          {/* CEFR badge + difficulty */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cefrBadgeColors[item.cefr_level]}`}
            >
              {item.cefr_level}
            </span>
            <DifficultyDots level={item.cefr_level} />
          </div>

          {/* French word */}
          <h2 className="mt-4 text-3xl font-bold text-gray-900">{item.word}</h2>

          {/* IPA phonetic */}
          <p className="mt-1 text-lg text-gray-500">/{item.phonetic}/</p>

          {/* Audio player */}
          {item.audio_url && (
            <div className="mt-4 w-full" onClick={(e) => e.stopPropagation()}>
              <AudioPlayer src={item.audio_url} />
            </div>
          )}

          {/* Flip hint */}
          <p className="mt-auto text-xs text-gray-400">
            {intl.formatMessage({ id: "vocab.flashcard.flip" })}
          </p>
        </div>

        {/* ----- Back face (Spanish) ----- */}
        <div
          className={[
            "absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-gray-200",
            "bg-blue-50 px-8 py-6 shadow-lg [backface-visibility:hidden] [transform:rotateY(180deg)]",
          ].join(" ")}
          aria-hidden={!isFlipped}
        >
          {/* CEFR badge + difficulty (repeated on back for consistency) */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cefrBadgeColors[item.cefr_level]}`}
            >
              {item.cefr_level}
            </span>
            <DifficultyDots level={item.cefr_level} />
          </div>

          {/* Spanish translation */}
          <h2 className="mt-4 text-3xl font-bold text-blue-900">
            {item.translation}
          </h2>

          {/* Example sentence (French) */}
          <div className="mt-6 w-full space-y-1 text-center">
            <p className="text-sm font-medium italic text-gray-700">
              {item.example_sentence}
            </p>
            {/* Example translation (Spanish) */}
            <p className="text-sm text-gray-500">{item.example_translation}</p>
          </div>

          {/* Audio player on back too */}
          {item.audio_url && (
            <div className="mt-4 w-full" onClick={(e) => e.stopPropagation()}>
              <AudioPlayer src={item.audio_url} />
            </div>
          )}

          {/* Flip hint */}
          <p className="mt-auto text-xs text-gray-400">
            {intl.formatMessage({ id: "vocab.flashcard.flip" })}
          </p>
        </div>
      </div>
    </div>
  );
}
