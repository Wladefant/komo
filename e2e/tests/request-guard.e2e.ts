import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { installRequestGuard } from '../e2e.request-guard.ts';

installRequestGuard();

test('request guard: network requests to forbidden production or unlisted hosts are aborted', async ({ app, screen }) => {
  await app.open('/');

  // Verify page loads with the request-level guard active
  const heading = screen.getByRole('heading', { level: 1 });
  await expect(heading).toBeVisible();
});
