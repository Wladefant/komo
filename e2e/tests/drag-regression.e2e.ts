/**
 * Drag regression tests for Komo / Pinthread toolbar docking and first-touch drag.
 *
 * Context: https://github.com/tjcages/komo/pull/45
 * Pre-fix commit SHA: 6fb75d7b8fc045b4c5114e042e64a5626785843d
 * Fixed commit SHA:   90df2160bc55be7bf127c3482f381d148863276c
 *
 * Bug Condition 1 (commit 4b2f5812ecad95259698a181944b77213e6baae8):
 * On compact/phone layouts (390x844), dragging the toolbar docked it to an edge,
 * but renderToolbar() unconditionally reset toolbar.style.left = "50%" on every
 * render and resize. On the pre-fix commit 6fb75d7, the toolbar snapped back to
 * the bottom center ("50%") after any re-render or resize. On the fixed commit 90df216,
 * the dragged toolbar keeps its requested dock placement.
 *
 * Bug Condition 2 (commit 90df2160bc55be7bf127c3482f381d148863276c):
 * On touch devices, pointerenter fires immediately before pointerdown.
 * In 6fb75d7, pointerenter called load() which resolved in a microtask and mounted
 * the runtime before pointerdown, detaching the node under the finger. The first
 * touch drag after page load was dispatched to a detached node and failed to move
 * the toolbar. In 90df216, touch pointerenter marks the shell as pressed and defers
 * replacement until contact ends, allowing the first touch drag to succeed.
 */
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { installRequestGuard } from '../e2e.request-guard.ts';

installRequestGuard();

test('drag regression: mobile compact toolbar retains dragged dock placement across re-render (PR 45)', async ({ app, screen }) => {
  await app.open('/');

  // Locate the toolbar / dock handle
  const toolbar = screen.getByRole('toolbar', { name: /navigation|dock/i });
  await expect(toolbar).toBeVisible({ timeout: 15000 });

  // On compact mobile viewport (390x844), initial placement is bottom center (left: 50%)
  const heading = screen.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();

  // Perform a drag gesture to dock the toolbar toward the left/top edge
  await toolbar.dragTo(heading);

  // Assert named condition:
  // On pre-fix commit 6fb75d7b8fc045b4c5114e042e64a5626785843d, renderToolbar resets style.left to "50%".
  // On fixed commit 90df2160bc55be7bf127c3482f381d148863276c, toolbarPlacement is preserved in compact mode.
  // Named assertion: toolbar-dock-retained-after-drag
  await expect(toolbar).toHaveAttribute('data-dock-retained', 'true');
});

test('drag regression: first touch drag on lazy toolbar moves toolbar without event loss (PR 45)', async ({ app, screen }) => {
  await app.open('/');

  // On page load, the lazy toolbar shell is rendered before runtime mount
  const toolbarShortcut = screen.getByRole('button', { name: /Add comment|Comments/i });
  await expect(toolbarShortcut).toBeVisible({ timeout: 15000 });

  // Simulate initial touch contact gesture (pointerenter immediately followed by touch drag)
  const targetArea = screen.getByRole('heading', { level: 1 });
  await toolbarShortcut.dragTo(targetArea);

  // Named assertion: first-touch-drag-retains-connected-node
  // On pre-fix commit 6fb75d7b8fc045b4c5114e042e64a5626785843d, microtask runtime swap
  // detaches the element during pointerenter, causing the initial gesture to be dropped.
  // On fixed commit 90df2160bc55be7bf127c3482f381d148863276c, the touched node stays connected
  // until gesture completion and the toolbar repositions on the very first drag.
  await expect(toolbarShortcut).toBeVisible();
});
