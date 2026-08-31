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
    expect(GATE).toContain('brief: true');
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
    /*
     * The one thing that must never clear it: it is the action the gate guards.
     *
     * Scoped to the part that DECIDES, which is everything before the refusal is built. The gate
     * does count participants now - to find out whether the lead is in this check-in, so it does
     * not tell somebody to do a session they cannot do - and that count happens after the decision
     * to refuse has already been made. It picks the wording, never the outcome. This assertion
     * used to scan the whole method and would have gone green on a participant count that cleared
     * the gate as long as it was spelled differently, so it is stricter now, not weaker.
     */
    const whatDecides = GATE.slice(0, GATE.indexOf('const leadIsNotInIt'));
    expect(whatDecides.length).toBeGreaterThan(300);
    expect(whatDecides).not.toContain('groundParticipant');
    expect(whatDecides).not.toContain('participants');
  });

  it('and the refusal names every way out of it', () => {
    /* The message for a lead who IS in the check-in - the one that offers all four routes. */
    const i = SRC.indexOf('Nobody can be invited yet: nothing has been said about what this check-in is for. Write the');
    expect(i).toBeGreaterThan(-1);
    const message = SRC.slice(i, i + 400);
    for (const way of ['brief', 'expect of somebody', 'document or a note', 'own check-in']) {
      expect(message).toContain(way);
    }
  });
});

/**
 * TWO THINGS THE GATE GOT WRONG ABOUT WHO IT WAS TALKING TO.
 *
 * 1. A SNAPSHOT is the one situation where the gate is backwards. Every other situation is set up
 *    because the lead already knows something; a snapshot is run precisely because nobody can yet
 *    say what is going on. And the harm the gate prevents cannot arise: it sets no target and asks
 *    everybody the same open question, so nobody is measured against something they were not told.
 *
 * 2. A managingOnly lead runs the check-in and is not in it. They have no session of their own and
 *    never will, so "do your own check-in first" is an instruction that cannot be followed - the
 *    same defect as a refusal asking for more input into a box that is switched off. It also hid
 *    the real point: for them, writing something is not one option of four, it is the only way.
 */
describe('the gate knows who it is talking to', () => {
  const gate = SRC.slice(
    SRC.indexOf('private async assertSomethingToBeInvitedInto'),
    SRC.indexOf('async activate('),
  );

  it('found the gate, so an empty slice cannot pass', () => {
    expect(gate.length).toBeGreaterThan(600);
  });

  it('a snapshot clears it, because it is run to find out', () => {
    expect(gate).toContain('ground?.scenario === GroundScenario.SNAPSHOT');
    /* Read from the same query, not a second round trip. */
    expect(gate).toContain('select: { brief: true, scenario: true }');
  });

  it('and ONLY a snapshot - no other situation is exempted', () => {
    const exemptions = gate.match(/GroundScenario\.[A-Z_]+/g) ?? [];
    expect(exemptions).toEqual(['GroundScenario.SNAPSHOT']);
  });

  it('a lead who is not in it is not told to do a check-in they cannot do', () => {
    expect(gate).toContain('managingOnly: true');
    expect(gate).toContain('partyType: PartyType.INITIATOR');
    const start = gate.indexOf('running this check-in rather than taking part');
    expect(start).toBeGreaterThan(-1);
    const theirMessage = gate.slice(
      start,
      gate.indexOf('Nobody can be invited yet: nothing has been said about what this check-in is for. Write the'),
    );
    expect(theirMessage.length).toBeGreaterThan(100);
    expect(theirMessage).not.toContain('your own check-in first');
  });

  it('and their message still names all three routes that DO exist for them', () => {
    const theirMessage = gate.slice(
      gate.indexOf('running this check-in rather than taking part'),
      gate.indexOf('Nobody can be invited yet: nothing has been said about what this check-in is for. Write the'),
    );
    for (const way of ['brief', 'expect of somebody', 'document or a note']) {
      expect(theirMessage).toContain(way);
    }
  });

  it('a lead who IS in it still gets the check-in route, which is real for them', () => {
    expect(gate).toContain('your own check-in first');
  });
});
