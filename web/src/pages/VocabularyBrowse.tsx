import { useCallback, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Button,
  Card,
  LoadingState,
  ErrorState,
} from "@/components/common";
import { getVocabularyItems } from "@/services/vocabulary";
import { CEFR_ORDER } from "@/types/cefr";
import type { CEFRLevel } from "@/types/cefr";
import type { VocabularyItem } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 12;

const cefrTabColors: Record<CEFRLevel, { active: string; inactive: string }> = {
  A1: { active: "bg-green-600 text-white", inactive: "text-green-700 hover:bg-green-50" },
  A2: { active: "bg-green-700 text-white", inactive: "text-green-800 hover:bg-green-50" },
  B1: { active: "bg-blue-600 text-white", inactive: "text-blue-700 hover:bg-blue-50" },
  B2: { active: "bg-blue-700 text-white", inactive: "text-blue-800 hover:bg-blue-50" },
  C1: { active: "bg-purple-600 text-white", inactive: "text-purple-700 hover:bg-purple-50" },
  C2: { active: "bg-purple-700 text-white", inactive: "text-purple-800 hover:bg-purple-50" },
};

// ---------------------------------------------------------------------------
// Difficulty dots (derived from CEFR level)
// ---------------------------------------------------------------------------

const cefrToDifficulty: Record<CEFRLevel, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 5,
};

function DifficultyDots({ level }: { level: CEFRLevel }) {
  const filled = cefrToDifficulty[level];
  return (
    <div className="flex items-center gap-0.5" aria-label={`Dificultad ${filled} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={[
            "inline-block h-1.5 w-1.5 rounded-full",
            i < filled ? "bg-blue-600" : "bg-gray-300",
          ].join(" ")}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vocabulary card detail modal
// ---------------------------------------------------------------------------

interface DetailModalProps {
  item: VocabularyItem;
  onClose: () => void;
}

function DetailModal({ item, onClose }: DetailModalProps) {
  const intl = useIntl();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={item.word}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{item.word}</h2>
            <p className="mt-0.5 text-sm text-gray-500">/{item.phonetic}/</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={intl.formatMessage({ id: "common.close" })}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Translation */}
        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            {intl.formatMessage({ id: "vocab.browse.translation" })}
          </p>
          <p className="mt-1 text-lg font-semibold text-blue-900">
            {item.translation}
          </p>
        </div>

        {/* Example */}
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700">
            {intl.formatMessage({ id: "vocab.browse.example" })}
          </p>
          <p className="mt-1 text-sm italic text-gray-600">
            {item.example_sentence}
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            {item.example_translation}
          </p>
        </div>

        {/* Metadata */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {item.cefr_level}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {item.category}
          </span>
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Close button */}
        <div className="mt-6 text-right">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {intl.formatMessage({ id: "common.close" })}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination controls
// ---------------------------------------------------------------------------

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Anterior
      </Button>
      <span className="text-sm text-gray-600">
        {currentPage + 1} / {totalPages}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
      >
        {/* Next */}
        Siguiente
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function VocabularyBrowse() {
  const intl = useIntl();

  // ---- State ----
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(null);
  const [page, setPage] = useState(0);
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);

  // ---- Data fetching ----
  const {
    data: paginatedData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["vocabulary", "items", selectedLevel, page],
    queryFn: () =>
      getVocabularyItems({
        cefr_level: selectedLevel ?? undefined,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  });

  const items = paginatedData?.items ?? [];
  const totalItems = paginatedData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // ---- Handlers ----
  const handleLevelChange = useCallback((level: CEFRLevel | null) => {
    setSelectedLevel(level);
    setPage(0);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ---- Render ----
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "vocab.browse.title" })}
        </h1>
        <Link to="/vocabulary/review">
          <Button variant="primary">
            {intl.formatMessage({ id: "vocab.review.title" })}
          </Button>
        </Link>
      </div>

      {/* CEFR level filter tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar por nivel CEFR">
        <button
          type="button"
          role="tab"
          aria-selected={selectedLevel === null}
          onClick={() => handleLevelChange(null)}
          className={[
            "min-h-[44px] rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            selectedLevel === null
              ? "bg-gray-900 text-white"
              : "text-gray-600 hover:bg-gray-100",
          ].join(" ")}
        >
          Todos
        </button>
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

      {/* Loading state */}
      {isLoading && (
        <LoadingState
          message={intl.formatMessage({ id: "common.loading" })}
          skeleton
          skeletonLines={6}
        />
      )}

      {/* Error state */}
      {isError && (
        <ErrorState
          message={intl.formatMessage({ id: "error.unknown" })}
          details={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      )}

      {/* Empty state */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-gray-500">
            {intl.formatMessage({ id: "common.noResults" })}
          </p>
        </div>
      )}

      {/* Vocabulary grid */}
      {!isLoading && !isError && items.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <Card
                key={item.id}
                hoverable
                onClick={() => setSelectedItem(item)}
                className="relative"
              >
                <div className="space-y-2">
                  {/* French word */}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {item.word}
                  </h3>

                  {/* Spanish translation */}
                  <p className="text-sm text-gray-600">{item.translation}</p>

                  {/* Difficulty + CEFR + Tags */}
                  <div className="flex items-center gap-2 pt-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        cefrTabColors[item.cefr_level].active
                      }`}
                    >
                      {item.cefr_level}
                    </span>
                    <DifficultyDots level={item.cefr_level} />
                  </div>

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 3 && (
                        <span className="text-[10px] text-gray-400">
                          +{item.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
