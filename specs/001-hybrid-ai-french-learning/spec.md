# Feature Specification: Hybrid AI French Learning Platform

**Feature Branch**: `001-hybrid-ai-french-learning`
**Created**: 2026-02-24
**Status**: Draft
**Input**: User description: "Production-ready French learning application (web + mobile) integrating Hugging Face models and Google Gemini services for cross-platform AI orchestration"

## Learner Profile

- **Native language**: Spanish
- **Additional fluent languages**: English, Portuguese
- **Target language**: French (beginner, CEFR A1 entry point)
- **Interface language**: Spanish
- **Curriculum framework**: CEFR (A1 through C2)
- **Cultural focus**: Paris, France

## Platform Constraints

This system MUST integrate two distinct AI service platforms to demonstrate cross-platform AI orchestration:

- **Hugging Face** (open-source models, self-hosted or via Inference Endpoints): MUST be used for tasks where low latency, cost efficiency, on-device capability, or specialized NLP model availability are the deciding factors.
- **Google Gemini** (multimodal cloud service): MUST be used for tasks where complex reasoning, structured output reliability, multimodal analysis, or pedagogical content generation quality are the deciding factors.

Every AI-powered feature MUST document which platform handles each sub-task and the justification (latency, cost, quality, multimodality).

## Clarifications

### Session 2026-02-24

- Q: When an AI platform is unavailable, what fallback behavior should users experience? → A: Hybrid strategy — queue async tasks (writing eval, lesson generation), fall back to other platform for sync tasks (grammar check, STT), show "unavailable" for non-substitutable tasks.
- Q: How should mastery percentage be calculated for the >=80% level-unlock gate? → A: Weighted score — 50% accuracy (last 20 exercises per skill) + 30% consistency (low variance in performance) + 20% recency (more recent results weighted higher).
- Q: How should PII be handled when sending learner data to external AI platforms? → A: Anonymize all data before sending — strip user IDs and PII, correlate responses back internally.
- Q: What is the target uptime for the learner-facing application? → A: 99.5% uptime (~43.8 hours downtime/year), with scheduled maintenance windows permitted.
- Q: How should the system handle concurrent multi-device sessions? → A: Last-write-wins with periodic sync (every 30 seconds). Most recent action takes precedence.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vocabulary Learning with Spaced Repetition (Priority: P1)

A learner opens the app and begins studying French vocabulary organized by CEFR level. The system presents flashcards with French words/phrases, their Spanish translations, example sentences, and audio pronunciation. The learner rates their recall difficulty, and the system schedules future reviews using a spaced repetition algorithm. Vocabulary difficulty is classified automatically, and semantically similar words are grouped to reinforce learning clusters.

**Why this priority**: Vocabulary is the foundation of language acquisition. A functional SRS vocabulary trainer delivers immediate, standalone learning value and constitutes the minimum viable product.

**Independent Test**: Can be fully tested by creating an account, selecting A1 vocabulary, completing a 10-card review session, and verifying that review intervals adjust based on recall performance.

**Acceptance Scenarios**:

1. **Given** a new learner at CEFR A1, **When** they start a vocabulary session, **Then** the system presents vocabulary items appropriate for A1 with French text, Spanish translation, example sentence, and audio.
2. **Given** a learner rates a card as "hard", **When** the SRS algorithm processes the rating, **Then** the card is rescheduled for review within 1 day (not the standard interval increase).
3. **Given** a learner completes a session, **When** they return to the dashboard, **Then** they see updated mastery percentages and upcoming review counts.
4. **Given** a vocabulary item, **When** the system classifies its difficulty, **Then** the classification uses the low-latency AI platform and completes within 100ms.
5. **Given** a set of vocabulary items, **When** the system generates semantic groupings, **Then** items are clustered by meaning using embedding-based similarity.

---

### User Story 2 - Placement Test and CEFR Assessment (Priority: P2)

A new learner takes a placement test that evaluates reading comprehension, vocabulary breadth, and basic grammar to determine their starting CEFR level. The test adapts its difficulty based on responses (presenting harder questions after correct answers and easier ones after errors). Upon completion, the learner receives their assessed CEFR level with a breakdown by skill area. Periodic CEFR-aligned exams are available to validate progression and unlock higher levels.

**Why this priority**: Correct level placement prevents learner frustration (too hard) or boredom (too easy). Without placement, all learners start at A1 regardless of existing knowledge, wasting the time of false beginners.

