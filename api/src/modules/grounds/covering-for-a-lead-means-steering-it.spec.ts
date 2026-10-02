import * as fs from 'fs';
import * as path from 'path';

/**
 * SOMEBODY WHO CAN END A CHECK-IN CAN ALSO STEER IT.
 *
 * The org admin's powers were split down a line nobody drew on purpose. An admin in this organisation
 * could RELEASE the report and CLOSE the check-in - the two least reversible acts in the product - and
 * could not write a context note or use the context chat.
 *
 * So the person covering for a lead who has left, or is on leave, could finish the thing and could not
 * set it up. That is the wrong way round: the reversible power was withheld and the irreversible one
 * granted.
 *
 * They already read with the lead's eyes elsewhere in this file - the ground read, the contact
 * visibility setting, the timeline. These two paths were the ones that forgot.
 *
 * WHAT THIS DOES NOT CHANGE, and the distinction is the whole product: who may WRITE a note is a
 * different question from what a note may be USED for. A note is still never quoted, never
 * attributed, never a fact about anybody, and a note about a person is still never shown to that
 * person. Widening the author never widens the use.
 */
const SERVICE = fs
  .readFileSync(path.join(__dirname, 'grounds.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

function body(name: string): string {
  const i = SERVICE.indexOf(`async ${name}(`);
  expect(i).toBeGreaterThan(-1);
  return SERVICE.slice(i, i + 2600);
}

describe('covering for a lead means being able to steer it', () => {
  /**
   * DECISION 63, 30 September 2026, NARROWED `addLeadContext` (and, with it, every other setup
   * writer in this file) FROM "ANY ADMIN OF THE ORGANISATION, AT ANY TIME" TO "THE LEAD, OR - ONLY
   * ONCE THE LEAD HAS LEFT THE ORGANISATION - AN ADMIN". Kept here, updated rather than removed,
   * because the underlying finding this test protects is still true and still worth pinning: an
   * admin covering for an absent lead should be able to steer the check-in, not only end it. What
   * changed is WHEN that admin may act - `updateTimeline` and `contextChat` (the propose half of
   * setting up a check-in, as against `applyContextProposal`, the confirm half) still let any admin
   * of the organisation act at any time, which this loop still checks; `addLeadContext` now goes
   * through `mayConfirmSetupOn` and has its own describe block below.
   */
  /* Changed 2 October 2026: contextChat left this loop. It let any admin of the organisation steer a check-in
     while its lead was still there, which decisions 63 and 72 rule out; it now goes through mayConfirmSetupOn
     (see its own describe block below, and request-63-the-context-chat-is-the-leads.spec.ts). */
  for (const fn of ['updateTimeline']) {
    describe(fn, () => {
      it('lets an admin in the same organisation act', () => {
        const b = body(fn);
        /* The one rule, which asks the role in THIS organisation: grounds/who-may-read-this-check-in.ts. */
        expect(b).toContain('adminsThisOrg({ ...viewer, userId: requestingUserId }, ');
      });

      /**
       * SCOPED TO THIS ORGANISATION. An ADMIN role alone is not enough - it would let an admin of one
       * company write context into another company's check-in.
       */
      it('and only in the same organisation', () => {
        expect(body(fn)).toMatch(/isOrgAdmin = adminsThisOrg\(\{ \.\.\.viewer, userId: requestingUserId \}, /);
      });

      it('still refuses everybody else, and says who may', () => {
        const b = body(fn);
        expect(b).toContain('ForbiddenException');
      });
    });
  }

  /**
   * BOUND TO THE GATE, NOT TO THE WORDS NEARBY. The first version asserted `isOrgAdmin` and the
   * refusal message appeared somewhere in the method - and a mutation removing `&& !isOrgAdmin` from
   * the schedule check left both strings sitting there, so it stayed green while an org admin was
   * refused again. The declaration is not the decision.
   */
  it('and the schedule gate itself lets them through', () => {
    expect(body('updateTimeline')).toContain(
      "if (changesTheSchedule && ground.initiatorId !== requestingUserId && !isOrgAdmin)",
    );
  });

  /**
   * ADDLEADCONTEXT, DECISION 63'S OWN RULE: the lead confirms, or - only once the lead has left the
   * organisation - an admin of it, through the one shared gate `mayConfirmSetupOn` (grounds.service)
   * / `whoMayConfirmSetup` (who-may-confirm-setup.ts) every setup writer in this file now calls.
   */
  describe('contextChat', () => {
    it('goes through the one decision 63 gate, not "any admin, any time"', () => {
      const b = body('contextChat');
      expect(b).toContain('await this.mayConfirmSetupOn(ground, requestingUserId);');
      expect(b).not.toContain('isOrgAdmin');
    });
  });

  describe('addLeadContext', () => {
    it('goes through the one decision 63 gate, not its own copy of "any admin, any time"', () => {
      const b = body('addLeadContext');
      expect(b).toContain('this.mayConfirmSetupOn(ground, requestingUserId)');
      expect(b).not.toContain('adminsThisOrg(viewer, ground)');
    });

    /** The audience rule is untouched: a shared note is still about the whole check-in only. */
    it('does not touch what a note may be used for', () => {
      const b = body('addLeadContext');
      expect(b).toContain('audience === ContextNoteAudience.EVERYONE && dto.participantId');
    });
  });
});
