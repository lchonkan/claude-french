/**
 * PlatformComparisonChart (T126)
 *
 * Side-by-side bar comparison of HuggingFace vs Gemini metrics.
 * Uses pure CSS bars (no chart library dependency).
 */

import type { PlatformStats } from "@/services/admin";

interface PlatformComparisonChartProps {
  platforms: Record<string, PlatformStats>;
}

interface MetricRow {
  label: string;
  key: keyof PlatformStats;
  format: (v: number) => string;
  unit: string;
}

const METRICS: MetricRow[] = [
  {
    label: "Solicitudes totales",
    key: "total_requests",
    format: (v) => v.toLocaleString(),
    unit: "",
  },
  {
    label: "Tasa de exito",
    key: "success_rate",
    format: (v) => `${(v * 100).toFixed(1)}%`,
    unit: "%",
  },
  {
    label: "Latencia promedio",
    key: "avg_latency_ms",
    format: (v) => `${v.toFixed(0)} ms`,
    unit: "ms",
  },
  {
    label: "Costo total",
    key: "total_estimated_cost_usd",
    format: (v) => `$${v.toFixed(2)}`,
    unit: "USD",
  },
  {
    label: "Fallbacks",
    key: "fallback_count",
    format: (v) => v.toString(),
    unit: "",
  },
];

const PLATFORM_COLORS: Record<string, string> = {
  huggingface: "bg-yellow-500",
  gemini: "bg-blue-500",
};

const PLATFORM_LABELS: Record<string, string> = {
  huggingface: "HuggingFace",
  gemini: "Gemini",
};

export function PlatformComparisonChart({
  platforms,
}: PlatformComparisonChartProps) {
  const platformNames = Object.keys(platforms);

  if (platformNames.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-4">
        No hay datos de plataforma disponibles.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="flex items-center gap-6">
        {platformNames.map((name) => (
          <div key={name} className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-sm ${PLATFORM_COLORS[name] ?? "bg-gray-400"}`}
            />
            <span className="text-sm font-medium text-gray-700">
              {PLATFORM_LABELS[name] ?? name}
            </span>
          </div>
        ))}
      </div>

      {/* Metric rows */}
      {METRICS.map((metric) => {
        // Find the max value across platforms for scaling the bars
        const values = platformNames.map(
          (p) => Number(platforms[p][metric.key]) || 0,
        );
        const maxVal = Math.max(...values, 1);

        return (
          <div key={metric.key} className="space-y-2">
            <div className="text-sm font-medium text-gray-600">
              {metric.label}
            </div>
            <div className="space-y-1.5">
              {platformNames.map((name) => {
                const val = Number(platforms[name][metric.key]) || 0;
                // For success_rate, scale to 100%
                const barPercent =
                  metric.key === "success_rate"
                    ? val * 100
                    : (val / maxVal) * 100;

                return (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-gray-500 shrink-0">
                      {PLATFORM_LABELS[name] ?? name}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                      <div
                        className={`h-full rounded transition-all duration-500 ${PLATFORM_COLORS[name] ?? "bg-gray-400"}`}
                        style={{
                          width: `${Math.max(barPercent, 2)}%`,
                        }}
                      />
                    </div>
                    <span className="w-24 text-xs font-medium text-gray-700 text-right shrink-0">
                      {metric.format(val)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
