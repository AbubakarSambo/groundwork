import { PartyType } from '@prisma/client';
import { BoardService } from './board.service';
import { BoardListener } from './board.listener';
import { boardAs, answered, person, AMINA, RUKIA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';
import { theClaimOn, withAClaim, afterTheLeadsAnswer, theClaimQuestion } from './a-claim-on-a-record-is-checked-first';

/**
 * A RECORD WITH NOBODY'S NAME BECOMES SOMEBODY'S ONLY ONCE THE LEAD SAYS YES (decision 76, item 3).
 *
 * Amina runs a sales check-in and added "Westgate Deli" on the board with nobody's name on it. Amani
 * Wekesa then says in her check-in that it is hers. That is a claim: Amina reads "Amani Wekesa says
 * the Westgate Deli deal is theirs. Is it?" on her board, and the deal stays without an owner until
 * she says yes. Read as every reader.
 */

const PEOPLE = [
  person('p-amina', 'u-amina', 'Amina', 'Wanjiru', PartyType.INITIATOR),
  person('p-rukia', 'u-rukia', 'Rukia', 'Mwangi'),
  person('p-amani', 'u-amani', 'Amani', 'Wekesa'),
];
const AMANI = ['u-amani', 'MEMBER'] as const;

const CLAIMED = {
  id: 'w-westgate', groundId: 'g-1', kind: 'deal', name: 'Westgate Deli', stage: 'Pitched', ownerParticipantId: null, dueAt: null,
  fields: withAClaim({ Value: 'KES 60K' }, 'p-amani', null, new Date('2026-10-01T10:00:00Z')),
  sourceEntryId: null, addedByUserId: 'u-amina', createdAt: new Date('2026-09-20T09:00:00Z'),
};

const setupWith = (item: any, more: Record<string, any> = {}) => ({
  people: PEOPLE, kindOfWork: 'sales org', items: [item], createdByUserId: 'u-setup',
  checkIns: [answered('p-rukia', 1), answered('p-amani', 1)], ...more,
});

const everyString = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach((x) => everyString(x, out));
  return out;
};
const theRecords = (board: any) => (board.workRecords ?? []).flatMap((s: any) => s.rows ?? []);
const westgate = (board: any) => theRecords(board).find((r: any) => r.id === 'w-westgate');

describe('a claim on a record with nobody\'s name, on the board, as each reader', () => {
  it('Amina, the lead, reads the claim said back as a question, and the deal still has nobody\'s name', async () => {
    const row = westgate(await boardAs(setupWith(CLAIMED), ...AMINA));
    expect(row.owner).toBeNull();
    expect(row.ownerParticipantId).toBeNull();
    expect(row.ownerClaim).toEqual({ participantId: 'p-amani', who: 'Amani Wekesa', says: 'Amani Wekesa says the Westgate Deli deal is theirs. Is it?' });
    /* The claim is not one of the deal's details. */
    expect(row.fields).toEqual({ Value: 'KES 60K' });
  });

  it('Amani, who said it, is not sent the deal as hers, nor the question', async () => {
    const board = await boardAs(setupWith(CLAIMED, { peersVisibleToEachOther: true }), ...AMANI);
    /* A participant's board holds their own records, and this one is not hers yet. */
    expect(westgate(board)).toBeUndefined();
    expect(everyString(board).filter((s) => /says the Westgate Deli deal is theirs|Is it\?/.test(s))).toEqual([]);
  });

  it('Rukia, a colleague, is not sent the deal or the claim', async () => {
    const board = await boardAs(setupWith(CLAIMED), ...RUKIA);
    expect(westgate(board)).toBeUndefined();
    expect(everyString(board).filter((s) => /says the Westgate Deli deal is theirs|Is it\?/.test(s))).toEqual([]);
  });

  it.each([
    ['Juma, an admin who only reads', JUMA],
    ['the admin who set it up', SETUP_ADMIN],
  ] as const)('%s reads the deal with nobody\'s name on it, and is not sent the claim', async (_who, [userId, role]) => {
    const board = await boardAs(setupWith(CLAIMED), userId, role);
    const row = westgate(board);
    expect(row.owner).toBeNull();
    expect(row.ownerParticipantId).toBeNull();
    expect(row).not.toHaveProperty('ownerClaim');
    expect(everyString(board).filter((s) => /says the Westgate Deli deal is theirs|Is it\?/.test(s))).toEqual([]);
  });

  it('once Amina says yes, the deal is Amani\'s on every board, and nobody is asked any more', async () => {
    const owned = { ...CLAIMED, ownerParticipantId: 'p-amani', fields: afterTheLeadsAnswer(CLAIMED.fields, true) };
    const lead = westgate(await boardAs(setupWith(owned), ...AMINA));
    expect(lead.owner).toBe('Amani Wekesa');
    expect(lead).not.toHaveProperty('ownerClaim');
    const amani = westgate(await boardAs(setupWith(owned), ...AMANI));
    expect(amani.ownerParticipantId).toBe('p-amani');
    expect(amani).not.toHaveProperty('ownerClaim');
  });

  it('where the lead herself said it, she reads it about herself', () => {
    expect(theClaimQuestion(null, { name: 'Westgate Deli', kind: 'deal' })).toBe('You said the Westgate Deli deal is yours. Is it?');
  });
});