**Independent Test**: Can be tested by completing the placement test with varying answer patterns and verifying the assigned level matches expected outcomes (all correct = higher level, all wrong = A1).

**Acceptance Scenarios**:

1. **Given** a new user with no prior assessment, **When** they begin the placement test, **Then** the system starts with A2-level questions and adapts up or down based on correctness.
2. **Given** a learner answers 5 consecutive questions correctly at B1 difficulty, **When** the adaptive algorithm adjusts, **Then** subsequent questions increase to B2 difficulty.
3. **Given** a completed placement test, **When** the system calculates results, **Then** the learner sees their overall CEFR level plus per-skill breakdown (vocabulary, grammar, reading).
4. **Given** a learner at A2 with >=80% mastery, **When** they take the A2 exit exam, **Then** passing the exam unlocks B1 content.
5. **Given** a learner fails a CEFR exam, **When** results are displayed, **Then** the system identifies specific weak areas and recommends targeted practice.

---

### User Story 3 - Grammar Lessons and Exercises (Priority: P3)

A learner accesses structured grammar lessons appropriate to their CEFR level. Each lesson explains a grammar concept (in Spanish with French examples) followed by interactive exercises: fill-in-the-blank, sentence reordering, conjugation practice, and error correction. The system provides instant feedback on answers, including grammar error detection and explanation of mistakes. Exercise difficulty adapts within the level based on the learner's error patterns.

**Why this priority**: Grammar is essential for progressing beyond basic vocabulary. Structured grammar practice with AI-powered error detection differentiates this from static textbook exercises.

**Independent Test**: Can be tested by completing an A1 grammar lesson (e.g., present tense of regular -er verbs), answering exercises, and verifying that feedback correctly identifies errors and adapts difficulty.

**Acceptance Scenarios**:

1. **Given** a learner at A1, **When** they open the grammar module, **Then** they see a curriculum of A1 grammar topics in pedagogically ordered sequence.
2. **Given** a learner submits a fill-in-the-blank answer with an incorrect conjugation, **When** the system evaluates the answer, **Then** feedback identifies the specific error type (e.g., "wrong verb ending for third person") within 200ms.
3. **Given** a learner consistently makes errors with irregular verbs, **When** the adaptive system recalibrates, **Then** subsequent exercises increase the proportion of irregular verb practice.
4. **Given** a grammar exercise, **When** quick grammar checking is performed, **Then** the low-latency AI platform handles the evaluation.

---

### User Story 4 - AI Conversational Practice (Priority: P4)

A learner engages in a text-based conversation in French with an AI tutor. The conversation follows scenarios appropriate to their CEFR level (e.g., A1: ordering at a café, B1: discussing weekend plans, B2: debating current events). The AI maintains the conversation in French, adjusts complexity to the learner's level, gently corrects errors inline, and can switch to Spanish for explanations when the learner is stuck. Each conversation is evaluated for vocabulary usage, grammar accuracy, and communicative effectiveness.

**Why this priority**: Conversational practice is where vocabulary and grammar converge into productive skill. AI-powered conversation provides unlimited practice without scheduling constraints of human tutors.

**Independent Test**: Can be tested by initiating an A1 conversation scenario, exchanging 5+ messages, and verifying the AI stays at appropriate complexity, corrects errors, and provides a post-conversation evaluation.

**Acceptance Scenarios**:

1. **Given** a learner at A1 selects "ordering at a Parisian café", **When** the conversation begins, **Then** the AI greets the learner in simple A1-appropriate French and sets the scene.
2. **Given** a learner writes a message with a grammar error, **When** the AI responds, **Then** it continues the conversation naturally while providing an inline correction with brief Spanish explanation.
3. **Given** the learner types "No entiendo" (Spanish for "I don't understand"), **When** the AI detects the language switch, **Then** it provides a Spanish explanation and simplified French rephrasing.
4. **Given** a completed conversation, **When** the evaluation is generated, **Then** the system uses the high-quality reasoning AI platform to produce a structured assessment of vocabulary, grammar, and communicative effectiveness.
5. **Given** a conversation in progress, **When** lightweight scaffolding responses are needed, **Then** the low-latency AI platform generates initial response candidates.

---

### User Story 5 - Writing Evaluation with CEFR Scoring (Priority: P5)

