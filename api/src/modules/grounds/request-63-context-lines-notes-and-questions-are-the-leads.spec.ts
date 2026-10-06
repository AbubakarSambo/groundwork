import { ForbiddenException } from '@nestjs/common';
import { aSetupConversation } from './request-92-harness';

/**
 * DECISIONS 63 AND 72 ON THE OTHER SETUP WRITERS (2 October 2026): a context line, a lead's private note,
 * and a question for a person. Each is the lead's, or an admin's only once the lead has left the
 * organisation, refused in the same sentence as every setup change. Behind both their own routes and Ask
 * Groundwork's doors. Who may READ a private note does not change: the lead only.
 *
 * Every writer already refused under this rule except `theQuestionForAPerson` (the step that works out the
 * sentence before the yes), which let any admin of the organisation in. It is under the rule now.
 */
const REFUSAL = 'Only Wanjiru Mwangi, who runs this check-in, can change how it is set up. An admin can only do that once Wanjiru has left the organisation. Nothing was changed.';

function asSomebody({ leadHasLeft = false } = {}) {
  const people: Record<string, any> = {
    userLead: { role: 'MEMBER', organizationId: 'org1', firstName: 'Wanjiru', lastName: 'Mwangi', isActive: !leadHasLeft },
    userAdmin: { role: 'ADMIN', organizationId: 'org1', firstName: 'Otieno', lastName: 'Kamau', isActive: true },
    userSetup: { role: 'ADMIN', organizationId: 'org1', firstName: 'Neema', lastName: 'Achieng', isActive: true },
    userAisha: { role: 'MEMBER', organizationId: 'org1', firstName: 'Aisha', lastName: 'Otieno', isActive: true },
  };
  return aSetupConversation({
    ground: { status: 'ACTIVE', createdByUserId: 'userSetup', participants: [{ id: 'pA', managingOnly: false, userId: 'userAisha' }] },
    seed: { user: { findUnique: async ({ where }: any) => people[where.id] ?? null } },
  });
}

/* Each writer, called as its route or Ask Groundwork's door calls it. */
const WRITERS: [string, (s: any, u: string) => Promise<unknown>][] = [
  ['adding a context line', (s, u) => s.addContextLine('g1', u, { kind: 'DECISION', text: 'We will drop the pilot.' })],
  ['changing a context line', (s, u) => s.changeContextLine('g1', u, 'line-1', { text: 'We will drop the pilot in May.' })],
  ['keeping a private note', (s, u) => s.addLeadContext('g1', u, { text: 'Aisha is new to the territory.' })],
  ['sharing a private note', (s, u) => s.shareLeadContext('g1', u, 'note-1')],
  ['working out a question for a person', (s, u) => s.theQuestionForAPerson('g1', u, { name: 'Aisha', leadWords: 'Ask Aisha whether the shops paid' })],
  ['keeping a question for a person', (s, u) => s.keepAQuestionForAPerson('g1', u, { participantId: 'pA', leadWords: 'Ask Aisha whether the shops paid', exactQuestion: 'Have the shops paid?' })],
  ['confirming a question for a person', (s, u) => s.confirmQuestionForPerson('g1', u, 'q-1', {})],
  ['leaving out a question for a person', (s, u) => s.declineQuestionForPerson('g1', u, 'q-1')],
];

/** The error a call ends in, or null; a refusal at the door is a ForbiddenException. */
const whatHappens = (p: Promise<unknown>) => p.then(() => null, (e) => e);

describe('the other setup writers follow decisions 63 and 72', () => {
  describe.each(WRITERS)('%s', (_what, call) => {
    it.each([
      ['Otieno, an admin, while Wanjiru is still there', 'userAdmin'],
      ['Neema, the admin who set it up, while Wanjiru is still there', 'userSetup'],
      ['Aisha, who checks in', 'userAisha'],
    ])('%s is refused in the same words, and nothing is written', async (_who, userId) => {
      const { service, writes } = asSomebody();
      const err = await whatHappens(call(service, userId));
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as Error).message).toBe(REFUSAL);
      expect(writes).toEqual([]);
    });

    it('Wanjiru, the lead, is let through', async () => {
      const { service } = asSomebody();
      expect(await whatHappens(call(service, 'userLead'))).not.toBeInstanceOf(ForbiddenException);
    });

    it.each([['Otieno', 'userAdmin'], ['Neema', 'userSetup']])('once Wanjiru has left, %s, an admin, is let through', async (_who, userId) => {
      const { service } = asSomebody({ leadHasLeft: true });
      expect(await whatHappens(call(service, userId))).not.toBeInstanceOf(ForbiddenException);
    });

    it('once Wanjiru has left, Aisha is still refused', async () => {
      const { service } = asSomebody({ leadHasLeft: true });
      expect(await whatHappens(call(service, 'userAisha'))).toBeInstanceOf(ForbiddenException);
    });
  });
});
