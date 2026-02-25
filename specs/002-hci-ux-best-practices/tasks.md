# Tasks: HCI Best Practices for French Learning Platform

**Input**: Design documents from `/specs/002-hci-ux-best-practices/`
**Prerequisites**: plan.md, spec.md
**Depends on**: Feature 001 project structure (web/, mobile/, tailwind.config.ts)

**Tests**: Per Constitution Principle II, every implementation task MUST include unit tests (Vitest/Jest) achieving >=80% coverage. Accessibility tasks MUST include axe-core automated audits. Tests written inline with each task.

**Organization**: Tasks grouped by user story (6 stories, P1-P6) with Setup and Foundational phases first.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6)
- Paths follow plan.md structure (web/, mobile/)

---

## Phase 1: Setup

**Purpose**: Install dependencies and configure tooling for design system and accessibility

- [ ] T001 Install Radix UI primitives (@radix-ui/react-dialog, @radix-ui/react-tooltip, @radix-ui/react-select, @radix-ui/react-accordion, @radix-ui/react-toggle) in web/package.json
- [ ] T002 [P] Install Framer Motion in web/package.json
- [ ] T003 [P] Install axe-core and @axe-core/react for accessibility testing in web/package.json
- [ ] T004 [P] Install and configure Storybook 8 for React in web/.storybook/main.ts
- [ ] T005 [P] Install react-native-reanimated and expo-haptics in mobile/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens, accessibility infrastructure, and shared hooks that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Design Tokens

- [ ] T006 Define CEFR color scheme (A1/A2 hue family, B1/B2 hue family, C1/C2 hue family) and feedback colors (success, error, warning, info) in web/src/design-tokens/colors.ts
- [ ] T007 [P] Define spacing scale (4px base unit, 8-step scale) in web/src/design-tokens/spacing.ts
- [ ] T008 [P] Define typography tokens (font families, size scale, weights, line heights) in web/src/design-tokens/typography.ts
- [ ] T009 [P] Create barrel export for all design tokens in web/src/design-tokens/index.ts
- [ ] T010 Extend tailwind.config.ts with design tokens from web/src/design-tokens/ (colors, spacing, typography, border radii)
- [ ] T010a [P] Verify all typography and spacing tokens use relative units (rem/em) instead of fixed px values to support system font scaling up to 200% in web/src/design-tokens/typography.ts and web/src/design-tokens/spacing.ts
- [ ] T011 [P] Create React Native design token adaptation in mobile/src/theme/tokens.ts mapping web tokens to StyleSheet values

### Accessibility Infrastructure

- [ ] T012 Create focus-visible styles, high-contrast overrides, and skip-to-content link in web/src/styles/accessibility.css
- [ ] T013 [P] Create useReducedMotion hook that reads prefers-reduced-motion media query in web/src/hooks/useReducedMotion.ts
- [ ] T014 [P] Create base axe-core WCAG 2.1 AA audit test suite that can run against any rendered component in web/tests/accessibility/wcag-audit.test.ts

### Shared Hooks

- [ ] T015 [P] Create useAutoSave hook for persisting exercise progress on each answer in web/src/hooks/useAutoSave.ts
- [ ] T016 [P] Create useAutoSave hook (React Native version) in mobile/src/hooks/useAutoSave.ts
- [ ] T017 [P] Create useHapticFeedback hook for supplementary haptic on correct/incorrect/button press in mobile/src/hooks/useHapticFeedback.ts

### Database Migration (Onboarding State)

- [ ] T018a Create Supabase migration adding onboarding_completed (BOOLEAN DEFAULT FALSE) and onboarding_tooltips_seen (JSONB DEFAULT '{}') columns to user_profiles table in supabase/migrations/

### UI Glossary

- [ ] T018 Populate UI glossary with canonical Spanish terms and prohibited synonyms (leccion/clase, ejercicio/actividad, puntuacion/nota, etc.) in web/src/i18n/glossary.json

**Checkpoint**: Foundation ready — design tokens, accessibility infra, and shared hooks available. Verify axe-core audit runs successfully on an empty test page.

---

## Phase 3: User Story 1 — Consistent Design System Across All Modules (Priority: P1) MVP

**Goal**: Unified visual components used identically across all 7 learning modules

**Independent Test**: Navigate across vocabulary, grammar, conversation, writing, pronunciation, listening, and cultural modules verifying shared elements are identical

### Implementation

