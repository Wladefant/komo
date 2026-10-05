import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { installRequestGuard } from '../e2e.request-guard.ts';

installRequestGuard();

// The page itself sends the requests. A production host and an unlisted host must be aborted at request level
// (route.abort), so the page's fetch rejects. The page's own host must still pass.
test('request guard: requests to a production host and an unlisted host are aborted, own host passes', async ({ app, browser }) => {
  await app.open('/');
  const outcome = await browser.evaluate(async () => {
    const reach = (url: string) => fetch(url, { mode: 'no-cors', cache: 'no-store' }).then(() => 'reached', () => 'aborted');
    return {
      production: await reach('https://polysimulator.com/e2e-probe'),
      unlisted: await reach('http://127.0.0.2:4340/e2e-probe'),
      own: await reach('/'),
    };
  });
  expect(outcome.production).toBe('aborted');
  expect(outcome.unlisted).toBe('aborted');
  expect(outcome.own).toBe('reached');
});
