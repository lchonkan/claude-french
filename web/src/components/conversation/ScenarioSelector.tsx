import type { ConversationScenario } from "@/services/conversation";

export interface ScenarioSelectorProps {
  /** Available scenarios to choose from */
  scenarios: ConversationScenario[];
  /** Callback when a scenario is selected */
  onSelect: (scenario: ConversationScenario) => void;
  /** Whether the selector is in a loading state */
  loading?: boolean;
  className?: string;
}

/** Map scenario icon identifiers to SVG path data (Heroicons outline) */
const ICON_PATHS: Record<string, string> = {
  coffee:
    "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z",
  map: "M9 6.75V15m0-8.25A1.125 1.125 0 1010.125 7.875H9V6.75zm0 0V15m6-8.25V15m0 0v-3.375c0-.621-.504-1.125-1.125-1.125H9.75M15 15V6.75m0 8.25v-3.375c0-.621.504-1.125 1.125-1.125h1.5M15 15h.008v.008H15V15z",
  users:
    "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
  "shopping-bag":
    "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
  utensils:
    "M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75l-1.5.75a3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0 3.354 3.354 0 00-3 0 3.354 3.354 0 01-3 0L3 16.5m15-3.379a48.474 48.474 0 00-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 013 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 016 13.12M12.265 3.11a.375.375 0 11-.53 0L12 2.845l.265.265z",
};

/** Map difficulty levels to color classes */
const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  A1: { bg: "bg-green-100", text: "text-green-700", label: "Principiante" },
  A2: { bg: "bg-green-100", text: "text-green-800", label: "Elemental" },
  B1: { bg: "bg-blue-100", text: "text-blue-700", label: "Intermedio" },
  B2: { bg: "bg-blue-100", text: "text-blue-800", label: "Intermedio alto" },
  C1: { bg: "bg-purple-100", text: "text-purple-700", label: "Avanzado" },
  C2: { bg: "bg-purple-100", text: "text-purple-800", label: "Maestria" },
};

/**
 * Grid of scenario cards for selecting a conversation topic.
 *
 * Each card displays the scenario title, a short description,
 * a relevant icon, and a difficulty badge (CEFR level).
 */
export function ScenarioSelector({
  scenarios,
  onSelect,
  loading = false,
  className = "",
}: ScenarioSelectorProps) {
  if (loading) {
    return (
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
      role="list"
      aria-label="Escenarios de conversacion"
    >
      {scenarios.map((scenario) => {
        const difficulty = DIFFICULTY_COLORS[scenario.difficulty] ?? DIFFICULTY_COLORS.A1;
        const iconPath = ICON_PATHS[scenario.icon] ?? ICON_PATHS.users;

        return (
          <button
            key={scenario.id}
            type="button"
            className="group flex flex-col items-start rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            onClick={() => onSelect(scenario)}
            role="listitem"
            aria-label={`${scenario.title} - ${difficulty.label}`}
          >
            {/* Icon and difficulty badge */}
            <div className="mb-3 flex w-full items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100">
                <svg
                  className="h-5 w-5"
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
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${difficulty.bg} ${difficulty.text}`}
              >
                {scenario.difficulty}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
              {scenario.title}
            </h3>

            {/* Description */}
            <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
              {scenario.description}
            </p>

            {/* Difficulty label */}
            <div className="mt-auto pt-3">
              <span className="text-xs text-gray-400">
                {difficulty.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