- [ ] T019 Redesign Button component with Radix primitives, design tokens, consistent sizing (44px min touch target), and pressed/active states in web/src/components/common/Button.tsx
- [ ] T020 [P] Redesign Card component with progressive disclosure support (expandable detail section) using design tokens in web/src/components/common/Card.tsx
- [ ] T021 [P] Redesign ProgressBar component with CEFR color coding from design tokens in web/src/components/common/ProgressBar.tsx
- [ ] T022 [P] Redesign AudioPlayer component with consistent play/pause, speed controls, and progress scrubber using design tokens in web/src/components/common/AudioPlayer.tsx
- [ ] T023 [P] Redesign LoadingState component with skeleton UI and estimated duration display in web/src/components/common/LoadingState.tsx
- [ ] T024 [P] Redesign ErrorState component with constructive Spanish messaging and retry action in web/src/components/common/ErrorState.tsx
- [ ] T025 [P] Create EmptyState component with illustrated empty states and suggested action in web/src/components/common/EmptyState.tsx
- [ ] T026 Create Storybook stories for all common components (Button, Card, ProgressBar, AudioPlayer, LoadingState, ErrorState, EmptyState) showing all states in web/.storybook/
- [ ] T027 [P] Mirror all common components for React Native in mobile/src/components/common/ (Button, Card, ProgressBar, AudioPlayer, LoadingState, ErrorState, EmptyState)
- [ ] T028 Update all existing module pages (vocabulary, grammar, conversation, writing, pronunciation, listening, cultural) to use redesigned common components — ensure identical visual treatment in web/src/pages/
- [ ] T029 [P] Update all mobile module screens to use redesigned common components in mobile/src/screens/

**Checkpoint**: Design system MVP complete. Visual audit: navigate all 7 modules confirming consistent button, card, progress, and audio components. Verify >=80% test coverage on common components.

---

## Phase 4: User Story 2 — Cognitive Load Management (Priority: P2)

**Goal**: One-item-at-a-time exercise presentation, session length defaults, progressive disclosure, Miller's Law compliance

**Independent Test**: Start a vocabulary session, verify one-card-at-a-time with progressive disclosure and <=7 interactive elements

### Implementation

- [ ] T030 [US2] Refactor vocabulary flashcard flow to single-card presentation with tap-to-reveal progressive disclosure in web/src/components/vocabulary/Flashcard.tsx
- [ ] T031 [P] [US2] Refactor grammar exercise flow to single-question presentation with minimal progress indicator ("3 of 10") in web/src/pages/GrammarLesson.tsx
- [ ] T032 [US2] Add session length setting (default 10-20 items, user-adjustable) to vocabulary and grammar session pages in web/src/pages/VocabularyReview.tsx and web/src/pages/GrammarLesson.tsx
- [ ] T033 [P] [US2] Implement progressive disclosure for grammar rule explanations: concise summary + expandable detail using Radix Accordion in web/src/components/grammar/RuleExplanation.tsx
- [ ] T034 [P] [US2] Implement progressive disclosure for pronunciation results: overall score first, expandable phoneme details in web/src/components/pronunciation/EvaluationResult.tsx
- [ ] T035 [US2] Audit all exercise screens for Miller's Law compliance (<=7 interactive elements) and refactor any violations in web/src/pages/
- [ ] T036 [P] [US2] Apply cognitive load changes to mobile screens in mobile/src/screens/

**Checkpoint**: Cognitive load management complete. Verify single-item presentation, session length controls, and <=7 interactive elements on all exercise screens.

---

## Phase 5: User Story 3 — Immediate Constructive Feedback (Priority: P3)

**Goal**: 100ms visual feedback, constructive error messaging, live audio indicator, loading states with estimates

**Independent Test**: Answer questions correctly and incorrectly, verify feedback timing and tone; record audio and verify waveform

### Implementation

- [ ] T037 [US3] Create FeedbackToast component: correct (green checkmark, brief animation) and incorrect (orange highlight, correct answer, Spanish explanation) with 100ms render target in web/src/components/common/FeedbackToast.tsx
- [ ] T038 [P] [US3] Create WaveformMeter component displaying live audio level during recording in web/src/components/common/WaveformMeter.tsx
- [ ] T039 [US3] Update LoadingState to show estimated duration for AI operations >2s and update estimate every 10s for operations >10s in web/src/components/common/LoadingState.tsx
- [ ] T040 [US3] Integrate FeedbackToast into vocabulary review (correct/incorrect card ratings) in web/src/pages/VocabularyReview.tsx
- [ ] T041 [P] [US3] Integrate FeedbackToast into grammar exercises (correct/incorrect answers) in web/src/pages/GrammarLesson.tsx
- [ ] T042 [US3] Integrate WaveformMeter into pronunciation recording flow in web/src/pages/Pronunciation.tsx
- [ ] T043 [US3] Add pressed/active states (50ms visual touch feedback) to all interactive elements via Tailwind active: variants in web/src/components/common/Button.tsx and web/src/styles/accessibility.css
- [ ] T044 [P] [US3] Mirror feedback components and integrations for mobile in mobile/src/components/common/ and mobile/src/screens/

