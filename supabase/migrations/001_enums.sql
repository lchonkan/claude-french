-- Migration 001: Enum types for French Learning Platform

CREATE TYPE cefr_level_enum AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
CREATE TYPE skill_enum AS ENUM ('vocabulary', 'grammar', 'writing', 'listening', 'pronunciation', 'conversation');
CREATE TYPE module_enum AS ENUM ('vocabulary', 'grammar', 'writing', 'listening', 'pronunciation', 'conversation', 'cultural');
CREATE TYPE exercise_type_enum AS ENUM ('fill_blank', 'reorder', 'conjugate', 'error_correct', 'multiple_choice', 'open_ended');
CREATE TYPE error_type_enum AS ENUM ('grammar', 'pronunciation', 'vocabulary', 'spelling');
CREATE TYPE ai_platform_enum AS ENUM ('huggingface', 'gemini');
CREATE TYPE ai_task_type_enum AS ENUM (
  'grammar_check', 'stt', 'phoneme_alignment', 'embedding',
  'text_generation', 'writing_eval', 'conversation',
  'pronunciation_analysis', 'lesson_generation',
  'difficulty_recalibration', 'cultural_content'
);
CREATE TYPE eval_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE exam_type_enum AS ENUM ('placement', 'exit');
CREATE TYPE badge_type_enum AS ENUM (
  'cefr_completion', 'streak_7', 'streak_30', 'streak_100',
  'first_conversation', 'first_writing', 'first_pronunciation',
  'vocab_100', 'vocab_500', 'vocab_1000'
);
CREATE TYPE activity_type_enum AS ENUM (
  'vocab_review', 'grammar_exercise', 'conversation', 'writing',
  'pronunciation', 'listening', 'exam', 'daily_challenge'
);
