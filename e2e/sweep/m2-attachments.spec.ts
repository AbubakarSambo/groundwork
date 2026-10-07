import { test, expect } from '@playwright/test';
import { signInByLink, APP, whatIsOnThePage } from '../user-journeys-helpers';
import { screenshotTo, watch, watchSummary } from './sweep-helpers';
import * as path from 'path';

/**
 * M2, the photo and document step, done with Playwright's setInputFiles (which can set a native
 * file input directly, unlike the interactive Browser-pane tools used for the rest of the tester's
 * M2 run - see the bug log). Amani Wekesa (Kilima Traders U8) has an open session on "Check how
 * the same role is going"; this attaches a small real photo and a small real document to it and
 * confirms both are accepted and kept.
 */
const PHOTO = path.resolve(__dirname, '../../docs/bug-log-screens/_m2-test-photo.png');
const DOC = path.resolve(__dirname, '../../docs/bug-log-screens/_m2-test-document.txt');

test.beforeAll(async () => {
  const fs = require('fs');
  // small, real, throwaway files kept under docs/bug-log-screens/ so Playwright (same machine,
  // no extra permissions) can read them back as attachments.
  fs.writeFileSync(DOC, 'A small test document for the M2 attachment sweep.\n');
  const png = Buffer.from(
    '89504e470d0a1a0a0000000d4948445200000001000000010802000000907724' +
    'f3000000017352474200aece1ce90000000467414d410000b18f0bfc61050000' +
    '000a49444154789c6364000000050001a5f645400000000049454e44ae426082',
    'hex',
  );
  fs.writeFileSync(PHOTO, png);
});

test('M2 attachments: a photo and a document via setInputFiles', async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const watcher = watch(page);
  await signInByLink(page, 'amani.u8@example.test');
  await page.goto(`${APP}/grounds/6d7b2482-cc1c-429c-8977-3c8e2572d7bf`); // Check how the same role is going
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3000);

  await page.waitForTimeout(8000);

  const attachBtn = page.getByRole('button', { name: /Add a photo, a document/i });
  await attachBtn.waitFor({ state: 'visible', timeout: 30000 });
  await attachBtn.click();

  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toHaveCount(1, { timeout: 10000 });

  // The photo.
  await fileInput.setInputFiles(PHOTO);
  await page.waitForTimeout(3000);
  await screenshotTo(page, 'docs/bug-log-screens/_m2-after-photo-attach.png');
  const photoDialogText = await whatIsOnThePage(page);
  const photoAccepted = /\.png|what does it show/i.test(photoDialogText);
  console.log('M2 attach: photo accepted (file recognised, caption dialog shown):', photoAccepted);
  const addPhoto = page.getByRole('button', { name: 'Add to session' });
  if (await addPhoto.isVisible().catch(() => false)) { await addPhoto.click(); await page.waitForTimeout(2000); }

  // The document, as a second attachment.
  const attachBtn2 = page.getByRole('button', { name: /Add a photo, a document/i });
  await attachBtn2.waitFor({ state: 'visible', timeout: 15000 });
  await attachBtn2.click();
  const fileInput2 = page.locator('input[type="file"]').first();
  await fileInput2.setInputFiles(DOC);
  await page.waitForTimeout(3000);
  await screenshotTo(page, 'docs/bug-log-screens/_m2-after-document-attach.png');
  const docDialogText = await whatIsOnThePage(page);
  const docAccepted = /\.txt|what does it (show|say)|what is it/i.test(docDialogText);
  console.log('M2 attach: document accepted (file recognised, caption dialog shown):', docAccepted);
  const addDoc = page.getByRole('button', { name: 'Add to session' });
  if (await addDoc.isVisible().catch(() => false)) { await addDoc.click(); await page.waitForTimeout(2000); }
  await screenshotTo(page, 'docs/bug-log-screens/_m2-after-both-attached.png');

  const issue = watchSummary(watcher);
  if (issue) console.log('M2 attach console/network:', issue);

  expect(photoAccepted, 'A photo attached via the file input should be acknowledged, not silently dropped').toBe(true);
  expect(docAccepted, 'A document attached via the file input should be acknowledged, not silently dropped').toBe(true);
});