A learner completes a writing prompt appropriate to their CEFR level (A1: short descriptions, B1: informal emails, B2: opinion essays, C1: formal arguments). After submission, the system provides a detailed CEFR-aligned evaluation covering grammar, vocabulary range, coherence, task completion, and an overall CEFR score for the writing. Feedback includes specific suggestions for improvement with examples.

**Why this priority**: Writing evaluation requires sophisticated language assessment that is difficult to automate well. High-quality AI evaluation is a key differentiator, and the structured output demonstrates cross-platform capability.

**Independent Test**: Can be tested by submitting a short A1-level description (3-5 sentences), receiving an evaluation, and verifying it includes CEFR score, per-criterion ratings, and actionable feedback.

**Acceptance Scenarios**:

1. **Given** a learner at A1, **When** they access writing prompts, **Then** they see level-appropriate prompts (e.g., "Describe your daily routine in 5 sentences").
2. **Given** a submitted writing sample, **When** the evaluation is generated, **Then** the high-quality reasoning AI platform produces a structured JSON evaluation with per-criterion CEFR scores.
3. **Given** a writing evaluation result, **When** displayed to the learner, **Then** feedback is presented in Spanish with specific French examples showing how to improve.
4. **Given** a submitted text, **When** quick grammar issues are identified, **Then** the low-latency AI platform highlights surface-level errors before the full evaluation completes.
5. **Given** an evaluation result, **When** complexity is scored, **Then** sentence complexity scoring uses embeddings from the low-latency AI platform.

---

### User Story 6 - Pronunciation Practice with Multimodal Feedback (Priority: P6)

A learner records themselves speaking a French word, phrase, or sentence. The system transcribes the audio, aligns individual phonemes against the target pronunciation, and provides multimodal feedback on accuracy, prosody (rhythm and intonation), and fluency. The learner sees a visual comparison of their pronunciation versus the target, with specific phonemes highlighted for improvement. Audio playback speed adjusts based on the learner's proficiency.

**Why this priority**: Pronunciation is critical for spoken communication and is the hardest skill to practice alone. The multimodal pipeline (audio transcription + phoneme analysis + holistic evaluation) is the primary showcase of cross-platform AI orchestration.

**Independent Test**: Can be tested by recording a simple A1 phrase (e.g., "Bonjour, je m'appelle..."), receiving phoneme-level feedback, and verifying the system identifies specific pronunciation issues.

**Acceptance Scenarios**:

1. **Given** a learner selects a pronunciation exercise, **When** they see the target phrase, **Then** they can play a native-speaker reference audio and record their own attempt.
2. **Given** a recorded audio clip, **When** the system processes it, **Then** speech-to-text transcription is performed by the low-latency AI platform.
3. **Given** a transcription, **When** phoneme alignment runs, **Then** the low-latency AI platform maps the learner's phonemes against the target pronunciation.
4. **Given** transcription and phoneme data, **When** holistic evaluation runs, **Then** the multimodal AI platform analyzes prosody, fluency, and overall quality using audio + text combined.
5. **Given** evaluation results, **When** displayed to the learner, **Then** they see a phoneme-by-phoneme accuracy map, an overall fluency score, and specific improvement suggestions in Spanish.
6. **Given** a learner at A1, **When** reference audio is played, **Then** playback speed defaults to 0.75x and adjusts based on the learner's demonstrated comprehension.

---

### User Story 7 - Listening Comprehension (Priority: P7)

A learner listens to French audio clips (dialogues, monologues, announcements) appropriate to their CEFR level and answers comprehension questions. Audio clips feature Paris-specific cultural contexts (e.g., metro announcements, café conversations, museum audio guides). Playback speed adjusts based on learner level. Questions progress from multiple-choice at A1 to open-ended at B2+.

**Why this priority**: Listening comprehension is essential for real-world communication. Paris-contextualized audio reinforces the cultural focus and prepares learners for actual immersion.

**Independent Test**: Can be tested by listening to an A1 dialogue, answering comprehension questions, and verifying correct/incorrect feedback with explanations.

**Acceptance Scenarios**:

1. **Given** a learner at A1, **When** they start a listening exercise, **Then** the audio plays at reduced speed with a simple dialogue and multiple-choice questions in Spanish.
2. **Given** an audio clip, **When** the learner requests a transcript, **Then** the system displays the French text with key vocabulary highlighted and Spanish translations on tap.
3. **Given** a learner answers a comprehension question incorrectly, **When** feedback is displayed, **Then** the system replays the relevant audio segment and explains the correct answer in Spanish.

