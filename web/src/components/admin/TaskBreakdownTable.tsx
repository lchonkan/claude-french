/**
 * TaskBreakdownTable (T126)
 *
 * Sortable table of task-level AI metrics. Columns: task type, platform,
 * calls, latency (avg/p95/p99), cost, success rate, fallbacks.
 */

import { useState, useMemo, useCallback } from "react";
import type { TaskBreakdownItem } from "@/services/admin";

interface TaskBreakdownTableProps {
  tasks: TaskBreakdownItem[];
}

type SortKey = keyof TaskBreakdownItem;
type SortDir = "asc" | "desc";

interface Column {
  key: SortKey;
  label: string;
  format: (v: unknown) => string;
  align: "left" | "right";
}

const COLUMNS: Column[] = [
  {
    key: "task_type",
    label: "Tarea",
    format: (v) => String(v).replace(/_/g, " "),
    align: "left",
  },
  {
    key: "platform",
    label: "Plataforma",
    format: (v) => (v === "huggingface" ? "HuggingFace" : v === "gemini" ? "Gemini" : String(v)),
    align: "left",
  },
  {
    key: "request_count",
    label: "Llamadas",
    format: (v) => Number(v).toLocaleString(),
    align: "right",
  },
  {
    key: "avg_latency_ms",
    label: "Latencia (avg)",
    format: (v) => `${Number(v).toFixed(0)} ms`,
    align: "right",
  },
  {
    key: "p95_latency_ms",
    label: "p95",
    format: (v) => `${Number(v).toFixed(0)} ms`,
    align: "right",
  },
  {
    key: "avg_cost_usd",
    label: "Costo/llamada",
    format: (v) => `$${Number(v).toFixed(4)}`,
    align: "right",
  },
  {
    key: "total_cost_usd",
    label: "Costo total",
    format: (v) => `$${Number(v).toFixed(2)}`,
    align: "right",
  },
  {
    key: "success_rate",
    label: "Exito",
    format: (v) => `${(Number(v) * 100).toFixed(1)}%`,
    align: "right",
  },
  {
    key: "fallback_count",
    label: "Fallbacks",
    format: (v) => String(v),
    align: "right",
  },
];

export function TaskBreakdownTable({ tasks }: TaskBreakdownTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("request_count");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );

  const sorted = useMemo(() => {
    const copy = [...tasks];
    copy.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
    return copy;
  }, [tasks, sortKey, sortDir]);

  if (tasks.length === 0) {
    return (
      <div className="text-gray-400 text-sm py-4">
        No hay datos de tareas disponibles.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors ${
                  col.align === "right" ? "text-right" : "text-left"
                }`}
                onClick={() => handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key && (
                    <span className="text-xs text-blue-600">
                      {sortDir === "asc" ? "\u25B2" : "\u25BC"}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((task, idx) => (
            <tr
              key={`${task.task_type}-${task.platform}`}
              className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-25"
              }`}
            >
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2.5 ${
                    col.align === "right" ? "text-right" : "text-left"
                  } ${col.key === "task_type" ? "font-medium text-gray-900" : "text-gray-700"}`}
                >
                  {col.format(task[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
