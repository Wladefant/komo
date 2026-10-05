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

  // The API is the source of truth. Only the thread whose first comment is this run's pin text is returned.
  const server = async (): Promise<ServerThread[]> => {
    // Read from the test process, not the page: this is the API's own answer, with no widget or page state in between.
    // The API only answers its allowed origin (the app), so send it, and fail loudly on any other status.
    const reply = await fetch(THREADS, { cache: 'no-store', headers: { origin: 'http://127.0.0.1:4343' } });
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
  // paragraph is not tappable, so a locator tap on it is rightly "not actionable"). Tap through the catcher as a touch.
  await browser.evaluate(() => {
    const target = document.querySelector('#fixture-target')!.getBoundingClientRect();
    const x = target.left + target.width / 2;
    const y = target.top + target.height / 2;
    // The catcher lives in the widget's shadow root, so the document's elementFromPoint only reports the host.
    const catcher = document.querySelector('[data-branch-comments]')!.shadowRoot!.querySelector('.catch') as HTMLElement;
    const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 };
    catcher.dispatchEvent(new PointerEvent('pointerdown', init));
    catcher.dispatchEvent(new PointerEvent('pointerup', init));
  });
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
        return { inView, opened };
      },
      { id: threadId, allowOpen: mayOpen },
    );
    if (state.opened) lastOpen = Date.now();
    return state.inView;
  };
  // Press a control inside this thread's list item. The list scrolls and slides inside a clipped panel, which the
  // generic tap actionability check misreads as "outside the viewport", so press it as a click on the element itself.
  const press = async (selector: string): Promise<void> => {
    await until(reveal, (found) => found, `this thread's card in the widget (for ${selector})`);
    const pressed = await browser.evaluate(
      ({ id, inner }: { id: string; inner: string }) => {
        const root = document.querySelector('[data-branch-comments]')?.shadowRoot;
        const item = root?.querySelector(`.thread-item[data-thread="${id}"]`);
        const control = item?.querySelector(inner) as HTMLElement | null;
        control?.click();
        return control ? 'ok' : `no ${inner} in ${(item?.outerHTML ?? 'no item').slice(0, 400)}`;
      },
      { id: threadId, inner: selector },
    );
    expect(pressed).toBe('ok');
  };

  // Reply: open this thread's card, write, send.
  await press('.thread-card');
  await screen.getByRole('textbox', { name: 'Reply' }).fill(replyText);
  await screen.getByRole('button', { name: 'Send reply' }).tap();
  const afterReply = await until(server, (list) => (list[0]?.comments.length ?? 0) === 2, 'the reply on the server');
  expect(afterReply[0]?.id).toBe(threadId);
  expect(afterReply[0]?.comments).toEqual([`QA Guest: ${pinText}`, `QA Guest: ${replyText}`]);

  // Resolve: press the resolve control that belongs to this thread's id, then check the API by that id.
  await press('.card-resolve');
  const afterResolve = await until(server, (list) => list[0]?.resolved === true, 'the thread marked resolved on the server');
  expect(afterResolve).toHaveLength(1);
  expect(afterResolve[0]?.id).toBe(threadId);
});
