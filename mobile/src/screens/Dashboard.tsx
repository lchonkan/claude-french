import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

interface SkillMastery {
  skill: string;
  mastery_percentage: number;
}

interface CEFRProgress {
  current_level: string;
  overall_mastery: number;
  skills: SkillMastery[];
  exam_available: boolean;
}

interface Badge {
  id: string;
  badge_type: string;
  cefr_level: string | null;
  earned_at: string;
}

interface DailyChallenge {
  id: string;
  challenge_type: string;
  description_es: string;
  completed: boolean;
  xp_reward: number;
}

interface UserInfo {
  display_name: string;
  current_cefr_level: string;
  xp_total: number;
  current_streak: number;
  longest_streak: number;
}

interface DashboardData {
  user: UserInfo;
  cefr_progress: CEFRProgress;
  badges: Badge[];
  daily_challenge: DailyChallenge | null;
}

const skillLabels: Record<string, string> = {
  vocabulary: "Vocabulario",
  grammar: "Gramatica",
  writing: "Escritura",
  listening: "Auditiva",
  pronunciation: "Pronunciacion",
  conversation: "Conversacion",
};

// ---------------------------------------------------------------------------
// Progress bar sub-component
// ---------------------------------------------------------------------------

function SkillBar({ skill, percentage }: { skill: string; percentage: number }) {
  const pct = Math.max(0, Math.min(100, percentage));
  const barColor =
    pct >= 80 ? "#10B981" : pct >= 50 ? "#3B82F6" : pct >= 25 ? "#F59E0B" : "#EF4444";

  return (
    <View style={skillBarStyles.container}>
      <View style={skillBarStyles.header}>
        <Text style={skillBarStyles.label}>
          {skillLabels[skill] ?? skill}
        </Text>
        <Text style={skillBarStyles.value}>{Math.round(pct)}%</Text>
      </View>
      <View style={skillBarStyles.bg}>
        <View
          style={[
            skillBarStyles.fill,
            { width: `${pct}%`, backgroundColor: barColor },
          ]}
        />
      </View>
    </View>
  );
}

const skillBarStyles = StyleSheet.create({
  container: { marginBottom: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: { fontSize: 13, fontWeight: "500", color: "#374151" },
  value: { fontSize: 13, fontWeight: "600", color: "#111827" },
  bg: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4 },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export function DashboardScreen() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingChallenge, setCompletingChallenge] = useState(false);

  // ---- Load dashboard ----
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiClient<{ data: DashboardData }>(
          "/progress/dashboard"
        );
        setDashboard(result.data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error al cargar"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ---- Complete daily challenge ----
  const handleCompleteChallenge = useCallback(async () => {
    if (!dashboard?.daily_challenge || completingChallenge) return;
    setCompletingChallenge(true);
    try {
      await apiClient(
        `/progress/daily-challenge/${dashboard.daily_challenge.id}/complete`,
        { method: "POST" }
      );
      setDashboard((prev) => {
        if (!prev || !prev.daily_challenge) return prev;
        return {
          ...prev,
          user: {
            ...prev.user,
            xp_total:
              prev.user.xp_total + prev.daily_challenge!.xp_reward,
          },
          daily_challenge: {
            ...prev.daily_challenge!,
            completed: true,
          },
        };
      });
    } catch {
      // Silently fail
    } finally {
      setCompletingChallenge(false);
    }
  }, [dashboard, completingChallenge]);

  // ---- Loading ----
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Cargando tu progreso...</Text>
      </View>
    );
  }

  // ---- Error ----
  if (error || !dashboard) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>
          {error ?? "No se pudo cargar el panel."}
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            apiClient<{ data: DashboardData }>("/progress/dashboard")
              .then((r) => setDashboard(r.data))
              .catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Error"
                )
              )
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const { user, cefr_progress, badges, daily_challenge } = dashboard;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Hola, {user.display_name}</Text>
      <Text style={styles.subtitle}>
        Nivel {cefr_progress.current_level}
      </Text>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {/* XP */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {user.xp_total.toLocaleString()}
          </Text>
          <Text style={styles.statLabel}>XP Total</Text>
        </View>

        {/* Streak */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{user.current_streak}</Text>
          <Text style={styles.statLabel}>
            {user.current_streak === 1 ? "Dia de racha" : "Dias de racha"}
          </Text>
        </View>

        {/* Badges */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{badges.length}</Text>
          <Text style={styles.statLabel}>Insignias</Text>
        </View>
      </View>

      {/* Overall progress */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          Progreso nivel {cefr_progress.current_level}
        </Text>
        <View style={styles.overallProgressBg}>
          <View
            style={[
              styles.overallProgressFill,
              {
                width: `${Math.min(100, cefr_progress.overall_mastery)}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.overallProgressText}>
          {Math.round(cefr_progress.overall_mastery)}% dominio general
        </Text>
      </View>

      {/* Per-skill mastery */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Dominio por habilidad</Text>
        {cefr_progress.skills.map((s) => (
          <SkillBar
            key={s.skill}
            skill={s.skill}
            percentage={s.mastery_percentage}
          />
        ))}
      </View>

      {/* Daily challenge */}
      {daily_challenge && (
        <View
          style={[
            styles.sectionCard,
            daily_challenge.completed && styles.challengeCompleted,
          ]}
        >
          <View style={styles.challengeHeader}>
            <Text style={styles.sectionTitle}>Desafio diario</Text>
            <Text style={styles.challengeXP}>
              +{daily_challenge.xp_reward} XP
            </Text>
          </View>
          <Text style={styles.challengeDescription}>
            {daily_challenge.description_es}
          </Text>
          {daily_challenge.completed ? (
            <Text style={styles.challengeCompletedText}>Completado</Text>
          ) : (
            <Pressable
              style={styles.challengeButton}
              onPress={handleCompleteChallenge}
              disabled={completingChallenge}
              accessibilityRole="button"
              accessibilityLabel="Completar desafio diario"
            >
              {completingChallenge ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.challengeButtonText}>Completar</Text>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Badges earned */}
      {badges.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Insignias obtenidas</Text>
          <View style={styles.badgeList}>
            {badges.slice(0, 6).map((badge) => (
              <View key={badge.id} style={styles.badgeItem}>
                <View style={styles.badgeIcon}>
                  <Text style={styles.badgeEmoji}>
                    {badge.badge_type.includes("streak")
                      ? "F"
                      : badge.badge_type.includes("vocab")
                        ? "B"
                        : "T"}
                  </Text>
                </View>
                <Text style={styles.badgeText}>
                  {badge.badge_type.replace(/_/g, " ")}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
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
  errorText: {
    fontSize: 14,
    color: "#991B1B",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Header
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 20,
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  statLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
    textAlign: "center",
  },

  // Section card
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },

  // Overall progress bar
  overallProgressBg: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 6,
  },
  overallProgressFill: {
    height: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 6,
  },
  overallProgressText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },

  // Daily challenge
  challengeCompleted: {
    borderColor: "#A7F3D0",
    backgroundColor: "#ECFDF5",
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeXP: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D97706",
  },
  challengeDescription: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 12,
  },
  challengeCompletedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
    textAlign: "center",
  },
  challengeButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  challengeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Badges
  badgeList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeItem: {
    alignItems: "center",
    width: 64,
  },
  badgeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  badgeEmoji: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D97706",
  },
  badgeText: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
  },
});
