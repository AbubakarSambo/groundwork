import { GroundsService } from './grounds.service';
import { ContextItemKind } from '@prisma/client';
import { onlyTheLeadConfirmsSetup } from './who-may-confirm-setup';

/* Request 92, point 8: the refusal names the lead, in full sentences. */
const ONLY_THE_LEAD_CONFIRMS_SETUP = onlyTheLeadConfirmsSetup('Tunde Ade');

/**
 * DECISION 63, 30 September 2026: "Only the lead confirms setup changes and questions for people,
 * unless the lead has left the organisation; then an admin of that organisation can, and the people
 * on the check-in are told who did it."
 *
 * Exercised on two of the eight doors `mayConfirmSetupOn` now gates: `addContextLine` (a context
 * line, the plainest of the "setup changes") and `confirmQuestionForPerson` /
 * `declineQuestionForPerson` (a question for somebody on the check-in). The same four cases, on
 * both doors:
 *   1. the lead can;
 *   2. an admin cannot while the lead is still in the organisation, with the plain refusal sentence;
 *   3. an admin can once the lead has left, and the row a participant may read carries a sentence
 *      naming them;
 *   4. a participant (neither the lead nor an admin) never can.
 */

const GROUND_ID = 'g1';
const LEAD_ID = 'lead-1';
const ADMIN_ID = 'admin-1';
const PARTICIPANT_ID = 'participant-user-1';
const ORG_ID = 'org-1';

function makeService(opts: { leadIsActive: boolean }) {
  const groundRow = { id: GROUND_ID, initiatorId: LEAD_ID, organizationId: ORG_ID, status: 'ACTIVE', endState: null };
  const users: Record<string, any> = {
    [LEAD_ID]: { isActive: opts.leadIsActive, firstName: 'Tunde', lastName: 'Ade', role: 'LEAD', organizationId: ORG_ID },
    [ADMIN_ID]: { isActive: true, firstName: 'Ngozi', lastName: 'Bello', role: 'ADMIN', organizationId: ORG_ID },
    [PARTICIPANT_ID]: { isActive: true, firstName: 'Femi', lastName: 'Okoro', role: 'MEMBER', organizationId: ORG_ID },
  };
  const createdLines: any[] = [];
  const questionLine = {
    id: 'q1',
    text: 'Ask about the Lagos numbers',
    aboutParticipantId: 'about-1',
    exactQuestion: null as string | null,
    closedAt: null as Date | null,
    confirmedByAdminNote: null as string | null,
  };
  const prisma: any = {
    ground: { findUnique: jest.fn(async () => groundRow) },
    user: { findUnique: jest.fn(async ({ where }: any) => users[where.id] ?? null) },
    groundContextItem: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `line-${createdLines.length + 1}`, ...data };
        createdLines.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where }: any) => {
        if (where.kind === ContextItemKind.QUESTION_FOR_PERSON && where.id === questionLine.id) return { ...questionLine };
        return null;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        Object.assign(questionLine, data);
        return { ...questionLine, id: where.id };
      }),
    },
    groundParticipant: {
      findMany: jest.fn(async () => [{ id: 'about-1', email: 'femi@example.test', nameGiven: null, user: { firstName: 'Femi', lastName: 'Okoro' } }]),
      findFirst: jest.fn(async () => ({ id: 'about-1', email: 'femi@example.test', nameGiven: null, user: { firstName: 'Femi', lastName: 'Okoro' } })),
    },
  };
  const service = new GroundsService(prisma, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { service, prisma, createdLines, questionLine };
}

describe('the refusal an admin or a participant reads', () => {
  it('names the lead and says plainly that nothing was changed', () => {
    expect(ONLY_THE_LEAD_CONFIRMS_SETUP).toBe('Only Tunde Ade, who runs this check-in, can change how it is set up. An admin can only do that once Tunde has left the organisation. Nothing was changed.');
  });
});

