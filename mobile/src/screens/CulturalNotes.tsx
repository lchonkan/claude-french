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
import { apiClient } from "../services/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CulturalNotePreview {
  id: string;
  cefr_level: string;
  title_es: string;
  title_fr: string;
  category: string;
  preview_es: string;
  vocabulary_count: number;
  reviewed: boolean;
}

interface VocabRef {
  id: string;
  french_text: string;
  spanish_translation: string;
  in_user_review_queue: boolean;
}

interface CulturalNoteDetail {
  id: string;
  cefr_level: string;
  title_es: string;
  title_fr: string;
  content_fr: string;
  content_es: string;
  vocabulary: VocabRef[];
  category: string;
}

type ScreenView = "list" | "detail";

const CATEGORIES = [
  { key: "all", label: "Todos" },
  { key: "history", label: "Historia" },
  { key: "neighborhoods", label: "Barrios" },
  { key: "etiquette", label: "Etiqueta" },
  { key: "cuisine", label: "Gastronomia" },
  { key: "daily_life", label: "Cotidiano" },
];

const categoryColors: Record<string, { bg: string; text: string }> = {
  history: { bg: "#FFFBEB", text: "#92400E" },
  neighborhoods: { bg: "#F0FDFA", text: "#134E4A" },
  etiquette: { bg: "#FFF1F2", text: "#9F1239" },
  cuisine: { bg: "#FFF7ED", text: "#9A3412" },
  daily_life: { bg: "#F0F9FF", text: "#0C4A6E" },
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function CulturalNotesScreen() {
  const [view, setView] = useState<ScreenView>("list");
  const [category, setCategory] = useState("all");
  const [notes, setNotes] = useState<CulturalNotePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail state
  const [noteDetail, setNoteDetail] = useState<CulturalNoteDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [language, setLanguage] = useState<"fr" | "es">("fr");
  const [addingVocab, setAddingVocab] = useState<string | null>(null);

  // ---- Load notes ----
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const categoryParam =
          category !== "all" ? `&category=${category}` : "";
        const result = await apiClient<{
          data: { notes: CulturalNotePreview[]; total: number };
        }>(`/cultural/notes?cefr_level=A1${categoryParam}&limit=20`);
        setNotes(result.data.notes);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar notas"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [category]);

  // ---- Load note detail ----
  const handleNotePress = useCallback(async (id: string) => {
    setDetailLoading(true);
    setLanguage("fr");
    try {
      const result = await apiClient<{ data: CulturalNoteDetail }>(
        `/cultural/notes/${id}`
      );
      setNoteDetail(result.data);
      setView("detail");
    } catch {
      setError("No se pudo cargar el articulo.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ---- Add vocab to SRS ----
  const handleAddVocab = useCallback(
    async (vocabId: string) => {
      if (!noteDetail || addingVocab) return;
      setAddingVocab(vocabId);
      try {
        await apiClient(
          `/cultural/notes/${noteDetail.id}/vocabulary/${vocabId}/add`,
          { method: "POST" }
        );
        // Update local state
        setNoteDetail((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            vocabulary: prev.vocabulary.map((v) =>
              v.id === vocabId ? { ...v, in_user_review_queue: true } : v
            ),
          };
        });
      } catch {
        // Silently fail
      } finally {
        setAddingVocab(null);
      }
    },
    [noteDetail, addingVocab]
  );

  // ---- Back to list ----
  const handleBack = useCallback(() => {
    setView("list");
    setNoteDetail(null);
  }, []);

  // ======== Detail view ========
  if (view === "detail") {
    if (detailLoading || !noteDetail) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando articulo...</Text>
        </View>
      );
    }

    const content =
      language === "fr" ? noteDetail.content_fr : noteDetail.content_es;
    const title =
      language === "fr" ? noteDetail.title_fr : noteDetail.title_es;
    const paragraphs = content
      .split("\n")
      .filter((p) => p.trim().length > 0);

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Back button */}
        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Volver a notas"
        >
          <Text style={styles.backButtonText}>{"< Volver"}</Text>
        </Pressable>

        {/* Title */}
        <Text style={styles.detailTitle}>{title}</Text>
        {language === "fr" && (
          <Text style={styles.detailSubtitle}>{noteDetail.title_es}</Text>
        )}

        {/* Language toggle */}
        <View style={styles.langToggle}>
          <Pressable
            style={[
              styles.langButton,
              language === "fr" && styles.langButtonActive,
            ]}
            onPress={() => setLanguage("fr")}
          >
            <Text
              style={[
                styles.langButtonText,
                language === "fr" && styles.langButtonTextActive,
              ]}
            >
              Francais
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.langButton,
              language === "es" && styles.langButtonActive,
            ]}
            onPress={() => setLanguage("es")}
          >
            <Text
              style={[
                styles.langButtonText,
                language === "es" && styles.langButtonTextActive,
              ]}
            >
              Espanol
            </Text>
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.contentCard}>
          {paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>

        {/* Vocabulary */}
        {noteDetail.vocabulary.length > 0 && (
          <View style={styles.vocabSection}>
            <Text style={styles.vocabTitle}>Vocabulario relacionado</Text>
            {noteDetail.vocabulary.map((v) => (
              <View key={v.id} style={styles.vocabItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vocabFrench}>{v.french_text}</Text>
                  <Text style={styles.vocabSpanish}>
                    {v.spanish_translation}
                  </Text>
                </View>
                {v.in_user_review_queue ? (
                  <Text style={styles.vocabAdded}>En repaso</Text>
                ) : (
                  <Pressable
                    style={styles.vocabAddButton}
                    onPress={() => handleAddVocab(v.id)}
                    disabled={addingVocab === v.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Agregar ${v.french_text} a repaso`}
                  >
                    {addingVocab === v.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.vocabAddButtonText}>Agregar</Text>
                    )}
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // ======== List view ========
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Notas culturales</Text>
        <Text style={styles.pageSubtitle}>
          Explora la cultura francesa
        </Text>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            style={[
              styles.categoryTab,
              category === cat.key && styles.categoryTabActive,
            ]}
            onPress={() => setCategory(cat.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: category === cat.key }}
          >
            <Text
              style={[
                styles.categoryTabText,
                category === cat.key && styles.categoryTabTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Error */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Loading */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 32 }}
        />
      ) : notes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            No hay notas disponibles para esta categoria.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const catColor = categoryColors[item.category] ?? {
              bg: "#F3F4F6",
              text: "#374151",
            };
            return (
              <Pressable
                style={styles.noteCard}
                onPress={() => handleNotePress(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Leer: ${item.title_es}`}
              >
                <View style={styles.badgeRow}>
                  <View style={styles.cefrBadge}>
                    <Text style={styles.cefrBadgeText}>
                      {item.cefr_level}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: catColor.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryBadgeText,
                        { color: catColor.text },
                      ]}
                    >
                      {CATEGORIES.find((c) => c.key === item.category)
                        ?.label ?? item.category}
                    </Text>
                  </View>
                </View>
                <Text style={styles.noteTitle}>{item.title_fr}</Text>
                <Text style={styles.noteTitleEs}>{item.title_es}</Text>
                <Text style={styles.notePreview} numberOfLines={3}>
                  {item.preview_es}
                </Text>
                <Text style={styles.noteFooter}>
                  {item.vocabulary_count > 0
                    ? `${item.vocabulary_count} palabras`
                    : "Sin vocabulario"}
                </Text>
              </Pressable>
            );
          }}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  categoryScroll: {
    maxHeight: 48,
  },
  categoryContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  categoryTabActive: {
    backgroundColor: "#2563EB",
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  categoryTabTextActive: {
    color: "#FFFFFF",
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: "#991B1B",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  noteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  cefrBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cefrBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E40AF",
  },
  categoryBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  noteTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  noteTitleEs: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 1,
  },
  notePreview: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginTop: 6,
  },
  noteFooter: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
  },

  // Detail view
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: "#2563EB",
    fontWeight: "600",
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  detailSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  langToggle: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 2,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  langButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  langButtonActive: {
    backgroundColor: "#2563EB",
  },
  langButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  langButtonTextActive: {
    color: "#FFFFFF",
  },
  contentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginTop: 16,
  },
  paragraph: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
    marginBottom: 12,
  },
  vocabSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginTop: 16,
  },
  vocabTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  vocabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  vocabFrench: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  vocabSpanish: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 1,
  },
  vocabAdded: {
    fontSize: 12,
    fontWeight: "500",
    color: "#059669",
  },
  vocabAddButton: {
    backgroundColor: "#2563EB",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 64,
    alignItems: "center",
  },
  vocabAddButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
