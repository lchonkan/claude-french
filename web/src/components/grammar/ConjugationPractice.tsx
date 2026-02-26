import { useCallback, useState } from "react";
import { Button } from "@/components/common";
import type { ExerciseSubmitResult } from "@/services/grammar";

export interface ConjugationPracticeProps {
  /** Exercise prompt in Spanish */
  promptEs: string;
  /** The verb infinitive (e.g. "parler") */
  verb: string;
  /** Spanish translation of the verb */
  translation: string;
  /** Expected conjugation forms keyed by pronoun */
  expectedForms: Record<string, string>;
  /** Callback when user submits all forms */
  onSubmit: (forms: Record<string, string>) => void;
  /** Whether a submission is in progress */
  submitting: boolean;
  /** The result after submission */
  result: ExerciseSubmitResult | null;
}

const PRONOUN_ORDER = [
  "je",
  "tu",
  "il/elle",
  "nous",
  "vous",
  "ils/elles",
];

/**
 * Fallback order for non-standard pronoun keys (e.g. adjective forms).
 */
function getOrderedPronouns(expected: Record<string, string>): string[] {
  const keys = Object.keys(expected);
  // If keys match standard pronouns, use canonical order
  const standardKeys = keys.filter((k) =>
    PRONOUN_ORDER.includes(k.toLowerCase()),
  );
  if (standardKeys.length === keys.length) {
    return PRONOUN_ORDER.filter((p) =>
      keys.some((k) => k.toLowerCase() === p),
    );
  }
  // Otherwise return as-is (e.g. adjective forms)
  return keys;
}

export function ConjugationPractice({
  promptEs,
  verb,
  translation,
  expectedForms,
  onSubmit,
  submitting,
  result,
}: ConjugationPracticeProps) {
  const orderedPronouns = getOrderedPronouns(expectedForms);
  const [forms, setForms] = useState<Record<string, string>>(
    Object.fromEntries(orderedPronouns.map((p) => [p, ""])),
  );
  const isAnswered = result !== null;

  const handleChange = useCallback(
    (pronoun: string, value: string) => {
      if (isAnswered) return;
      setForms((prev) => ({ ...prev, [pronoun]: value }));
    },
    [isAnswered],
  );

  function handleSubmit() {
    onSubmit(forms);
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (index < orderedPronouns.length - 1) {
        // Focus next input
        const nextInput = document.getElementById(
          `conj-input-${orderedPronouns[index + 1]}`,
        );
        nextInput?.focus();
      } else if (!isAnswered && !submitting) {
        handleSubmit();
      }
    }
  }

  function getInputStyle(pronoun: string): string {
    if (!isAnswered) {
      return "border-gray-300 focus:border-blue-500 focus:ring-blue-200";
    }
    const expected = expectedForms[pronoun] ?? "";
    const userVal = (forms[pronoun] ?? "").trim().toLowerCase();
    const isCorrect = userVal === expected.trim().toLowerCase();
    return isCorrect
      ? "border-green-400 bg-green-50 text-green-800"
      : "border-red-400 bg-red-50 text-red-800";
  }

  const allFilled = orderedPronouns.every(
    (p) => (forms[p] ?? "").trim().length > 0,
  );

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
      {/* Prompt */}
      <p className="text-sm font-medium text-gray-700">{promptEs}</p>

      {/* Verb header */}
      <div className="rounded-lg bg-blue-50 p-3">
        <p className="text-lg font-bold text-blue-800">{verb}</p>
        <p className="text-sm text-blue-600">{translation}</p>
      </div>

      {/* Conjugation table */}
      <div className="space-y-2">
        {orderedPronouns.map((pronoun, idx) => (
          <div key={pronoun} className="flex items-center gap-3">
            <label
              htmlFor={`conj-input-${pronoun}`}
              className="w-28 text-right text-sm font-medium text-gray-600"
            >
              {pronoun}
            </label>
            <input
              id={`conj-input-${pronoun}`}
              type="text"
              value={forms[pronoun] ?? ""}
              onChange={(e) => handleChange(pronoun, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              disabled={isAnswered}
              placeholder="..."
              className={[
                "flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                "focus:outline-none focus:ring-2",
                "disabled:bg-gray-50",
                getInputStyle(pronoun),
              ].join(" ")}
              autoComplete="off"
            />
            {/* Show correct answer if wrong */}
            {isAnswered &&
              (forms[pronoun] ?? "").trim().toLowerCase() !==
                (expectedForms[pronoun] ?? "").trim().toLowerCase() && (
                <span className="text-sm text-green-700">
                  {expectedForms[pronoun]}
                </span>
              )}
          </div>
        ))}
      </div>

      {/* Submit button */}
      {!isAnswered && (
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!allFilled}
        >
          Verificar conjugacion
        </Button>
      )}
    </div>
  );
}
