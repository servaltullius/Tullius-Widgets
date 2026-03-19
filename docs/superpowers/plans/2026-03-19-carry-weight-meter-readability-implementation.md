# Carry Weight Meter Readability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the `바만` carry-weight mode so its fill level is easy to read without showing numeric values.

**Architecture:** Keep carry-weight mode selection in `HudWidgetItems`, but add optional meter-presentation controls to `StatWidget` for a darker track and endpoint marker. Limit behavior changes to the carry-weight `meterOnly` path so other widgets stay visually stable.

**Tech Stack:** React, TypeScript, Vitest

---

## Chunk 1: Meter-Only Readability

### Task 1: Lock the desired UI with tests

**Files:**
- Modify: `view/src/components/HudWidgetItems.test.tsx`

- [ ] **Step 1: Write the failing test**

Add expectations for the `meterOnly` carry-weight widget to require:
- a visible meter endpoint marker
- a distinct darker meter track style

- [ ] **Step 2: Run test to verify it fails**

Run: `cd view && npm test -- HudWidgetItems`
Expected: FAIL because the meter-only widget does not render the endpoint marker yet.

### Task 2: Implement the minimal presentation changes

**Files:**
- Modify: `view/src/components/HudWidgetItems.tsx`
- Modify: `view/src/components/StatWidget.tsx`

- [ ] **Step 3: Write minimal implementation**

Add optional meter presentation props to `StatWidget` and pass them only for carry-weight `meterOnly` rendering.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd view && npm test -- HudWidgetItems`
Expected: PASS

### Task 3: Verify no regressions

**Files:**
- Modify: `view/src/components/HudWidgetItems.test.tsx` (if expectation tuning is needed)

- [ ] **Step 5: Run focused verification**

Run: `cd view && npm run lint && npm test -- HudWidgetItems && npm run build`
Expected: all pass

- [ ] **Step 6: Run full verification**

Run: `cd view && npm test`
Expected: full suite passes

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-03-19-carry-weight-meter-readability-design.md \
  docs/superpowers/plans/2026-03-19-carry-weight-meter-readability-implementation.md \
  view/src/components/HudWidgetItems.tsx \
  view/src/components/StatWidget.tsx \
  view/src/components/HudWidgetItems.test.tsx
git commit -m "fix: improve carry weight meter readability"
```
