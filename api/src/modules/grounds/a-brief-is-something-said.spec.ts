import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * THE REFUSAL WAS UNTRUE, AND I WATCHED IT HAPPEN.
 *
 * Setup asks for a brief in as many words - "say who this is about and what they have been brought
 * in to do" - stores it on the ground, and then adds the participants. This gate counted documents
 * and lead notes and NOT the brief, so every participant added from the setup flow was refused with
 * "nothing has been said about what this check-in is for" while the lead's own description of it sat
 * on the same row.
 *
 * Reproduced in the browser against a running API: created a ground with a full, specific brief,
 * called the participants endpoint, and got the refusal back.
 *
 * WHAT STILL DOES NOT CLEAR IT: adding a person. The gate exists so nobody opens their first session
 * and answers into a vacuum, and the act of inviting somebody says nothing about what the check-in
 * is for. A gate cleared by the action it guards is not a gate.
 *
 * Comments stripped: this explanation quotes the code it protects.
 */
const SRC = readFileSync(join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, '');

const GATE = SRC.slice(
  SRC.indexOf('private async assertSomethingToBeInvitedInto'),
  SRC.indexOf('Nobody can be invited yet'),
);

describe('what counts as something to be invited into', () => {
  it('finds the gate, so an empty slice cannot pass', () => {
    expect(GATE.length).toBeGreaterThan(300);
  });

  it('the lead having finished their own check-in still clears it', () => {
    expect(GATE).toContain('status: CheckInStatus.COMPLETED');
    expect(GATE).toContain('partyType: PartyType.INITIATOR');
  });

  it('a document or a note still clears it', () => {
    expect(GATE).toContain('groundDocument.count');
    expect(GATE).toContain('leadContextNote.count');
  });

  it('and the brief clears it, which is the fix', () => {
    expect(GATE).toContain('select: { brief: true }');
    expect(GATE).toContain("(ground?.brief ?? '').trim().length >= GroundsService.MEANS_SOMETHING");
  });

  it('but only a brief long enough to tell somebody anything', () => {
    /* Four words typed to get past a field tells the person answering nothing. */
    expect(SRC).toContain('private static readonly MEANS_SOMETHING = 40');
  });

  it('an expectation clears it, being the strongest form of what it asks for', () => {
    /* Somebody named, and what is wanted of them. Setup can record one now. */
    expect(GATE).toContain('personObjective.count');
  });

  it('adding a person does NOT clear it', () => {
    /* The one thing that must never clear it: it is the action the gate guards. */
    expect(GATE).not.toContain('groundParticipant.count');
  });

  it('and the refusal names every way out of it', () => {
    const message = SRC.slice(SRC.indexOf('Nobody can be invited yet'), SRC.indexOf('Nobody can be invited yet') + 400);
    for (const way of ['brief', 'expect of somebody', 'document or a note', 'own check-in']) {
      expect(message).toContain(way);
    }
  });
});
