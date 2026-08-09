import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE GROUND RUNS AT THE RHYTHM THEY ASKED FOR.
 *
 * GW-017. Sahar said, in the setup conversation, "90 days, weekly check-ins". The
 * ground was created as:
 *
 *   grounds:  timeline_days = 90   cadence = FORTNIGHTLY
 *   brief:    "...Goals: Have it written down, 90 days, weekly check-ins."
 *
 * The duration survived and the cadence did not, so the ground ran at about six
 * sessions instead of twelve - half the period she described - and every "N
 * sessions" figure downstream inherited the error.
 *
 * The cause was not comprehension. Her words are sitting correctly in the brief.
 * The cadence was simply never extracted: the client held
 * `useState('FORTNIGHTLY')` and nothing ever updated it, so whatever anyone said
 * about rhythm was discarded on the way to the enum, and the default masqueraded
 * as a decision.
 *
 * Now the onboarding extraction reads both cadence and duration, and the prompt is
 * explicitly told NEVER to guess - because a fabricated cadence is worse than an
 * absent one. Absent means the existing default stands and the person can edit it;
 * invented means the ground is quietly wrong and nobody knows.
 */

const SRC = readFileSync(join(__dirname, 'entry.service.ts'), 'utf8');

/** The onboarding extraction prompt and tool. */
const EXTRACT = (() => {
  const i = SRC.indexOf('const EXTRACT_SYSTEM');
  expect(i).toBeGreaterThan(-1);
  return SRC.slice(i, SRC.indexOf('const allMessages', i));
})();

describe('the extraction asks for rhythm and length', () => {
  it('asks for a cadence', () => {
    expect(EXTRACT).toMatch(/- cadence: how often they check in, IF they said/);
  });

  it('asks for a duration in days', () => {
    expect(EXTRACT).toMatch(/- timelineDays: how long the whole period runs, in days, IF they said/);
  });

  it('maps ordinary words, including the one that was getting lost', () => {
    // "weekly" -> WEEKLY is the exact case that failed live.
    expect(EXTRACT).toMatch(/"weekly" or "every week" -> WEEKLY/);
    expect(EXTRACT).toMatch(/"every two weeks", "fortnightly", "every other week" -> FORTNIGHTLY/);
    expect(EXTRACT).toMatch(/"monthly" or "once a month" -> MONTHLY/);
  });

  it('maps the durations people actually use', () => {
    expect(EXTRACT).toMatch(/"90 days" or "three months" -> 90/);
    expect(EXTRACT).toMatch(/"a quarter" -> 90/);
  });
});

describe('it never invents one', () => {
  it('says so, in the prompt, with the reason', () => {
    // A guessed cadence sets up the wrong ground and nobody can tell.
    expect(EXTRACT).toMatch(/Never guess a cadence or a duration/);
    expect(EXTRACT).toMatch(/a wrong number here silently sets up the wrong ground/);
  });

  it('tells the model to omit rather than fill in', () => {
    expect(EXTRACT).toMatch(/Omit it entirely if they did not say/);
    expect(EXTRACT).toMatch(/Omit if they did not say/);
  });
});

describe('the fields exist on the tool, so they can actually come back', () => {
  it('constrains cadence to the real enum values', () => {
    expect(EXTRACT).toMatch(/cadence: \{ type: 'string', enum: \['DAILY', 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ONE_TIME'\] \}/);
  });

  it('carries timelineDays as a number', () => {
    expect(EXTRACT).toMatch(/timelineDays: \{ type: 'number' \}/);
  });

  it('records why this exists, next to the field', () => {
    // So the next person to trim this schema knows what it cost.
    expect(EXTRACT).toMatch(/GW-017/);
  });
});
