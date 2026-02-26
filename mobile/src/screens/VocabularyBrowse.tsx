import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useIntl } from "react-intl";
import { apiClient } from "../services/api";

// ---------------------------------------------------------------------------
// Types
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

interface PaginatedResponse {
  items: VocabularyItem[];
  total: number;
  page: number;
  page_size: number;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
type CEFRLevel = (typeof CEFR_LEVELS)[number];

const CEFR_COLORS: Record<string, { bg: string; text: string }> = {
  A1: { bg: "#DCFCE7", text: "#166534" },
  A2: { bg: "#BBF7D0", text: "#14532D" },
  B1: { bg: "#DBEAFE", text: "#1E40AF" },
  B2: { bg: "#BFDBFE", text: "#1E3A8A" },
  C1: { bg: "#F3E8FF", text: "#6B21A8" },
  C2: { bg: "#E9D5FF", text: "#581C87" },
};

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Vocabulary list item
// ---------------------------------------------------------------------------

function VocabularyListItem({
  item,
  onPress,
}: {
  item: VocabularyItem;
  onPress: () => void;
}) {
  const colors = CEFR_COLORS[item.cefr_level] ?? CEFR_COLORS.A1;

  return (
    <Pressable
      style={styles.listItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.word}: ${item.translation}`}
    >
      <View style={styles.listItemLeft}>
        <Text style={styles.listItemWord}>{item.word}</Text>
        <Text style={styles.listItemTranslation}>{item.translation}</Text>
      </View>
      <View
        style={[styles.cefrBadge, { backgroundColor: colors.bg }]}
      >
        <Text style={[styles.cefrBadgeText, { color: colors.text }]}>
          {item.cefr_level}
        </Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Item detail modal (bottom sheet style)
// ---------------------------------------------------------------------------

function ItemDetail({
  item,
  onClose,
}: {
  item: VocabularyItem;
  onClose: () => void;
}) {
  const intl = useIntl();
  const colors = CEFR_COLORS[item.cefr_level] ?? CEFR_COLORS.A1;

  return (
    <View style={styles.detailOverlay}>
      <Pressable style={styles.detailBackdrop} onPress={onClose} />
      <View style={styles.detailSheet}>
        <View style={styles.detailHeader}>
          <View>
            <Text style={styles.detailWord}>{item.word}</Text>
            <Text style={styles.detailPhonetic}>/{item.phonetic}/</Text>
          </View>
          <Pressable onPress={onClose} accessibilityLabel={intl.formatMessage({ id: "common.close" })}>
            <Text style={styles.detailClose}>X</Text>
          </Pressable>
        </View>

        <View style={[styles.detailTranslationBox, { backgroundColor: colors.bg }]}>
          <Text style={[styles.detailTranslation, { color: colors.text }]}>
            {item.translation}
          </Text>
        </View>

        <Text style={styles.detailSectionTitle}>Ejemplo</Text>
        <Text style={styles.detailExampleFr}>{item.example_sentence}</Text>
        <Text style={styles.detailExampleEs}>{item.example_translation}</Text>

        {item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function VocabularyBrowseScreen() {
  const intl = useIntl();

  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | null>(null);
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VocabularyItem | null>(null);

  const fetchItems = useCallback(
    async (offset = 0, append = false) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const query = new URLSearchParams();
        if (selectedLevel) query.set("cefr_level", selectedLevel);
        query.set("limit", String(PAGE_SIZE));
        query.set("offset", String(offset));

        const data = await apiClient<PaginatedResponse>(
          `/vocabulary/items?${query}`,
        );

        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setTotal(data.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [selectedLevel],
  );

  useEffect(() => {
    fetchItems(0, false);
  }, [fetchItems]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || items.length >= total) return;
    fetchItems(items.length, true);
  }, [loadingMore, items.length, total, fetchItems]);

  const handleLevelChange = useCallback((level: CEFRLevel | null) => {
    setSelectedLevel(level);
  }, []);

  // ---- Render ----
  return (
    <View style={styles.container}>
      {/* CEFR level filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        <Pressable
          style={[
            styles.filterChip,
            selectedLevel === null && styles.filterChipActive,
          ]}
          onPress={() => handleLevelChange(null)}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedLevel === null }}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedLevel === null && styles.filterChipTextActive,
            ]}
          >
            Todos
          </Text>
        </Pressable>
        {CEFR_LEVELS.map((level) => {
          const isActive = selectedLevel === level;
          return (
            <Pressable
              key={level}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => handleLevelChange(level)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {level}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchItems(0, false)}
          >
            <Text style={styles.retryButtonText}>
              {intl.formatMessage({ id: "common.retry" })}
            </Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>
            {intl.formatMessage({ id: "common.noResults" })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <VocabularyListItem
              item={item}
              onPress={() => setSelectedItem(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#2563EB"
                style={styles.loadingMore}
              />
            ) : null
          }
        />
      )}

      {/* Detail bottom sheet */}
      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
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
  },
  // Filter
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipActive: {
    backgroundColor: "#111827",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 8,
  },
  listItemLeft: {
    flex: 1,
  },
  listItemWord: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  listItemTranslation: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  cefrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 12,
  },
  cefrBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  // States
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
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
  loadingMore: {
    paddingVertical: 16,
  },
  // Detail
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 50,
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  detailSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  detailWord: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  detailPhonetic: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  detailClose: {
    fontSize: 18,
    fontWeight: "700",
    color: "#9CA3AF",
    padding: 4,
  },
  detailTranslationBox: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  detailTranslation: {
    fontSize: 18,
    fontWeight: "600",
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  detailExampleFr: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#374151",
    marginBottom: 2,
  },
  detailExampleEs: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagChipText: {
    fontSize: 11,
    color: "#6B7280",
  },
});
