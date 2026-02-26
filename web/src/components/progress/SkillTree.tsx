/**
 * SkillTree -- Visual tree showing 6 skills per CEFR level.
 *
 * Renders a vertical list of CEFR level blocks, each containing
 * connected skill nodes. Nodes are filled based on mastery percentage.
 * Level progression indicators connect blocks.
 */

import type { SkillTreeLevel, SkillTreeNode } from "@/services/progress";
import type { CEFRLevel } from "@/types/cefr";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const levelColors: Record<string, { bg: string; border: string; text: string }> = {
  A1: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  A2: { bg: "bg-green-50", border: "border-green-300", text: "text-green-800" },
  B1: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  B2: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800" },
  C1: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
  C2: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-800" },
};

const statusIcons: Record<string, string> = {
  locked: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
  in_progress: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  completed: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  mastered: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
};

const skillLabels: Record<string, string> = {
  vocabulary: "Vocab",
  grammar: "Gram",
  writing: "Escr",
  listening: "Aud",
  pronunciation: "Pron",
  conversation: "Conv",
};

// ---------------------------------------------------------------------------
// Skill node sub-component
// ---------------------------------------------------------------------------

function SkillNodeComponent({ node }: { node: SkillTreeNode }) {
  const isMastered = node.status === "mastered";
  const isProgress = node.status === "in_progress";
  const isLocked = node.status === "locked";

  const ringColor = isMastered
    ? "ring-emerald-400"
    : isProgress
      ? "ring-blue-400"
      : "ring-gray-200";

  const bgColor = isMastered
    ? "bg-emerald-100"
    : isProgress
      ? "bg-blue-50"
      : "bg-gray-100";

  const textColor = isMastered
    ? "text-emerald-700"
    : isProgress
      ? "text-blue-700"
      : "text-gray-400";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={[
          "relative flex h-12 w-12 items-center justify-center rounded-full ring-2",
          ringColor,
          bgColor,
        ].join(" ")}
        title={`${skillLabels[node.skill] ?? node.skill}: ${Math.round(node.mastery)}%`}
      >
        {/* Fill overlay based on mastery */}
        {!isLocked && (
          <div
            className={[
              "absolute bottom-0 left-0 w-full rounded-b-full overflow-hidden",
              isMastered ? "bg-emerald-200" : "bg-blue-200",
            ].join(" ")}
            style={{ height: `${Math.max(0, Math.min(100, node.mastery))}%` }}
            aria-hidden="true"
          />
        )}

        <span
          className={`relative z-10 text-xs font-bold ${textColor}`}
        >
          {isLocked ? (
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d={statusIcons.locked}
              />
            </svg>
          ) : (
            `${Math.round(node.mastery)}%`
          )}
        </span>
      </div>
      <span className={`text-[10px] font-medium ${textColor}`}>
        {skillLabels[node.skill] ?? node.skill}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SkillTreeProps {
  levels: SkillTreeLevel[];
  className?: string;
}

export function SkillTree({ levels, className = "" }: SkillTreeProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {levels.map((level, idx) => {
        const colors = levelColors[level.cefr_level] ?? levelColors.A1;
        const isLocked = level.status === "locked";
        const isCompleted = level.status === "completed";

        return (
          <div key={level.cefr_level}>
            {/* Connector line between levels */}
            {idx > 0 && (
              <div className="flex justify-center py-1">
                <div
                  className={[
                    "h-6 w-0.5",
                    isLocked ? "bg-gray-200" : "bg-blue-300",
                  ].join(" ")}
                />
              </div>
            )}

            {/* Level block */}
            <div
              className={[
                "rounded-xl border p-4",
                colors.border,
                isLocked ? "bg-gray-50 opacity-60" : colors.bg,
              ].join(" ")}
            >
              {/* Level header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-lg font-bold ${isLocked ? "text-gray-400" : colors.text}`}
                  >
                    {level.cefr_level}
                  </span>
                  {isCompleted && (
                    <svg
                      className="h-5 w-5 text-emerald-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      aria-label="Nivel completado"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d={statusIcons.completed}
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {Math.round(level.overall_mastery)}%
                </span>
              </div>

              {/* Skill nodes */}
              {level.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-4">
                  {level.skills.map((node) => (
                    <SkillNodeComponent key={node.skill} node={node} />
                  ))}
                </div>
              )}

              {/* Exam status */}
              {!isLocked && (
                <div className="mt-3 flex justify-center">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                      level.exam_status === "passed"
                        ? "bg-emerald-100 text-emerald-700"
                        : level.exam_status === "available"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-500",
                    ].join(" ")}
                  >
                    {level.exam_status === "passed"
                      ? "Examen aprobado"
                      : level.exam_status === "available"
                        ? "Examen disponible"
                        : "Examen bloqueado"}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
