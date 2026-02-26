import { useState } from "react";
import { Button } from "@/components/common";
import type { ExerciseSubmitResult } from "@/services/grammar";

export interface ErrorCorrectionProps {
  /** Exercise prompt in Spanish */
  promptEs: string;
  /** The French sentence containing an error */
  sentence: string;
  /** The word that contains the error */
  errorWord: string;
  /** Callback when user submits their correction */
  onSubmit: (answer: string) => void;
  /** Whether a submission is in progress */
  submitting: boolean;
  /** The result after submission */
  result: ExerciseSubmitResult | null;
}

export function ErrorCorrection({
  promptEs,
  sentence,
  errorWord,
  onSubmit,
  submitting,
  result,
}: ErrorCorrectionProps) {
  const [correction, setCorrection] = useState("");
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const isAnswered = result !== null;

  // Split sentence into words for clickable display
  const words = sentence.split(/\s+/);

  function handleWordClick(word: string) {
    if (isAnswered) return;
    setSelectedWord(word);
    // Pre-fill the correction input (clear for fresh typing)
    setCorrection("");
  }

  function handleSubmit() {
    if (correction.trim()) {
      onSubmit(correction.trim());
    }
  }

  function getWordStyle(word: string): string {
    // Clean punctuation for comparison
    const cleanWord = word.replace(/[.,!?;:'"]/g, "");
    const cleanError = errorWord.replace(/[.,!?;:'"]/g, "");

    if (isAnswered) {
      if (cleanWord.toLowerCase() === cleanError.toLowerCase()) {
        return result?.correct
          ? "text-green-700 bg-green-100 rounded px-1"
          : "text-red-700 bg-red-100 line-through rounded px-1";
      }
      return "text-gray-800";
    }

    // Before submission
    if (selectedWord && cleanWord.toLowerCase() === selectedWord.replace(/[.,!?;:'"]/g, "").toLowerCase()) {
      return "text-blue-700 bg-blue-100 rounded px-1 ring-2 ring-blue-300";
    }

    return "text-gray-800 cursor-pointer hover:bg-yellow-50 hover:text-yellow-800 rounded px-0.5 transition-colors";
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      {/* Prompt */}
      <p className="text-sm font-medium text-gray-700">{promptEs}</p>

      {/* Sentence with clickable words */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
        <p className="text-lg leading-relaxed">
          {words.map((word, i) => (
            <span key={i}>
              <span
                role="button"
                tabIndex={isAnswered ? -1 : 0}
                onClick={() => handleWordClick(word)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleWordClick(word);
                  }
                }}
                className={getWordStyle(word)}
              >
                {word}
              </span>
              {i < words.length - 1 && " "}
            </span>
          ))}
        </p>
      </div>

      {/* Instruction */}
      {!isAnswered && !selectedWord && (
        <p className="text-xs text-gray-400">
          Haz clic en la palabra con el error, luego escribe la correccion.
        </p>
      )}

      {/* Selected word + correction input */}
      {!isAnswered && selectedWord && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Palabra seleccionada:</span>
            <span className="rounded bg-yellow-100 px-2 py-0.5 font-medium text-yellow-800">
              {selectedWord}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !submitting && correction.trim()) {
                  handleSubmit();
                }
              }}
              placeholder="Escribe la correccion..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Corrected sentence (shown after submission) */}
      {isAnswered && result?.correct_answer && (
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
          <span className="font-medium text-gray-600">Correccion: </span>
          <span className="text-green-700">{result.correct_answer}</span>
        </div>
      )}

      {/* Submit button */}
      {!isAnswered && selectedWord && (
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!correction.trim()}
        >
          Verificar correccion
        </Button>
      )}
    </div>
  );
}
