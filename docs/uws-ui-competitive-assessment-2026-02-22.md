# UWS UI Competitive Assessment (2026-02-22)

## Objective
Compare current UWS extension UI quality with our target and define where we should stay similar vs where we should improve.

## Realistic Baseline
- UWS current UI quality: **strong** (roughly 8/10 for power users).
- Our current repo UI state: **implemented and smoke-verified** (parity shell + tool cards + welcome flows + cloud/test panels wired).
- Practical strategy:
  1) Match familiar layout first (parity confidence).
  2) Improve usability and clarity second (premium differentiation).

## What UWS Does Well
1) Clear product identity (dark visual language, consistent branding).
2) Strong data-table-first feel for serious workflows.
3) Core actions are visible (search/filter/export/images).
4) Tool modules and roadmap are discoverable in one hub.
5) Quick-start blocks lower friction for first runs.

## Where UWS Can Be Improved
1) Visual density is high; first-time users can feel overloaded.
2) Priority hierarchy is mixed (tooling + roadmap + onboarding in same attention layer).
3) Some text contrast/readability can be improved for long sessions.
4) Advanced settings can feel heavy without progressive disclosure.
5) Recovery UX can be more explicit (what failed + one-click fix path).

## Our UX Direction (Similar + Better)
1) Keep familiar frame
- Left/center data-table focus.
- Right contextual extraction panel.
- Familiar module-card structure.

2) Improve first-run friendliness
- Guided mode by default, Pro mode toggle for advanced users.
- Cleaner step hierarchy and better defaults.
- Simpler onboarding copy with explicit "what happens next".

3) Improve operational clarity
- Better run status model (ETA, retries, bottleneck step).
- Clearer errors with direct action buttons.
- Quality score and field-completeness indicators pre-export.

4) Improve table ergonomics
- Stronger column actions (type, quality, dedupe hints).
- Faster bulk operations and mapping UX.
- Better row-level context actions.

5) Keep performance perception high
- Skeleton states over blocking spinners.
- Non-blocking background tasks.
- Immediate local feedback on extraction setup.

## UX Quality Targets
1) New user completes first extraction without confusion in one guided path.
2) Power user reaches extraction settings in minimal clicks.
3) Failure recovery path is explicit and quick.
4) Export path is linear and predictable across all formats.

## Build Rule
Do not reinvent layout too early.
Parity structure first, premium usability improvements second.
