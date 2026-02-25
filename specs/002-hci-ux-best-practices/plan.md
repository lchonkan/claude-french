# Implementation Plan: HCI Best Practices for French Learning Platform

**Branch**: `002-hci-ux-best-practices` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-hci-ux-best-practices/spec.md`
**Depends on**: `001-hybrid-ai-french-learning` (base platform tech stack and project structure)
**Merge Strategy**: Branch `002-hci-ux-best-practices` MUST be rebased onto
`001-hybrid-ai-french-learning` before implementation begins, ensuring all
base platform components (web/, mobile/, supabase/, tailwind.config.ts) are
available. Resolve any conflicts in favor of feature 001's structure.

## Summary

Apply Human-Computer Interaction best practices across the French learning
platform's user interface. This feature defines a shared design system
(tokens, components, patterns), cognitive load management strategies,
feedback patterns, error prevention mechanisms, WCAG 2.1 AA accessibility
compliance, and a guided onboarding flow. All work is frontend-focused,
extending the existing React (web) and React Native (mobile) applications
from feature 001. No new backend services are required; onboarding state
is tracked in the existing user_profiles table.

## Technical Context

**Language/Version**: TypeScript 5.x (frontend only — no backend changes)
**Primary Dependencies**:
- Web: React 19, Tailwind CSS (design tokens via tailwind.config.ts),
  Radix UI Primitives (accessible base components), Framer Motion
  (animation with reduced-motion support), react-intl (i18n)
- Mobile: React Native (Expo SDK 52), react-native-reanimated (animation),
  expo-haptics (supplementary feedback)
- Shared: Storybook 8 (component documentation and visual testing)
- Testing: axe-core (automated WCAG audits), Vitest (web), Jest (mobile)
**Storage**: No new database tables. Onboarding state stored in
  user_profiles.onboarding_completed (BOOLEAN) and
  user_profiles.onboarding_tooltips_seen (JSONB) via existing Supabase.
  **Requires migration**: These two columns must be added to user_profiles
  via a Supabase migration (see tasks.md T018a).
**Testing**: Vitest + @testing-library/react (web), Jest + @testing-library/react-native (mobile), axe-core (accessibility), Storybook visual regression
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge), iOS 16+, Android 13+
**Project Type**: Frontend design system + UX patterns (cross-cutting)
**Performance Goals**: 100ms interaction feedback, 300ms page transitions, 50ms touch feedback
**Constraints**: WCAG 2.1 AA compliance, 44x44px minimum touch targets, support system font scaling to 200%, reduced-motion preference respect
**Scale/Scope**: 7 learning modules, ~30 shared components, ~15 design tokens, 6 onboarding steps, 1 UI glossary

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | Single responsibility per component; Tailwind tokens defined once in config; linting enforced; no dead code | PASS |
| II. Testing Standards | Vitest/Jest for component tests; axe-core for accessibility; Storybook visual regression; >=80% coverage on shared components | PASS |
| III. UX Consistency | This feature IS the UX consistency implementation — design system, glossary, shared components, loading/empty/error states | PASS |
| IV. Performance | 100ms feedback latency target; animation budgets; reduced-motion support; bundle size monitoring for new dependencies | PASS |

All gates pass.

## Research Decisions

### 1. Design Token System

**Decision**: Tailwind CSS theme extension via `tailwind.config.ts`

**Rationale**: Feature 001 already uses Tailwind CSS. Extending the theme
config with custom design tokens (CEFR colors, spacing scale, typography,
border radii) provides a single source of truth consumed by all components.
No additional dependency needed.

**Alternatives considered**:
- Style Dictionary: Generates platform-specific tokens but adds build
  complexity for a project already using Tailwind.
- CSS custom properties only: Less type-safe, no autocomplete in editors.

### 2. Accessible Component Primitives

**Decision**: Radix UI Primitives (headless, unstyled)

**Rationale**: Radix provides WAI-ARIA compliant primitives (Dialog,
Tooltip, Select, Accordion, Toggle) with keyboard navigation, focus
management, and screen reader support built in. Components are unstyled,
so Tailwind CSS classes apply directly. This avoids building accessibility
from scratch for every component.

**Alternatives considered**:
- Headless UI: Fewer primitives (no Tooltip, Accordion).
- React Aria (Adobe): More verbose API; heavier bundle for the same
  functionality.
- Custom from scratch: High risk of accessibility bugs; not justified
  when proven libraries exist.

### 3. Animation with Reduced-Motion Support

**Decision**: Framer Motion (web), react-native-reanimated (mobile)

**Rationale**: Framer Motion respects `prefers-reduced-motion` via its
`useReducedMotion()` hook and provides declarative animation with exit
animations for page transitions. React Native Reanimated is the standard
for performant native animations with Expo.

**Alternatives considered**:
- CSS transitions only: Insufficient for coordinated multi-element
  animations (onboarding coach marks, XP award animations).
- React Spring: Less active maintenance; fewer Expo-compatible examples.

### 4. Accessibility Testing

**Decision**: axe-core (automated) + manual screen reader testing

**Rationale**: axe-core integrates with Vitest/Jest for CI-automated
WCAG 2.1 AA audits. Manual testing with VoiceOver (iOS/macOS) and
TalkBack (Android) covers dynamic content that automated tools miss
(e.g., screen reader announcement order for flashcards).

### 5. Onboarding Approach

**Decision**: Custom implementation using Radix Tooltip + local state

**Rationale**: Onboarding coach marks are contextual tooltips pointing
to specific UI elements. Radix Tooltip provides accessible, positioned
tooltips. Onboarding state (which steps/tooltips seen) is tracked per
user in `user_profiles.onboarding_tooltips_seen` (JSONB). No third-party
onboarding library needed — the requirements are simple enough for a
custom solution with fewer dependencies.

**Alternatives considered**:
- Shepherd.js / Intro.js: Adds 15-30KB; not React Native compatible.
- React Joyride: Web-only; would need a separate mobile solution.

### 6. Component Documentation

**Decision**: Storybook 8

**Rationale**: Storybook provides isolated component development,
visual regression testing, and a living design system reference.
Supports React and React Native (via @storybook/react-native).
Enables verification of all component states (loading, empty, error,
active, disabled) required by Constitution Principle III.

## Project Structure

### Documentation (this feature)

```text
specs/002-hci-ux-best-practices/
├── plan.md              # This file
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Quality checklist
└── tasks.md             # Task breakdown
```

### Source Code (modifications to existing feature 001 structure)

```text
web/
├── .storybook/                    # Storybook config
│   └── main.ts
├── src/
│   ├── design-tokens/             # NEW: Design token definitions
│   │   ├── colors.ts              # CEFR color scheme, feedback colors
│   │   ├── spacing.ts             # Spacing scale
│   │   ├── typography.ts          # Font sizes, weights, line heights
│   │   └── index.ts               # Barrel export
│   ├── components/
│   │   ├── common/                # MODIFIED: Extend with accessible primitives
│   │   │   ├── Button.tsx         # Redesigned with Radix, touch targets
│   │   │   ├── Card.tsx           # Progressive disclosure support
│   │   │   ├── ProgressBar.tsx    # CEFR color-coded
│   │   │   ├── AudioPlayer.tsx    # Consistent across modules
│   │   │   ├── LoadingState.tsx   # Skeleton + estimated duration
│   │   │   ├── ErrorState.tsx     # Constructive tone, retry action
│   │   │   ├── EmptyState.tsx     # NEW: Illustrated empty states
│   │   │   ├── AccentToolbar.tsx  # NEW: French accent input assistant
│   │   │   ├── ConfirmDialog.tsx  # NEW: Destructive action confirmation
│   │   │   ├── CoachMark.tsx      # NEW: Onboarding tooltip
│   │   │   ├── FeedbackToast.tsx  # NEW: Correct/incorrect animation
│   │   │   └── WaveformMeter.tsx  # NEW: Live audio level indicator
│   │   └── [module]/              # Module components updated for consistency
│   ├── hooks/
│   │   ├── useReducedMotion.ts    # NEW: Respects prefers-reduced-motion
│   │   ├── useAutoSave.ts         # NEW: Exercise progress auto-save
│   │   └── useOnboarding.ts      # NEW: Onboarding state management
│   ├── i18n/
│   │   └── glossary.json          # MODIFIED: Canonical UI terms with synonyms
│   └── styles/
│       └── accessibility.css      # NEW: Focus-visible, contrast overrides
├── tailwind.config.ts             # MODIFIED: Extended with design tokens
└── tests/
    └── accessibility/             # NEW: axe-core audit tests
        └── wcag-audit.test.ts

mobile/
├── src/
│   ├── components/
│   │   └── common/                # Mirror web common components for RN
│   ├── hooks/
│   │   ├── useHapticFeedback.ts   # NEW: Supplementary haptic feedback
│   │   ├── useAutoSave.ts         # NEW: Exercise progress auto-save (RN)
│   │   └── useOnboarding.ts      # NEW: Onboarding state management (RN)
│   └── theme/
│       └── tokens.ts              # NEW: Design tokens adapted for RN
└── tests/
    └── accessibility/
```

**Structure Decision**: This feature adds to the existing web/ and mobile/
directories from feature 001. No new services, no new backend code. All
changes are in the frontend layer: design tokens, shared components,
hooks, and Storybook configuration. The design token definitions in
`web/src/design-tokens/` serve as the single source of truth, with
`mobile/src/theme/tokens.ts` adapting them for React Native's StyleSheet.

## Complexity Tracking

No constitution violations. All changes follow single responsibility
(one component per file, one hook per concern). The addition of Radix UI,
Framer Motion, and Storybook dependencies is justified by the accessibility
and documentation requirements that cannot be met with simpler alternatives.
