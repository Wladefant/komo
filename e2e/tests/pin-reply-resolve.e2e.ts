/**
 * Pin, reply and resolve against a real Pinthread API, at every configured viewport.
 *
 * The API is the stock Worker, started by e2e/serve.mjs on a fresh throwaway local D1 database at http://127.0.0.1:8788.
 * The three viewport targets share that one store, so the test never reads a count: it finds its own thread by a
 * unique pin text, in the widget and in the API, and scopes the Reply and Resolve taps to that thread's id.
 * Guest comments are on for the default project, so the flow signs in as a guest named "QA Guest" (nothing external).
 * The request guard allows loopback and still aborts every production and unknown host (request-guard.e2e.ts).
 * Issue: https://github.com/Wladefant/komo/issues/23
 * Touch hit areas (44 px or more): https://github.com/Wladefant/komo/issues/32, https://github.com/Wladefant/komo/issues/31,
 * https://github.com/Wladefant/komo/issues/36
 * The new reply in view with its actions in reach: https://github.com/Wladefant/komo/issues/39
 */
import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { installRequestGuard } from '../e2e.request-guard.ts';

installRequestGuard();

const API = 'http://127.0.0.1:8788';
const threadsUrl = (branch: string): string => `${API}/threads?authors=1&offset=0&project=pinthread&repo=tjcages%2Fpinthread&branch=${encodeURIComponent(branch)}`;

type ServerThread = { id: string; resolved: boolean; comments: string[] };