---

### User Story 8 - Paris Cultural Notes (Priority: P8)

A learner discovers short cultural enrichment articles about Paris (history, neighborhoods, etiquette, cuisine, daily life) written at their CEFR reading level. Each note includes vocabulary lists, cultural comparisons (French vs. Spanish-speaking cultures), and links to related lessons. Cultural notes are generated with pedagogical alignment to reinforce vocabulary and grammar from the learner's current curriculum.

**Why this priority**: Cultural context motivates learners and provides authentic reading practice. Paris-specific content differentiates this product and prepares learners for real-world application.

**Independent Test**: Can be tested by opening a cultural note at A1 level, verifying the text matches A1 vocabulary/grammar, and confirming linked vocabulary items appear in the SRS module.

**Acceptance Scenarios**:

1. **Given** a learner at A1, **When** they browse cultural notes, **Then** they see articles written with A1-level vocabulary and simple sentence structures.
2. **Given** a cultural note about Parisian cafés, **When** the learner taps an unfamiliar word, **Then** the system shows a Spanish translation and adds the word to their vocabulary review queue.
3. **Given** lesson content generation is needed, **When** the system creates cultural notes, **Then** the high-quality reasoning AI platform generates content with pedagogical alignment to the learner's current CEFR curriculum.

---

### User Story 9 - Gamification and Progress Tracking (Priority: P9)

A learner earns XP for completing activities (vocabulary reviews, grammar exercises, conversations, writing tasks, pronunciation practice). They maintain a daily streak, earn CEFR-level badges upon passing exams, and navigate a visual skill tree showing their progression. Daily adaptive challenges are generated based on weak areas. The progress dashboard shows CEFR progress, skill mastery percentages, streak history, and comparative analytics.

**Why this priority**: Gamification drives daily engagement and habit formation, which is the primary predictor of language learning success. Without motivation mechanics, learner retention drops significantly.

**Independent Test**: Can be tested by completing 3 different activities, verifying XP awards, streak increment, and skill tree progress update.

**Acceptance Scenarios**:

1. **Given** a learner completes a vocabulary review session of 10 cards, **When** the session ends, **Then** they receive XP proportional to accuracy (e.g., 10 XP per correct card) and their daily streak increments.
2. **Given** a learner has a 7-day streak, **When** they miss a day, **Then** the streak resets to 0 but a "longest streak" record is preserved.
3. **Given** a learner passes the A1 exit exam, **When** the badge is awarded, **Then** a CEFR A1 badge appears on their profile and the skill tree unlocks A2 content.
4. **Given** a learner's error patterns show weakness in verb conjugation, **When** a daily challenge is generated, **Then** the challenge focuses on conjugation exercises at their current difficulty level.
5. **Given** a learner opens the progress dashboard, **When** data loads, **Then** they see per-skill mastery percentages, total XP, streak status, CEFR progress bar, and badges earned.

---

### User Story 10 - AI Model Performance Analytics (Priority: P10)

The system logs every AI interaction with metadata including which platform handled the request (Hugging Face or Gemini), response latency, estimated cost, task type, and success/failure status. An analytics dashboard (admin-facing) displays comparative metrics: average latency per platform per task type, cost per user per day, error rates, and model usage distribution. This data enables informed decisions about model routing optimization.

**Why this priority**: Cross-platform AI orchestration analytics is the technical differentiator of this system. Without tracking, there is no way to validate or optimize the hybrid model strategy.

**Independent Test**: Can be tested by triggering AI interactions across multiple task types, then viewing the analytics dashboard to verify latency, cost, and routing data are captured and displayed correctly.

**Acceptance Scenarios**:

1. **Given** any AI-powered interaction, **When** the request completes, **Then** the system logs: platform used, task type, latency in milliseconds, estimated cost, and success/failure.
2. **Given** 100+ logged interactions, **When** an admin views the analytics dashboard, **Then** they see average latency per platform per task type in a comparative chart.
3. **Given** logged cost estimations, **When** the admin filters by time range, **Then** the dashboard shows cost-per-user-per-day trends for each AI platform.
4. **Given** both platforms are in use, **When** the analytics are reviewed, **Then** the data enables comparison of which platform performs better for each task category.

---

### Edge Cases

