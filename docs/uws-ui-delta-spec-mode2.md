# UWS UI Delta Spec (Mode 2)

## Objective
Define exactly what stays one-to-one and what we intentionally improve.

## Principle
1) Preserve familiarity on core workflows.
2) Improve clarity, speed, and error recovery where users struggle.

## Keep One-to-One (Locked Similar)
1) Overall layout pattern
- Data-table-centric workspace
- Sidepanel with tool modules

2) Main navigation model
- menu/history/data/tools pattern

3) Core module set
- list, page details, email, image, text (+ roadmap cards)

4) Per-tool welcome/quick-start structure
- tutorial card
- 3-step quick-start block
- start CTA

5) Extraction setup mental model
- select URLs -> select fields/configure -> run -> export

## Improve Intentionally (Delta)
1) Visual hierarchy
- stronger spacing and section grouping
- clearer primary/secondary action contrast

2) Progressive disclosure
- guided mode default
- advanced controls collapsed until needed

3) Run feedback
- richer progress states and ETA indicators
- explicit retry reason and one-click fixes

4) Error UX
- actionable messages with context
- less dead-end modal behavior

5) Table ergonomics
- clearer column-level actions
- faster mapping and bulk edit affordances

6) Export flow
- unified export panel with schema preview and validation status

## Non-Goals
1) Full visual redesign in parity phase.
2) Changing core flow order that would break familiarity.

## Acceptance Criteria
1) Parity reviewers can map each UWS core action to the equivalent screen in our UI.
2) First-time users complete first extraction with fewer confusion points.
3) Power users can access advanced controls without extra friction.
