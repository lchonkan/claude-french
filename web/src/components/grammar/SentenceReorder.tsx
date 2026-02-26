import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/common";
import type { ExerciseSubmitResult } from "@/services/grammar";

export interface SentenceReorderProps {
  /** Exercise prompt in Spanish */
  promptEs: string;
  /** The correct word order (used to generate shuffled options) */
  words: string[];
  /** Callback when user submits the ordered words */
  onSubmit: (orderedWords: string[]) => void;
  /** Whether a submission is in progress */
  submitting: boolean;
  /** The result after submission */
  result: ExerciseSubmitResult | null;
}

/**
 * Shuffle an array using Fisher-Yates algorithm (returns a new array).
 * Ensures the shuffled order differs from the original.
 */
function shuffle(arr: string[]): string[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  // If shuffle produced the same order, swap first two
  if (copy.length > 1 && copy.every((w, i) => w === arr[i])) {
    [copy[0], copy[1]] = [copy[1], copy[0]];
  }
  return copy;
}

export function SentenceReorder({
  promptEs,
  words,
  onSubmit,
  submitting,
  result,
}: SentenceReorderProps) {
  const shuffledWords = useMemo(() => shuffle(words), [words]);
  const [available, setAvailable] = useState<string[]>(shuffledWords);
  const [selected, setSelected] = useState<string[]>([]);
  const isAnswered = result !== null;

  const handleSelectWord = useCallback(
    (word: string, index: number) => {
      if (isAnswered) return;
      setSelected((prev) => [...prev, word]);
      setAvailable((prev) => prev.filter((_, i) => i !== index));
    },
    [isAnswered],
  );

  const handleRemoveWord = useCallback(
    (word: string, index: number) => {
      if (isAnswered) return;
      setAvailable((prev) => [...prev, word]);
      setSelected((prev) => prev.filter((_, i) => i !== index));
    },
    [isAnswered],
  );

  const handleReset = useCallback(() => {
    setAvailable(shuffledWords);
    setSelected([]);
  }, [shuffledWords]);

  function handleSubmit() {
    if (selected.length > 0) {
      onSubmit(selected);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      {/* Prompt */}
      <p className="text-sm font-medium text-gray-700">{promptEs}</p>

      {/* Selected words (answer area) */}
      <div
        className={[
          "flex min-h-[52px] flex-wrap gap-2 rounded-lg border-2 border-dashed p-3",
          isAnswered
            ? result?.correct
              ? "border-green-300 bg-green-50"
              : "border-red-300 bg-red-50"
            : "border-blue-200 bg-blue-50/30",
        ].join(" ")}
      >
        {selected.length === 0 && !isAnswered && (
          <span className="text-sm text-gray-400">
            Selecciona las palabras en orden...
          </span>
        )}
        {selected.map((word, i) => (
          <button
            key={`sel-${i}`}
            type="button"
            disabled={isAnswered}
            onClick={() => handleRemoveWord(word, i)}
            className={[
              "min-h-[36px] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isAnswered
                ? result?.correct
                  ? "bg-green-200 text-green-800"
                  : "bg-red-200 text-red-800"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200",
            ].join(" ")}
          >
            {word}
          </button>
        ))}
      </div>

      {/* Available words (word bank) */}
      {!isAnswered && (
        <div className="flex flex-wrap gap-2">
          {available.map((word, i) => (
            <button
              key={`avail-${i}`}
              type="button"
              onClick={() => handleSelectWord(word, i)}
              className="min-h-[36px] rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {/* Correct answer (shown after incorrect submission) */}
      {isAnswered && !result?.correct && result?.correct_answer && (
        <p className="text-sm text-gray-600">
          <span className="font-medium">Orden correcto: </span>
          {result.correct_answer}
        </p>
      )}

      {/* Action buttons */}
      {!isAnswered && (
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={selected.length === 0}
          >
            Verificar
          </Button>
          {selected.length > 0 && (
            <Button variant="ghost" onClick={handleReset}>
              Reiniciar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
