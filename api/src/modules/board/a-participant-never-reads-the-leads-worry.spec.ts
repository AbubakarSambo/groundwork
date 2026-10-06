import { PartyType } from '@prisma/client';
import { whatThisSessionHolds, atAGlanceTiles } from '../reports/what-this-session-holds';

/**
 * RUN-26, LOANS: A PARTICIPANT NEVER READS THE LEAD'S JUDGEMENT. Sunday's Blockers tile quoted Amaka: "I need to
 * understand if this is an issue with our selection process for who qualifies for the loans." Where people do not see
 * each other, a participant's tile holds only their own worries, plus the count across people. The lead and an admin
 * read it as before.
 */
const person = (id: string, first: string, last: string, lead = false) => ({
  id, userId: `u-${first.toLowerCase()}`, partyType: lead ? PartyType.INITIATOR : PartyType.PARTICIPANT, email: `${id}@x.test`,
  roleAsDescribed: null, nameGiven: null, organisationGiven: null, createdAt: new Date(lead ? '2026-09-01' : '2026-09-02'), user: { firstName: first, lastName: last },
});
const PEOPLE = [person('p-amaka', 'Amaka', 'Nwachukwu', true), person('p-sunday', 'Sunday', 'Eze'), person('p-musa', 'Musa', 'Danjuma')];
const WORRIES = [
  { text: 'I need to understand if this is an issue with our selection process for who qualifies for the loans.', participantId: 'p-amaka', saidWordForWord: true },
  { text: 'I missed the first three repayments.', participantId: 'p-sunday', saidWordForWord: true },
  { text: 'The supplier never delivered the machine.', participantId: 'p-musa', saidWordForWord: true },
];
const prisma = (rows: any[], peersVisibleToEachOther: boolean | null) => ({
  checkIn: { findMany: async () => [{ id: 'c1' }] },
  groundDependency: { findMany: async () => [] },
  groundObjective: { findMany: async () => [] },
  groundObjectiveSnapshot: { findMany: async () => [] },
  ground: { findUnique: async () => ({ participants: PEOPLE, peersVisibleToEachOther }) },
  recordEntry: { findMany: async (args: any) => (args?.where?.type ? rows : []) },
});
const tileFor = async (reader: any, rows = WORRIES, peers: boolean | null = null) => {
  const held = await whatThisSessionHolds(prisma(rows, peers) as any, 'g1', 1, reader);
  const tile = atAGlanceTiles({ agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: held.blocked, waiting: held.waiting, worries: held.worries, theWorry: held.theFirstWorry, whyNoWorry: held.whyNoWorryIsShown, theBlocker: held.theFirstBlocker, waitsFromEarlier: held.waitsFromEarlier } as any)
    .find((t) => t.label === 'Blockers')!;
  return tile;
};

describe('the Blockers tile, where people do not see each other', () => {
  it('Sunday reads his own worry and the count, and not Amaka\'s doubt or Musa\'s worry', async () => {
    const t = await tileFor({ participantId: 'p-sunday', isLead: false, ownWaitsOnly: true });
    expect(t.value).toBe('3 worries');
    expect(t.sub).toBe('You said, "I missed the first three repayments." There are 2 more worries on record, and nobody is waiting on anybody.');
    expect(t.sub).not.toMatch(/selection process|Amaka|supplier/);
  });
  it('Sunday with only the lead\'s and Musa\'s worries reads the count and no words', async () => {
    const t = await tileFor({ participantId: 'p-sunday', isLead: false, ownWaitsOnly: true }, [WORRIES[0], WORRIES[2]]);
    expect(t.sub).not.toMatch(/selection process|Amaka|supplier/);
    /* Request 127 item 7: the count says the true reason. */
    expect(t.sub).toMatch(/^2 worries are on record\. They are other people's words, so they are not shown to you\./);
  });
  it('Amaka, who runs it, reads her own worry as hers', async () => {
    const t = await tileFor({ participantId: 'p-amaka', isLead: true });
    expect(t.sub).toMatch(/^You said, "I need to understand if this is an issue/);
  });
  it('an admin outside the check-in reads the first worry after the lead\'s name', async () => {
    const t = await tileFor({ participantId: null, isLead: false });
    expect(t.sub).toMatch(/^Amaka Nwachukwu said, "I need to understand/);
  });
  it('where people see each other, Sunday reads the lead\'s words in her name, as he reads a colleague\'s (decisions 4 and 88)', async () => {
    const t = await tileFor({ participantId: 'p-sunday', isLead: false }, WORRIES, true);
    expect(t.sub).toMatch(/^Amaka Nwachukwu said, "I need to understand if this is an issue with our selection process for who qualifies for the loans\."/);
  });
  it('where people see each other, a new hire reads his lead\'s own worry, and his own is still "You said"', async () => {
    const lonely = [WORRIES[0]];
    expect((await tileFor({ participantId: 'p-sunday', isLead: false }, lonely, true)).sub).toMatch(/^Amaka Nwachukwu said, "I need to understand/);
    expect((await tileFor({ participantId: 'p-sunday', isLead: false }, [WORRIES[1]], true)).sub).toMatch(/^You said, "I missed the first three repayments\."/);
  });
});