- What happens when a learner's audio recording is silent, too noisy, or in the wrong language?
- How does the system handle AI platform outages (Hugging Face or Gemini unavailable)?
- What happens when a learner's mastery score is exactly at the 80% threshold for level unlock?
- How does the SRS algorithm handle vocabulary items the learner has never reviewed (new cards vs. review cards scheduling)?
- What happens when a learner switches devices mid-session? Last-write-wins with 30-second sync; completed exercises are never lost, in-progress exercises on the abandoned device are discarded if not submitted before the next sync.
- How does the system handle concurrent writing evaluations that exceed AI rate limits?
- What happens when the placement test is abandoned midway?
- How does the system handle French text with special characters (accents: é, è, ê, ë, ç, etc.) in user input across platforms?

## Requirements *(mandatory)*

### Functional Requirements

**Core Learning Engine**

- **FR-001**: System MUST provide a CEFR-aligned curriculum with fixed content per level (A1 through C2) and adaptive difficulty within each level.
- **FR-002**: System MUST implement spaced repetition scheduling for vocabulary review using an established SRS algorithm (e.g., SM-2 or similar).
- **FR-003**: System MUST adapt exercise difficulty based on the learner's error patterns, increasing focus on weak areas and reducing repetition of mastered content.
- **FR-004**: System MUST support level progression gated by >=80% skill mastery AND passing a CEFR-aligned exit exam. Mastery percentage MUST be calculated as a weighted score: 50% accuracy (rolling window of last 20 exercises per skill) + 30% consistency (low variance in recent performance) + 20% recency (exponentially higher weight for more recent results).

**AI Orchestration**

- **FR-005**: System MUST route AI tasks to the appropriate platform (Hugging Face or Gemini) based on a documented routing strategy considering latency, cost, and quality.
- **FR-006**: System MUST provide hybrid fallback behavior when an AI platform is unavailable:
  - **Async tasks** (writing evaluation, lesson generation, cultural content, adaptive recalibration): MUST queue the request and notify the learner when results are ready.
  - **Sync tasks** (grammar correction, speech-to-text, conversational scaffolding): MUST fall back to the other AI platform with potentially reduced quality, informing the learner that results may differ from normal.
  - **Non-substitutable tasks** (multimodal pronunciation analysis, structured evaluation output with no equivalent on the other platform): MUST display "feature temporarily unavailable" and suggest alternative activities the learner can do in the meantime.
- **FR-007**: System MUST log every AI interaction with platform, task type, latency, estimated cost, and outcome.
- **FR-008**: System MUST use the low-latency AI platform for: grammar correction, speech-to-text, phoneme alignment, vocabulary classification, sentence complexity scoring, embedding generation, and lightweight conversational scaffolding.
- **FR-009**: System MUST use the high-quality reasoning AI platform for: writing evaluation, complex conversational reasoning, structured evaluation output, multimodal pronunciation analysis, lesson generation, adaptive difficulty recalibration, and cultural content enrichment.

**Multilingual Interface**

