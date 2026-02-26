import type { CEFRLevel, ExerciseType, Module, Skill } from "./cefr";

// ---------------------------------------------------------------------------
// Generic API wrappers
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  phonetic: string;
  example_sentence: string;
  example_translation: string;
  audio_url: string | null;
  category: string;
  cefr_level: CEFRLevel;
  tags: string[];
  created_at: string;
}

export interface VocabularyProgress {
  item_id: string;
  user_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string;
  mastery_score: number;
  last_reviewed: string;
}

export interface ReviewRequest {
  item_id: string;
  rating: 1 | 2 | 3 | 4; // again=1, hard=2, good=3, easy=4
  response_time_ms: number;
}

export interface ReviewResponse {
  item_id: string;
  next_review: string;
  interval_days: number;
  ease_factor: number;
  mastery_score: number;
  xp_earned: number;
}

// ---------------------------------------------------------------------------
// Grammar / Lessons
// ---------------------------------------------------------------------------

export interface Lesson {
  id: string;
  title: string;
  description: string;
  module: Module;
  cefr_level: CEFRLevel;
  order: number;
  estimated_minutes: number;
  content_html: string;
  exercises: LessonExercise[];
  prerequisites: string[];
}

export interface LessonExercise {
  id: string;
  lesson_id: string;
  exercise_type: ExerciseType;
  prompt: string;
  prompt_audio_url: string | null;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  hints: string[];
  order: number;
  points: number;
}

export interface ExerciseSubmission {
  exercise_id: string;
  answer: string;
  time_spent_ms: number;
}

export interface ExerciseResult {
  exercise_id: string;
  correct: boolean;
  correct_answer: string;
  explanation: string;
  xp_earned: number;
  feedback: string | null;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export interface WritingSubmission {
  prompt_id: string;
  text: string;
  cefr_level: CEFRLevel;
}

export interface WritingEvaluation {
  id: string;
  grammar_score: number;
  vocabulary_score: number;
  coherence_score: number;
  overall_score: number;
  corrections: WritingCorrection[];
  feedback: string;
  xp_earned: number;
}

export interface WritingCorrection {
  original: string;
  corrected: string;
  explanation: string;
  category: "grammar" | "vocabulary" | "style" | "spelling";
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export interface ConversationSession {
  id: string;
  user_id: string;
  scenario: string;
  cefr_level: CEFRLevel;
  messages: ConversationMessage[];
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  xp_earned: number;
}

export interface ConversationMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  audio_url: string | null;
  corrections: ConversationCorrection[] | null;
  timestamp: string;
}

export interface ConversationCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Pronunciation
// ---------------------------------------------------------------------------

export interface PronunciationScore {
  overall: number;
  phoneme_scores: PhonemeScore[];
  feedback: string;
  model_audio_url: string;
}

export interface PhonemeScore {
  phoneme: string;
  score: number;
  expected: string;
  actual: string;
}

export interface PronunciationExercise {
  id: string;
  text: string;
  phonetic: string;
  audio_url: string;
  cefr_level: CEFRLevel;
  difficulty: "easy" | "medium" | "hard";
}

// ---------------------------------------------------------------------------
// Progress & Gamification
// ---------------------------------------------------------------------------

export interface SkillMastery {
  skill: Skill;
  cefr_level: CEFRLevel;
  mastery_percent: number;
  total_exercises: number;
  correct_exercises: number;
  last_practiced: string;
}

export interface MasteryDashboard {
  overall_level: CEFRLevel;
  skills: SkillMastery[];
  total_xp: number;
  current_streak: StreakInfo;
  daily_challenge: DailyChallenge | null;
  recent_badges: Badge[];
  weekly_xp_history: number[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  earned_at: string;
  category: string;
}

export interface XPTransaction {
  id: string;
  amount: number;
  source: string;
  description: string;
  created_at: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  exercise_type: ExerciseType;
  module: Module;
  xp_reward: number;
  completed: boolean;
  expires_at: string;
}

export interface StreakInfo {
  current: number;
  longest: number;
  last_activity: string;
  streak_alive: boolean;
}

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

export interface ExamAttempt {
  id: string;
  user_id: string;
  exam_type: "placement" | "exit";
  target_level: CEFRLevel;
  score: number;
  passed: boolean;
  skill_scores: Record<Skill, number>;
  started_at: string;
  completed_at: string;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  current_level: CEFRLevel;
  target_level: CEFRLevel;
  native_language: string;
  daily_goal_xp: number;
  total_xp: number;
  joined_at: string;
  timezone: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  notifications_enabled: boolean;
  daily_reminder_time: string | null;
  audio_autoplay: boolean;
  theme: "light" | "dark" | "system";
}
