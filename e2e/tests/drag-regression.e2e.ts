/**
 * Drag regression tests for the pinthread dock, from upstream https://github.com/tjcages/komo/pull/45.
 * Pre-fix upstream commit:  6fb75d7b8fc045b4c5114e042e64a5626785843d
 * Fixed upstream commit:    90df2160bc55be7bf127c3482f381d148863276c
 *
 * Both tests read real widget state through the open shadow root of [data-branch-comments] and drive the dock with
 * touch pointer events, so they need no model call.
 *
 * 1. A dragged dock keeps its place when the mode changes. Pre-fix, compact (mobile) layouts rebuilt the dock at
 *    left:50% on every render, so it snapped back to the bottom centre. The edge layout at 1440 never had that
 *    bug, so this test passes there on both commits and fails on 390x844 and 390x420 only before the fix.
 * 2. The first touch must not replace the control under the finger. Pre-fix, pointerenter(touch) mounted the menu
 *    in a microtask and detached the node before pointerdown. This fails on every viewport before the fix.
 */
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { installRequestGuard } from '../e2e.request-guard.ts';

installRequestGuard();

test('drag regression: a dragged dock keeps its placement after a mode change (PR 45)', async ({ app, browser }) => {
  await app.open('/');
  await browser.evaluate(() => localStorage.clear());
  await app.open('/');
  const result = await browser.evaluate(async () => {
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const host = document.querySelector('[data-branch-comments]')!;
    const root = host.shadowRoot!;
    const toolbar = root.querySelector('.toolbar') as HTMLElement;
    const rect = () => {
      const r = toolbar.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y)];
    };
    const surface = toolbar.querySelector('.dock__surface') as HTMLElement;
    const s = surface.getBoundingClientRect();
    const sx = s.x + 4;
    const sy = s.y + s.height / 2;
    const init = rect();
    const ev = (x: number, y: number) => ({
      bubbles: true, composed: true, cancelable: true, clientX: x, clientY: y,
      pointerId: 7, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1,
    });
    surface.dispatchEvent(new PointerEvent('pointerdown', ev(sx, sy)));
    for (let i = 1; i <= 12; i++) {
      window.dispatchEvent(new PointerEvent('pointermove', ev(sx - i * Math.min(7, sx / 12), sy - i * 30)));
      await sleep(16);
    }
    window.dispatchEvent(new PointerEvent('pointerup', ev(sx - 80, sy - 360)));
    await sleep(700);
    const docked = rect();
    const press = (id: string) => (root.querySelector('[data-dock-item="' + id + '"]') as HTMLElement).click();
    press('comment');
    await sleep(500);
    press('browse');
    await sleep(500);
    return { init, docked, after: rect() };
  });
  // The drag moved the dock, and a re-render did not move it back.
  expect(Math.abs(result.docked[1]! - result.init[1]!)).toBeGreaterThan(40);
  expect(Math.abs(result.after[0]! - result.docked[0]!)).toBeLessThanOrEqual(2);
  expect(Math.abs(result.after[1]! - result.docked[1]!)).toBeLessThanOrEqual(2);
});

test('drag regression: the first touch keeps the pressed control connected until release (PR 45)', async ({ app, browser }) => {
  await app.open('/');
  const result = await browser.evaluate(async () => {
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const root = document.querySelector('[data-branch-comments]')!.shadowRoot!;
    const toolbar = root.querySelector('.toolbar') as HTMLElement;
    const control = toolbar.querySelector('[data-dock-item="browse"]') as HTMLElement;
    const touch = { pointerId: 9, pointerType: 'touch', isPrimary: true };
    toolbar.dispatchEvent(new PointerEvent('pointerenter', touch));
    await sleep(400);
    const connectedBeforePress = control.isConnected;
    control.dispatchEvent(new PointerEvent('pointerdown', { ...touch, bubbles: true, composed: true, button: 0, buttons: 1 }));
    await sleep(200);
    const connectedWhilePressed = control.isConnected;
    document.dispatchEvent(new PointerEvent('pointerup', { ...touch, bubbles: true, composed: true }));
    await sleep(600);
    const replacement = toolbar.querySelector('[data-dock-item="browse"]');
    return {
      connectedBeforePress,
      connectedWhilePressed,
      menuReplacedAfterRelease: !control.isConnected && !!replacement && replacement.isConnected,
    };
  });
  expect(result.connectedBeforePress).toBe(true);
  expect(result.connectedWhilePressed).toBe(true);
  expect(result.menuReplacedAfterRelease).toBe(true);
});
