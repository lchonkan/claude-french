<!--
Sync Impact Report
===================
Version change: N/A (template) -> 1.0.0
Modified principles: N/A (initial creation)
Added sections:
  - Principle I: Code Quality
  - Principle II: Testing Standards
  - Principle III: User Experience Consistency
  - Principle IV: Performance Requirements
  - Section: Development Workflow
  - Section: Quality Gates
  - Governance rules
Removed sections: None
Templates requiring updates:
  - .specify/templates/plan-template.md: Constitution Check section
    references generic gates - aligns with principles. No update needed.
  - .specify/templates/spec-template.md: Success Criteria section
    supports measurable outcomes aligned with UX/perf principles.
    No update needed.
  - .specify/templates/tasks-template.md: Test phases and polish phase
    align with testing and quality principles. No update needed.
Follow-up TODOs: None
-->

# French Learning Platform Constitution

## Core Principles

### I. Code Quality

All production code MUST be clean, readable, and maintainable.

- Every module, function, and component MUST have a single,
  clear responsibility.
- Code MUST follow consistent naming conventions and formatting
  rules enforced by automated linting and formatting tools.
- Functions MUST be small and focused. If a function exceeds
  40 lines, it MUST be decomposed unless decomposition would
  reduce clarity.
- Dead code, unused imports, and commented-out code MUST NOT
  exist in the codebase. Remove rather than comment out.
- Dependencies MUST be explicitly declared and version-pinned.
  No implicit or transitive dependency reliance.
- All warnings from linters and type checkers MUST be resolved
  before merging. Zero-warning policy is non-negotiable.

**Rationale**: A French learning application will grow in
complexity as vocabulary, grammar rules, and lesson content
expand. Strict code quality prevents technical debt from
compounding as the feature set scales.

### II. Testing Standards

All features MUST be verified by automated tests before
they are considered complete.

- Unit tests MUST cover all business logic, including lesson
  generation, answer validation, scoring, and progress
  tracking.
- Integration tests MUST verify interactions between modules
  (e.g., user input processing through scoring to progress
  update).
- Test coverage for new code MUST meet or exceed 80% line
  coverage. Critical paths (answer evaluation, progress
  persistence) MUST have 100% coverage.
- Tests MUST be deterministic: no flaky tests, no reliance
  on network calls or external services without mocking.
- Test names MUST clearly describe the scenario being tested
  using the pattern: `test_<unit>_<scenario>_<expected>`.
- Regression tests MUST be added for every bug fix to prevent
  recurrence.

**Rationale**: Language learning correctness is paramount.
Incorrect answer validation or lost progress directly damages
user trust and learning outcomes.

### III. User Experience Consistency

The application MUST deliver a uniform, predictable, and
accessible experience across all interactions.

- All user-facing text MUST use consistent terminology. A
  glossary of UI terms MUST be maintained and referenced.
- Error messages MUST be user-friendly, actionable, and
  written in the user's interface language (not developer
  jargon).
- Navigation patterns and interaction flows MUST be uniform
  across all lesson types and features.
- Loading states, empty states, and error states MUST be
  explicitly designed for every user-facing view.
- Accessibility MUST be considered from the start: semantic
  markup, keyboard navigation, and sufficient color contrast
  are required for all UI components.
- French language content (vocabulary, sentences, grammar
  explanations) MUST be reviewed for accuracy. Incorrect
  language content MUST be treated as a P0 bug.

**Rationale**: Learners build habits around interface
patterns. Inconsistency breaks flow and increases cognitive
load, directly hindering the learning experience.

### IV. Performance Requirements

The application MUST remain responsive and efficient under
normal usage conditions.

- UI interactions MUST respond within 100ms. Any operation
  exceeding 200ms MUST display a loading indicator.
- Page/screen transitions MUST complete within 300ms.
- Lesson content and vocabulary data MUST load within 500ms
  on a standard connection.
- Memory usage MUST remain stable during extended sessions
  (no memory leaks). A 30-minute session MUST NOT increase
  baseline memory by more than 20%.
- Bundle size (if web-based) or app size MUST be monitored.
  Increases exceeding 10% MUST be justified and approved.
- Database queries and data operations MUST be profiled.
  Any single operation exceeding 100ms MUST be optimized
  or explicitly justified.

**Rationale**: Language learning sessions require sustained
focus. Performance issues break concentration and discourage
regular practice, which is the single most important factor
in language acquisition.

## Development Workflow

- All changes MUST be made on feature branches and merged
  via pull request.
- Every pull request MUST pass all automated checks (lint,
  format, type check, tests) before merge.
- Code reviews MUST verify compliance with all four core
  principles, not just functional correctness.
- Commit messages MUST be descriptive and follow conventional
  commit format (e.g., `feat:`, `fix:`, `test:`, `docs:`).
- Features MUST be developed incrementally: working MVP first,
  then iterate. Avoid large, monolithic changes.

## Quality Gates

All pull requests MUST pass the following gates before merge:

| Gate | Requirement | Automated |
|------|------------|-----------|
| Lint | Zero warnings | Yes |
| Format | All files formatted | Yes |
| Type Check | No type errors | Yes |
| Unit Tests | All pass, coverage >= 80% | Yes |
| Integration Tests | All pass | Yes |
| Performance | No regression beyond thresholds | Yes |
| Content Accuracy | French content reviewed | Manual |
| UX Consistency | Follows established patterns | Manual |

## Governance

This constitution is the authoritative source for development
standards in the French Learning Platform project. It supersedes informal
conventions and ad-hoc decisions.

- Amendments MUST be documented with rationale and applied via
  a versioned update to this file.
- Any principle change MUST include a migration plan for
  existing code that does not comply.
- Compliance with these principles MUST be verified during
  code review. Reviewers MUST reference specific principle
  numbers when requesting changes.
- Exceptions to any principle MUST be documented inline with
  justification and tracked for future resolution.
- Version increments follow semantic versioning: MAJOR for
  principle removals or incompatible redefinitions, MINOR for
  new principles or material expansions, PATCH for
  clarifications and wording fixes.

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
