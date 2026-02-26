import type { CulturalNotePreview } from "@/services/cultural";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const cefrBadgeColors: Record<CEFRLevel, string> = {
  A1: "bg-green-100 text-green-800",
  A2: "bg-green-200 text-green-900",
  B1: "bg-blue-100 text-blue-800",
  B2: "bg-blue-200 text-blue-900",
  C1: "bg-purple-100 text-purple-800",
  C2: "bg-purple-200 text-purple-900",
};

const categoryLabels: Record<string, { label: string; color: string }> = {
  history: { label: "Historia", color: "bg-amber-100 text-amber-800" },
  neighborhoods: { label: "Barrios", color: "bg-teal-100 text-teal-800" },
  etiquette: { label: "Etiqueta", color: "bg-rose-100 text-rose-800" },
  cuisine: { label: "Gastronomia", color: "bg-orange-100 text-orange-800" },
  daily_life: { label: "Vida cotidiana", color: "bg-sky-100 text-sky-800" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ArticleCardProps {
  note: CulturalNotePreview;
  onClick: (id: string) => void;
}

export function ArticleCard({ note, onClick }: ArticleCardProps) {
  const cefrColor = cefrBadgeColors[note.cefr_level] ?? "bg-gray-100 text-gray-800";
  const cat = categoryLabels[note.category] ?? {
    label: note.category,
    color: "bg-gray-100 text-gray-700",
  };

  return (
    <button
      type="button"
      onClick={() => onClick(note.id)}
      className="w-full rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      aria-label={`Leer: ${note.title_es}`}
    >
      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cefrColor}`}
        >
          {note.cefr_level}
        </span>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cat.color}`}
        >
          {cat.label}
        </span>
        {note.reviewed && (
          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Revisado
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="mt-3 text-base font-semibold text-gray-900 line-clamp-2">
        {note.title_fr}
      </h3>
      <p className="mt-0.5 text-sm text-gray-500">{note.title_es}</p>

      {/* Preview */}
      <p className="mt-2 text-sm leading-relaxed text-gray-600 line-clamp-3">
        {note.preview_es}
      </p>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>
          {note.vocabulary_count > 0
            ? `${note.vocabulary_count} palabras de vocabulario`
            : "Sin vocabulario vinculado"}
        </span>
        <span className="font-medium text-blue-600">Leer mas</span>
      </div>
    </button>
  );
}
