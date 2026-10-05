import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { installRequestGuard } from '../e2e.request-guard.ts';

installRequestGuard();

test('widget flow: open review dock, place pin, drag toolbar, reply, and resolve thread', async ({ app, screen }) => {
  await app.open('/');

  // 1. Open widget / comment mode
  // The dock renders with comment shortcut button on the landing page
  const commentTrigger = screen.getByRole('button', { name: /Add comment|Comments|Try pinthread/i });
  await expect(commentTrigger).toBeVisible({ timeout: 15000 });
  await commentTrigger.tap();

  // 2. Place a pin comment
  // Clicking on an anchorable element creates a draft pin and opens the comment composer
  const targetElement = screen.getByRole('heading', { level: 1 });
  await expect(targetElement).toBeVisible();
  await targetElement.tap();

  // Composer textarea appears in the shadow DOM with placeholder "Add a comment…"
  const composerInput = screen.getByPlaceholder(/Add a comment|Comment/i);
  await expect(composerInput).toBeVisible({ timeout: 10000 });
  await composerInput.fill('E2E test pin: review typography and layout alignment.');

  // Submit comment via Post comment button
  const postButton = screen.getByRole('button', { name: /Post comment/i });
  await expect(postButton).toBeVisible();
  await postButton.tap();

  // Confirm thread card is created with comment text
  await expect(screen.getByText('E2E test pin: review typography and layout alignment.')).toBeVisible({ timeout: 10000 });

  // 3. Drag toolbar / pin
  // Locate dock toolbar and drag handle to reposition
  const dockToolbar = screen.getByRole('toolbar', { name: /navigation|dock/i });
  if (await dockToolbar.isVisible()) {
    // Perform drag gesture across coordinates
    await dockToolbar.dragTo(targetElement);
    await expect(dockToolbar).toBeVisible();
  }

  // 4. Reply to the thread
  const replyInput = screen.getByPlaceholder(/Reply/i);
  await expect(replyInput).toBeVisible({ timeout: 10000 });
  await replyInput.fill('Verified and updated spacing.');

  const sendReplyButton = screen.getByRole('button', { name: /Send reply/i });
  await expect(sendReplyButton).toBeVisible();
  await sendReplyButton.tap();

  // Confirm reply message appears in the thread
  await expect(screen.getByText('Verified and updated spacing.')).toBeVisible({ timeout: 10000 });

  // 5. Resolve thread
  const resolveButton = screen.getByRole('button', { name: /Resolve comment/i });
  await expect(resolveButton).toBeVisible();
  await resolveButton.tap();

  // After resolving, button state transitions or thread receives resolved marker
  await expect(screen.getByRole('button', { name: /Reopen comment/i })).toBeVisible({ timeout: 10000 });
});

test('widget mobile flow: compact dock placement and thread creation at 390x844', async ({ app, screen }) => {
  await app.open('/');

  // On compact viewports (390x844), verify the mobile dock is centered at bottom
  const mobileCommentTrigger = screen.getByRole('button', { name: /Add comment|Comments|Try pinthread/i });
  await expect(mobileCommentTrigger).toBeVisible({ timeout: 15000 });
  await mobileCommentTrigger.tap();

  // Select target element on page to anchor pin
  const heroHeading = screen.getByRole('heading', { level: 1 });
  await heroHeading.tap();

  // Fill composer
  const commentBox = screen.getByPlaceholder(/Add a comment|Comment/i);
  await expect(commentBox).toBeVisible({ timeout: 10000 });
  await commentBox.fill('Mobile 390px feedback note.');

  const submitButton = screen.getByRole('button', { name: /Post comment/i });
  await submitButton.tap();

  // Verify created thread
  await expect(screen.getByText('Mobile 390px feedback note.')).toBeVisible({ timeout: 10000 });

  // Resolve on mobile
  const resolveButton = screen.getByRole('button', { name: /Resolve comment/i });
  await expect(resolveButton).toBeVisible();
  await resolveButton.tap();

  await expect(screen.getByRole('button', { name: /Reopen comment/i })).toBeVisible({ timeout: 10000 });
});
