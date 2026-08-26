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
   * `updateTimeline` joined these two once the write-actions table was checked role by role. Who Sees
   * What has the org admin able to change timeline and rhythm; the code refused them, which is the
   * same split the wrong way round - release and close permitted, reschedule not.
   */
  for (const fn of ['addLeadContext', 'contextChat', 'updateTimeline']) {
    describe(fn, () => {
      it('lets an admin in the same organisation act', () => {
        const b = body(fn);
        expect(b).toContain("viewer?.role === 'ADMIN'");
        expect(b).toContain('viewer.organizationId === ground.organizationId');
      });

      /**
       * SCOPED TO THIS ORGANISATION. An ADMIN role alone is not enough - it would let an admin of one
       * company write context into another company's check-in.
       */
      it('and only in the same organisation', () => {
        expect(body(fn)).toMatch(/isOrgAdmin = viewer\?\.role === 'ADMIN' && viewer\.organizationId === ground\.organizationId/);
      });

      it('still refuses everybody else, and says who may', () => {
        const b = body(fn);
        expect(b).toContain('ForbiddenException');
        /** One phrasing across all three, addressed to the person being refused. */
        expect(b).toMatch(/admin in your organisation/i);
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

  /** The audience rule is untouched: a shared note is still about the whole check-in only. */
  it('does not touch what a note may be used for', () => {
    const b = body('addLeadContext');
    expect(b).toContain('audience === ContextNoteAudience.EVERYONE && dto.participantId');
  });
});
