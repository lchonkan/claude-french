/** Common European Framework of Reference for Languages levels */
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

/** Core language skills tracked in the platform */
export type Skill =
  | "vocabulary"
  | "grammar"
  | "writing"
  | "listening"
  | "pronunciation"
  | "conversation";

/** All learning modules, including non-skill modules */
export type Module = Skill | "cultural";

/** Exercise types available across grammar and vocabulary practice */
export type ExerciseType =
  | "fill_blank"
  | "reorder"
  | "conjugate"
  | "error_correct"
  | "multiple_choice"
  | "open_ended";

/** CEFR level ordering for comparison and progression */
export const CEFR_ORDER: readonly CEFRLevel[] = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

/** Returns true if level a is at or above level b */
export function isAtOrAbove(a: CEFRLevel, b: CEFRLevel): boolean {
  return CEFR_ORDER.indexOf(a) >= CEFR_ORDER.indexOf(b);
}
