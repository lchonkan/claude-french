/**
 * Comprehension question component for listening exercises.
 *
 * Displays a multiple-choice question with:
 * - Question text (French primary, Spanish secondary)
 * - Selectable answer options
 * - Correct / incorrect state indication after submission
 * - Explanation reveal on incorrect answers
 */

import { useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComprehensionQuestionData {
  id: string;
  question_fr: string;
  question_es: string;
  options: string[];
}

export interface QuestionFeedbackData {
  correct: boolean;
  correct_answer: string;
  explanation_es: string;
}

export interface ComprehensionQuestionProps {
  question: ComprehensionQuestionData;
  /** One-based question number for display */
  questionNumber: number;
  /** If provided, the question is in "answered" state */
  feedback?: QuestionFeedbackData | null;
  /** Called when the user selects an answer */
  onAnswer?: (questionId: string, answer: string) => void;
  /** Currently selected answer (controlled) */
  selectedAnswer?: string | null;
  /** Whether the question is disabled (e.g., after submission) */
  disabled?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ComprehensionQuestion({
  question,
  questionNumber,
  feedback = null,
  onAnswer,
  selectedAnswer = null,
  disabled = false,
  className = "",
}: ComprehensionQuestionProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  const handleSelect = useCallback(
    (option: string) => {
      if (disabled || feedback) return;
      onAnswer?.(question.id, option);
    },
    [disabled, feedback, onAnswer, question.id]
  );

  const isAnswered = feedback != null;

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm ${
        isAnswered
          ? feedback.correct
            ? "border-green-200"
            : "border-red-200"
          : "border-gray-200"
      } ${className}`}
    >
      {/* Question header */}
      <div className="border-b border-gray-100 px-5 py-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              isAnswered
                ? feedback.correct
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {questionNumber}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {question.question_fr}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {question.question_es}
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="px-5 py-3">
        <fieldset disabled={disabled || isAnswered}>
          <legend className="sr-only">
            Opciones para pregunta {questionNumber}
          </legend>
          <div className="space-y-2">
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrectOption =
                isAnswered && option === feedback.correct_answer;
              const isWrongSelection =
                isAnswered && isSelected && !feedback.correct;

              let optionStyles =
                "border-gray-200 hover:border-blue-300 hover:bg-blue-50";

              if (isAnswered) {
                if (isCorrectOption) {
                  optionStyles =
                    "border-green-300 bg-green-50 text-green-800";
                } else if (isWrongSelection) {
                  optionStyles = "border-red-300 bg-red-50 text-red-800";
                } else {
                  optionStyles =
                    "border-gray-200 bg-gray-50 text-gray-400";
                }
              } else if (isSelected) {
                optionStyles =
                  "border-blue-400 bg-blue-50 text-blue-800 ring-1 ring-blue-300";
              }

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  disabled={disabled || isAnswered}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-default ${optionStyles}`}
                  aria-pressed={isSelected}
                >
                  {/* Radio circle */}
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected || isCorrectOption
                        ? isCorrectOption
                          ? "border-green-500"
                          : isWrongSelection
                            ? "border-red-500"
                            : "border-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {(isSelected || isCorrectOption) && (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isCorrectOption
                            ? "bg-green-500"
                            : isWrongSelection
                              ? "bg-red-500"
                              : "bg-blue-500"
                        }`}
                      />
                    )}
                  </span>

                  {/* Option text */}
                  <span className="flex-1">{option}</span>

                  {/* Result icon */}
                  {isAnswered && isCorrectOption && (
                    <svg
                      className="h-5 w-5 shrink-0 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {isWrongSelection && (
                    <svg
                      className="h-5 w-5 shrink-0 text-red-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {/* Feedback / Explanation section */}
      {isAnswered && (
        <div
          className={`border-t px-5 py-3 ${
            feedback.correct
              ? "border-green-100 bg-green-50"
              : "border-red-100 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-2">
            {feedback.correct ? (
              <span className="text-sm font-medium text-green-700">
                Correcto!
              </span>
            ) : (
              <span className="text-sm font-medium text-red-700">
                Incorrecto
              </span>
            )}
          </div>

          {!feedback.correct && (
            <>
              {showExplanation ? (
                <p className="mt-2 text-sm text-gray-700">
                  {feedback.explanation_es}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowExplanation(true)}
                  className="mt-1 text-sm font-medium text-blue-600 underline hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Ver explicacion
                </button>
              )}
            </>
          )}

          {feedback.correct && feedback.explanation_es && (
            <p className="mt-1 text-sm text-green-700">
              {feedback.explanation_es}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
