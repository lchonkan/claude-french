/**
 * XPAnimation -- XP total display with floating +XP animation.
 *
 * Renders the current XP total in bold. When `recentXP` is provided
 * and greater than 0, a "+{amount} XP" text animates upward and fades out.
 */

import { useEffect, useState } from "react";

interface XPAnimationProps {
  totalXP: number;
  recentXP?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: { total: "text-lg", label: "text-xs", anim: "text-sm" },
  md: { total: "text-2xl", label: "text-sm", anim: "text-base" },
  lg: { total: "text-4xl", label: "text-base", anim: "text-lg" },
};

export function XPAnimation({
  totalXP,
  recentXP = 0,
  size = "md",
  className = "",
}: XPAnimationProps) {
  const [showAnimation, setShowAnimation] = useState(false);
  const [animatingAmount, setAnimatingAmount] = useState(0);
  const classes = sizeClasses[size];

  useEffect(() => {
    if (recentXP > 0) {
      setAnimatingAmount(recentXP);
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [recentXP]);

  return (
    <div className={`relative inline-flex items-baseline gap-1 ${className}`}>
      {/* XP total */}
      <span className={`font-bold ${classes.total} text-gray-900`}>
        {totalXP.toLocaleString()}
      </span>
      <span className={`${classes.label} font-semibold text-blue-600`}>XP</span>

      {/* Floating animation */}
      {showAnimation && animatingAmount > 0 && (
        <span
          className={`absolute -top-6 left-1/2 -translate-x-1/2 font-bold ${classes.anim} text-emerald-500 animate-xp-float pointer-events-none`}
          aria-hidden="true"
        >
          +{animatingAmount}
        </span>
      )}

      {/* CSS animation keyframes are injected via a style tag */}
      <style>{`
        @keyframes xp-float {
          0% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -24px);
          }
        }
        .animate-xp-float {
          animation: xp-float 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
