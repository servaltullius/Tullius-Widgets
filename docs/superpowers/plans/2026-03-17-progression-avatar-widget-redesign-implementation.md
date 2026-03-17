# Progression Avatar Widget Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the integrated progression widget into a Dororong-centered avatar medallion with an XP ring and one bottom line of level plus XP text, without changing the existing widget id or layout/editing model.

**Architecture:** Keep the current `experience.progress` data flow intact and concentrate the redesign inside `ExperienceWidget`. The implementation should replace the current horizontal medallion-plus-text layout with a compact vertical block, then update focused tests so the new visual contract is locked without reopening settings or migration work.

**Tech Stack:** React, TypeScript, existing `view/src` HUD component architecture, Vitest, npm lint/build pipeline

---

**Spec reference:** `docs/superpowers/specs/2026-03-17-progression-avatar-widget-redesign-design.md`

**Implementation context:** Use `/home/kdw73/Tullius Widgets/.worktrees/progression-avatar-widget` on branch `feat/progression-avatar-widget`.

## File Structure

### Existing files to modify

- `view/src/components/ExperienceWidget.tsx`
- `view/src/components/ExperienceWidget.test.tsx`
- `view/src/components/HudWidgetItems.test.tsx`

### Existing files to verify only if needed

- `view/src/components/HudWidgetItems.tsx`

### New files to create

- None expected. Keep the redesign inside the existing widget surface area.

## Chunk 1: Lock The New Widget Contract In Tests

### Task 1: Replace the old medallion assertions with avatar-style layout expectations

**Files:**
- Modify: `view/src/components/ExperienceWidget.test.tsx`
- Test: `view/src/components/HudWidgetItems.test.tsx`

- [ ] **Step 1: Rewrite the `ExperienceWidget` tests around the approved visual contract**

Add or update assertions for all of the following:

- the Dororong icon still renders inside the widget
- the progress ring still exposes `role="progressbar"`
- the center no longer renders the previous numeric badge treatment
- the visible content now contains a single bottom-line structure such as `레벨 57 · 123,456 / 987,654`
- the old standalone visible percent helper text is absent
- bad XP inputs still clamp `aria-valuenow` safely

Prefer DOM assertions that describe the public output rather than internal implementation details.

- [ ] **Step 2: Add a focused HUD integration assertion**

Update `view/src/components/HudWidgetItems.test.tsx` so it still proves:

- `experience.progress` renders through the canonical item id
- hiding `player.level` does not hide the integrated progression widget

Do not widen this into a full settings or layout test.

- [ ] **Step 3: Run the targeted widget tests and confirm failure**

Run:

```bash
cd view
npm test -- ExperienceWidget HudWidgetItems
```

Expected: FAIL because `ExperienceWidget` still renders the Stage 2 horizontal layout and level badge.

- [ ] **Step 4: Commit the failing-test checkpoint**

```bash
git add view/src/components/ExperienceWidget.test.tsx view/src/components/HudWidgetItems.test.tsx
git commit -m "test: define avatar progression widget contract"
```

## Chunk 2: Implement The Avatar Medallion Redesign

### Task 2: Rewrite `ExperienceWidget` into the approved vertical avatar layout

**Files:**
- Modify: `view/src/components/ExperienceWidget.tsx`
- Test: `view/src/components/ExperienceWidget.test.tsx`

- [ ] **Step 1: Replace the horizontal text-row composition with a centered vertical block**

Implementation requirements:

- keep the existing props and `visible` short-circuit behavior
- keep the progress ring driven by a clamped percent from `currentXp / totalXp`
- keep the Dororong icon centered and larger than the current Stage 2 presentation
- remove the bottom-right numeric level badge entirely
- move the numeric readout below the medallion
- render the bottom line as `레벨 {level} · {currentXp} / {totalXp}`
- remove the visible percent helper line from the widget body
- preserve tooltip detail for precise XP wording

Do not route the widget back through `StatWidget`.

- [ ] **Step 2: Keep styling compact and resize-friendly**

While implementing, ensure:

- the medallion stays visually dominant
- the text line remains centered under it
- the widget footprint stays compact enough for existing saved positions
- the ring remains easy to verify in tests

- [ ] **Step 3: Re-run the targeted widget tests**

Run:

```bash
cd view
npm test -- ExperienceWidget HudWidgetItems
```

Expected: PASS

- [ ] **Step 4: Commit the widget redesign**

```bash
git add view/src/components/ExperienceWidget.tsx view/src/components/ExperienceWidget.test.tsx view/src/components/HudWidgetItems.test.tsx
git commit -m "feat: redesign progression widget as avatar medallion"
```

## Chunk 3: Full Verification And Cleanup

### Task 3: Verify the redesign against the existing frontend pipeline

**Files:**
- Verify only: `view/src/components/HudWidgetItems.tsx`
- Verify only: `view/src/components/ExperienceWidget.tsx`

- [ ] **Step 1: Run lint**

Run:

```bash
cd view
npm run lint
```

Expected: PASS

- [ ] **Step 2: Run the full test suite**

Run:

```bash
cd view
npm test
```

Expected: PASS

- [ ] **Step 3: Run the production build**

Run:

```bash
cd view
npm run build
```

Expected: PASS

- [ ] **Step 4: Commit any final expectation or polish adjustments**

```bash
git add view/src/components/ExperienceWidget.tsx view/src/components/ExperienceWidget.test.tsx view/src/components/HudWidgetItems.test.tsx
git commit -m "test: verify avatar progression widget redesign"
```

Only create this commit if verification required a real code or test adjustment. If verification is already clean after Task 2, skip this commit.
