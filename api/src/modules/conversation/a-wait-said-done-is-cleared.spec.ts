import { PartyType } from '@prisma/client';
import { clearTheWaitsSaidDone, aLineSaysItIsDone, type AnOpenWait, type ALineOnRecord } from './a-wait-said-done-is-cleared';
import { boardAs, person, answered, handoff, type Setup } from '../board/the-switchboards-sections-harness';

/**
 * A WAIT IS CLEARED WHEN EITHER SIDE SAYS IT IS DONE (Hafsah's point 14, Drop Access, 17 October).
 *
 * The lines are word for word what the test bed holds. Mercy waited on Joseph for "the samples" (12 October) and "the sample
 * units" (13 October); on 15 October Joseph said he brought them and Mercy said so too. The second wait stayed open and Grace's
 * morning summary called it four days late.
 */
const at = (s: string) => new Date(s);
const NAMES: Record<string, string[]> = { 'p-mercy': ['Mercy', 'Wairimu'], 'p-joseph': ['Joseph', 'Kariuki'], 'p-kevin': ['Kevin', 'Omondi'] };
const namesOf = (pid: string) => NAMES[pid] ?? [];
const UNITS: AnOpenWait = { id: 'd-units', fromParticipantId: 'p-mercy', onParticipantId: 'p-joseph', onLabel: null, what: 'the sample units', createdAt: at('2026-10-13T15:05:28Z'), sourceCheckInId: 'c2-mercy' };
const line = (id: string, participantId: string, checkInId: string, type: string, text: string, createdAt: string): ALineOnRecord => ({ id, participantId, checkInId, type, text, createdAt: at(createdAt) });
const LINES = [
  line('j1', 'p-joseph', 'c1-joseph', 'COMMITMENT', 'I also need to drop samples for Mercy on Thursday.', '2026-10-12T15:06:44Z'),
  line('j2', 'p-joseph', 'c2-joseph', 'WORRY', 'I did not drop samples for Mercy on Thursday. I forgot them again.', '2026-10-13T15:06:37Z'),
  line('m3', 'p-mercy', 'c3-mercy', 'WORRY', "Joseph still hasn't given me the samples. Peter at Tuskys Westgate is waiting to see them before he makes a decision.", '2026-10-14T15:04:59Z'),
  line('j3', 'p-joseph', 'c3-joseph', 'WORRY', "I still haven't dropped off Mercy's samples.", '2026-10-14T15:07:09Z'),
  line('m4', 'p-mercy', 'c4-mercy', 'PROGRESS', 'Joseph finally brought the samples today, so I showed them to Peter at Tuskys Westgate.', '2026-10-15T15:05:36Z'),
  line('m4b', 'p-mercy', 'c4-mercy', 'PROGRESS', 'I am not waiting on samples anymore.', '2026-10-15T15:05:36Z'),
  line('j4', 'p-joseph', 'c4-joseph', 'PROGRESS', 'I brought Mercy her samples today, as promised.', '2026-10-15T15:07:35Z'),
];

describe('a line says a wait is done', () => {
  it.each([
    ['m4', true], ['m4b', true], ['j4', true],
    ['j1', false], ['j2', false], ['m3', false], ['j3', false],
  ])('%s', (id, yes) => {
    expect(aLineSaysItIsDone(LINES.find((l) => l.id === id)!, UNITS, namesOf)).toBe(yes);
  });

  it('a colleague who is not in the wait never clears it', () => {
    expect(aLineSaysItIsDone(line('k', 'p-kevin', 'c4-kevin', 'PROGRESS', 'I brought Mercy the samples today.', '2026-10-15T15:00:00Z'), UNITS, namesOf)).toBe(false);
  });

  it('a line about another thing never clears it', () => {
    expect(aLineSaysItIsDone(line('m', 'p-mercy', 'c4-mercy', 'PROGRESS', 'Joseph sent the price list today.', '2026-10-15T15:00:00Z'), UNITS, namesOf)).toBe(false);
  });
});

function aBed(on: boolean, lines = LINES, waits: AnOpenWait[] = [UNITS]) {
  const updates: any[] = [];
  const prisma: any = {
    ground: { findUnique: async () => ({ organizationId: 'org' }) },
    organization: { findUnique: async () => ({ release1SalesBoardOn: on }) },
    groundDependency: { findMany: async () => waits, updateMany: async (a: any) => { updates.push(a); return { count: 1 }; } },
    groundParticipant: { findMany: async () => Object.entries(NAMES).map(([id, [firstName, lastName]]) => ({ id, nameGiven: null, user: { firstName, lastName } })) },
    recordEntry: { findMany: async () => lines.filter((l) => l.type === 'PROGRESS') },
    checkIn: { findMany: async () => [{ id: 'c2-mercy', completedAt: at('2026-10-13T15:05:32Z') }] },
  };
  return { prisma, updates };
}