**Checkpoint**: Feedback system complete. Verify 100ms visual feedback on answer submission, constructive Spanish error messages, live waveform during recording.

---

## Phase 6: User Story 4 — Error Prevention (Priority: P4)

**Goal**: Accent toolbar, constrained input, auto-save, destructive action confirmation, inline validation

**Independent Test**: Type accented characters via toolbar, navigate away mid-exercise and confirm auto-save, trigger destructive action and confirm dialog

### Implementation

- [ ] T045 [US4] Create AccentToolbar component with French accented characters (e, e, e, e, c, a, u, i, o) insertable into the active text input in web/src/components/common/AccentToolbar.tsx
- [ ] T046 [P] [US4] Create ConfirmDialog component using Radix Dialog for destructive actions (abandon session, reset progress, delete recording) in web/src/components/common/ConfirmDialog.tsx
- [ ] T047 [US4] Integrate useAutoSave into all exercise pages (vocabulary review, grammar exercises, writing editor) to persist progress on each completed answer in web/src/pages/
- [ ] T048 [P] [US4] Refactor fill-in-the-blank grammar exercises to use constrained input (Radix Select or autocomplete) instead of free-text where answer set is finite in web/src/components/grammar/FillBlank.tsx
- [ ] T049 [US4] Integrate AccentToolbar into writing editor and all free-text French input fields in web/src/pages/Writing.tsx and web/src/components/grammar/
- [ ] T050 [US4] Integrate ConfirmDialog into session abandon, progress reset, and recording delete flows in web/src/pages/
- [ ] T051 [P] [US4] Mirror error prevention components and integrations for mobile in mobile/src/components/common/ and mobile/src/screens/

**Checkpoint**: Error prevention complete. Verify accent input works, auto-save preserves progress, destructive actions require confirmation.

---

## Phase 7: User Story 5 — Accessible and Inclusive Design (Priority: P5)

**Goal**: WCAG 2.1 AA compliance, 44px touch targets, screen reader support, language tags, reduced motion, font scaling

**Independent Test**: Run axe-core audit with zero critical violations; navigate vocabulary review with screen reader; test at 200% font size

### Implementation

- [ ] T052 [US5] Add lang="fr" attributes to all French-language content elements and lang="es" to Spanish elements across all components in web/src/components/
- [ ] T053 [P] [US5] Ensure all interactive elements meet 44x44px touch target minimum on mobile and 24x24px on desktop across all common components in web/src/components/common/
- [ ] T054 [US5] Add ARIA roles, labels, and live regions to vocabulary flashcard (announce French word, translation, example in correct order) in web/src/components/vocabulary/Flashcard.tsx
- [ ] T055 [P] [US5] Add icon and text label supplements to all color-only indicators (correct/incorrect feedback, CEFR level badges, mastery percentages) in web/src/components/
- [ ] T056 [US5] Integrate useReducedMotion hook into all animated components (FeedbackToast, CoachMark, page transitions) to suppress/simplify animations when enabled in web/src/components/
- [ ] T057 [US5] Test and fix responsive layout at 150% and 200% system font sizes across all core learning flows (vocabulary, grammar, writing) in web/src/
- [ ] T058 [US5] Ensure all listening exercise audio has transcript toggle available alongside the audio player in web/src/pages/Listening.tsx
- [ ] T059 [US5] Run full axe-core WCAG 2.1 AA audit on all learner-facing pages and fix all critical and serious violations in web/tests/accessibility/
- [ ] T060 [P] [US5] Apply accessibility improvements to mobile (touch targets, screen reader labels, reduced motion) in mobile/src/

**Checkpoint**: Accessibility complete. Zero critical/serious axe-core violations. Screen reader navigation works for vocabulary review. Layout functional at 200% font size.

---

## Phase 8: User Story 6 — Guided Onboarding (Priority: P6)

**Goal**: Step-by-step onboarding flow, contextual tooltips on first use, single primary CTA on dashboard

**Independent Test**: Create new account, complete onboarding, verify one concept per step, skip works, dashboard shows primary CTA

### Implementation

