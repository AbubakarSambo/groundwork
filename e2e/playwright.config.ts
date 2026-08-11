import { defineConfig } from '@playwright/test';

/**
 * Journeys that drive Groundwork the way a person does.
 *
 * Deliberately NOT a unit-test config. These run against the real client, the
 * real API, a real database and a real mail catcher, and they follow links out
 * of actual emails. Nothing is seeded through the API - if a step cannot be done
 * through the interface, that is a finding, not something to work around.
 *
 * Serial and single-worker on purpose. A ground is a stateful thing: an org's
 * free-ground count, the returning-versus-new distinction, and the paywall all
 * depend on what happened before, and running two at once corrupts all three.
 */
export default defineConfig({
  testDir: '.',
  // A ground with real model calls is slow, and a ground is a FULL CADENCE:
  // every session, for every person, every answer a live model call. Ground 1
  // was 24 check-ins in 42 minutes. Ground 2 is 48, with six people signing in
  // and out around them, so an hour does not cover it - and a journey cut off
  // mid-run tells you nothing except that it was cut off.
  timeout: 4 * 60 * 60 * 1000,
  expect: { timeout: 30 * 1000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    // Every step is captured: these runs are read as evidence afterwards, and a
    // failure with no picture of the screen is nearly useless.
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 900 },
    actionTimeout: 30 * 1000,
  },
  outputDir: './artifacts',
});
