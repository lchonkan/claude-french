/**
 * EvaluationResult -- Displays the full writing evaluation with 4 criterion
 * scores as progress bars, an overall CEFR badge, and feedback text.
 */

import type { CEFRLevel } from "@/types/cefr";
import { CriterionScore } from "./CriterionScore";

export interface EvaluationResultProps {
  grammarScore: number | null;
  vocabularyScore: number | null;
  coherenceScore: number | null;
  taskCompletionScore: number | null;
  overallCefrScore: CEFRLevel | null;
  feedbackEs: string | null;
  /** Optional list of specific errors found */
  details?: EvaluationErrorDetail[];
  className?: string;
}

export interface EvaluationErrorDetail {
  original: string;
  correction: string;
  error_type: string;
  explanation_es: string;
}

const cefrBadgeColors: Record<CEFRLevel, string> = {
  A1: "bg-green-100 text-green-800 border-green-200",
  A2: "bg-green-100 text-green-800 border-green-200",
  B1: "bg-blue-100 text-blue-800 border-blue-200",
  B2: "bg-blue-100 text-blue-800 border-blue-200",
  C1: "bg-purple-100 text-purple-800 border-purple-200",
  C2: "bg-purple-100 text-purple-800 border-purple-200",
};

export function EvaluationResult({
  grammarScore,
  vocabularyScore,
  coherenceScore,
  taskCompletionScore,
  overallCefrScore,
  feedbackEs,
  details,
  className = "",
}: EvaluationResultProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {/* Header with overall CEFR badge */}
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Resultado de la evaluacion
          </h3>
          <p className="mt-0.5 text-sm text-gray-500">
            Evaluacion CEFR de tu escritura
          </p>
        </div>
        {overallCefrScore && (
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 text-lg font-bold ${cefrBadgeColors[overallCefrScore]}`}
          >
            {overallCefrScore}
          </div>
        )}
      </div>

      {/* Criterion scores */}
      <div className="space-y-5 px-6 py-5">
        <CriterionScore
          label="Gramatica"
          score={grammarScore}
          description="Precision gramatical: concordancia, conjugaciones, uso correcto de tiempos verbales."
        />
        <CriterionScore
          label="Vocabulario"
          score={vocabularyScore}
          description="Riqueza y precision del vocabulario utilizado, adecuacion al nivel CEFR."
        />
        <CriterionScore
          label="Coherencia"
          score={coherenceScore}
          description="Organizacion del texto, uso de conectores y fluidez de las ideas."
        />
        <CriterionScore
          label="Cumplimiento de la tarea"
          score={taskCompletionScore}
          description="Respuesta completa y relevante a la consigna de escritura."
        />
      </div>

      {/* Feedback */}
      {feedbackEs && (
        <div className="border-t border-gray-100 px-6 py-4">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            Retroalimentacion
          </h4>
          <p className="text-sm leading-relaxed text-gray-600">
            {feedbackEs}
          </p>
        </div>
      )}

      {/* Specific errors / corrections */}
      {details && details.length > 0 && (
        <div className="border-t border-gray-100 px-6 py-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">
            Correcciones especificas ({details.length})
          </h4>
          <div className="space-y-2.5">
            {details.map((d, index) => (
              <div
                key={index}
                className="rounded-lg bg-red-50 p-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-600 line-through">
                    {d.original}
                  </span>
                  <span className="text-gray-400" aria-hidden="true">
                    {">"}
                  </span>
                  <span className="font-medium text-green-700">
                    {d.correction}
                  </span>
                  <span className="ml-auto rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {d.error_type}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {d.explanation_es}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
