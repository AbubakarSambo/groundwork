/**
 * THE LEAD MARKS WHAT THE RECORD SHOWS ABOUT A PERSON (decision 57, items 2 and 3, on layer 2; F2, 2 November 2026).
 *
 * Tunde runs the check-in and reads layer 2 about Femi. He can say it is right, wrong or not sure, and that he talked it through.
 * Both are kept on Femi's newest assessment by the pattern's id. Talked through moves his own waiting step on (the next assessment
 * follows it up) and takes it off Today; wrong ends its steps. Femi, a colleague, an admin who does not run it, or anybody with
 * judgements of a person off, is refused, and nothing is written.
 */
import { theLeadMarksAPatternAcrossTime, theStepsAfterHerMark } from './the-leads-mark-on-a-pattern';
import { theIdOfAPatternAcrossTime } from './what-the-record-shows-the-lead';
import type { AnIntervention } from './the-next-step-for-each-pattern';

const ID = theIdOfAPatternAcrossTime('p-femi', 'slipping-promises');
const STEP: AnIntervention = {
  key: 'slipping-promises', participantId: 'p-femi', ladder: 'work', rung: 2, step: 'a conversation', forWhom: 'the lead', theLeadDecides: true,
  says: 'Talk with Femi about it. Femi has let 2 promised days pass without the work done.', because: '', state: 'waiting for the lead',
  startedIn: { checkInId: 'c3', sessionNumber: 3 }, followedUp: [],
};
const ASSESSMENT = () => ({
  kind: 'assessment', version: 1,
  acrossTime: { patterns: [{ key: 'slipping-promises', participantId: 'p-femi', kind: 'needs work', state: 'holds', who: 'Femi', saying: 'Femi has let 2 promised days pass without the work done.',
    instances: [{ checkInId: 'c2', sessionNumber: 2, on: '2026-10-07', item: 'the deck', words: ['I have not sent the deck.'] }, { checkInId: 'c3', sessionNumber: 3, on: '2026-10-14', item: 'the call', words: ['I did not call them.'] }] }],
    role: null, focus: null, toAskNextTime: [] },
  interventions: [STEP],
});

function aBed(o: { judgementsOn?: boolean } = {}) {
  let column: any = ASSESSMENT();
  const prisma: any = {
    groundParticipant: { findUnique: jest.fn(async () => ({ groundId: 'g1', ground: { initiatorId: 'u-tunde' } })) },
    ground: { findUnique: jest.fn(async () => ({ organizationId: 'org' })) },
    organization: { findUnique: jest.fn(async () => ({ personJudgementsOn: o.judgementsOn !== false })) },
    checkIn: {
      findMany: jest.fn(async () => [{ id: 'c3', participantId: 'p-femi', sessionNumber: 3, sessionReport: column }]),
      findUnique: jest.fn(async () => ({ sessionReport: column })),
      update: jest.fn(async (a: any) => { column = a.data.sessionReport; return {}; }),
    },
  };
  return { prisma, column: () => column };
}

describe('Tunde, who runs the check-in', () => {
  it('marks that he talked it through: kept by the pattern\'s id, his waiting step moves on, and he reads it as talked through', async () => {
    const bed = aBed();
    const served = await theLeadMarksAPatternAcrossTime(bed.prisma, ID, 'u-tunde', { talkedAbout: true }, new Date('2026-10-15T10:00:00Z'));
    expect(served).toMatchObject({ id: ID, talkedAbout: true, heading: 'Femi has let 2 promised days pass without the work done.' });
    expect(bed.column().theLeadsMarks[ID]).toMatchObject({ talkedAboutAt: '2026-10-15T10:00:00.000Z', by: 'u-tunde' });
    expect(bed.column().interventions[0].state).toBe('open');
  });

  it('marks it right, wrong or not sure, and wrong ends its steps', async () => {
    const bed = aBed();
    const served = await theLeadMarksAPatternAcrossTime(bed.prisma, ID, 'u-tunde', { mark: 'WRONG' });
    expect(served.leadMark).toBe('WRONG');
    expect(bed.column().interventions[0].state).toBe('ended');
    expect(theStepsAfterHerMark([STEP], 'slipping-promises', { mark: 'RIGHT' })[0].state).toBe('waiting for the lead');
  });
});

describe('everybody else', () => {
  it('Femi, a colleague and an admin who does not run it are refused, and nothing is written', async () => {
    for (const userId of ['u-femi', 'u-ngozi', 'u-admin']) {
      const bed = aBed();
      await expect(theLeadMarksAPatternAcrossTime(bed.prisma, ID, userId, { talkedAbout: true })).rejects.toHaveProperty('status', 403);
      expect(bed.prisma.checkIn.update).not.toHaveBeenCalled();
    }
  });

  it('with judgements of a person off, even Tunde is refused', async () => {
    const bed = aBed({ judgementsOn: false });
    await expect(theLeadMarksAPatternAcrossTime(bed.prisma, ID, 'u-tunde', { mark: 'RIGHT' })).rejects.toHaveProperty('status', 403);
    expect(bed.prisma.checkIn.update).not.toHaveBeenCalled();
  });

  it('a pattern that does not hold, or an id that is not one, is refused', async () => {
    const bed = aBed();
    await expect(theLeadMarksAPatternAcrossTime(bed.prisma, theIdOfAPatternAcrossTime('p-femi', 'overload'), 'u-tunde', { mark: 'RIGHT' })).rejects.toHaveProperty('status', 403);
    await expect(theLeadMarksAPatternAcrossTime(bed.prisma, 'pd2', 'u-tunde', { mark: 'RIGHT' })).rejects.toHaveProperty('status', 403);
    expect(bed.prisma.checkIn.update).not.toHaveBeenCalled();
  });
});
