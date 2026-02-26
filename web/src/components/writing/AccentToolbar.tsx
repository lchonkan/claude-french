/**
 * AccentToolbar -- A row of buttons for inserting French accented characters
 * at the current cursor position in a textarea.
 */

import { useCallback, type RefObject } from "react";

export interface AccentToolbarProps {
  /** Ref to the textarea element for cursor-position insertion */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Callback fired after a character is inserted, with the new text value */
  onInsert: (newValue: string) => void;
  /** Disable all buttons */
  disabled?: boolean;
  className?: string;
}

/**
 * French accent characters commonly needed by learners.
 * Organized in a visually logical order.
 */
const ACCENT_CHARS = [
  { char: "\u00e9", label: "e accent aigu" },
  { char: "\u00e8", label: "e accent grave" },
  { char: "\u00ea", label: "e accent circonflexe" },
  { char: "\u00eb", label: "e trema" },
  { char: "\u00e7", label: "c cedille" },
  { char: "\u00e0", label: "a accent grave" },
  { char: "\u00f9", label: "u accent grave" },
  { char: "\u00fb", label: "u accent circonflexe" },
  { char: "\u00ee", label: "i accent circonflexe" },
  { char: "\u00f4", label: "o accent circonflexe" },
  { char: "\u0153", label: "o-e ligature" },
  { char: "\u00e6", label: "a-e ligature" },
] as const;

export function AccentToolbar({
  textareaRef,
  onInsert,
  disabled = false,
  className = "",
}: AccentToolbarProps) {
  const handleInsert = useCallback(
    (char: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? start;
      const currentValue = textarea.value;

      // Insert character at cursor position, replacing any selection
      const newValue =
        currentValue.slice(0, start) + char + currentValue.slice(end);

      onInsert(newValue);

      // Restore focus and set cursor position after the inserted character
      requestAnimationFrame(() => {
        textarea.focus();
        const newPosition = start + char.length;
        textarea.setSelectionRange(newPosition, newPosition);
      });
    },
    [textareaRef, onInsert]
  );

  return (
    <div
      className={`flex flex-wrap gap-1 ${className}`}
      role="toolbar"
      aria-label="Caracteres franceses con acento"
    >
      {ACCENT_CHARS.map(({ char, label }) => (
        <button
          key={char}
          type="button"
          onClick={() => handleInsert(char)}
          disabled={disabled}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-white text-base font-medium text-gray-700 transition-colors hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:text-gray-700"
          aria-label={`Insertar ${label}`}
          title={label}
        >
          {char}
        </button>
      ))}
    </div>
  );
}
