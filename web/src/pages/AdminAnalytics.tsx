/**
 * AdminAnalytics page (T125).
 *
 * Full admin analytics dashboard with:
 * - AI Overview section (stat cards)
 * - Platform comparison (HuggingFace vs Gemini)
 * - Task breakdown table (sortable)
 * - Daily trends charts (SVG-based)
 * - User engagement stats
 * - Content metrics
 * - Date range picker for filtering
 */

import { useState, useEffect, useCallback } from "react";
import { useIntl } from "react-intl";
import { Card } from "@/components/common/Card";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import {
  PlatformComparisonChart,
  TaskBreakdownTable,
  TrendGraph,
  CostPerUserChart,
} from "@/components/admin";
import {
  getAIOverview,
  getAIByTask,
  getAITrends,
  getUserEngagement,
  getContentMetrics,
} from "@/services/admin";
import type {
  AIOverview,
  TaskBreakdownResponse,
  TrendsResponse,
  UserEngagement,
  ContentMetrics,
  TrendMetric,
  DateRange,
} from "@/services/admin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDefaultRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start_date: formatDate(start), end_date: formatDate(end) };
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "yellow" | "red" | "gray";
}

function StatCard({ label, value, subtitle, color = "blue" }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: "border-l-blue-500",
    green: "border-l-emerald-500",
    yellow: "border-l-yellow-500",
    red: "border-l-red-500",
    gray: "border-l-gray-400",
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 border-l-4 ${colorClasses[color]}`}
    >
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && (
        <div className="mt-0.5 text-xs text-gray-400">{subtitle}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminAnalytics() {
  const intl = useIntl();

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultRange);

  // Data states
  const [aiOverview, setAiOverview] = useState<AIOverview | null>(null);
  const [taskBreakdown, setTaskBreakdown] =
    useState<TaskBreakdownResponse | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [userEngagement, setUserEngagement] =
    useState<UserEngagement | null>(null);
  const [contentMetrics, setContentMetrics] =
    useState<ContentMetrics | null>(null);

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendMetric, setSelectedTrendMetric] =
    useState<TrendMetric>("requests");

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        overviewRes,
        taskRes,
        trendRes,
        userRes,
        contentRes,
      ] = await Promise.all([
        getAIOverview(dateRange),
        getAIByTask(dateRange),
        getAITrends(dateRange, selectedTrendMetric),
        getUserEngagement(dateRange),
        getContentMetrics(),
      ]);

      setAiOverview(overviewRes.data);
      setTaskBreakdown(taskRes.data);
      setTrends(trendRes.data);
      setUserEngagement(userRes.data);
      setContentMetrics(contentRes.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al cargar las analiticas.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedTrendMetric]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch trends when metric changes
  const handleTrendMetricChange = useCallback(
    async (metric: TrendMetric) => {
      setSelectedTrendMetric(metric);
      try {
        const res = await getAITrends(dateRange, metric);
        setTrends(res.data);
      } catch {
        // Silent fallback -- keep existing data
      }
    },
    [dateRange],
  );

  if (loading) {
    return (
      <LoadingState
        message="Cargando analiticas..."
        skeleton
        skeletonLines={8}
      />
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchData} />;
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header + Date Range */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {intl.formatMessage({ id: "nav.admin" })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Panel de analiticas de la plataforma
          </p>
        </div>

        {/* Date range picker */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Desde:</label>
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) =>
              setDateRange((prev) => ({
                ...prev,
                start_date: e.target.value,
              }))
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <label className="text-sm text-gray-600">Hasta:</label>
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) =>
              setDateRange((prev) => ({
                ...prev,
                end_date: e.target.value,
              }))
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={fetchData}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* AI Overview -- Key Metrics */}
      {/* ================================================================= */}
      {aiOverview && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Resumen de IA
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              label="Total de llamadas"
              value={aiOverview.total_requests.toLocaleString()}
              color="blue"
            />
            <StatCard
              label="Costo total"
              value={`$${Object.values(aiOverview.by_platform)
                .reduce((s, p) => s + p.total_estimated_cost_usd, 0)
                .toFixed(2)}`}
              color="green"
            />
            <StatCard
              label="Latencia promedio"
              value={`${(
                Object.values(aiOverview.by_platform).reduce(
                  (s, p) => s + p.avg_latency_ms * p.total_requests,
                  0,
                ) /
                Math.max(aiOverview.total_requests, 1)
              ).toFixed(0)} ms`}
              color="yellow"
            />
            <StatCard
              label="Tasa de errores"
              value={`${(
                (1 -
                  Object.values(aiOverview.by_platform).reduce(
                    (s, p) => s + p.success_rate * p.total_requests,
                    0,
                  ) /
                    Math.max(aiOverview.total_requests, 1)) *
                100
              ).toFixed(2)}%`}
              color="red"
            />
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* Platform Comparison + Cost Per User */}
      {/* ================================================================= */}
      {aiOverview && (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Comparacion de plataformas">
            <PlatformComparisonChart
              platforms={aiOverview.by_platform}
            />
          </Card>
          <Card title="Distribucion de costos">
            <CostPerUserChart
              platforms={aiOverview.by_platform}
              costPerUserPerDay={aiOverview.cost_per_user_per_day_usd}
              totalUsers={userEngagement?.total_users ?? 1}
            />
          </Card>
        </section>
      )}

      {/* ================================================================= */}
      {/* Task Breakdown Table */}
      {/* ================================================================= */}
      {taskBreakdown && (
        <Card title="Desglose por tipo de tarea">
          <TaskBreakdownTable tasks={taskBreakdown.tasks} />
        </Card>
      )}

      {/* ================================================================= */}
      {/* Daily Trends */}
      {/* ================================================================= */}
      {trends && (
        <Card title="Tendencias diarias">
          <div className="mb-4 flex items-center gap-2">
            {(
              ["requests", "latency", "cost", "errors"] as TrendMetric[]
            ).map((m) => (
              <button
                key={m}
                onClick={() => handleTrendMetricChange(m)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedTrendMetric === m
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m === "requests"
                  ? "Solicitudes"
                  : m === "latency"
                    ? "Latencia"
                    : m === "cost"
                      ? "Costo"
                      : "Errores"}
              </button>
            ))}
          </div>
          <TrendGraph
            dataPoints={trends.data_points}
            metric={trends.metric}
            variant={selectedTrendMetric === "requests" ? "bar" : "line"}
          />
        </Card>
      )}

      {/* ================================================================= */}
      {/* User Engagement */}
      {/* ================================================================= */}
      {userEngagement && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Engagement de usuarios
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard
              label="Total usuarios"
              value={userEngagement.total_users.toLocaleString()}
              color="blue"
            />
            <StatCard
              label="Usuarios activos"
              value={userEngagement.active_users.toLocaleString()}
              color="green"
            />
            <StatCard
              label="Nuevos usuarios"
              value={userEngagement.new_users.toLocaleString()}
              color="yellow"
            />
            <StatCard
              label="DAU promedio"
              value={userEngagement.avg_daily_active.toLocaleString()}
              color="blue"
            />
            <StatCard
              label="Sesion promedio"
              value={`${userEngagement.avg_session_minutes.toFixed(1)} min`}
              color="gray"
            />
          </div>

          {/* Streak distribution and CEFR distribution */}
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Distribucion de rachas">
              <div className="space-y-2">
                {Object.entries(userEngagement.streak_distribution).map(
                  ([key, count]) => {
                    const labels: Record<string, string> = {
                      "0_days": "Sin racha",
                      "1_7_days": "1-7 dias",
                      "8_30_days": "8-30 dias",
                      "30_plus_days": "30+ dias",
                    };
                    const maxCount = Math.max(
                      ...Object.values(userEngagement.streak_distribution),
                      1,
                    );
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-20 text-xs text-gray-600">
                          {labels[key] ?? key}
                        </span>
                        <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded"
                            style={{
                              width: `${(count / maxCount) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-xs font-medium text-gray-700 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </Card>
            <Card title="Distribucion CEFR">
              <div className="space-y-2">
                {Object.entries(userEngagement.cefr_distribution).map(
                  ([level, count]) => {
                    const maxCount = Math.max(
                      ...Object.values(userEngagement.cefr_distribution),
                      1,
                    );
                    const colors: Record<string, string> = {
                      A1: "bg-green-300",
                      A2: "bg-green-500",
                      B1: "bg-blue-400",
                      B2: "bg-blue-600",
                      C1: "bg-purple-500",
                      C2: "bg-purple-700",
                    };
                    return (
                      <div key={level} className="flex items-center gap-3">
                        <span className="w-8 text-xs font-medium text-gray-700">
                          {level}
                        </span>
                        <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                          <div
                            className={`h-full rounded ${colors[level] ?? "bg-gray-400"}`}
                            style={{
                              width: `${(count / maxCount) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-xs font-medium text-gray-700 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* Content Metrics */}
      {/* ================================================================= */}
      {contentMetrics && (
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Metricas de contenido
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card title="Vocabulario">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium text-gray-900">
                    {contentMetrics.vocabulary_items.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Revisados</span>
                  <span className="font-medium text-emerald-600">
                    {contentMetrics.vocabulary_items.reviewed?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pendientes</span>
                  <span className="font-medium text-yellow-600">
                    {contentMetrics.vocabulary_items.pending_review?.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
            <Card title="Notas culturales">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium text-gray-900">
                    {contentMetrics.cultural_notes.total}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Revisadas</span>
                  <span className="font-medium text-emerald-600">
                    {contentMetrics.cultural_notes.reviewed}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Generadas por IA</span>
                  <span className="font-medium text-blue-600">
                    {contentMetrics.cultural_notes.ai_generated}
                  </span>
                </div>
              </div>
            </Card>
            <Card title="Lecciones">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-medium text-gray-900">
                    {contentMetrics.lessons.total}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Activas</span>
                  <span className="font-medium text-emerald-600">
                    {contentMetrics.lessons.active}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Borrador</span>
                  <span className="font-medium text-gray-400">
                    {contentMetrics.lessons.draft}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
