/**
 * PhonemeMap -- Visual display of phonemes with color-coded accuracy.
 *
 * Each phoneme is rendered as a pill with a background color reflecting
 * its accuracy score:
 *   - Green (>= 0.7):  Good pronunciation
 *   - Yellow (>= 0.4): Fair pronunciation, needs work
 *   - Red (< 0.4):     Poor pronunciation, focus area
 *
 * Clicking a phoneme reveals its details (expected vs. actual) and any
 * identified issues.
 */

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhonemeData {
  target: string;
  actual: string;
  score: number;
  issue?: string | null;
}

export interface PhonemeMapProps {
  phonemes: PhonemeData[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getScoreColor(score: number): string {
  if (score >= 0.7) return "bg-green-100 text-green-800 border-green-300";
  if (score >= 0.4) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-800 border-red-300";
}

function getScoreLabel(score: number): string {
  if (score >= 0.7) return "Bueno";
  if (score >= 0.4) return "Regular";
  return "Necesita practica";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhonemeMap({ phonemes, className = "" }: PhonemeMapProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (phonemes.length === 0) {
    return (
      <p className={`text-sm text-gray-400 ${className}`}>
        No hay datos de fonemas disponibles.
      </p>
    );
  }

  const selected = selectedIndex !== null ? phonemes[selectedIndex] : null;

  return (
    <div className={className}>
      {/* Phoneme pills */}
      <div
        className="flex flex-wrap gap-1.5"
        role="list"
        aria-label="Mapa de fonemas"
      >
        {phonemes.map((phoneme, index) => (
          <button
            key={index}
            type="button"
            className={[
              "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
              "transition-all duration-150 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
              getScoreColor(phoneme.score),
              selectedIndex === index && "ring-2 ring-blue-500 ring-offset-1",
            ].join(" ")}
            onClick={() =>
              setSelectedIndex(selectedIndex === index ? null : index)
            }
            aria-label={`Fonema ${phoneme.target}: ${Math.round(phoneme.score * 100)}%`}
            aria-pressed={selectedIndex === index}
            role="listitem"
          >
            <span className="font-mono">{phoneme.target}</span>
            <span className="ml-1 opacity-70">
              {Math.round(phoneme.score * 100)}%
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
          Bueno
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
          Regular
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400" />
          Necesita practica
        </span>
      </div>

      {/* Detail panel */}
      {selected && (
        <div
          className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3"
          role="region"
          aria-label="Detalle del fonema seleccionado"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold text-gray-900">
                /{selected.target}/
              </span>
              <span className="text-sm text-gray-500">
                {getScoreLabel(selected.score)}
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {Math.round(selected.score * 100)}%
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-xs font-medium text-gray-500">
                Esperado
              </span>
              <p className="font-mono text-gray-900">/{selected.target}/</p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500">
                Pronunciado
              </span>
              <p className="font-mono text-gray-900">/{selected.actual}/</p>
            </div>
          </div>

          {selected.issue && (
            <div className="mt-2 rounded bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
              {selected.issue === "uvular_r"
                ? "La 'r' francesa es uvular (producida en la garganta), diferente de la 'r' espanola."
                : selected.issue}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