- [ ] T061 [US6] Create useOnboarding hook managing onboarding state (steps seen, tooltips dismissed) synced to user_profiles.onboarding_tooltips_seen via API in web/src/hooks/useOnboarding.ts
- [ ] T062 [US6] Create CoachMark component using Radix Tooltip for contextual first-use tooltips with pointer to target element in web/src/components/common/CoachMark.tsx
- [ ] T063 [US6] Create OnboardingFlow page: 4-6 steps (select language, CEFR overview, first flashcard, first audio), each introducing one concept, with skip option and progress dots in web/src/pages/Onboarding.tsx
- [ ] T064 [US6] Update post-onboarding dashboard to show single primary CTA ("Empieza tu primera leccion") visually dominant via design tokens in web/src/pages/Dashboard.tsx
- [ ] T065 [US6] Add contextual CoachMarks to first-use interactions: first pronunciation recording (point to record button), first writing submission (point to submit), first vocabulary review (point to difficulty rating) in web/src/pages/
- [ ] T066 [US6] Ensure returning users see no onboarding tooltips (useOnboarding checks persisted state) in web/src/hooks/useOnboarding.ts
- [ ] T067 [P] [US6] Create mobile onboarding flow and CoachMark integration in mobile/src/screens/Onboarding.tsx and mobile/src/hooks/useOnboarding.ts

**Checkpoint**: Onboarding complete. New user sees step-by-step flow, tooltips on first use, primary CTA on dashboard. Returning users see none of this.

---

## Phase 9: Polish & Cross-Cutting

**Purpose**: Documentation, visual regression, and final validation

- [ ] T068 Create Storybook stories for all new components (AccentToolbar, ConfirmDialog, CoachMark, FeedbackToast, WaveformMeter, EmptyState) showing all states in web/.storybook/
- [ ] T069 [P] Run visual regression test across all Storybook stories to establish baseline snapshots
- [ ] T070 [P] Verify UI glossary compliance: search all user-facing strings for prohibited synonyms from glossary.json
- [ ] T071 [P] Run full accessibility audit on mobile app (screen reader navigation, touch targets, contrast)
- [ ] T072 Verify all edge cases from spec: screen reader + recording, >30s AI wait, font size >200%, <320px screen, no haptic support, logical CSS properties for RTL-readiness

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — design tokens and hooks must exist. **This is the MVP.**
- **US2-US6 (Phases 4-8)**: Depend on US1 (use redesigned common components)
  - US2, US3, US4 can proceed in parallel after US1
  - US5 should run after US3 (feedback components need accessibility pass)
  - US6 depends on dashboard existing (US1+)
- **Polish (Phase 9)**: Depends on all stories complete

### User Story Dependencies

- **US1 (Design System)**: Foundational only. **MVP.**
- **US2 (Cognitive Load)**: US1 (uses redesigned components)
- **US3 (Feedback)**: US1 (FeedbackToast uses design tokens)
- **US4 (Error Prevention)**: US1 (AccentToolbar, ConfirmDialog use design system)
- **US5 (Accessibility)**: US1 + US3 (audits all components including feedback)
- **US6 (Onboarding)**: US1 (dashboard must exist with design system)

### Parallel Opportunities

- **Phase 2**: T007, T008, T009, T011, T013, T014, T015, T016, T017 (all different files)
- **Phase 3**: T020-T025, T027 (all different component files)
- **After US1**: US2 + US3 + US4 can start simultaneously
- **Within each story**: Mobile tasks are always parallelizable with web

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (install dependencies)
2. Complete Phase 2: Foundational (tokens, hooks, accessibility infra)
3. Complete Phase 3: US1 (design system components)
4. **STOP and VALIDATE**: Visual audit across all 7 modules
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational -> Design tokens available
2. US1 (Design System) -> Visual audit -> Deploy (MVP!)
3. US2 + US3 + US4 in parallel -> Test each -> Deploy
4. US5 (Accessibility) -> Full WCAG audit -> Deploy
5. US6 (Onboarding) -> New user test -> Deploy
6. Phase 9: Polish -> Final validation

---

## Metrics

- **Total tasks**: 74
- **Setup**: 5 tasks
- **Foundational**: 15 tasks (includes migration T018a and relative units verification T010a)
- **User Stories**: 49 tasks (US1: 11, US2: 7, US3: 8, US4: 7, US5: 9, US6: 7)
- **Polish**: 5 tasks
- **Parallelizable tasks**: 33 (marked [P])
- **New components**: 7 (EmptyState, AccentToolbar, ConfirmDialog, CoachMark, FeedbackToast, WaveformMeter, RuleExplanation)
- **Redesigned components**: 6 (Button, Card, ProgressBar, AudioPlayer, LoadingState, ErrorState)
- **New hooks**: 5 (useReducedMotion, useAutoSave ×2, useOnboarding, useHapticFeedback)
- **Testing policy**: Inline with each task; >=80% coverage; axe-core for WCAG audits