describe('the lead\'s answer, and only the lead\'s', () => {
  function serviceWith(item: any) {
    const updates: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ id: 'g-1', initiatorId: 'u-amina', kindOfWork: 'sales org', workStages: null, participants: PEOPLE.map((p) => ({ id: p.id })) })) },
      workItem: {
        findFirst: jest.fn(async () => structuredClone(item)),
        update: jest.fn(async (a: any) => { updates.push(a); return { id: a.where.id, ...a.data }; }),
      },
      groundParticipant: {
        findFirst: jest.fn(async ({ where }: any) => {
          const p = PEOPLE.find((x) => x.id === where.id);
          return p ? { id: p.id, userId: p.userId, nameGiven: null, user: p.user } : null;
        }),
      },
    };
    return { service: new BoardService(prisma, {} as any, {} as any, {} as any), updates };
  }

  it('her yes sets the owner, takes the question away, and says back what happened', async () => {
    const { service, updates } = serviceWith(CLAIMED);
    const out = await service.answerAClaimOnARecord('g-1', 'w-westgate', 'u-amina', true);
    expect(out.saidBack).toBe('The Westgate Deli deal is now Amani Wekesa\'s.');
    expect(updates[0].data.ownerParticipantId).toBe('p-amani');
    expect(theClaimOn(updates[0].data.fields)).toBeNull();
    expect(updates[0].data.fields.Value).toBe('KES 60K');
  });

  it('her no leaves the deal with nobody\'s name, and Amani\'s claim on it is not put to her again', async () => {
    const { service, updates } = serviceWith(CLAIMED);
    const out = await service.answerAClaimOnARecord('g-1', 'w-westgate', 'u-amina', false);
    expect(out.saidBack).toBe('The Westgate Deli deal still has nobody\'s name on it.');
    expect(updates[0].data).not.toHaveProperty('ownerParticipantId');
    expect(theClaimOn(updates[0].data.fields)).toBeNull();
    expect(theClaimOn(withAClaim(updates[0].data.fields, 'p-amani', 'e9', new Date()))).toBeNull();
    /* Somebody else may still say it is theirs. */
    expect(theClaimOn(withAClaim(updates[0].data.fields, 'p-rukia', 'e9', new Date()))?.participantId).toBe('p-rukia');
  });

  it.each([['Amani, who said it', 'u-amani'], ['Rukia', 'u-rukia'], ['the admin who set it up', 'u-setup'], ['Juma, an admin', 'u-juma']])(
    '%s cannot answer it',
    async (_who, userId) => {
      const { service, updates } = serviceWith(CLAIMED);
      await expect(service.answerAClaimOnARecord('g-1', 'w-westgate', userId, true)).rejects.toThrow('Only the lead of this check-in can change its records.');
      expect(updates).toEqual([]);
    },
  );

  it('with no claim waiting, there is nothing to answer', async () => {
    const { service } = serviceWith({ ...CLAIMED, fields: { Value: 'KES 60K' } });
    await expect(service.answerAClaimOnARecord('g-1', 'w-westgate', 'u-amina', true)).rejects.toThrow('Nobody is waiting for your answer about this record.');
  });
});

describe('when somebody says it is theirs in a check-in', () => {
  function listenerWith(items: any[]) {
    const updated: any[] = [];
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ kindOfWork: 'sales org', workStages: null })) },
      recordEntry: { findMany: jest.fn(async () => [{ id: 'e1', participantId: 'p-amani', text: 'Westgate Deli is mine, and they want the fridges next week.' }]) },
      workItem: {
        findMany: jest.fn(async () => structuredClone(items)),
        create: jest.fn(async () => ({ id: 'w-new' })),
        update: jest.fn(async (a: any) => { updated.push(a); return a; }),
      },
    };
    const anthropic: any = { extract: jest.fn(async () => ({ records: [{ lineId: 'e1', kind: 'deal', name: 'Westgate Deli' }] })) };
    return { run: () => new BoardListener(prisma, anthropic).onCheckInCompleted({ checkInId: 'c1', groundId: 'g-1', participantId: 'p-amani', sessionNumber: 2 }), updated };
  }

  it('it is kept as a claim for the lead, never as the owner', async () => {
    const { run, updated } = listenerWith([{ id: 'w-westgate', kind: 'deal', name: 'Westgate Deli', fields: { Value: 'KES 60K' }, ownerParticipantId: null }]);
    await run();
    expect(updated[0].data).not.toHaveProperty('ownerParticipantId');
    expect(theClaimOn(updated[0].data.fields)).toMatchObject({ participantId: 'p-amani', sourceEntryId: 'e1' });
    expect(updated[0].data.fields.Value).toBe('KES 60K');
  });

  it('a claim already waiting is kept as it is, so the lead answers one at a time', async () => {
    const waiting = withAClaim({}, 'p-rukia', 'e0', new Date('2026-09-30T10:00:00Z'));
    const { run, updated } = listenerWith([{ id: 'w-westgate', kind: 'deal', name: 'Westgate Deli', fields: waiting, ownerParticipantId: null }]);
    await run();
    expect(theClaimOn(updated[0].data.fields)?.participantId).toBe('p-rukia');
  });
});
