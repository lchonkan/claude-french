import { useState } from "react";
import { Button } from "@/components/common";
import type { ExerciseSubmitResult } from "@/services/grammar";

export interface FillBlankProps {
  /** Exercise prompt in Spanish */
  promptEs: string;
  /** The sentence (may contain ___ for blanks) or question text */
  sentence: string;
  /** Answer options for multiple-choice style */
  options: string[];
  /** The correct answer (shown after submission) */
  correctAnswer?: string;
  /** Callback when user submits */
  onSubmit: (answer: string) => void;
  /** Whether a submission is in progress */
  submitting: boolean;
  /** The result after submission (null before first submit) */
  result: ExerciseSubmitResult | null;
}

export function FillBlank({
  promptEs,
  sentence,
  options,
  onSubmit,
  submitting,
  result,
}: FillBlankProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");

  const hasOptions = options.length > 0;
  const isAnswered = result !== null;

  function handleSubmit() {
    const answer = hasOptions ? selectedOption : textInput.trim();
    if (answer) {
      onSubmit(answer);
    }
  }

  function getOptionStyle(option: string): string {
    if (!isAnswered) {
      return selectedOption === option
        ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200"
        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50";
    }
    // After submission: highlight correct/incorrect
    const isSelected = selectedOption === option;
    const isCorrectOption =
      option.toLowerCase().trim() ===
      (result?.correct_answer ?? "").toLowerCase().trim();

    if (isCorrectOption) {
      return "border-green-500 bg-green-50 text-green-800";
    }
    if (isSelected && !result?.correct) {
      return "border-red-500 bg-red-50 text-red-800";
    }
    return "border-gray-200 bg-gray-50 text-gray-400";
  }

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      {/* Prompt */}
      <p className="text-sm font-medium text-gray-700">{promptEs}</p>

      {/* Sentence with blank */}
      <p className="text-lg text-gray-900">
        {sentence.split("___").map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 && (
              <span className="mx-1 inline-block min-w-[80px] border-b-2 border-blue-400 text-center text-blue-600">
                {isAnswered
                  ? result?.correct_answer ?? "___"
                  : selectedOption ?? (textInput || "___")}
              </span>
            )}
          </span>
        ))}
      </p>

      {/* Options or text input */}
      {hasOptions ? (
        <div className="grid grid-cols-2 gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={isAnswered}
              onClick={() => setSelectedOption(option)}
              className={[
                "min-h-[44px] rounded-lg border px-4 py-2.5 text-sm font-medium transition-all",
                getOptionStyle(option),
              ].join(" ")}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isAnswered && !submitting) {
              handleSubmit();
            }
          }}
          disabled={isAnswered}
          placeholder="Escribe tu respuesta..."
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
        />
      )}

      {/* Submit button */}
      {!isAnswered && (
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={hasOptions ? !selectedOption : !textInput.trim()}
        >
          Verificar
        </Button>
      )}
    </div>
  );
}
