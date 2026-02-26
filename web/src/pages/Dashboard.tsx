import { useCallback, useState } from "react";
import { useIntl } from "react-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Card,
  Button,
  LoadingState,
  ErrorState,
  ProgressBar,
} from "@/components/common";
import {
  MasteryMeter,
  StreakCounter,
  BadgeGrid,
  XPAnimation,
  DailyChallenge,
  SkillTree,
} from "@/components/progress";
import {
  getDashboard,
  getSkillTree,
  completeDailyChallenge,
} from "@/services/progress";
import type { DashboardData } from "@/services/progress";

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [recentXP, setRecentXP] = useState(0);
  const [showSkillTree, setShowSkillTree] = useState(false);

  // ---- Data fetching ----
  const {
    data: dashboardResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["progress", "dashboard"],
    queryFn: getDashboard,
  });

  const {
    data: skillTreeResponse,
    isLoading: skillTreeLoading,
  } = useQuery({
    queryKey: ["progress", "skill-tree"],
    queryFn: getSkillTree,
    enabled: showSkillTree,
  });

  const dashboard: DashboardData | null = dashboardResponse?.data ?? null;
  const skillTreeData = skillTreeResponse?.data?.levels ?? [];

  // ---- Mutation: complete daily challenge ----
  const completeMutation = useMutation({
    mutationFn: completeDailyChallenge,
    onSuccess: (result) => {
      setRecentXP(result.data.xp_awarded);
      queryClient.invalidateQueries({ queryKey: ["progress"] });
    },
  });

  const handleCompleteChallenge = useCallback(
    async (id: string) => {
      await completeMutation.mutateAsync(id);
    },
    [completeMutation],
  );

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "nav.dashboard" })}
        </h1>
        <LoadingState message="Cargando tu progreso..." skeleton skeletonLines={8} />
      </div>
    );
  }

  // ---- Error state ----
  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "nav.dashboard" })}
        </h1>
        <ErrorState
          message={intl.formatMessage({ id: "error.unknown" })}
          details={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // ---- Fallback data when dashboard is null ----
  if (!dashboard) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {intl.formatMessage({ id: "nav.dashboard" })}
        </h1>
        <p className="mt-2 text-gray-600">
          Bienvenido a tu panel de aprendizaje de frances.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card title={intl.formatMessage({ id: "progress.dailyChallenge" })}>
            <p className="text-sm text-gray-500">Proximo desafio disponible.</p>
          </Card>
          <Card title={intl.formatMessage({ id: "progress.streak" }, { count: 0 })}>
            <p className="text-sm text-gray-500">
              {intl.formatMessage({ id: "progress.streakMessage" })}
            </p>
          </Card>
          <Card title={intl.formatMessage({ id: "progress.mastery" })}>
            <p className="text-sm text-gray-500">
              Comienza tu primera leccion para ver tu progreso.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const { user, cefr_progress, badges, daily_challenge } = dashboard;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {user.display_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Nivel {cefr_progress.current_level} - Sigue practicando para avanzar
          </p>
        </div>
        <XPAnimation totalXP={user.xp_total} recentXP={recentXP} size="md" />
      </div>

      {/* Top row: Streak + CEFR Progress + Daily Challenge */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Streak */}
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Racha</h2>
          </div>
          <div className="mt-3">
            <StreakCounter
              currentStreak={user.current_streak}
              longestStreak={user.longest_streak}
              size="md"
            />
          </div>
        </Card>

        {/* CEFR Progress */}
        <Card>
          <h2 className="text-sm font-semibold text-gray-700">
            Progreso nivel {cefr_progress.current_level}
          </h2>
          <div className="mt-3">
            <ProgressBar
              percent={cefr_progress.overall_mastery}
              cefrLevel={cefr_progress.current_level as import("@/types/cefr").CEFRLevel}
              label="Dominio general"
              showPercent
              size="lg"
            />
          </div>
          {cefr_progress.exam_available && (
            <div className="mt-3">
              <Link to="/exam">
                <Button variant="primary" size="sm">
                  Tomar examen de nivel
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Daily Challenge */}
        {daily_challenge ? (
          <DailyChallenge
            challenge={daily_challenge}
            onComplete={handleCompleteChallenge}
          />
        ) : (
          <Card>
            <h2 className="text-sm font-semibold text-gray-700">
              Desafio diario
            </h2>
            <p className="mt-3 text-sm text-gray-500">
              No hay desafio disponible hoy.
            </p>
          </Card>
        )}
      </div>

      {/* Per-skill mastery meters */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900">
          {intl.formatMessage({ id: "progress.mastery" })} por habilidad
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cefr_progress.skills.map((skill) => (
            <MasteryMeter
              key={skill.skill}
              skill={skill.skill}
              percentage={skill.mastery_percentage}
              variant="circular"
              size="md"
            />
          ))}
        </div>
        <div className="mt-4">
          {cefr_progress.skills.map((skill) => (
            <MasteryMeter
              key={`bar-${skill.skill}`}
              skill={skill.skill}
              percentage={skill.mastery_percentage}
              variant="bar"
              className="mb-3"
            />
          ))}
        </div>
      </Card>

      {/* Skill Tree toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Arbol de habilidades
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkillTree((v) => !v)}
          >
            {showSkillTree ? "Ocultar" : "Ver arbol"}
          </Button>
        </div>
        {showSkillTree && (
          <div className="mt-4">
            {skillTreeLoading ? (
              <LoadingState message="Cargando..." skeleton skeletonLines={4} />
            ) : (
              <SkillTree levels={skillTreeData} />
            )}
          </div>
        )}
      </Card>

      {/* Badges */}
      <Card>
        <h2 className="text-lg font-semibold text-gray-900">
          {intl.formatMessage({ id: "progress.badges" })}
        </h2>
        <div className="mt-4">
          <BadgeGrid earnedBadges={badges} />
        </div>
      </Card>

      {/* Recent activity */}
      {dashboard.recent_activity.length > 0 && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900">
            Actividad reciente
          </h2>
          <div className="mt-3 divide-y divide-gray-100">
            {dashboard.recent_activity.slice(0, 5).map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm text-gray-600 capitalize">
                  {activity.activity_type.replace("_", " ")}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-blue-600">
                    +{activity.xp_earned} XP
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleDateString("es", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
