/**
 * READS COMMENTS ON PURPOSE - DO NOT ADD COMMENT-STRIPPING TO THIS FILE.
 *
 * Most source-assertion specs in this repo must strip comments before matching, because this
 * codebase quotes code verbatim inside long explanatory comments and a guard that matches one is
 * satisfied by prose while the code it protects is gone. Sixty-seven specs were changed for exactly
 * that reason.
 *
 * This file is one of seven that are the OPPOSITE case: its job is to hold a comment to account -
 * to fail when the prose starts describing behaviour the code no longer has. Stripping comments here
 * removes the very thing under test.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { PartyType } from '@prisma/client';
import { buildIntakeBlock } from './prompt-library';

/**
 * Ground-situation context guard: "context yes, answers never."
 *
 * (1) An invited participant's intake block must carry the ground's brief AS
 * LABELED CONTEXT - with attribution rules that forbid presenting it as the
 * participant's own account - so they know what they were added to without
 * being led to echo the initiator's goals.
 * (2) The initiator's intake is unchanged (the brief is their own framing -
 * no attribution block).
 * (3) The initiator's ANSWERS never reach another party: every conversation-
 * turn query in conversation.service is scoped to a single check-in
 * (checkInId), and the architectural hard rule stays documented. If someone
 * adds a cross-party turn query or drops the rule, this bites.
 */
const CTX_BASE = {
  scenario: 'NEW_PROJECT' as any,
  sessionNumber: 1,
  otherPartyCheckedIn: true,
  groundLabel: 'Groundwork project',
  adminBrief: 'Ship the first onboarding flow to production this quarter; paid subscription is the sign of success.',
};

describe('participant ground-situation context (context yes, answers never)', () => {
  it('participant intake carries the brief plus attribution rules', () => {
    const block = buildIntakeBlock({ ...CTX_BASE, partyType: PartyType.PARTICIPANT } as any);
    expect(block).toContain('ADMIN_BRIEF: Ship the first onboarding flow');
    expect(block).toMatch(/ADMIN_BRIEF_ATTRIBUTION:/);
    expect(block).toMatch(/NOT this person's account/i);
    expect(block).toMatch(/Elicit THEIR independent account/i);
  });

  it('initiator intake carries its own attribution: the brief is an instruction to the product, not their stated position', () => {
    /* Adversarial run, 20 Sep 2026: a managing partner's setup brief was read back to her as "your stated
       expectation was to Help the person develop clarity". The lead's block now says what the brief is. */
    const block = buildIntakeBlock({ ...CTX_BASE, partyType: PartyType.INITIATOR } as any);
    expect(block).toContain('ADMIN_BRIEF: Ship the first onboarding flow');
    expect(block).toMatch(/ADMIN_BRIEF_ATTRIBUTION: The brief above is what this person wrote at setup/);
    expect(block).not.toMatch(/NOT this person's account/);
  });

  it('answers never: every content-bearing turn load is check-in-scoped and the hard rule stands', () => {
    const src = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8');
    expect(src).toMatch(/HARD RULE \(architectural\): a party's transcript and record are NEVER loaded/);
    // findMany is what returns turn CONTENT (the arrays fed into prompts) -
    // each one must be keyed by a single checkInId. findFirst/count are
    // allowed as presence checks (e.g. round-started metering) because no
    // content from them reaches a prompt.
    const queries = src.match(/conversationTurn\.findMany\(\s*\{[\s\S]{0,200}?where:\s*\{[\s\S]{0,120}?\}/g) ?? [];
    expect(queries.length).toBeGreaterThanOrEqual(4);
    for (const q of queries) {
      expect(q).toMatch(/checkInId/);
      expect(q).not.toMatch(/groundId/);
    }
  });
});
