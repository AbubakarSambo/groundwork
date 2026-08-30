import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * COACHING IS NOT BEHIND A FLAG, AND THE FLAG IS GONE RATHER THAN LEFT LYING THERE.
 *
 * This file used to prove the opposite: that coaching was off unless somebody set COACHING_ENABLED
 * to the exact string "true", so it could never arrive by accident through a misspelled variable.
 * That was the right shape for a feature nobody had decided about.
 *
 * It was never turned on anywhere, for long enough that the coach had run for nobody. The decision
 * is made now, and a switch that no longer switches anything is worse than no switch at all - the
 * next person reads it, believes coaching is configurable, and turns it "off" to no effect.
 *
 * WHAT DID NOT CHANGE. The coach is still silent when there is nothing to raise, which is most
 * sessions, and it still says nothing about somebody it has not just heard from. Being on is not
 * the same as speaking.
 */
/*
 * COMMENTS STRIPPED FIRST, which this repository requires of every source-assertion spec and for a
 * reason I have proved four times today: this file's own explanation names the flag it is checking
 * has gone, so a match against the raw text would find the prose and pass while the flag was still
 * being read.
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, '');
const CONFIG = strip(readFileSync(join(__dirname, 'configuration.ts'), 'utf8'));
const SERVICE = strip(readFileSync(join(__dirname, '..', 'modules', 'conversation', 'conversation.service.ts'), 'utf8'));

describe('the flag', () => {
  it('is gone from the configuration', () => {
    expect(CONFIG).not.toContain('COACHING_ENABLED');
    expect(CONFIG).not.toContain('coachingEnabled');
  });

  it('and nothing reads an environment variable to decide whether to coach', () => {
    const gate = SERVICE.slice(SERVICE.indexOf('private coachingEnabled()'));
    expect(gate.slice(0, 400)).not.toContain('process.env');
    expect(gate.slice(0, 400)).not.toContain('this.config');
  });
});

describe('what stayed true', () => {
  it('the coach still says nothing when there is no step outstanding', () => {
    /* Being on is not the same as speaking. `coachingBlock` returns empty on no current step. */
    expect(SERVICE).toContain("if (!row?.currentStep) return '';");
  });

  it('and never asks about a step it gave in this same session', () => {
    expect(SERVICE).toContain('if (state.stepGivenAt !== null && state.stepGivenAt >= sessionNumber)');
  });
});
