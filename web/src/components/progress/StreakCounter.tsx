/**
 * StreakCounter -- Animated flame icon with streak count.
 *
 * Shows a flame SVG icon that pulses on increment, alongside the
 * current streak day count and a label.
 */

import { useEffect, useState } from "react";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  animated?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { icon: "h-6 w-6", number: "text-lg", label: "text-xs" },
  md: { icon: "h-8 w-8", number: "text-2xl", label: "text-sm" },
  lg: { icon: "h-12 w-12", number: "text-4xl", label: "text-base" },
};

export function StreakCounter({
  currentStreak,
  longestStreak,
  animated = true,
  size = "md",
  className = "",
}: StreakCounterProps) {
  const [pulse, setPulse] = useState(false);
  const classes = sizeClasses[size];

  // Pulse animation on mount or streak change
  useEffect(() => {
    if (!animated || currentStreak === 0) return;
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(timer);
  }, [currentStreak, animated]);

  const flameColor =
    currentStreak >= 30
      ? "text-red-500"
      : currentStreak >= 7
        ? "text-orange-500"
        : currentStreak > 0
          ? "text-amber-500"
          : "text-gray-300";

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      aria-label={`Racha de ${currentStreak} dias`}
    >
      {/* Flame icon */}
      <div className={`relative ${pulse ? "animate-bounce" : ""}`}>
        <svg
          className={`${classes.icon} ${flameColor} transition-colors duration-300`}
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 23C7.58 23 4 19.42 4 15c0-2.84 1.48-5.56 3.79-7.7.53-.5 1.34-.56 1.93-.16.59.4.78 1.16.45 1.78-.6 1.15-.91 2.1-.91 2.83 0 .41.09.79.25 1.12.7-1.72 2.55-3.39 4.7-5.39C16.63 5.14 19 2.96 19 1c0-.55.45-1 1-1s1 .45 1 1c0 .58-.07 1.14-.2 1.68C20.27 4.38 18.64 6.8 16.7 9c-1.82 2.06-3.55 4.15-3.55 6 0 1.22.63 2.3 1.58 2.92.2-.77.6-1.47 1.17-2.03.92-.92 2.35-1.6 4.1-1.85-.21 2.87-1.47 5.25-3.39 6.88C15.14 22.26 13.34 23 12 23z" />
        </svg>
        {/* Glow effect for active streaks */}
        {currentStreak > 0 && (
          <div
            className={`absolute inset-0 rounded-full ${flameColor} opacity-20 blur-sm`}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Count and label */}
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`font-bold ${classes.number} text-gray-900`}>
            {currentStreak}
          </span>
          <span className={`${classes.label} font-medium text-gray-500`}>
            {currentStreak === 1 ? "dia" : "dias"}
          </span>
        </div>
        {longestStreak > currentStreak && (
          <p className="text-xs text-gray-400">
            Mejor racha: {longestStreak} dias
          </p>
        )}
      </div>
    </div>
  );
}
