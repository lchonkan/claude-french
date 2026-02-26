/**
 * BadgeGrid -- Grid of badge icons with earned/unearned states.
 *
 * Earned badges are full-color and highlighted. Unearned badges
 * are greyed out with reduced opacity.
 */

import type { BadgeData } from "@/services/progress";
import { BADGE_CATALOG } from "@/services/progress";

// ---------------------------------------------------------------------------
// Badge icon mapping
// ---------------------------------------------------------------------------

const badgeIcons: Record<string, string> = {
  trophy: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  flame: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
  pen: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z",
  mic: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  book: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BadgeGridProps {
  earnedBadges: BadgeData[];
  className?: string;
}

export function BadgeGrid({ earnedBadges, className = "" }: BadgeGridProps) {
  const earnedTypes = new Set(earnedBadges.map((b) => b.badge_type));

  return (
    <div className={`grid grid-cols-5 gap-3 ${className}`}>
      {BADGE_CATALOG.map((badge) => {
        const isEarned = earnedTypes.has(badge.type);
        const iconPath = badgeIcons[badge.icon] ?? badgeIcons.trophy;

        return (
          <div
            key={badge.type}
            className={[
              "flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all",
              isEarned
                ? "bg-amber-50 ring-1 ring-amber-200"
                : "bg-gray-50 opacity-40",
            ].join(" ")}
            title={
              isEarned
                ? `${badge.nameEs} - Obtenida`
                : `${badge.nameEs} - ${badge.descriptionEs}`
            }
          >
            <div
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full",
                isEarned ? "bg-amber-100" : "bg-gray-200",
              ].join(" ")}
            >
              <svg
                className={[
                  "h-5 w-5",
                  isEarned ? "text-amber-600" : "text-gray-400",
                ].join(" ")}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={iconPath}
                />
              </svg>
            </div>
            <span
              className={[
                "text-[10px] font-medium leading-tight",
                isEarned ? "text-amber-800" : "text-gray-400",
              ].join(" ")}
            >
              {badge.nameEs}
            </span>
          </div>
        );
      })}
    </div>
  );
}
