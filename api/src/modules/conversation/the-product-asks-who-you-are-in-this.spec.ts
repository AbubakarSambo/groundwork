import { readFileSync } from 'fs';
import { join } from 'path';
import { STARTING_SCENARIOS, WHO_ARE_YOU_IN_THIS } from './prompt-library';

/**
 * A THIRD PARTY WAS ASKED THE HIRE'S QUESTION, THEN THE LEAD'S.
 *
 * The prompt has two roles. Every non-initiator got the participant block, which in NEW_HIRE is
 * "what do you think you were hired to do". Walked as the clinic a ward refers into, the model saw
 * the person was not the hire and improvised the initiator's framing: "what will she be doing that
 * you are doing now?" He does not do her job.
 *
 * Nothing on a participant row says whether they are the person the check-in is about, so the
 * product asks, in its own words, as the first line - and the pack has a block for the answer that
 * is not "the hire".
 */
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const SERVICE = strip(readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8'));

describe('the product asks who you are in this', () => {
  it('the first line to a non-lead in a starting scenario is written by the product, not the model', () => {
    const at = SERVICE.indexOf(': startsSomething && notTheLead');
    expect(at).toBeGreaterThan(-1);
    expect(SERVICE.slice(at, at + 400)).toContain('? WHO_ARE_YOU_IN_THIS');
  });

  it('and not on a correction or a closing session, which have their own openers', () => {
    const at = SERVICE.indexOf(': startsSomething && notTheLead');
    expect(SERVICE.slice(at, at + 200)).toContain('correctingSession == null');
    expect(SERVICE.slice(at, at + 200)).toContain('!(checkIn as any).isFinal');
  });

  it('and only on a first session, reading the scenario from the ground that was actually loaded', () => {
    /* Found live: the guard read `checkIn.ground`, which is never included, so it was always false
       and the model wrote the opener. And session two already has the answer in session one. */
    const at = SERVICE.indexOf('const startsSomething = STARTING_SCENARIOS.has(');
    expect(SERVICE.slice(at, at + 120)).toContain('ground?.scenario');
    expect(SERVICE.slice(at, at + 120)).not.toContain('checkIn as any).ground');
    /* Their own first session (22 November, 0987cfdf1), so somebody added while the team is on session 3 is still asked. */
    expect(SERVICE).toContain('const firstSession = (await theirOwnSessionNumber(this.prisma, checkIn)) === 1;');
    expect(SERVICE).toMatch(/startsSomething && notTheLead && firstSession/);
  });

  it('covers every scenario whose pack has role-specific questions', () => {
    for (const s of ['NEW_HIRE', 'NEW_COFOUNDER', 'NEW_ADVISOR', 'NEW_PROJECT', 'NEW_MANAGER', 'CONTRACT_RENEWAL', 'ROLE_HANDOVER']) {
      expect(STARTING_SCENARIOS.has(s)).toBe(true);
    }
  });

  it('the pack gives the model a block for somebody who is not the person this is about', () => {
    const lib = readFileSync(join(__dirname, 'prompt-library.ts'), 'utf8');
    expect(lib).toContain('ROLE-SPECIFIC QUESTIONS - somebody else in this');
    expect(lib).toContain('NEVER the participant ones');
    expect(lib).toContain(WHO_ARE_YOU_IN_THIS);
  });

  it('the question itself carries no role, no name and no assumption', () => {
    expect(WHO_ARE_YOU_IN_THIS).not.toMatch(/\b(hire|manager|lead|she|he|her|him)\b/i);
  });
});
