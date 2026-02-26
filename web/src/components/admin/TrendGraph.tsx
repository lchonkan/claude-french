/**
 * TrendGraph (T126)
 *
 * Simple SVG-based line/bar chart for daily trends.
 * No external chart library dependency.
 */

import { useMemo } from "react";
import type { TrendDataPoint } from "@/services/admin";

interface TrendGraphProps {
  dataPoints: TrendDataPoint[];
  metric: string;
  height?: number;
  variant?: "line" | "bar";
  color?: string;
}

const METRIC_LABELS: Record<string, string> = {
  latency: "Latencia (ms)",
  cost: "Costo (USD)",
  requests: "Solicitudes",
  errors: "Errores",
};

const DEFAULT_COLORS: Record<string, string> = {
  latency: "#3b82f6",  // blue-500
  cost: "#10b981",     // emerald-500
  requests: "#8b5cf6", // violet-500
  errors: "#ef4444",   // red-500
};

export function TrendGraph({
  dataPoints,
  metric,
  height = 200,
  variant = "line",
  color,
}: TrendGraphProps) {
  const chartColor = color ?? DEFAULT_COLORS[metric] ?? "#6b7280";
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const width = 700;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { values, maxVal, minVal, yTicks, xLabels, pathD, areaD } =
    useMemo(() => {
      const vals = dataPoints.map((dp) => dp.value);
      const max = Math.max(...vals, 1);
      const min = Math.min(...vals, 0);
      const range = max - min || 1;

      // Y-axis tick marks (5 ticks)
      const tickCount = 5;
      const ticks: number[] = [];
      for (let i = 0; i <= tickCount; i++) {
        ticks.push(min + (range * i) / tickCount);
      }

      // X-axis labels (show every N-th date to avoid crowding)
      const step = Math.max(1, Math.floor(dataPoints.length / 7));
      const labels = dataPoints
        .map((dp, i) => ({ date: dp.date, i }))
        .filter((_, idx) => idx % step === 0);

      // Line path
      const points = vals.map((v, i) => {
        const x = padding.left + (i / Math.max(vals.length - 1, 1)) * innerW;
        const y =
          padding.top + innerH - ((v - min) / range) * innerH;
        return { x, y };
      });

      const lineD =
        points.length > 0
          ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`
          : "";

      // Area path (for filled variant)
      const areaPath =
        points.length > 0
          ? `${lineD} L ${points[points.length - 1].x},${padding.top + innerH} L ${points[0].x},${padding.top + innerH} Z`
          : "";

      return {
        values: vals,
        maxVal: max,
        minVal: min,
        yTicks: ticks,
        xLabels: labels,
        pathD: lineD,
        areaD: areaPath,
      };
    }, [dataPoints, innerW, innerH, padding.left, padding.top]);

  if (dataPoints.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-8 text-center">
        No hay datos de tendencias para el periodo seleccionado.
      </div>
    );
  }

  const range = maxVal - minVal || 1;

  return (
    <div className="w-full">
      <div className="text-sm font-medium text-gray-600 mb-2">
        {METRIC_LABELS[metric] ?? metric}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: `${height}px` }}
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y =
            padding.top +
            innerH -
            ((tick - minVal) / range) * innerH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerW}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px]"
                fill="#9ca3af"
              >
                {tick >= 1000
                  ? `${(tick / 1000).toFixed(1)}k`
                  : tick.toFixed(tick < 1 ? 4 : 0)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map(({ date, i: idx }) => {
          const x =
            padding.left +
            (idx / Math.max(values.length - 1, 1)) * innerW;
          return (
            <text
              key={date}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="text-[10px]"
              fill="#9ca3af"
            >
              {date.slice(5)} {/* MM-DD */}
            </text>
          );
        })}

        {/* Bar chart variant */}
        {variant === "bar" &&
          values.map((v, i) => {
            const barW = Math.max(
              innerW / values.length - 2,
              2,
            );
            const barH = ((v - minVal) / range) * innerH;
            const x =
              padding.left +
              (i / Math.max(values.length - 1, 1)) * innerW -
              barW / 2;
            const y = padding.top + innerH - barH;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={chartColor}
                opacity={0.7}
                rx={1}
              >
                <title>
                  {dataPoints[i]?.date}: {v}
                </title>
              </rect>
            );
          })}

        {/* Line chart variant */}
        {variant === "line" && pathD && (
          <>
            {/* Area fill */}
            <path d={areaD} fill={chartColor} opacity={0.1} />
            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke={chartColor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Data points */}
            {values.map((v, i) => {
              const x =
                padding.left +
                (i / Math.max(values.length - 1, 1)) * innerW;
              const y =
                padding.top +
                innerH -
                ((v - minVal) / range) * innerH;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={values.length <= 31 ? 3 : 1.5}
                  fill={chartColor}
                >
                  <title>
                    {dataPoints[i]?.date}: {v}
                  </title>
                </circle>
              );
            })}
          </>
        )}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + innerH}
          stroke="#d1d5db"
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={padding.left + innerW}
          y2={padding.top + innerH}
          stroke="#d1d5db"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
