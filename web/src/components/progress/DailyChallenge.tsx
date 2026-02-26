/**
 * DailyChallenge -- Challenge card with skill icon, description, and complete button.
 */

import { useState } from "react";
import { Button } from "@/components/common";
import type { DailyChallengeData } from "@/services/progress";

// ---------------------------------------------------------------------------
// Skill icon mapping
// ---------------------------------------------------------------------------

const skillIcons: Record<string, string> = {
  vocabulary:
    "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  grammar:
    "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  writing:
    "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  listening:
    "M15.536 8.464a5 5 0 010 7.072M12 12h.01M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728",
  pronunciation:
    "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  conversation:
    "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
};

const skillLabels: Record<string, string> = {
  vocabulary: "Vocabulario",
  grammar: "Gramatica",
  writing: "Escritura",
  listening: "Comprension auditiva",
  pronunciation: "Pronunciacion",
  conversation: "Conversacion",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DailyChallengeProps {
  challenge: DailyChallengeData;
  onComplete: (id: string) => Promise<void>;
  className?: string;
}

export function DailyChallenge({
  challenge,
  onComplete,
  className = "",
}: DailyChallengeProps) {
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(challenge.completed);

  const iconPath =
    skillIcons[challenge.challenge_type] ?? skillIcons.vocabulary;
  const skillLabel =
    skillLabels[challenge.challenge_type] ?? challenge.challenge_type;

  const handleComplete = async () => {
    if (completed || completing) return;
    setCompleting(true);
    try {
      await onComplete(challenge.id);
      setCompleted(true);
    } catch {
      // Error handled by parent
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      className={[
        "rounded-xl border bg-white p-5 shadow-sm",
        completed ? "border-emerald-200 bg-emerald-50" : "border-gray-200",
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        {/* Skill icon */}
        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            completed ? "bg-emerald-100" : "bg-blue-100",
          ].join(" ")}
        >
          <svg
            className={[
              "h-6 w-6",
              completed ? "text-emerald-600" : "text-blue-600",
            ].join(" ")}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={iconPath}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Desafio diario
            </h3>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              {skillLabel}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            {challenge.description_es}
          </p>

          <div className="mt-3 flex items-center justify-between">
            {/* XP reward */}
            <span className="text-sm font-semibold text-amber-600">
              +{challenge.xp_reward} XP
            </span>

            {/* Complete button */}
            {completed ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Completado
              </span>
            ) : (
              <Button
                variant="primary"
                size="sm"
                loading={completing}
                onClick={handleComplete}
              >
                Completar
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
