/**
 * CostPerUserChart (T126)
 *
 * Cost distribution visualization.
 * Shows cost breakdown by platform and cost-per-user-per-day metric
 * using SVG donut chart and stat cards.
 */

import type { PlatformStats } from "@/services/admin";

interface CostPerUserChartProps {
  platforms: Record<string, PlatformStats>;
  costPerUserPerDay: number;
  totalUsers: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  huggingface: "#eab308", // yellow-500
  gemini: "#3b82f6",      // blue-500
};

const PLATFORM_LABELS: Record<string, string> = {
  huggingface: "HuggingFace",
  gemini: "Gemini",
};

/**
 * Render an SVG donut chart showing cost distribution across platforms.
 */
function DonutChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) {
    return (
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        <circle
          cx={60}
          cy={60}
          r={50}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={12}
        />
        <text
          x={60}
          y={64}
          textAnchor="middle"
          className="text-xs"
          fill="#9ca3af"
        >
          $0.00
        </text>
      </svg>
    );
  }

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32">
      {segments.map((seg) => {
        const pct = seg.value / total;
        const dashLength = pct * circumference;
        const dashOffset = -offset * circumference;
        offset += pct;

        return (
          <circle
            key={seg.label}
            cx={60}
            cy={60}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={12}
            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
          >
            <title>
              {seg.label}: ${seg.value.toFixed(2)}
            </title>
          </circle>
        );
      })}
      {/* Center text */}
      <text
        x={60}
        y={58}
        textAnchor="middle"
        className="text-sm font-bold"
        fill="#1f2937"
      >
        ${total.toFixed(2)}
      </text>
      <text
        x={60}
        y={72}
        textAnchor="middle"
        className="text-[9px]"
        fill="#6b7280"
      >
        costo total
      </text>
    </svg>
  );
}

export function CostPerUserChart({
  platforms,
  costPerUserPerDay,
  totalUsers,
}: CostPerUserChartProps) {
  const segments = Object.entries(platforms).map(([name, stats]) => ({
    label: PLATFORM_LABELS[name] ?? name,
    value: stats.total_estimated_cost_usd,
    color: PLATFORM_COLORS[name] ?? "#6b7280",
  }));

  const totalCost = segments.reduce((sum, s) => sum + s.value, 0);
  const monthlyEstimate = costPerUserPerDay * 30 * totalUsers;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-6">
        {/* Donut chart */}
        <DonutChart segments={segments} />

        {/* Legend and breakdown */}
        <div className="flex-1 space-y-3">
          {segments.map((seg) => {
            const pct = totalCost > 0 ? (seg.value / totalCost) * 100 : 0;
            return (
              <div key={seg.label} className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">
                    {seg.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${seg.value.toFixed(2)} ({pct.toFixed(1)}%)
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-lg font-bold text-gray-900">
            ${costPerUserPerDay.toFixed(3)}
          </div>
          <div className="text-xs text-gray-500">por usuario/dia</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-lg font-bold text-gray-900">
            ${(costPerUserPerDay * 30).toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">por usuario/mes</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-lg font-bold text-gray-900">
            ${monthlyEstimate.toFixed(0)}
          </div>
          <div className="text-xs text-gray-500">estimado mensual</div>
        </div>
      </div>
    </div>
  );
}
