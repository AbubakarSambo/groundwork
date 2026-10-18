import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THERE IS ONE WAY IN FROM WHATSAPP. Two live inbound handlers on two routes drifted for months: the
 * platform one dropped the first message, looked identity up across every tenant, picked the oldest
 * open check-in in silence and handled no media. It is now a door: the shared-secret signature, which
 * organisation the sender means, and a hand-off to the organisation handler. Every fix is written once.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const platform = strip(readFileSync(join(__dirname, 'whatsapp.controller.ts'), 'utf8'));
const service = strip(readFileSync(join(__dirname, 'whatsapp.service.ts'), 'utf8'));
const org = strip(readFileSync(join(__dirname, '..', 'public-api', 'whatsapp-for-an-organisation.service.ts'), 'utf8'));

describe('the platform route', () => {
  it('delegates to the organisation handler and keeps no routing body of its own', () => {
    /* With the number it came in on, so the reply goes back on the same one (survey item 8). */
    expect(platform).toMatch(/await this\.inbound\.handle\(organizationId, body, 'ours'\)/);
    for (const gone of ['this.conversation.open(', 'this.conversation.sendMessage(', 'checkIn.findFirst', 'findUserByPhoneNumber']) {
      expect(platform).not.toContain(gone);
    }
  });
  it('and the unscoped phone lookup no longer exists anywhere', () => {
    expect(service).not.toContain('findUserByPhoneNumber');
    expect(service).toMatch(/async whichOrganisations\(rawNumber: string\)/);
  });
});

describe('the organisation handler', () => {
  it('says the roster-but-not-linked fact instead of "nothing open"', () => {
    expect(org).toContain("is not connected to a Groundwork sign-in yet");
  });
  it('keeps a short first answer and drops only a greeting, matched by a list', () => {
    expect(org).not.toMatch(/text\.length <= 12/);
    expect(org).toMatch(/if \((?:A_GREETING_ALONE\.test\(text\)|isAGreetingOrARequestToStart\(text\))( \|\| beginning)?\) \{ await say\(reply\); return; \}/);
  });
  it('matches finish before the status and answers honestly on a session not yet opened', () => {
    const finishOnNotStarted = org.indexOf("A_FINISH_WORD.test(text) && current.status === 'NOT_STARTED'");
    const finishOnInProgress = org.indexOf("A_FINISH_WORD.test(text) && current.status === 'IN_PROGRESS'");
    const answerPath = org.indexOf("if (current.status === 'NOT_STARTED') {\n        const first = await this.conversation.open(");
    expect(finishOnNotStarted).toBeGreaterThan(-1);
    expect(finishOnNotStarted).toBeLessThan(finishOnInProgress);
    expect(finishOnInProgress).toBeLessThan(answerPath);
    expect(org).toContain('There is nothing to finish yet - this check-in has not started.');
  });
});
