import * as fs from 'fs';
import * as path from 'path';

/**
 * NOBODY IS INVITED INTO AN EMPTY CHECK-IN. GW-EXP-8.
 *
 * Her decision, in her words: "setup is key or you go set up the context in the context tab."
 *
 * WHAT THIS PROTECTS. Somebody's first session is the one you cannot redo - what they say into it is
 * on the record. If the invitation goes out before anything has been said about what the check-in is
 * for, they answer into a vacuum, which is the exact failure the expectation work exists to end. And
 * an invitation cannot be recalled: the person has already read it.
 *
 * WHY A SPEC ON THE SOURCE. The gate is a refusal, so the thing worth pinning is that it is REACHED
 * from the invite path and that it names both ways out. A defensive query - one that swallows its own
 * error and returns zero - would let the gate pass silently, so this also pins that it does not.
 */
/**
 * COMMENTS STRIPPED FIRST. This file quotes its own assertions inside its explanation, and the gate it
 * guards explains itself at length in prose - so an unstripped match would go green on a sentence
 * while the code beneath it was gone. That has happened in this repository before.
 */
const SERVICE = fs
  .readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('nobody is invited into an empty check-in', () => {
  const gate = (() => {
    const start = SERVICE.indexOf('private async assertSomethingToBeInvitedInto');
    expect(start).toBeGreaterThan(-1);
    const end = SERVICE.indexOf('async addParticipant(', start);
    expect(end).toBeGreaterThan(start);
    return SERVICE.slice(start, end);
  })();

  it('is called from the path that sends the invitation', () => {
    const add = SERVICE.slice(SERVICE.indexOf('async addParticipant('));
    expect(add).toContain('await this.assertSomethingToBeInvitedInto(groundId)');
  });

  it('lets the lead through once their own conversation is finished', () => {
    expect(gate).toContain('status: CheckInStatus.COMPLETED');
    expect(gate).toContain('partyType: PartyType.INITIATOR');
  });

  it('lets the lead through on context alone, which is the second way out', () => {
    expect(gate).toContain('groundDocument.count');
    expect(gate).toContain('leadContextNote.count');
  });

  /**
   * A gate that swallows a failed query answers "nothing here" to a question it never got to ask, and
   * a refusal that cannot happen is not a refusal.
   */
  it('does not swallow its own queries', () => {
    expect(gate).not.toContain('.catch(');
  });

  /** The house rule: a refusal that does not say what to do next is the failure, not the fix. */
  it('names both ways out in the refusal itself', () => {
    const refusal = gate.slice(gate.indexOf('BadRequestException'));
    expect(refusal).toMatch(/your own check-in/i);
    expect(refusal).toMatch(/Context and resources/i);
  });
});
