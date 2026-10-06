/**
 * Drag regression tests for the pinthread dock, from upstream https://github.com/tjcages/komo/pull/45.
 * Pre-fix upstream commit:  6fb75d7b8fc045b4c5114e042e64a5626785843d
 * Fixed upstream commit:    90df2160bc55be7bf127c3482f381d148863276c
 *
 * The first two tests read real widget state through the open shadow root of [data-branch-comments] and drive the
 * dock with synthetic touch pointer events, so they need no model call.
 *
 * 1. A dragged dock keeps its place when the mode changes. Pre-fix, compact (mobile) layouts rebuilt the dock at
 *    left:50% on every render, so it snapped back to the bottom centre. The edge layout at 1440 never had that
 *    bug, so this test passes there on both commits and fails on 390x844 and 390x420 only before the fix.
 * 2. The first touch must not replace the control under the finger. Pre-fix, pointerenter(touch) mounted the menu
 *    in a microtask and detached the node before pointerdown. This fails on every viewport before the fix.
 * 3. A real touch drag moves the dock and it settles (https://github.com/Wladefant/komo/issues/37). Synthetic
 *    PointerEvents never get the browser's implicit touch capture, so tests 1 and 2 passed on cddbbec, which ended
 *    every real touch drag at its first move. This test turns on touch emulation and sends real touches through
 *    CDP Input.dispatchTouchEvent on the target's own page, so the browser captures the pointer as on a phone.
 */
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import type {} from '../e2e.config.ts';
import { installRequestGuard } from '../e2e.request-guard.ts';

installRequestGuard();

