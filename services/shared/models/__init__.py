"""Shared domain models for the French learning platform.

Re-exports every public model and enum so consumers can write::

    from shared.models import CEFRLevel, VocabularyItem, Lesson

Modules:
    vocabulary (T029) -- CEFRLevel, VocabularyItem, VocabularyProgress, reviews
    lesson (T030)     -- Skill, Module, ExerciseType, Lesson, LessonExercise
    evaluation (T031) -- EvalStatus, writing/conversation evaluation models
    mastery (T032)    -- SkillMastery, MasteryDashboard, LevelUnlockCheck
    gamification (T033) -- Badge, XPTransaction, DailyChallenge, StreakInfo
    pronunciation (T034) -- PronunciationScore, PronunciationExercise, history
"""

from .evaluation import (
    AIPlatform,
    ConversationMessage,
    ConversationMessageRequest,
    ConversationSession,
    ConversationStartRequest,
    EvalStatus,
    WritingEvaluationResult,
    WritingSubmission,
)
from .gamification import (
    ActivityType,
    Badge,
    BadgeType,
    DailyChallenge,
    StreakInfo,
    XPTransaction,
)
from .lesson import (
    ExerciseResult,
    ExerciseSubmission,
    ExerciseType,
    Lesson,
    LessonExercise,
    Module,
    Skill,
)
from .mastery import (
    ExerciseResultRecord,
    LevelUnlockCheck,
    MasteryDashboard,
    SkillMastery,
)
from .pronunciation import (
    PronunciationExercise,
    PronunciationHistory,
    PronunciationScore,
    PronunciationSubmission,
)
from .vocabulary import (
    CEFRLevel,
    VocabularyItem,
    VocabularyProgress,
    VocabularyReviewRequest,
    VocabularyReviewResponse,
)

__all__ = [
    # vocabulary
    "CEFRLevel",
    "VocabularyItem",
    "VocabularyProgress",
    "VocabularyReviewRequest",
    "VocabularyReviewResponse",
    # lesson
    "ExerciseResult",
    "ExerciseSubmission",
    "ExerciseType",
    "Lesson",
    "LessonExercise",
    "Module",
    "Skill",
    # evaluation
    "AIPlatform",
    "ConversationMessage",
    "ConversationMessageRequest",
    "ConversationSession",
    "ConversationStartRequest",
    "EvalStatus",
    "WritingEvaluationResult",
    "WritingSubmission",
    # mastery
    "ExerciseResultRecord",
    "LevelUnlockCheck",
    "MasteryDashboard",
    "SkillMastery",
    # gamification
    "ActivityType",
    "Badge",
    "BadgeType",
    "DailyChallenge",
    "StreakInfo",
    "XPTransaction",
    # pronunciation
    "PronunciationExercise",
    "PronunciationHistory",
    "PronunciationScore",
    "PronunciationSubmission",
]
