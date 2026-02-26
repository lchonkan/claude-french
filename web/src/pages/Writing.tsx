/**
 * Writing page -- Complete writing practice and evaluation workflow.
 *
 * Features:
 * - Prompt selection by CEFR level (dropdown or cards)
 * - Text editor with word/character count
 * - AccentToolbar for French accented characters
 * - "Quick grammar check" button (calls POST /grammar/check for preview)
 * - Submit button with polling for evaluation result
 * - Full evaluation display with 4 criterion scores, overall CEFR badge,
 *   and detailed feedback
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { Button, LoadingState } from "@/components/common";
import {
  WritingEditor,
  AccentToolbar,
  EvaluationResult,
} from "@/components/writing";
import type { EvaluationErrorDetail } from "@/components/writing";
import {
  getWritingPrompts,
  submitWriting,
  pollEvaluation,
  quickGrammarCheck,
  type WritingPrompt,
  type WritingEvaluationResult,
  type GrammarCheckResult,
} from "@/services/writing";
import type { CEFRLevel } from "@/types/cefr";
import { CEFR_ORDER } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Page state types
// ---------------------------------------------------------------------------

type PageView = "prompts" | "editor" | "evaluating" | "result" | "history";

// ---------------------------------------------------------------------------
// Default CEFR level (in a real app, from user profile)
// ---------------------------------------------------------------------------

const DEFAULT_CEFR_LEVEL: CEFRLevel = "A1";

// ---------------------------------------------------------------------------
// Writing page component
// ---------------------------------------------------------------------------

export default function Writing() {
  const intl = useIntl();

  // Core page state
  const [view, setView] = useState<PageView>("prompts");
  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>(DEFAULT_CEFR_LEVEL);

  // Prompt selection
  const [prompts, setPrompts] = useState<WritingPrompt[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<WritingPrompt | null>(null);

  // Editor
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grammar preview
  const [grammarResult, setGrammarResult] = useState<GrammarCheckResult | null>(null);
  const [grammarLoading, setGrammarLoading] = useState(false);

  // Submission / evaluation
  const [submitting, setSubmitting] = useState(false);
  const [evaluationStatus, setEvaluationStatus] = useState<string>("pending");
  const [evaluationResult, setEvaluationResult] = useState<WritingEvaluationResult | null>(null);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ---- Load prompts when CEFR level changes ----
  useEffect(() => {
    async function loadPrompts() {
      setPromptsLoading(true);
      setError(null);
      try {
        const result = await getWritingPrompts(cefrLevel);
        setPrompts(result.prompts);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar las consignas de escritura."
        );
        setPrompts([]);
      } finally {
        setPromptsLoading(false);
      }
    }
    loadPrompts();
  }, [cefrLevel]);

  // ---- Select a prompt and go to editor ----
  const handleSelectPrompt = useCallback((prompt: WritingPrompt) => {
    setSelectedPrompt(prompt);
    setText("");
    setGrammarResult(null);
    setEvaluationResult(null);
    setError(null);
    setView("editor");
  }, []);

  // ---- Quick grammar check ----
  const handleGrammarCheck = useCallback(async () => {
    if (!text.trim() || grammarLoading) return;

    setGrammarLoading(true);
    setError(null);

    try {
      const result = await quickGrammarCheck(text, cefrLevel);
      setGrammarResult(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al verificar la gramatica."
      );
    } finally {
      setGrammarLoading(false);
    }
  }, [text, cefrLevel, grammarLoading]);

  // ---- Submit writing for evaluation ----
  const handleSubmit = useCallback(async () => {
    if (!selectedPrompt || !text.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    setView("evaluating");
    setEvaluationStatus("pending");

    try {
      const submitResult = await submitWriting({
        prompt_id: selectedPrompt.id,
        prompt_text: selectedPrompt.prompt_fr,
        submitted_text: text,
        cefr_level: cefrLevel,
      });

      // Poll for completion
      const completed = await pollEvaluation(submitResult.evaluation_id, {
        maxRetries: 40,
        initialDelayMs: 2000,
        maxDelayMs: 8000,
        onStatusChange: (status) => setEvaluationStatus(status),
      });

      setEvaluationResult(completed);
      setView("result");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error durante la evaluacion."
      );
      setView("editor");
    } finally {
      setSubmitting(false);
    }
  }, [selectedPrompt, text, cefrLevel, submitting]);

  // ---- Go back to prompt selection ----
  const handleNewWriting = useCallback(() => {
    setSelectedPrompt(null);
    setText("");
    setGrammarResult(null);
    setEvaluationResult(null);
    setError(null);
    setView("prompts");
  }, []);

  // ---- Go back to editor from result ----
  const handleEditAgain = useCallback(() => {
    setGrammarResult(null);
    setEvaluationResult(null);
    setError(null);
    setView("editor");
  }, []);

  // Compute word count for button disabling
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minWords = selectedPrompt?.min_words ?? 20;
  const maxWords = selectedPrompt?.max_words ?? 500;
  const canSubmit = wordCount >= minWords && wordCount <= maxWords + 50;

  // ===========================================================================
  // Render: Evaluating (loading state)
  // ===========================================================================
  if (view === "evaluating") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: "writing.title" })}
          </h1>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <LoadingState
            message={
              evaluationStatus === "processing"
                ? "Evaluando tu escritura con IA..."
                : "Enviando tu texto para evaluacion..."
            }
            estimatedDuration="30-60 segundos"
          />

          <div className="mt-4 text-center">
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Estado: {evaluationStatus === "processing" ? "Procesando" : "Pendiente"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Render: Result
  // ===========================================================================
  if (view === "result" && evaluationResult) {
    // Extract error details for the EvaluationResult component
    const errorDetails: EvaluationErrorDetail[] =
      evaluationResult.evaluation_json?.details?.map((d) => ({
        original: d.original,
        correction: d.correction,
        error_type: d.error_type,
        explanation_es: d.explanation_es,
      })) ?? [];

    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: "writing.title" })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {selectedPrompt?.title}
          </p>
        </div>

        <EvaluationResult
          grammarScore={evaluationResult.grammar_score}
          vocabularyScore={evaluationResult.vocabulary_score}
          coherenceScore={evaluationResult.coherence_score}
          taskCompletionScore={evaluationResult.task_completion_score}
          overallCefrScore={evaluationResult.overall_cefr_score}
          feedbackEs={evaluationResult.feedback_es}
          details={errorDetails}
          className="mb-6"
        />

        {/* Submitted text preview */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h4 className="mb-2 text-sm font-semibold text-gray-700">
            Tu texto
          </h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {evaluationResult.submitted_text}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleEditAgain}>
            Editar y reenviar
          </Button>
          <Button variant="primary" onClick={handleNewWriting}>
            Nueva escritura
          </Button>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // Render: Editor
  // ===========================================================================
  if (view === "editor" && selectedPrompt) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: "writing.title" })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Nivel {cefrLevel} -- {selectedPrompt.title}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              type="button"
              className="ml-2 font-medium underline"
              onClick={() => setError(null)}
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Prompt card */}
        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="mb-1 text-sm font-semibold text-blue-800">
            Consigna
          </h3>
          <p className="text-sm leading-relaxed text-blue-700">
            {selectedPrompt.prompt_fr}
          </p>
          <p className="mt-2 text-xs text-blue-500">
            {selectedPrompt.prompt_es}
          </p>
        </div>

        {/* Accent toolbar */}
        <div className="mb-3">
          <AccentToolbar
            textareaRef={textareaRef}
            onInsert={setText}
            disabled={submitting}
          />
        </div>

        {/* Text editor */}
        <WritingEditor
          ref={textareaRef}
          value={text}
          onChange={setText}
          disabled={submitting}
          minWords={selectedPrompt.min_words}
          maxWords={selectedPrompt.max_words}
          placeholder={`Ecris en francais... (min ${selectedPrompt.min_words} mots)`}
          className="mb-4"
        />

        {/* Grammar preview results */}
        {grammarResult && grammarResult.corrections.length > 0 && (
          <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="mb-2 text-sm font-semibold text-yellow-800">
              Revision gramatical rapida ({grammarResult.corrections.length} sugerencias)
            </h4>
            <div className="space-y-2">
              {grammarResult.corrections.map((c, i) => (
                <div key={i} className="rounded-lg bg-white p-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 line-through">{c.original}</span>
                    <span className="text-gray-400" aria-hidden="true">{">"}</span>
                    <span className="font-medium text-green-700">{c.suggestion}</span>
                  </div>
                  {c.explanation_es && (
                    <p className="mt-1 text-xs text-gray-500">{c.explanation_es}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {grammarResult && grammarResult.corrections.length === 0 && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-sm text-green-700">
              No se encontraron errores gramaticales. Bien hecho!
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNewWriting}
          >
            Cambiar consigna
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleGrammarCheck}
            loading={grammarLoading}
            disabled={!text.trim() || grammarLoading || submitting}
          >
            Revision gramatical rapida
          </Button>

          <div className="flex-1" />

          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={!canSubmit || submitting}
          >
            Enviar para evaluacion
          </Button>
        </div>

        {!canSubmit && wordCount > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            {wordCount < minWords
              ? `Necesitas al menos ${minWords} palabras (tienes ${wordCount}).`
              : `Has superado el limite de ${maxWords} palabras (tienes ${wordCount}).`}
          </p>
        )}
      </div>
    );
  }

  // ===========================================================================
  // Render: Prompt selection (default)
  // ===========================================================================
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "writing.title" })}
        </h1>
        <p className="mt-2 text-gray-500">
          Mejora tu escritura en frances con retroalimentacion detallada impulsada por IA.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => setError(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* CEFR level selector */}
      <div className="mb-6 flex items-center gap-3">
        <label
          htmlFor="cefr-select"
          className="text-sm font-medium text-gray-700"
        >
          Nivel CEFR:
        </label>
        <div className="flex gap-1.5">
          {CEFR_ORDER.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setCefrLevel(level)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                cefrLevel === level
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              aria-pressed={cefrLevel === level}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Prompts grid */}
      {promptsLoading ? (
        <LoadingState
          message="Cargando consignas de escritura..."
          skeleton
          skeletonLines={4}
        />
      ) : prompts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">
            No hay consignas disponibles para el nivel {cefrLevel}.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {prompts.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              onClick={() => handleSelectPrompt(prompt)}
              className="group rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                  {prompt.title}
                </h3>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
                  {prompt.min_words}-{prompt.max_words} mots
                </span>
              </div>
              <p className="text-sm leading-relaxed text-gray-500 line-clamp-2">
                {prompt.prompt_es}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
