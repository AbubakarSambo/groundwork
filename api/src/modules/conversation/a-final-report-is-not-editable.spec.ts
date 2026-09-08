import { BadRequestException } from '@nestjs/common';
import {
  whetherItCanStillBeCorrected,
  refuseIfTheWindowHasClosed,
  DEFAULT_CORRECTION_WINDOW_DAYS,
  isAWindow,
  MAX_CORRECTION_WINDOW_DAYS,
} from './the-window-for-correcting-a-record';
import * as fs from 'fs';
import * as path from 'path';

/**
 * "IT SEEMS YOU CAN STILL CORRECT A REPORT WHEN IT'S FINAL."
 *
 * There was one lock and it was about SESSIONS: a session cannot be corrected once a later one has
 * started, because the later ones build on it. Nothing said anything about the REPORT having gone
 * out - so a round could close, everybody read the shared report, and the account it was built
 * from could still be quietly edited afterwards.
 */
const DAY = 24 * 60 * 60 * 1000;

describe('the window for correcting a record', () => {
  it('is open while the report has not gone out', () => {
    expect(whetherItCanStillBeCorrected({ releasedAt: null, windowDays: 0 })).toEqual({ allowed: true });
  });

  it('stays open for the window after release, because that is when people spot errors', () => {
    const released = new Date('2026-09-01T10:00:00Z');
    expect(
      whetherItCanStillBeCorrected({ releasedAt: released, windowDays: 7, now: new Date('2026-09-07T10:00:00Z') }),
    ).toEqual({ allowed: true });
  });

  it('and closes after it, naming the day rather than the arithmetic', () => {
    const released = new Date('2026-09-01T10:00:00Z');
    const out = whetherItCanStillBeCorrected({ releasedAt: released, windowDays: 7, now: new Date('2026-09-20T10:00:00Z') });
    expect(out.allowed).toBe(false);
    expect((out as any).saying).toContain('8 September 2026');
    /* And says where the thing they wanted to say can still go. A refusal with no route is a wall. */
    expect((out as any).saying).toContain('next check-in');
  });

  it('honours a deliberate zero as "final when shared"', () => {
    const out = whetherItCanStillBeCorrected({
      releasedAt: new Date('2026-09-01T10:00:00Z'),
      windowDays: 0,
      now: new Date('2026-09-01T10:00:01Z'),
    });
    expect(out.allowed).toBe(false);
    expect((out as any).saying).toContain('final');
  });

  it('but never treats a broken row as zero', () => {
    /* Zero from a nonsense row would make every released report uncorrectable, platform-wide. */
    for (const bad of [null, undefined, '7', 7.5, -1, MAX_CORRECTION_WINDOW_DAYS + 1, {}, NaN]) {
      expect(isAWindow(bad)).toBe(false);
    }
    expect(isAWindow(0)).toBe(true);
    expect(isAWindow(DEFAULT_CORRECTION_WINDOW_DAYS)).toBe(true);
  });

  it('throws the same sentence it would have said', () => {
    expect(() =>
      refuseIfTheWindowHasClosed({ releasedAt: new Date(Date.now() - 40 * DAY), windowDays: 7 }),
    ).toThrow(BadRequestException);
  });
});

describe('the correction path applies it', () => {
  const service = fs
    .readFileSync(path.join(__dirname, 'conversation.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('checks the window before opening a correction session', () => {
    const at = service.indexOf('async startSelfCorrectionSession(');
    expect(at).toBeGreaterThan(-1);
    const body = service.slice(at, at + 3000);
    expect(body).toContain('refuseIfTheWindowHasClosed({');
    expect(body).toContain('releasedAt: releasedReport?.releasedAt ?? null');
  });

  it('and reads the window from the database, falling back to the shipped default', () => {
    expect(service).toContain('platformSetting.findUnique({ where: { key: CORRECTION_WINDOW_KEY } })');
    expect(service).toContain('return DEFAULT_CORRECTION_WINDOW_DAYS;');
  });
});
