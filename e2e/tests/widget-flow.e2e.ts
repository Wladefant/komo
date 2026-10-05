/**
 * Widget flow at every configured viewport (390x844, 390x420 with the keyboard open, 1440x900).
 *
 * Scope: open the page, switch the dock into comment mode and back, and check the dock stays reachable (inside
 * the viewport, controls at least 44 px, no horizontal overflow). Placing a pin, replying and resolving need the
 * pinthread API. The demo shows "Can't connect" without it and the request guard blocks every external host, so
 * those steps are not covered here (https://github.com/Wladefant/super-board/issues/490).
 */
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { installRequestGuard } from '../e2e.request-guard.ts';

installRequestGuard();

test('widget flow: comment mode toggles and the dock stays reachable', async ({ app, browser, screen }) => {
  await app.open('/');
  const comment = screen.getByRole('button', { name: /Add comment/ });
  await expect(comment).toBeVisible({ timeout: 15000 });
  await comment.tap();
  const inComment = await browser.evaluate(() => {
    const root = document.querySelector('[data-branch-comments]')!.shadowRoot!;
    return {
      current: root.querySelector('[data-dock-item][aria-current]')?.getAttribute('data-dock-item') ?? '',
      catcherVisible: !(root.querySelector('.catch') as HTMLElement).hidden,
    };
  });
  expect(inComment.current).toBe('comment');
  expect(inComment.catcherVisible).toBe(true);

  await screen.getByRole('button', { name: /Browse website/ }).tap();
  const reachable = await browser.evaluate(() => {
    const root = document.querySelector('[data-branch-comments]')!.shadowRoot!;
    const toolbar = root.querySelector('.toolbar') as HTMLElement;
    const box = toolbar.getBoundingClientRect();
    const smallest = Math.min(
      ...[...toolbar.querySelectorAll('[data-dock-item]:not(.dock__sheet *)')].map((b) => {
        const r = b.getBoundingClientRect();
        return Math.min(r.width, r.height);
      }),
    );
    return {
      current: root.querySelector('[data-dock-item][aria-current]')?.getAttribute('data-dock-item') ?? '',
      catcherHidden: (root.querySelector('.catch') as HTMLElement).hidden,
      inside: box.left >= 0 && box.top >= 0 && box.right <= window.innerWidth && box.bottom <= window.innerHeight,
      smallest: Math.round(smallest),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  expect(reachable.current).toBe('browse');
  expect(reachable.catcherHidden).toBe(true);
  expect(reachable.inside).toBe(true);
  expect(reachable.smallest).toBeGreaterThanOrEqual(44);
  expect(reachable.overflow).toBe(false);
});
