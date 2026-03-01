import { useCallback, useMemo, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Button,
  LoadingState,
  ErrorState,
  ProgressBar,
} from "@/components/common";
import { Flashcard } from "@/components/vocabulary/Flashcard";
import { getReviewItems, submitReview } from "@/services/vocabulary";
import type { ReviewResponse } from "@/types";

// ---------------------------------------------------------------------------
// Rating button configuration
// ---------------------------------------------------------------------------

type Rating = 1 | 2 | 3 | 4;

interface RatingOption {
  rating: Rating;
  labelId: string;
  color: string;
}

const RATING_OPTIONS: RatingOption[] = [
  {
    rating: 1,
    labelId: "vocab.rating.again",
    color:
      "bg-red-100 text-red-800 hover:bg-red-200 focus-visible:ring-red-400",
  },
  {
    rating: 2,
    labelId: "vocab.rating.hard",
    color:
      "bg-orange-100 text-orange-800 hover:bg-orange-200 focus-visible:ring-orange-400",
  },
  {
    rating: 3,
    labelId: "vocab.rating.good",
    color:
      "bg-green-100 text-green-800 hover:bg-green-200 focus-visible:ring-green-400",
  },
  {
    rating: 4,
    labelId: "vocab.rating.easy",
    color:
      "bg-blue-100 text-blue-800 hover:bg-blue-200 focus-visible:ring-blue-400",
  },
];

// ---------------------------------------------------------------------------
// Session summary
// ---------------------------------------------------------------------------

interface SessionResult {
  totalCards: number;
  goodOrEasy: number;
  lastNextReview: string | null;
}

function SessionSummary({ result }: { result: SessionResult }) {
  const intl = useIntl();
  const accuracy =
    result.totalCards > 0
      ? Math.round((result.goodOrEasy / result.totalCards) * 100)
      : 0;

  const nextReviewDate = result.lastNextReview
    ? new Date(result.lastNextReview).toLocaleDateString("es", {
        dateStyle: "medium",
      })
    : null;

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center shadow-lg">
      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-green-100">
        <svg
          className="h-7 w-7 text-green-600"
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
      </div>

      <h2 className="text-xl font-bold text-gray-900">
        {intl.formatMessage({ id: "vocab.review.sessionComplete" })}
      </h2>

      <div className="space-y-2 text-sm text-gray-600">
        <p>
          Tarjetas repasadas:{" "}
          <span className="font-semibold text-gray-900">
            {result.totalCards}
          </span>
        </p>
        <p>
          {intl.formatMessage(
            { id: "vocab.review.accuracy" },
            { percent: accuracy },
          )}
        </p>
        {nextReviewDate && (
          <p>
            Proximo repaso:{" "}
            <span className="font-semibold text-gray-900">
              {nextReviewDate}
            </span>
          </p>
        )}
      </div>

      <ProgressBar percent={accuracy} label="Precision" showPercent size="md" />

      <Link to="/vocabulary">
        <Button variant="primary" className="mt-4 w-full">
          {intl.formatMessage({ id: "nav.vocabulary" })}
        </Button>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  const intl = useIntl();

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white px-8 py-12 text-center shadow-sm">
      <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-blue-100">
        <svg
          className="h-7 w-7 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </div>

      <p className="text-sm text-gray-600">
        {intl.formatMessage({ id: "vocab.review.noCards" })}
      </p>

      <Link to="/vocabulary">
        <Button variant="secondary" className="mt-2">
          {intl.formatMessage({ id: "vocab.browse.title" })}
        </Button>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function VocabularyReview() {
  const intl = useIntl();
  const queryClient = useQueryClient();

  // ---- State ----
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(
    null,
  );
  const [goodOrEasyCount, setGoodOrEasyCount] = useState(0);

  // ---- Data fetching ----
  const {
    data: reviewItems,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["vocabulary", "review"],
    queryFn: getReviewItems,
  });

  const items = (reviewItems as any)?.data?.items ?? [];

  // ---- Mutation ----
  const reviewMutation = useMutation({
    mutationFn: ({ itemId, rating }: { itemId: string; rating: Rating }) =>
      submitReview(itemId, rating),
    onSuccess: (response: ReviewResponse, variables) => {
      if (variables.rating >= 3) {
        setGoodOrEasyCount((prev) => prev + 1);
      }

      const totalCards = items.length;
      const nextIndex = currentIndex + 1;

      if (nextIndex >= totalCards) {
        // Session complete
        setSessionResult({
          totalCards,
          goodOrEasy:
            goodOrEasyCount + (variables.rating >= 3 ? 1 : 0),
          lastNextReview: response.next_review,
        });
        // Invalidate to refetch on next visit
        queryClient.invalidateQueries({ queryKey: ["vocabulary", "review"] });
      } else {
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
      }
    },
  });

  // ---- Handlers ----
  const handleFlip = useCallback(() => {
    setIsFlipped(true);
  }, []);

  const handleRate = useCallback(
    (rating: Rating) => {
      if (!items.length) return;
      const currentItem = items[currentIndex];
      reviewMutation.mutate({ itemId: currentItem.id, rating });
    },
    [items, currentIndex, reviewMutation],
  );

  // ---- Derived values ----
  const totalCards = items.length;
  const progressPercent =
    totalCards > 0 ? (currentIndex / totalCards) * 100 : 0;
  const currentItem = items[currentIndex] ?? null;

  const progressLabel = useMemo(
    () => `${currentIndex + 1} de ${totalCards}`,
    [currentIndex, totalCards],
  );

  // ---- Render states ----
  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingState message={intl.formatMessage({ id: "common.loading" })} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-12">
        <ErrorState
          message={intl.formatMessage({ id: "error.unknown" })}
          details={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!reviewItems || reviewItems.length === 0) {
    return (
      <div className="py-12">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "vocab.review.title" })}
        </h1>
        <EmptyState />
      </div>
    );
  }

  if (sessionResult) {
    return (
      <div className="py-12">
        <SessionSummary result={sessionResult} />
      </div>
    );
  }

  // ---- Active review ----
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "vocab.review.title" })}
        </h1>
        <span className="text-sm font-medium text-gray-500">
          {progressLabel}
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar percent={progressPercent} size="sm" />

      {/* Flashcard */}
      {currentItem && (
        <Flashcard item={currentItem} onFlip={handleFlip} />
      )}

      {/* Rating buttons (visible only after flip) */}
      {isFlipped && (
        <div className="flex items-center justify-center gap-3">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.rating}
              type="button"
              disabled={reviewMutation.isPending}
              onClick={() => handleRate(opt.rating)}
              className={[
                "min-h-[44px] rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                opt.color,
              ].join(" ")}
            >
              {intl.formatMessage({ id: opt.labelId })}
            </button>
          ))}
        </div>
      )}

      {/* Mutation error feedback */}
      {reviewMutation.isError && (
        <p className="text-center text-sm text-red-600" role="alert">
          {intl.formatMessage({ id: "error.unknown" })}
        </p>
      )}
    </div>
  );
}
