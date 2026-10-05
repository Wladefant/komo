/**
 * Pin, reply and resolve against a real Pinthread API, at every configured viewport.
 *
 * The API is the stock Worker, started by e2e/serve.mjs on a fresh throwaway local D1 database at http://127.0.0.1:8788.
 * The three viewport targets share that one store, so the test never reads a count: it finds its own thread by a
 * unique pin text, in the widget and in the API, and scopes the Reply and Resolve taps to that thread's id.
 * Guest comments are on for the default project, so the flow signs in as a guest named "QA Guest" (nothing external).
 * The request guard allows loopback and still aborts every production and unknown host (request-guard.e2e.ts).
 * Issue: https://github.com/Wladefant/komo/issues/23
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
  await screen.getByRole('textbox', { name: 'Comment' }).fill(pinText);
  await screen.getByRole('button', { name: 'Post comment' }).tap();
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
    await control.tap();
  };

  // Reply: open this thread's card, write, send.
  await tapInThread('.thread-card');
  await screen.getByRole('textbox', { name: 'Reply' }).fill(replyText);
  await screen.getByRole('button', { name: 'Send reply' }).tap();
  const afterReply = await until(server, (list) => (list[0]?.comments.length ?? 0) === 2, 'the reply on the server');
  expect(afterReply[0]?.id).toBe(threadId);
  expect(afterReply[0]?.comments).toEqual([`QA Guest: ${pinText}`, `QA Guest: ${replyText}`]);

  // Resolve: press the resolve control that belongs to this thread's id, then check the API by that id.
  await tapInThread('.card-resolve');
  const afterResolve = await until(server, (list) => list[0]?.resolved === true, 'the thread marked resolved on the server');
  expect(afterResolve).toHaveLength(1);
  expect(afterResolve[0]?.id).toBe(threadId);
});
