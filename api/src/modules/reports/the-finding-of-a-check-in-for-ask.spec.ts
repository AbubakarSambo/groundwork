import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { theFindingOnItsOwn } from '../engagement/the-first-insight';

/**
 * THE ONE FINDING OF A CHECK-IN, FOR ASK (screens request 198), AS EACH PERSON READS IT.
 *
 * The route serves the sentence the first-insight mail's subject already says, read from the report as the asking person is served it. These run the real
 * `theFindingOf` with a double for `sessionReport` (the read that holds the walls), and check what a lead, a participant, a participant before the picture is
 * released, and a person with no right to the check-in are actually given.
 */
const SENTENCE = 'Who owns the next step with the distributor is not agreed upon by the team.';
const served = {
  whereThingsStand: {
    settled: ['The launch date is the first of March.'],
    open: [SENTENCE, 'The budget for the second quarter.'],
    openWithReasons: [{ topic: SENTENCE, settledBy: 'Name one owner by Friday.', positions: [{ who: 'Abigail', said: 'I think Omar owns it, because he spoke to them.' }] }],
  },
  theConversationWorthHaving: 'Who is going to own the next step with the distributor, and by when?',
};

function service(opts: { released?: number[] | null; read: (userId: string) => any }) {
  const sessionReport = jest.fn(async (_g: string, _n: number, userId: string) => {
    const r = opts.read(userId);
    if (r instanceof Error) throw r;
    return r;
  });
  const fake: any = {
    prisma: {
      ground: { findUnique: jest.fn(async () => ({ label: 'Kenya launch', report: opts.released === null ? { releasedAt: null, releasedSessions: [] } : { releasedAt: new Date(), releasedSessions: opts.released ?? [1] } })) },
      checkIn: { aggregate: jest.fn(async () => ({ _max: { sessionNumber: 1 } })) },
    },
    sessionReport,
  };
  return { call: (user: string) => (ReportsService.prototype as any).theFindingOf.call(fake, 'g1', user, 'org1'), sessionReport };
}

describe('the one finding of a check-in, for Ask', () => {
  it('the lead is given the real difference as a whole sentence, and that more is still open', async () => {
    const s = service({ read: () => served });
    const got = await s.call('u-lead');
    expect(got.finding).toBe(SENTENCE);
    expect(got.moreStillOpen).toBe(1);
    expect(got.conversationWorthHaving).toBe('Who is going to own the next step with the distributor, and by when?');
    expect(got.label).toBe('Kenya launch');
  });

  it('is only the report\'s own sentence: nobody\'s words, no position, no advice, and no name', async () => {
    const got = await service({ read: () => served }).call('u-lead');
    const all = JSON.stringify(got);
    for (const never of ['Abigail', 'Omar', 'I think', 'positions', 'settledBy', 'Name one owner by Friday']) expect(all).not.toContain(never);
  });

  it('a participant is given what the report served to them says, and nothing from the lead', async () => {
    const got = await service({ read: () => ({ ...served, whereThingsStand: { ...served.whereThingsStand, openWithReasons: [] } }) }).call('u-abi');
    expect(got.finding).toBe(SENTENCE);
  });

  it('a participant whose picture is still withheld is given no finding, and no sentence about why', async () => {
    const got = await service({ read: () => ({ withheldUntilYouAnswer: true, saying: 'A picture is forming.' }) }).call('u-abi');
    expect(got.finding).toBeNull();
    expect(JSON.stringify(got)).not.toContain('forming');
  });

  it('nothing is served before the report is released to anyone, the lead included', async () => {
    const got = await service({ released: null, read: () => served }).call('u-lead');
    expect(got.finding).toBeNull();
    expect(got.sessionNumber).toBeNull();
  });

  it('somebody with no right to the check-in is told it is not there, released or not', async () => {
    const stranger = new NotFoundException('That report could not be found, so go back to the check-in and open it from there.');
    await expect(service({ read: () => stranger }).call('u-stranger')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service({ released: null, read: () => stranger }).call('u-stranger')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the latest released session is the one read', async () => {
    const s = service({ released: [1, 2], read: () => served });
    await s.call('u-lead');
    expect(s.sessionReport).toHaveBeenCalledWith('g1', 2, 'u-lead', 'org1');
  });

  it('a difference the report names as a phrase is said as a whole sentence', () => {
    const got = theFindingOnItsOwn({ whereThingsStand: { open: ['the unit of measurement for success'] } }, 'Sales plan');
    expect(got!.finding).toBe('The people in "Sales plan" differ on "the unit of measurement for success".');
  });

  it('nothing open is no finding', () => {
    expect(theFindingOnItsOwn({ whereThingsStand: { open: [], settled: ['a'] } }, 'x')).toBeNull();
  });

  it('is a GET route at grounds/:groundId/report/finding', () => {
    expect(Reflect.getMetadata('path', ReportsController.prototype.finding)).toBe('finding');
    expect(Reflect.getMetadata('path', ReportsController)).toBe('grounds/:groundId/report');
  });
});