test('drag regression: a dragged dock keeps its placement after a mode change (PR 45)', async ({ app, browser }) => {
  await app.open('/');
  await browser.evaluate(() => localStorage.clear());
  await app.open('/');
  const result = await browser.evaluate(async () => {
    const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
    // Poll once per frame until the check passes; fail with its name after the deadline.
    const until = async (name: string, check: () => boolean, ms = 5000) => {
      const deadline = performance.now() + ms;
      while (!check()) {
        if (performance.now() > deadline) throw new Error('timed out waiting for ' + name);
        await frame();
      }
    };
    const host = document.querySelector('[data-branch-comments]')!;
    const root = host.shadowRoot!;
    const toolbar = root.querySelector('.toolbar') as HTMLElement;
    const rect = () => {
      const r = toolbar.getBoundingClientRect();
      return [Math.round(r.x), Math.round(r.y)];
    };
    // The dock has settled when its own motion has stopped and its box holds still for 5 frames.
    const settled = async (name: string) => {
      let last = '', still = 0;
      await until(name, () => {
        const r = toolbar.getBoundingClientRect();
        const box = [r.x, r.y, r.width, r.height].map(Math.round).join();
        const running = toolbar.getAnimations().some((a) => a.playState === 'running');
        still = !running && !toolbar.dataset.dragging && box === last ? still + 1 : 0;
        last = box;
        return still >= 5;
      });
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
      await frame();
    }
    window.dispatchEvent(new PointerEvent('pointerup', ev(sx - 80, sy - 360)));
    await settled('the drag to settle');
    const docked = rect();
    const item = (id: string) => root.querySelector('[data-dock-item="' + id + '"]') as HTMLElement;
    const press = async (id: string) => {
      item(id).click();
      await until(id + ' to become active', () => item(id)?.getAttribute('aria-current') === 'page');
      await settled('the dock to settle after ' + id);
    };
    await press('comment');
    await press('browse');
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
    const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
    const until = async (name: string, check: () => boolean, ms = 5000) => {
      const deadline = performance.now() + ms;
      while (!check()) {
        if (performance.now() > deadline) throw new Error('timed out waiting for ' + name);
        await frame();
      }
    };
    // A negative check: the state must hold for a bounded window in which the old
    // code had already replaced the node. Returns false as soon as it breaks.
    const holds = async (check: () => boolean, ms: number) => {
      const deadline = performance.now() + ms;
      while (performance.now() < deadline) {
        if (!check()) return false;
        await frame();
      }
      return check();
    };
    const root = document.querySelector('[data-branch-comments]')!.shadowRoot!;
    const toolbar = root.querySelector('.toolbar') as HTMLElement;
    const control = toolbar.querySelector('[data-dock-item="browse"]') as HTMLElement;
    const touch = { pointerId: 9, pointerType: 'touch', isPrimary: true };
    toolbar.dispatchEvent(new PointerEvent('pointerenter', touch));
    const connectedBeforePress = await holds(() => control.isConnected, 400);
    control.dispatchEvent(new PointerEvent('pointerdown', { ...touch, bubbles: true, composed: true, button: 0, buttons: 1 }));
    const connectedWhilePressed = await holds(() => control.isConnected, 200);
    document.dispatchEvent(new PointerEvent('pointerup', { ...touch, bubbles: true, composed: true }));
    await until('the menu to replace the shell', () => {
      const next = toolbar.querySelector('[data-dock-item="browse"]');
      return !control.isConnected && !!next?.isConnected;
    }).catch(() => undefined);
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

test('drag regression: a real touch drag moves the dock and it settles (komo#37)', async ({ app, browser }) => {
  await app.open('/');
  await browser.evaluate(() => localStorage.clear());
  await app.open('/');
  // The target's own live page, published by e2e.config.ts. The target names are the viewport sizes.
  const size = await browser.evaluate(() => `${innerWidth}x${innerHeight}`);
  const live = globalThis.pinthreadLiveSurfaces?.[size];
  if (!live) throw new Error(`no live page for target ${size}`);
  const cdp = await live.context().newCDPSession(live.page());
  try {
    // A touch screen from the first paint, as on a phone.
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await browser.reload();
    // Wait for the dock to rest, then take a point on its surface edge: a child of the drag handle, so the touch
    // starts captured to that child, as a finger on a phone does.
    const start = await browser.evaluate(async () => {
      const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
      const deadline = performance.now() + 5000;
      let last = '', still = 0;
      for (;;) {
        const toolbar = document.querySelector('[data-branch-comments]')?.shadowRoot?.querySelector<HTMLElement>('.toolbar');
        const surface = toolbar?.querySelector('.dock__surface');
        if (toolbar && surface) {
          const r = toolbar.getBoundingClientRect();
          const box = [r.x, r.y, r.width, r.height].map(Math.round).join();
          const running = toolbar.getAnimations().some((a) => a.playState === 'running');
          still = !running && box === last ? still + 1 : 0;
          last = box;
          if (still >= 5) {
            const s = surface.getBoundingClientRect();
            return { x: Math.round(s.x + 4), y: Math.round(s.y + s.height / 2), top: Math.round(r.y), coarse: matchMedia('(pointer: coarse)').matches };
          }
        }
        if (performance.now() > deadline) throw new Error('timed out waiting for the dock to rest');
        await frame();
      }
    });
    expect(start.coarse).toBe(true);
    // CDP compares each event's touch points with the previous event, so a move lists the same id and an end lists none.
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0, y = 0) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await touch('touchStart', start.x, start.y);
    for (let i = 1; i <= 12; i++) await touch('touchMove', start.x - i * Math.min(7, start.x / 12), start.y - i * 30);
    const dragging = await browser.evaluate(
      () => document.querySelector('[data-branch-comments]')?.shadowRoot?.querySelector<HTMLElement>('.toolbar')?.dataset.dragging ?? '',
    );
    await touch('touchEnd');
    const after = await browser.evaluate(async () => {
      const frame = () => new Promise<number>((r) => requestAnimationFrame(r));
      const toolbar = document.querySelector('[data-branch-comments]')?.shadowRoot?.querySelector<HTMLElement>('.toolbar');
      if (!toolbar) throw new Error('no dock toolbar');
      const deadline = performance.now() + 5000;
      let last = '', still = 0;
      // Settled: no running dock animation, no drag in progress, and the same box for 5 frames.
      while (still < 5) {
        if (performance.now() > deadline) throw new Error('timed out waiting for the dock to settle');
        await frame();
        const r = toolbar.getBoundingClientRect();
        const box = [r.x, r.y, r.width, r.height].map(Math.round).join();
        const running = toolbar.getAnimations().some((a) => a.playState === 'running');
        still = !running && !toolbar.dataset.dragging && box === last ? still + 1 : 0;
        last = box;
      }
      return { top: Math.round(toolbar.getBoundingClientRect().y) };
    });
    // The drag was still live after the last move, and the dock rests well away from where it started.
    expect(dragging).toBe('true');
    expect(Math.abs(after.top - start.top)).toBeGreaterThan(100);
  } finally {
    await cdp.detach();
  }
});
