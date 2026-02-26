import { useCallback, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  LoadingState,
  ErrorState,
} from "@/components/common";
import { ArticleCard, ArticleReader } from "@/components/cultural";
import {
  getCulturalNotes,
  getCulturalNote,
  addVocabularyFromNote,
  CULTURAL_CATEGORIES,
} from "@/services/cultural";
import type {
  CulturalCategory,
  CulturalNoteDetail,
} from "@/services/cultural";
import { CEFR_ORDER } from "@/types/cefr";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 9;

const cefrTabColors: Record<CEFRLevel, { active: string; inactive: string }> = {
  A1: { active: "bg-green-600 text-white", inactive: "text-green-700 hover:bg-green-50" },
  A2: { active: "bg-green-700 text-white", inactive: "text-green-800 hover:bg-green-50" },
  B1: { active: "bg-blue-600 text-white", inactive: "text-blue-700 hover:bg-blue-50" },
  B2: { active: "bg-blue-700 text-white", inactive: "text-blue-800 hover:bg-blue-50" },
  C1: { active: "bg-purple-600 text-white", inactive: "text-purple-700 hover:bg-purple-50" },
  C2: { active: "bg-purple-700 text-white", inactive: "text-purple-800 hover:bg-purple-50" },
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function CulturalNotes() {
  const intl = useIntl();
  const queryClient = useQueryClient();

  // ---- State ----
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>("A1");
  const [selectedCategory, setSelectedCategory] = useState<CulturalCategory | null>(null);
  const [page, setPage] = useState(0);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // ---- Data fetching: note list ----
  const {
    data: listData,
    isLoading: listLoading,
    isError: listError,
    error: listErrorObj,
    refetch: refetchList,
  } = useQuery({
    queryKey: ["cultural", "notes", selectedLevel, selectedCategory, page],
    queryFn: () =>
      getCulturalNotes({
        cefr_level: selectedLevel,
        category: selectedCategory ?? undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const notes = listData?.data?.notes ?? [];
  const totalNotes = listData?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalNotes / PAGE_SIZE));

  // ---- Data fetching: note detail ----
  const {
    data: detailData,
    isLoading: detailLoading,
    isError: detailError,
  } = useQuery({
    queryKey: ["cultural", "note", selectedNoteId],
    queryFn: () => getCulturalNote(selectedNoteId!),
    enabled: selectedNoteId != null,
  });

  const noteDetail: CulturalNoteDetail | null = detailData?.data ?? null;

  // ---- Mutation: add vocab to SRS ----
  const addVocabMutation = useMutation({
    mutationFn: (vocabId: string) =>
      addVocabularyFromNote(selectedNoteId!, vocabId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["cultural", "note", selectedNoteId],
      });
    },
  });

  // ---- Handlers ----
  const handleLevelChange = useCallback((level: CEFRLevel) => {
    setSelectedLevel(level);
    setPage(0);
  }, []);

  const handleCategoryChange = useCallback(
    (category: CulturalCategory | null) => {
      setSelectedCategory(category);
      setPage(0);
    },
    [],
  );

  const handleNoteClick = useCallback((id: string) => {
    setSelectedNoteId(id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedNoteId(null);
  }, []);

  const handleAddVocab = useCallback(
    async (vocabId: string) => {
      await addVocabMutation.mutateAsync(vocabId);
    },
    [addVocabMutation],
  );

  // ---- If reading an article, show the reader ----
  if (selectedNoteId) {
    if (detailLoading) {
      return (
        <div className="space-y-6">
          <LoadingState message="Cargando articulo..." skeleton skeletonLines={8} />
        </div>
      );
    }

    if (detailError || !noteDetail) {
      return (
        <div className="space-y-6">
          <ErrorState
            message="No se pudo cargar el articulo."
            onRetry={() =>
              queryClient.invalidateQueries({
                queryKey: ["cultural", "note", selectedNoteId],
              })
            }
          />
          <Button variant="ghost" onClick={handleBack}>
            Volver
          </Button>
        </div>
      );
    }

    return (
      <ArticleReader
        note={noteDetail}
        onAddVocabToSRS={handleAddVocab}
        onBack={handleBack}
      />
    );
  }

  // ---- Render list view ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "cultural.title" })}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Explora la cultura francesa a traves de articulos bilingues.
        </p>
      </div>

      {/* CEFR level filter tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filtrar por nivel CEFR"
      >
        {CEFR_ORDER.map((level) => {
          const colors = cefrTabColors[level];
          const isActive = selectedLevel === level;
          return (
            <button
              key={level}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleLevelChange(level)}
              className={[
                "min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                isActive ? colors.active : colors.inactive,
              ].join(" ")}
            >
              {level}
            </button>
          );
        })}
      </div>

      {/* Category filter tabs */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filtrar por categoria"
      >
        <button
          type="button"
          role="tab"
          aria-selected={selectedCategory === null}
          onClick={() => handleCategoryChange(null)}
          className={[
            "min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            selectedCategory === null
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100",
          ].join(" ")}
        >
          Todos
        </button>
        {CULTURAL_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleCategoryChange(cat.key)}
              className={[
                "inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100",
              ].join(" ")}
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={cat.icon}
                />
              </svg>
              {cat.labelEs}
            </button>
          );
        })}
      </div>

      {/* Loading state */}
      {listLoading && (
        <LoadingState
          message={intl.formatMessage({ id: "common.loading" })}
          skeleton
          skeletonLines={6}
        />
      )}

      {/* Error state */}
      {listError && (
        <ErrorState
          message={intl.formatMessage({ id: "error.unknown" })}
          details={
            listErrorObj instanceof Error ? listErrorObj.message : undefined
          }
          onRetry={() => refetchList()}
        />
      )}

      {/* Empty state */}
      {!listLoading && !listError && notes.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
            />
          </svg>
          <p className="mt-4 text-sm text-gray-500">
            No hay notas culturales disponibles para este nivel y categoria.
          </p>
        </div>
      )}

      {/* Article card grid */}
      {!listLoading && !listError && notes.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <ArticleCard
                key={note.id}
                note={note}
                onClick={handleNoteClick}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="ghost"
                size="sm"
                disabled={page === 0}
                onClick={() => {
                  setPage(page - 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-600">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => {
                  setPage(page + 1);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Siguiente
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