test('pin, reply and resolve: a guest places a pin, replies and resolves it, and the API agrees', async ({ app, browser, screen }) => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pinText = `QA-pin ${stamp}`;
  const replyText = `QA-reply ${stamp}`;
  // On a loopback host the widget always uses its "local" channel, so the viewports share one store. The test never
  // counts it: it finds its own thread by this run's unique pin text.
  const THREADS = threadsUrl('local');
  await app.open(`/fixture/${stamp}/`);
  const appOrigin = new URL(process.env.APP_URL ?? 'http://127.0.0.1:4340').origin;

  // The API is the source of truth. Only the thread whose first comment is this run's pin text is returned.
  const server = async (): Promise<ServerThread[]> => {
    // Read from the test process, not the page: this is the API's own answer, with no widget or page state in between.
    // The API only answers its allowed origin (the app), so send it, and fail loudly on any other status.
    const reply = await fetch(THREADS, { cache: 'no-store', headers: { origin: appOrigin } });
    if (!reply.ok) throw new Error(`API ${reply.status} for ${THREADS}`);
    const body = (await reply.json()) as {
      threads?: { id?: string; resolved?: boolean; comments?: { body?: string; author?: string }[] }[];
      authors?: Record<string, { name?: string }>;
    };
    return (body.threads ?? [])
      .filter((thread) => thread.comments?.[0]?.body === pinText)
      .map((thread) => ({
        id: thread.id ?? '',
        resolved: !!thread.resolved,
        comments: (thread.comments ?? []).map((comment) => `${body.authors?.[comment.author ?? '']?.name ?? ''}: ${comment.body ?? ''}`),
      }));
  };
  const until = async <T>(read: () => Promise<T>, done: (value: T) => boolean, what: string): Promise<T> => {
    let last = await read();
    for (let attempt = 0; attempt < 40 && !done(last); attempt++) {
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 250);
      await promise;
      last = await read();
    }
    if (!done(last)) throw new Error(`Timed out waiting for ${what}; last value ${JSON.stringify(last)}`);
    return last;
  };
  // The engine taps with a mouse, so the page always matches a fine pointer. To check the touch hit areas, copy the
  // widget's own `@media (pointer: coarse)` and `@media (hover: none)` rules (a touch screen matches both) into an
  // unconditional style, hit-test each control from its centre with elementFromPoint along both axes, then remove the
  // copy before the tap. Without the `(hover: none)` rules, the desktop-only shortcut tip covers the sidebar head.
  // The thread dialog opens with a 250 ms size animation that holds its height. The copied rules add spacing, so a
  // measurement inside that animation sees a clipped message list. Wait for every finite widget animation to end
  // first: a phone has the coarse rules from the start, so the settled layout is the one a user taps. The widget
  // places its sidebar tips from measured button boxes, so fire `resize` after the copy (and after removing it) to let
  // the widget lay them out again, as it does on a touch screen from the start.
  const expectTouchTargets = async (selectors: string[]): Promise<void> => {
    const areas = await browser.evaluate(async (list: string[]) => {
      const root = document.querySelector('[data-branch-comments]')!.shadowRoot!;
      await Promise.all(
        root
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined)),
      );
      const coarse = document.createElement('style');
      coarse.textContent = [...root.querySelectorAll('style')]
        .flatMap((style) => [...(style.sheet?.cssRules ?? [])])
        .filter((rule) => rule instanceof CSSMediaRule && ['(pointer: coarse)', '(hover: none)'].includes(rule.media.mediaText))
        .flatMap((rule) => [...(rule as CSSMediaRule).cssRules].map((inner) => inner.cssText))
        .join('\n');
      root.append(coarse);
      const relayout = async (): Promise<void> => {
        window.dispatchEvent(new Event('resize'));
        const frames = Promise.withResolvers<void>();
        requestAnimationFrame(() => requestAnimationFrame(() => frames.resolve()));
        await frames.promise;
      };
      await relayout();
      try {
        return list.map((selector) => {
          const target = root.querySelector(selector);
          if (!target) return { selector, width: 0, height: 0 };
          const box = target.getBoundingClientRect();
          const x = box.left + box.width / 2;
          const y = box.top + box.height / 2;
          const owns = (dx: number, dy: number): boolean => {
            const hit = root.elementFromPoint(x + dx, y + dy);
            return !!hit && target.contains(hit);
          };
          const reach = (step: (n: number) => boolean): number => {
            let n = 0;
            while (n < 80 && step(n + 1)) n++;
            return n;
          };
          const width = reach((n) => owns(-n, 0)) + reach((n) => owns(n, 0)) + 1;
          const height = reach((n) => owns(0, -n)) + reach((n) => owns(0, n)) + 1;
          return { selector, width, height };
        });
      } finally {
        coarse.remove();
        await relayout();
      }
    }, selectors);
    // Every control is found, and none is under 44 px on either axis. A failure names the control and its size.
    expect(areas.filter((area) => area.width < 44 || area.height < 44)).toEqual([]);
  };
  // A phone has the coarse rules from the first paint, so a layout the widget builds while they are on is the one a
  // user sees. Keep the same copy on across a step (on: true), then remove it (on: false).
  const phoneRules = async (on: boolean): Promise<void> => {
    await browser.evaluate(async (enable: boolean) => {
      const root = document.querySelector('[data-branch-comments]')!.shadowRoot!;
      root.querySelector('style[data-e2e-phone]')?.remove();
      if (enable) {
        const phone = document.createElement('style');
        phone.dataset.e2ePhone = '';
        phone.textContent = [...root.querySelectorAll('style')]
          .flatMap((style) => [...(style.sheet?.cssRules ?? [])])
          .filter((rule): rule is CSSMediaRule => rule instanceof CSSMediaRule && ['(pointer: coarse)', '(hover: none)'].includes(rule.media.mediaText))
          .flatMap((rule) => [...rule.cssRules].map((inner) => inner.cssText))
          .join('\n');
        root.append(phone);
      }
      window.dispatchEvent(new Event('resize'));
      const frames = Promise.withResolvers<void>();
      requestAnimationFrame(() => requestAnimationFrame(() => frames.resolve()));
      await frames.promise;
    }, on);
  };

  expect(await server()).toEqual([]);

  // Pin: comment mode, tap the paragraph, write, post, then give a name when asked.
  await screen.getByRole('button', { name: /Add comment/ }).tap();
  // In comment mode the widget's own catcher layer covers the page and takes the tap (that is the design: the
  // paragraph is not tappable, so a locator tap on it is rightly "not actionable"). Tap the catcher for real, at the
  // centre of the paragraph. The catcher is a full-viewport layer, so a position in it is a viewport position.
  const spot = await browser.evaluate(() => {
    const box = document.querySelector('#fixture-target')!.getBoundingClientRect();
    return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
  });
  const catcher = browser.locator('.catch');
  await expect(catcher).toBeVisible();
  await catcher.tap({ position: spot });
  await expect(screen.getByRole('textbox', { name: 'Comment' })).toBeVisible();
  await expectTouchTargets(['.draft-close', '.new-comment-composer .send']);
  await screen.getByRole('textbox', { name: 'Comment' }).fill(pinText);
  await screen.getByRole('button', { name: 'Post comment' }).tap();
  await expect(screen.getByRole('textbox', { name: 'Your name' })).toBeVisible();
  await expectTouchTargets(['.account .primary']);
  await screen.getByRole('textbox', { name: 'Your name' }).fill('QA Guest');
  await screen.getByRole('button', { name: 'Continue' }).tap();

  // The API has this pin, and the widget shows a card with this pin's text.
  const afterPin = await until(server, (list) => list.length === 1, 'the pin on the server');
  expect(afterPin[0]?.resolved).toBe(false);
  expect(afterPin[0]?.comments).toEqual([`QA Guest: ${pinText}`]);
  const threadId = afterPin[0]!.id;
  expect(threadId).not.toBe('');
  // The list lives in a panel that the widget collapses and reopens by itself (on a phone it shrinks to a 52 px pill
  // while closed). So open it from the dock whenever it is collapsed, at most once per 1.5 s, and wait for a full card.
  let lastOpen = 0;
  let lastBox = '';
  const reveal = async (): Promise<boolean> => {
    const mayOpen = Date.now() - lastOpen > 1500;
    const state = await browser.evaluate(
      ({ id, allowOpen }: { id: string; allowOpen: boolean }) => {
        const root = document.querySelector('[data-branch-comments]')?.shadowRoot;
        const found = root?.querySelector(`.thread-item[data-thread="${id}"]`);
        found?.scrollIntoView({ block: 'center' });
        const box = found?.getBoundingClientRect();
        const inView = !!box && box.height >= 60 && box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight;
        let opened = false;
        if (!inView && allowOpen) {
          const open = [...(root?.querySelectorAll('button') ?? [])].find((b) => /View all comments/.test(b.getAttribute('aria-label') ?? ''));
          open?.click();
          opened = !!open;
        }
        const rect = box ? [box.x, box.y, box.width, box.height].map(Math.round).join(',') : '';
        return { inView, opened, rect };
      },
      { id: threadId, allowOpen: mayOpen },
    );
    if (state.opened) lastOpen = Date.now();
    // Settled: the same on-screen rect on two reads in a row, so a slide-in animation has finished.
    const settled = state.inView && state.rect === lastBox;
    lastBox = state.rect;
    return settled;
  };
  // Tap a control of this thread's list item for real: bring the item fully into view first, then require the control
  // to be visible. The shared store holds other runs' threads, so the control is picked by this thread's id.
  const tapInThread = async (inner: string): Promise<void> => {
    await until(reveal, (found) => found, `this thread's card in the widget (for ${inner})`);
    const control = browser.locator(`[data-thread="${threadId}"] ${inner}`);
    await expect(control).toBeVisible();
    await expectTouchTargets([`[data-thread="${threadId}"] ${inner}`]);
    await control.tap();
  };

  // Reply: open this thread's card, write, send.
  await tapInThread('.thread-card');
  await expect(screen.getByRole('textbox', { name: 'Reply' })).toBeVisible();
  await expectTouchTargets([
    '.dialog-head [aria-label="Comment actions"]',
    '.dialog-head [aria-label="Resolve comment"]',
    '.dialog-head [aria-label="Close comment"]',
    '.message-reaction',
    '.reply-composer .send',
  ]);
  // Send the reply with the phone layout on, so the thread lays out the new reply as a phone does.
  await phoneRules(true);
  await screen.getByRole('textbox', { name: 'Reply' }).fill(replyText);
  await screen.getByRole('button', { name: 'Send reply' }).tap();
  const afterReply = await until(server, (list) => (list[0]?.comments.length ?? 0) === 2, 'the reply on the server');
  expect(afterReply[0]?.id).toBe(threadId);
  expect(afterReply[0]?.comments).toEqual([`QA Guest: ${pinText}`, `QA Guest: ${replyText}`]);
  // The whole new reply shows inside the message list, above the composer, with no scrolling by the test.
  const reply = await browser.evaluate(async (text: string) => {
    const root = document.querySelector('[data-branch-comments]')!.shadowRoot!;
    await Promise.all(
      root
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
    const list = root.querySelector('.dialog .messages');
    const item = [...(list?.querySelectorAll<HTMLElement>('[data-comment]') ?? [])].at(-1);
    if (!list || !item?.textContent?.includes(text)) return { found: false, inView: false, item: '', list: '' };
    const box = item.getBoundingClientRect();
    const view = list.getBoundingClientRect();
    const inView = box.top >= view.top - 1 && box.bottom <= view.bottom + 1;
    return { found: true, inView, item: `${Math.round(box.top)}-${Math.round(box.bottom)}`, list: `${Math.round(view.top)}-${Math.round(view.bottom)}` };
  }, replyText);
  expect(reply).toMatchObject({ found: true, inView: true });
  await expectTouchTargets(['.dialog .messages [data-comment]:last-child summary[aria-label="Message actions"]']);
  await phoneRules(false);

  // Resolve: press the resolve control that belongs to this thread's id, then check the API by that id.
  await tapInThread('.card-resolve');
  // The "Comment resolved" notice opens at once and closes after 5 s, so measure its controls before the API wait.
  await expect(screen.getByRole('button', { name: 'Undo' })).toBeVisible();
  await expectTouchTargets(['.floating-notice .notice-action', '.floating-notice [aria-label="Dismiss notice"]']);
  // Dismiss it now, inside those 5 s: on a short phone it sits over the sidebar head. Dismiss only hides it.
  await screen.getByRole('button', { name: 'Dismiss notice' }).tap();
  await expect(screen.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  const afterResolve = await until(server, (list) => list[0]?.resolved === true, 'the thread marked resolved on the server');
  expect(afterResolve).toHaveLength(1);
  expect(afterResolve[0]?.id).toBe(threadId);

  // Sidebar head and filter menu.
  // The sidebar has two selection menus (filter and pages); scope to the filter menu.
  const filterTrigger = 'summary.selection-trigger[aria-label="Filter comments"]';
  await expectTouchTargets([
    filterTrigger,
    '.panel-head .sidebar-search-trigger',
    '.panel-head [aria-label="Close sidebar"]',
  ]);
  await browser.locator(filterTrigger).tap();
  await expect(screen.getByRole('menuitemradio', { name: 'Resolved' })).toBeVisible();
  await expectTouchTargets([1, 2, 3].map((n) => `.comment-menu-items[aria-label="Filter comments"] > :nth-child(${n})`));
});
