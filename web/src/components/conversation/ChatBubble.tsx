import type { ReactNode } from "react";
import { InlineCorrection } from "./InlineCorrection";
import type { CorrectionData } from "@/services/conversation";

export interface ChatBubbleProps {
  /** Message sender role */
  role: "user" | "assistant";
  /** Message text content */
  content: string;
  /** Optional inline corrections to highlight */
  corrections?: CorrectionData[];
  /** Whether this message includes a Spanish fallback */
  hasSpanishFallback?: boolean;
  /** Timestamp string */
  timestamp?: string;
  className?: string;
}

/**
 * Chat message bubble component.
 *
 * User messages appear on the right side with blue styling.
 * AI (assistant) messages appear on the left with gray styling.
 * When corrections are present, the corrected words in the content
 * are highlighted with InlineCorrection tooltips.
 */
export function ChatBubble({
  role,
  content,
  corrections = [],
  hasSpanishFallback = false,
  timestamp,
  className = "",
}: ChatBubbleProps) {
  const isUser = role === "user";

  // Render content with inline corrections highlighted
  function renderContent(): ReactNode {
    if (corrections.length === 0) {
      return <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>;
    }

    // Build segments: split content by corrected words and insert InlineCorrection components
    let remaining = content;
    const segments: ReactNode[] = [];
    let segmentKey = 0;

    for (const correction of corrections) {
      const idx = remaining.indexOf(correction.corrected);
      if (idx === -1) {
        // Try matching the original text instead
        const origIdx = remaining.indexOf(correction.original);
        if (origIdx === -1) continue;

        // Add text before the correction
        if (origIdx > 0) {
          segments.push(
            <span key={segmentKey++}>{remaining.slice(0, origIdx)}</span>
          );
        }

        segments.push(
          <InlineCorrection
            key={segmentKey++}
            original={correction.original}
            corrected={correction.corrected}
            explanation={correction.explanation}
          />
        );

        remaining = remaining.slice(origIdx + correction.original.length);
      } else {
        // The AI already used the corrected form in the text
        if (idx > 0) {
          segments.push(
            <span key={segmentKey++}>{remaining.slice(0, idx)}</span>
          );
        }

        segments.push(
          <InlineCorrection
            key={segmentKey++}
            original={correction.original}
            corrected={correction.corrected}
            explanation={correction.explanation}
          />
        );

        remaining = remaining.slice(idx + correction.corrected.length);
      }
    }

    // Add any remaining text
    if (remaining) {
      segments.push(<span key={segmentKey++}>{remaining}</span>);
    }

    return (
      <p className="whitespace-pre-wrap text-sm leading-relaxed">{segments}</p>
    );
  }

  return (
    <div
      className={[
        "flex w-full",
        isUser ? "justify-end" : "justify-start",
        className,
      ].join(" ")}
    >
      <div
        className={[
          "relative max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "rounded-br-md bg-blue-600 text-white"
            : "rounded-bl-md bg-gray-100 text-gray-900",
        ].join(" ")}
      >
        {/* Role label */}
        <div
          className={[
            "mb-1 text-xs font-medium",
            isUser ? "text-blue-200" : "text-gray-500",
          ].join(" ")}
        >
          {isUser ? "Tu" : "Tuteur IA"}
        </div>

        {/* Message content */}
        {renderContent()}

        {/* Spanish fallback indicator */}
        {hasSpanishFallback && !isUser && (
          <div className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1">
            <svg
              className="h-3.5 w-3.5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span className="text-xs text-amber-700">
              Incluye explicacion en espanol
            </span>
          </div>
        )}

        {/* Corrections summary (for assistant messages) */}
        {!isUser && corrections.length > 0 && (
          <div className="mt-2 rounded-md bg-red-50 px-2 py-1.5">
            <div className="flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
              <span className="text-xs font-medium text-red-700">
                {corrections.length === 1
                  ? "1 correccion"
                  : `${corrections.length} correcciones`}
              </span>
            </div>
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <div
            className={[
              "mt-1 text-right text-[10px]",
              isUser ? "text-blue-300" : "text-gray-400",
            ].join(" ")}
          >
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}
