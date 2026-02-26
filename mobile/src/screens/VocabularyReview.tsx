import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useIntl } from "react-intl";
import { apiClient } from "../services/api";

// ---------------------------------------------------------------------------
// Types (subset mirroring web/src/types/api.ts)
// ---------------------------------------------------------------------------

interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  phonetic: string;
  example_sentence: string;
  example_translation: string;
  audio_url: string | null;
  cefr_level: string;
  tags: string[];
}

interface ReviewResponse {
  item_id: string;
  next_review: string;
  interval_days: number;
  ease_factor: number;
  mastery_score: number;
  xp_earned: number;
}

type Rating = 1 | 2 | 3 | 4;

interface RatingOption {
  rating: Rating;
  labelId: string;
  color: string;
  bgColor: string;
}

const RATING_OPTIONS: RatingOption[] = [
  { rating: 1, labelId: "vocab.rating.again", color: "#991B1B", bgColor: "#FEE2E2" },
  { rating: 2, labelId: "vocab.rating.hard", color: "#9A3412", bgColor: "#FFEDD5" },
  { rating: 3, labelId: "vocab.rating.good", color: "#166534", bgColor: "#DCFCE7" },
  { rating: 4, labelId: "vocab.rating.easy", color: "#1E40AF", bgColor: "#DBEAFE" },
];

// ---------------------------------------------------------------------------
// Flashcard sub-component
// ---------------------------------------------------------------------------

function MobileFlashcard({
  item,
  isFlipped,
  onFlip,
}: {
  item: VocabularyItem;
  isFlipped: boolean;
  onFlip: () => void;
}) {
  return (
    <Pressable
      onPress={onFlip}
      style={styles.flashcard}
      accessibilityRole="button"
      accessibilityLabel={isFlipped ? "Reverso de la tarjeta" : "Frente de la tarjeta"}
      accessibilityHint="Toca para voltear la tarjeta"
    >
      {!isFlipped ? (
        /* Front face */
        <View style={styles.flashcardInner}>
          <Text style={styles.cefrBadge}>{item.cefr_level}</Text>
          <Text style={styles.wordText}>{item.word}</Text>
          <Text style={styles.phoneticText}>/{item.phonetic}/</Text>
          <Text style={styles.flipHint}>Toca para voltear</Text>
        </View>
      ) : (
        /* Back face */
        <View style={[styles.flashcardInner, styles.flashcardBack]}>
          <Text style={styles.cefrBadge}>{item.cefr_level}</Text>
          <Text style={styles.translationText}>{item.translation}</Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleFr}>{item.example_sentence}</Text>
            <Text style={styles.exampleEs}>{item.example_translation}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function VocabularyReviewScreen() {
  const intl = useIntl();

  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [goodOrEasyCount, setGoodOrEasyCount] = useState(0);

  // ---- Fetch review items ----
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<VocabularyItem[]>("/vocabulary/review");
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar tarjetas");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount
  useState(() => {
    fetchItems();
  });

  // ---- Submit rating ----
  const handleRate = useCallback(
    async (rating: Rating) => {
      if (!items.length || submitting) return;

      const currentItem = items[currentIndex];
      setSubmitting(true);

      try {
        await apiClient<ReviewResponse>("/vocabulary/review", {
          method: "POST",
          body: JSON.stringify({
            vocabulary_item_id: currentItem.id,
            rating,
          }),
        });

        if (rating >= 3) {
          setGoodOrEasyCount((prev) => prev + 1);
        }

        const nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          setSessionComplete(true);
        } else {
          setCurrentIndex(nextIndex);
          setIsFlipped(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar");
      } finally {
        setSubmitting(false);
      }
    },
    [items, currentIndex, submitting],
  );

  // ---- Derived values ----
  const totalCards = items.length;
  const progressPercent = totalCards > 0 ? ((currentIndex) / totalCards) * 100 : 0;
  const currentItem = items[currentIndex] ?? null;
  const accuracy =
    totalCards > 0 ? Math.round((goodOrEasyCount / totalCards) * 100) : 0;

  const progressLabel = useMemo(
    () => `${currentIndex + 1} de ${totalCards}`,
    [currentIndex, totalCards],
  );

  // ---- Loading ----
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>
          {intl.formatMessage({ id: "common.loading" })}
        </Text>
      </View>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchItems}>
          <Text style={styles.retryButtonText}>
            {intl.formatMessage({ id: "common.retry" })}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ---- Empty state ----
  if (totalCards === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>
          {intl.formatMessage({ id: "vocab.review.noCards" })}
        </Text>
      </View>
    );
  }

  // ---- Session complete ----
  if (sessionComplete) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.completeTitle}>
          {intl.formatMessage({ id: "vocab.review.sessionComplete" })}
        </Text>
        <Text style={styles.completeDetail}>
          Tarjetas repasadas: {totalCards}
        </Text>
        <Text style={styles.completeDetail}>
          {intl.formatMessage(
            { id: "vocab.review.accuracy" },
            { percent: accuracy },
          )}
        </Text>
      </View>
    );
  }

  // ---- Active review ----
  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>{progressLabel}</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
        />
      </View>

      {/* Flashcard */}
      {currentItem && (
        <MobileFlashcard
          item={currentItem}
          isFlipped={isFlipped}
          onFlip={() => setIsFlipped(true)}
        />
      )}

      {/* Rating buttons */}
      {isFlipped && (
        <View style={styles.ratingRow}>
          {RATING_OPTIONS.map((opt) => (
            <Pressable
              key={opt.rating}
              disabled={submitting}
              onPress={() => handleRate(opt.rating)}
              style={[
                styles.ratingButton,
                { backgroundColor: opt.bgColor },
                submitting && styles.ratingButtonDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={intl.formatMessage({ id: opt.labelId })}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={opt.color} />
              ) : (
                <Text style={[styles.ratingButtonText, { color: opt.color }]}>
                  {intl.formatMessage({ id: opt.labelId })}
                </Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 24,
  },
  // Progress
  progressRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: "#2563EB",
    borderRadius: 2,
  },
  // Flashcard
  flashcard: {
    flex: 1,
    marginBottom: 16,
  },
  flashcardInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  flashcardBack: {
    backgroundColor: "#EFF6FF",
  },
  cefrBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: "hidden",
  },
  wordText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  phoneticText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  flipHint: {
    position: "absolute",
    bottom: 12,
    fontSize: 12,
    color: "#9CA3AF",
  },
  translationText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E3A8A",
    textAlign: "center",
  },
  exampleContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  exampleFr: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#374151",
    textAlign: "center",
  },
  exampleEs: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  // Rating buttons
  ratingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  ratingButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 12,
  },
  ratingButtonDisabled: {
    opacity: 0.5,
  },
  ratingButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // States
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 14,
    color: "#991B1B",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  completeDetail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
});
