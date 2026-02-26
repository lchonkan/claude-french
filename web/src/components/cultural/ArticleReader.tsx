import { useState } from "react";
import { Button } from "@/components/common";
import { VocabularyHighlight } from "./VocabularyHighlight";
import type { CulturalNoteDetail } from "@/services/cultural";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ArticleReaderProps {
  note: CulturalNoteDetail;
  onAddVocabToSRS: (vocabId: string) => Promise<void>;
  onBack: () => void;
}

export function ArticleReader({
  note,
  onAddVocabToSRS,
  onBack,
}: ArticleReaderProps) {
  const [language, setLanguage] = useState<"fr" | "es">("fr");

  const content = language === "fr" ? note.content_fr : note.content_es;
  const title = language === "fr" ? note.title_fr : note.title_es;

  // Parse content into paragraphs
  const paragraphs = content.split("\n").filter((p) => p.trim().length > 0);

  return (
    <article className="mx-auto max-w-3xl">
      {/* Back button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Volver a notas
        </Button>
      </div>

      {/* Header */}
      <header className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            {note.cefr_level}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 capitalize">
            {note.category.replace("_", " ")}
          </span>
        </div>

        {/* Title */}
        <h1 className="mt-3 text-2xl font-bold text-gray-900">{title}</h1>
        {language === "fr" && (
          <p className="mt-1 text-sm text-gray-500">{note.title_es}</p>
        )}

        {/* Language toggle */}
        <div
          className="mt-4 inline-flex rounded-lg border border-gray-200 p-0.5"
          role="radiogroup"
          aria-label="Idioma del articulo"
        >
          <button
            type="button"
            role="radio"
            aria-checked={language === "fr"}
            onClick={() => setLanguage("fr")}
            className={[
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              language === "fr"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            Francais
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={language === "es"}
            onClick={() => setLanguage("es")}
            className={[
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              language === "es"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900",
            ].join(" ")}
          >
            Espanol
          </button>
        </div>
      </header>

      {/* Article body */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="prose prose-gray max-w-none">
          {paragraphs.map((paragraph, idx) => (
            <p
              key={idx}
              className="mb-4 text-base leading-relaxed text-gray-800"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* Vocabulary section */}
      {note.vocabulary.length > 0 && (
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Vocabulario relacionado
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Toca una palabra para ver su traduccion y agregarla a tu cola de repaso.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            {note.vocabulary.map((vocab) => (
              <VocabularyHighlight
                key={vocab.id}
                vocab={vocab}
                onAddToSRS={onAddVocabToSRS}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