describe('clearing the waits said done, from the record', () => {
  it('with Release 1 on, Mercy\'s wait for the sample units is cleared on 15 October, the day Mercy said Joseph brought them', async () => {
    const { prisma, updates } = aBed(true);
    expect(await clearTheWaitsSaidDone(prisma, 'g')).toBe(1);
    expect(updates).toEqual([{ where: { id: 'd-units', clearedAt: null }, data: { status: 'CLEARED', clearedAt: at('2026-10-15T15:05:36Z') } }]);
  });

  it('Joseph\'s word alone clears it too', async () => {
    const { prisma, updates } = aBed(true, LINES.filter((l) => l.participantId === 'p-joseph'));
    expect(await clearTheWaitsSaidDone(prisma, 'g')).toBe(1);
    expect(updates[0].data.clearedAt).toEqual(at('2026-10-15T15:07:35Z'));
  });

  it('a done line said before the wait was last raised does not clear it', async () => {
    const raisedAgain = { ...UNITS, createdAt: at('2026-10-16T15:00:00Z') };
    const { prisma, updates } = aBed(true, LINES, [raisedAgain]);
    expect(await clearTheWaitsSaidDone(prisma, 'g')).toBe(0);
    expect(updates).toEqual([]);
  });

  it('with Release 1 off, nothing is cleared', async () => {
    const { prisma, updates } = aBed(false);
    expect(await clearTheWaitsSaidDone(prisma, 'g')).toBe(0);
    expect(updates).toEqual([]);
  });
});

/* What Grace and Mercy read once it is cleared: the row as the writer leaves it. */
const PEOPLE = [
  person('p-grace', 'u-grace', 'Grace', 'Njoroge', PartyType.INITIATOR),
  person('p-mercy', 'u-mercy', 'Mercy', 'Wairimu'),
  person('p-joseph', 'u-joseph', 'Joseph', 'Kariuki'),
];
const run = (clearedAt: Date | null): Setup => ({
  people: PEOPLE,
  initiatorId: 'u-grace',
  kindOfWork: 'sales team',
  releaseOneSalesBoard: true,
  clock: { now: at('2026-10-19T08:00:00Z') },
  checkIns: [answered('p-mercy', 4, '2026-10-15T15:05:49Z'), answered('p-joseph', 4, '2026-10-15T15:07:40Z')],
  dependencies: [handoff('d-units', 'p-mercy', 'the sample units', {
    onParticipantId: 'p-joseph', status: clearedAt ? 'CLEARED' : 'WAITING', clearedAt, dueOn: '2026-10-15', dueSaid: 'by Thursday',
    sourceCheckInId: 'c2-p-mercy', createdAt: at('2026-10-13T15:05:28Z'),
  })],
  commitments: [],
});

describe('once it is cleared, as each reader reads it', () => {
  it('Grace reads no blocker for the samples and the wait as cleared on 15 October', async () => {
    const b = await boardAs(run(at('2026-10-15T15:05:36Z')), 'u-grace', 'MEMBER');
    expect((b.blockers ?? []).map((x: any) => x.name)).not.toContain('the sample units');
    expect((b.whoWaitedOnWhom ?? []).map((x: any) => x.says)).toEqual([
      /* Changed 18 October (Hafsah's answer 5): the kit's sales board has no "Not backed:" note, so the sentence ends here. */
      'Mercy Wairimu said the work was waiting on Joseph Kariuki for the sample units from 13 October until it was cleared on 15 October.',
    ]);
    expect(JSON.stringify(b)).not.toMatch(/days late/);
  });

  it('Mercy reads the same about her own wait', async () => {
    const b = await boardAs(run(at('2026-10-15T15:05:36Z')), 'u-mercy', 'MEMBER');
    expect((b.blockers ?? []).map((x: any) => x.name)).not.toContain('the sample units');
    expect((b.whoWaitedOnWhom ?? []).map((x: any) => x.says)).toEqual([
      'You said the work was waiting on Joseph Kariuki for the sample units from 13 October until it was cleared on 15 October.',
    ]);
  });
});

/*
 * Real-model run, 25 October: Joseph waited on "Management" for "a decision on whether to offer a unit at KES 4,500". Grace, who runs
 * the check-in, said "I approved the KES 4,500 price for Juja Hardware for 5 units only." Her morning and Joseph's review still said he
 * was waiting. The lead deciding it, with the same amount, answers it.
 */
describe('the lead answered the decision', () => {
  const wait = { id: 'w1', fromParticipantId: 'p-joseph', onParticipantId: null, onLabel: 'Management', what: 'a decision on whether to offer a unit at KES 4,500', createdAt: '2026-10-14T11:08:50Z', sourceCheckInId: 'c-1' };
  const line = (participantId: string, text: string) => ({ id: 'l1', participantId, checkInId: 'c-9', type: 'PROGRESS', text, createdAt: '2026-10-25T18:34:14Z' });
  const leads = new Set(['p-grace']);
  const none = () => [] as string[];

  it('is cleared by the lead approving it, with the same amount', () => {
    expect(aLineSaysItIsDone(line('p-grace', 'I approved the KES 4,500 price for Juja Hardware for 5 units only.'), wait, none, none, leads)).toBe(true);
    expect(aLineSaysItIsDone(line('p-grace', 'I turned down the KES 4,500 price for Juja Hardware.'), wait, none, none, leads)).toBe(true);
  });

  it('is not cleared by somebody who does not run the check-in, another amount, or "I have not approved"', () => {
    expect(aLineSaysItIsDone(line('p-mercy', 'I approved the KES 4,500 price for Juja Hardware.'), wait, none, none, leads)).toBe(false);
    expect(aLineSaysItIsDone(line('p-grace', 'I approved the KES 4,800 price for Juja Hardware.'), wait, none, none, leads)).toBe(false);
    expect(aLineSaysItIsDone(line('p-grace', 'I have not approved the KES 4,500 price yet.'), wait, none, none, leads)).toBe(false);
  });
});