- **FR-010**: System MUST present the interface in Spanish (learner's native language) for all navigation, instructions, explanations, and feedback.
- **FR-011**: System MUST present learning content in French with Spanish support available on demand (translations, explanations).
- **FR-012**: System MUST leverage the learner's Spanish and Portuguese knowledge for cognate highlighting and cross-linguistic comparisons where beneficial.

**Cross-Platform**

- **FR-013**: System MUST be accessible as a web application and a mobile application with synchronized user data across platforms.
- **FR-014**: System MUST support audio recording on both web and mobile platforms for pronunciation exercises.
- **FR-015**: System MUST maintain session continuity when a learner switches between web and mobile devices. When a learner is active on multiple devices simultaneously, the system MUST use a last-write-wins strategy with periodic sync (every 30 seconds). The most recent action takes precedence, and no data loss is permitted for completed exercises or reviews.

**Content & Assessment**

- **FR-016**: System MUST provide a placement test that adaptively determines the learner's starting CEFR level.
- **FR-017**: System MUST provide periodic CEFR-aligned exams covering reading, writing, grammar, vocabulary, and listening for each level.
- **FR-018**: System MUST generate Paris-specific cultural notes aligned to the learner's current CEFR level and curriculum progress.
- **FR-019**: System MUST generate structured JSON output for all evaluation results (writing, conversation, pronunciation) following defined schemas.

**Gamification**

- **FR-020**: System MUST award XP for completed activities, maintain daily streaks, grant CEFR badges upon exam passage, and present a visual skill tree.
- **FR-021**: System MUST generate daily adaptive challenges based on the learner's identified weak areas.

**Data & Privacy**

- **FR-022**: System MUST persist all learner progress, mastery scores, evaluation history, and error patterns.
- **FR-023**: System MUST comply with GDPR requirements for data handling, including right to deletion, data portability, and explicit consent for AI processing.
- **FR-024**: System MUST encrypt all data in transit and at rest.
- **FR-025**: System MUST anonymize all learner data before sending to external AI platforms (Hugging Face Inference Endpoints and Gemini). User IDs, names, email addresses, and any other PII MUST be stripped from requests. The system MUST correlate AI platform responses back to the originating learner using internal session identifiers only.

### Key Entities

- **User**: Represents a learner with profile data (native language, target language, interface language), current CEFR level, and authentication credentials.
- **Lesson**: A unit of learning content belonging to a specific module (vocabulary, grammar, writing, etc.) and CEFR level, containing exercises and reference material.
- **CEFR Level**: One of six standardized proficiency levels (A1, A2, B1, B2, C1, C2) with defined competency descriptors and curriculum content.
- **Skill Mastery**: Per-user, per-skill proficiency metrics tracking mastery percentage (weighted: 50% accuracy over last 20 exercises, 30% consistency, 20% recency), error patterns, and time spent. Skills include vocabulary, grammar, writing, listening, pronunciation, and conversation. The system MUST retain at minimum the last 20 exercise results per skill to compute the rolling window.
- **Vocabulary Item**: A French word or phrase with Spanish translation, example sentences, audio, phonetic transcription, difficulty classification, CEFR level, and SRS scheduling data.
- **Writing Evaluation**: A structured assessment of a learner's written submission, including per-criterion CEFR scores (grammar, vocabulary range, coherence, task completion) and improvement suggestions.
- **Pronunciation Score**: A structured assessment of a learner's spoken attempt, including phoneme-level accuracy, prosody rating, fluency score, and specific improvement areas.
- **Error Pattern**: A tracked record of recurring mistakes by type (grammar category, phoneme confusion, vocabulary confusion) used to drive adaptive difficulty.
- **AI Model Usage Log**: A record of every AI platform interaction, tracking which platform, task type, latency, estimated cost, and success status for analytics.

## Assumptions

- The learner has access to a microphone for pronunciation exercises (web or mobile).
- Internet connectivity is required for all AI-powered features; offline mode is not in scope for the initial release.
- French content (vocabulary lists, grammar explanations, cultural notes) will be generated/curated using AI with human review for accuracy.
- The SRS algorithm follows SM-2 or a comparable evidence-based scheduling algorithm.
- Authentication uses standard email/password with optional social login (Google, Apple).
- XP values and gamification parameters will be tuned iteratively based on user engagement data.
- Audio content for listening exercises and pronunciation targets is either AI-generated (TTS) or sourced from licensed recordings.
- The admin analytics dashboard (User Story 10) is internal-facing and does not require the same UX polish as the learner-facing application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Learners can complete a full vocabulary review session (20 cards) in under 5 minutes with immediate feedback on each card.
- **SC-002**: The placement test accurately assigns learners to within one CEFR level of their actual proficiency (validated against a sample of 50 pre-assessed test users).
- **SC-003**: 90% of learners successfully complete their first lesson within 10 minutes of account creation (onboarding conversion).
- **SC-004**: Writing evaluations return structured feedback within 10 seconds of submission.
- **SC-005**: Pronunciation feedback (full pipeline: transcription + phoneme analysis + multimodal evaluation) completes within 8 seconds of audio submission.
- **SC-006**: The system supports 1,000 concurrent learners without degradation in response times.
- **SC-007**: AI model analytics correctly attribute 100% of AI interactions to the originating platform with accurate latency measurements (within 10ms tolerance).
- **SC-008**: Learners who practice daily for 30 days show measurable CEFR sub-skill improvement (>=10% mastery increase in at least 3 skill areas).
- **SC-009**: 70% of learners maintain a daily streak of 7+ days within their first month (engagement retention).
- **SC-010**: Cross-platform data synchronization between web and mobile occurs within 2 seconds, with zero data loss during device switches.
- **SC-011**: The learner-facing application maintains 99.5% uptime measured monthly, with planned maintenance windows communicated to users at least 24 hours in advance.