describe('decision 63: who may confirm setup on a check-in', () => {
  describe('door one: addContextLine', () => {
    it('the lead can add a context line', async () => {
      const { service } = makeService({ leadIsActive: true });
      const made = await service.addContextLine(GROUND_ID, LEAD_ID, { kind: 'NOTE', text: 'We are pausing the pilot.' });
      expect(made.text).toBe('We are pausing the pilot.');
      expect((made as any).confirmedByAdminNote).toBeNull();
    });

    it('an admin cannot add a context line while the lead is still in the organisation, and reads the plain refusal', async () => {
      const { service } = makeService({ leadIsActive: true });
      await expect(service.addContextLine(GROUND_ID, ADMIN_ID, { kind: 'NOTE', text: 'We are pausing the pilot.' }))
        .rejects.toMatchObject({ message: ONLY_THE_LEAD_CONFIRMS_SETUP });
    });

    it('an admin can add a context line once the lead has left the organisation, and the line carries a sentence naming them', async () => {
      const { service } = makeService({ leadIsActive: false });
      const made = await service.addContextLine(GROUND_ID, ADMIN_ID, { kind: 'NOTE', text: 'We are pausing the pilot.' });
      expect((made as any).confirmedByAdminNote).toBe('Ngozi Bello confirmed this because Tunde Ade has left the organisation.');
    });

    it('a participant who is neither the lead nor an admin can never add a context line, whether or not the lead has left', async () => {
      const stillHere = makeService({ leadIsActive: true });
      await expect(stillHere.service.addContextLine(GROUND_ID, PARTICIPANT_ID, { kind: 'NOTE', text: 'x' }))
        .rejects.toMatchObject({ message: ONLY_THE_LEAD_CONFIRMS_SETUP });
      const leadGone = makeService({ leadIsActive: false });
      await expect(leadGone.service.addContextLine(GROUND_ID, PARTICIPANT_ID, { kind: 'NOTE', text: 'x' }))
        .rejects.toMatchObject({ message: ONLY_THE_LEAD_CONFIRMS_SETUP });
    });
  });

  describe('door two: confirmQuestionForPerson and declineQuestionForPerson', () => {
    it('the lead can confirm a question for somebody on the check-in', async () => {
      const { service } = makeService({ leadIsActive: true });
      const result = await service.confirmQuestionForPerson(GROUND_ID, LEAD_ID, 'q1', {});
      expect(result.say).toContain('I have confirmed it.');
      expect(result.confirmedByAdminNote).toBeNull();
    });

    it('the lead can decline a question for somebody on the check-in', async () => {
      const { service } = makeService({ leadIsActive: true });
      const result = await service.declineQuestionForPerson(GROUND_ID, LEAD_ID, 'q1');
      expect(result.say).toContain('I have left it out.');
    });

    it('an admin cannot confirm or decline a question while the lead is still in the organisation, and reads the plain refusal', async () => {
      const { service } = makeService({ leadIsActive: true });
      await expect(service.confirmQuestionForPerson(GROUND_ID, ADMIN_ID, 'q1', {}))
        .rejects.toMatchObject({ message: ONLY_THE_LEAD_CONFIRMS_SETUP });
      await expect(service.declineQuestionForPerson(GROUND_ID, ADMIN_ID, 'q1'))
        .rejects.toMatchObject({ message: ONLY_THE_LEAD_CONFIRMS_SETUP });
    });

    it('an admin can confirm a question once the lead has left, and the card carries a sentence naming them', async () => {
      const { service } = makeService({ leadIsActive: false });
      const result = await service.confirmQuestionForPerson(GROUND_ID, ADMIN_ID, 'q1', {});
      expect(result.confirmedByAdminNote).toBe('Ngozi Bello confirmed this because Tunde Ade has left the organisation.');
      /* The sentence also rides along in the card's general "note" field, wherever only that is shown. */
      expect(result.note).toContain('Ngozi Bello confirmed this because Tunde Ade has left the organisation.');
    });

    it('an admin can decline a question once the lead has left', async () => {
      const { service } = makeService({ leadIsActive: false });
      const result = await service.declineQuestionForPerson(GROUND_ID, ADMIN_ID, 'q1');
      expect(result.say).toContain('I have left it out.');
    });

    it('a participant who is neither the lead nor an admin can never confirm or decline a question, whether or not the lead has left', async () => {
      const stillHere = makeService({ leadIsActive: true });
      await expect(stillHere.service.confirmQuestionForPerson(GROUND_ID, PARTICIPANT_ID, 'q1', {}))
        .rejects.toMatchObject({ message: ONLY_THE_LEAD_CONFIRMS_SETUP });
      const leadGone = makeService({ leadIsActive: false });
      await expect(leadGone.service.confirmQuestionForPerson(GROUND_ID, PARTICIPANT_ID, 'q1', {}))
        .rejects.toMatchObject({ message: ONLY_THE_LEAD_CONFIRMS_SETUP });
      await expect(leadGone.service.declineQuestionForPerson(GROUND_ID, PARTICIPANT_ID, 'q1'))
        .rejects.toMatchObject({ message: ONLY_THE_LEAD_CONFIRMS_SETUP });
    });
  });
});
