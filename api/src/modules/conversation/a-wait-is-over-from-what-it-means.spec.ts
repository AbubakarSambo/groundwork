import * as fs from 'fs';
import * as path from 'path';
import { clearTheWaitsTheRecordEnds, theWaitsOverMadeSafe, theWitnessesFor, theWaitsAsked, type AWaitToJudge, type AWitness } from './a-wait-is-over-from-what-it-means';

/**
 * A WAIT IS OVER FROM WHAT THE RECORD MEANS (Hafsah, 29 October 2026; two-week check). Aisha waited on Njeri for "confirmation that FN-007
 * has been raised"; Njeri said more than twenty times, in other words, that Jamii Clinics paid FN-007 on 16 October, and the wait was still
 * read to her on 19 January. The model reads the meaning; these tests hold what the product does with what it says: only a wait it was
 * handed, only with a line it was handed and a reason, on the later day, everywhere in the organisation, and the word rules only when the
 * model cannot be reached. The real model's reading of all 89 waits left open by the quarter test is in ~/Desktop/quarter-test/waits/.
 */
const at = (d: string) => new Date(`${d}T09:00:00Z`);
const FN007: AWaitToJudge = { id: 'w-fn007', groundId: 'g-lit', fromParticipantId: 'p-aisha-lit', onParticipantId: 'p-njeri-lit', onLabel: null, what: 'confirmation that FN-007 has been raised', createdAt: at('2026-10-19') };
const FN006: AWaitToJudge = { id: 'w-fn006', groundId: 'g-fees', fromParticipantId: 'p-aisha-fees', onParticipantId: 'p-njeri-fees', onLabel: null, what: 'confirmation of payment for FN-006', createdAt: at('2026-10-12') };
const PAID: AWitness = { id: 'l-paid', who: 'Njeri Wambui', kind: 'what happened', where: 'Fee notes', on: at('2026-10-16'), text: 'It confirms Jamii Clinics paid FN-007, KES 180,000, into the bank today.', byUserId: 'u-njeri' };
const OTHER: AWitness = { id: 'l-other', who: 'Brian Otieno', kind: 'what happened', where: 'Litigation team daily', on: at('2026-10-20'), text: 'The reply in Kasarani Foods v. Tumaini Traders was filed today.', byUserId: 'u-brian' };

describe('what the model says is made safe', () => {
  it('a wait it was handed, a line it was handed and a reason: cleared, on the later of the wait and the line', () => {
    const over = theWaitsOverMadeSafe({ over: [{ waitId: 'w-fn007', shownBy: 'l-paid', why: 'A fee note paid was raised.' }] }, [FN007], [PAID]);
    expect(over).toEqual([{ id: 'w-fn007', clearedAt: at('2026-10-19'), witnessId: 'l-paid' }]);
  });

  it('an id it was not handed, a line it was not handed, or no reason: nothing is cleared', () => {
    expect(theWaitsOverMadeSafe({ over: [{ waitId: 'w-made-up', shownBy: 'l-paid', why: 'x' }] }, [FN007], [PAID])).toEqual([]);
    expect(theWaitsOverMadeSafe({ over: [{ waitId: 'w-fn007', shownBy: 'l-made-up', why: 'x' }] }, [FN007], [PAID])).toEqual([]);
    expect(theWaitsOverMadeSafe({ over: [{ waitId: 'w-fn007', shownBy: 'l-paid', why: ' ' }] }, [FN007], [PAID])).toEqual([]);
    expect(theWaitsOverMadeSafe(null, [FN007], [PAID])).toBeNull();
  });
});

describe('what the model is handed', () => {
  it('for the FN-007 wait, Njeri’s line that it was paid, though it never says "raised", and from another check-in', () => {
    const chosen = theWitnessesFor([{ w: FN007, names: ['Aisha Kamau', 'Njeri Wambui'], userIds: ['u-aisha', 'u-njeri'] }], [PAID, OTHER]);
    expect(chosen.map((x) => x.id)).toContain('l-paid');
    expect(chosen.map((x) => x.id)).not.toContain('l-other');
    const asked = theWaitsAsked([{ w: FN007, waiting: 'Aisha Kamau', on: 'Njeri Wambui', where: 'Litigation team daily' }], chosen);
    expect(asked).toMatch(/w-fn007: Aisha Kamau is waiting on Njeri Wambui for "confirmation that FN-007 has been raised"/);
    expect(asked).toMatch(/l-paid: Njeri Wambui, what happened, in Fee notes, on 2026-10-16: "It confirms Jamii Clinics paid FN-007/);
  });
});

describe('the waits the record ends are cleared across the organisation', () => {
  function aBed() {
    const updated: { id: string; clearedAt: Date }[] = [];
    const prisma: any = {
      ground: {
        findUnique: jest.fn(async () => ({ organizationId: 'org-muchemi' })),
        findMany: jest.fn(async () => [{ id: 'g-lit', scenario: 'TEAM_CHECKIN', label: 'Litigation team daily' }, { id: 'g-fees', scenario: 'TEAM_CHECKIN', label: 'Fee notes' }]),
      },
      groundDependency: {
        findMany: jest.fn(async () => [FN007, FN006]),
        updateMany: jest.fn(async ({ where, data }: any) => { updated.push({ id: where.id, clearedAt: data.clearedAt }); return { count: 1 }; }),
      },
      groundParticipant: {
        findMany: jest.fn(async () => [
          { id: 'p-aisha-lit', groundId: 'g-lit', userId: 'u-aisha', user: { firstName: 'Aisha', lastName: 'Kamau' } },
          { id: 'p-njeri-lit', groundId: 'g-lit', userId: 'u-njeri', user: { firstName: 'Njeri', lastName: 'Wambui' } },
          { id: 'p-aisha-fees', groundId: 'g-fees', userId: 'u-aisha', user: { firstName: 'Aisha', lastName: 'Kamau' } },
          { id: 'p-njeri-fees', groundId: 'g-fees', userId: 'u-njeri', user: { firstName: 'Njeri', lastName: 'Wambui' } },
        ]),
      },
      recordEntry: {
        findMany: jest.fn(async () => [
          { id: 'l-paid', participantId: 'p-njeri-fees', type: 'PROGRESS', text: PAID.text, createdAt: at('2026-10-16'), participant: { groundId: 'g-fees', userId: 'u-njeri' } },
          { id: 'l-six', participantId: 'p-njeri-fees', type: 'PROGRESS', text: 'For FN-006 and FN-007, they have been paid.', createdAt: at('2027-01-11'), participant: { groundId: 'g-fees', userId: 'u-njeri' } },
        ]),
      },
      workItem: { findMany: jest.fn(async () => []) },
    };
    return { prisma, updated };
  }

  it('the model ends both FN waits, in two check-ins, from lines that never say "raised" or "confirmation"', async () => {
    const bed = aBed();
    const engine = { extract: jest.fn(async () => ({ over: [
      { waitId: 'w-fn007', shownBy: 'l-paid', why: 'FN-007 was paid, so it had been raised.' },
      { waitId: 'w-fn006', shownBy: 'l-six', why: 'Njeri says FN-006 has been paid.' },
    ] })) };
    const over = await clearTheWaitsTheRecordEnds(bed.prisma, engine, null, 'g-lit');
    expect(over?.map((o) => o.id).sort()).toEqual(['w-fn006', 'w-fn007']);
    expect(bed.updated).toEqual(expect.arrayContaining([{ id: 'w-fn007', clearedAt: at('2026-10-19') }, { id: 'w-fn006', clearedAt: at('2027-01-11') }]));
  });

  it('when the model cannot be reached, null, so the word rules run instead and nothing is lost', async () => {
    const bed = aBed();
    expect(await clearTheWaitsTheRecordEnds(bed.prisma, { extract: jest.fn(async () => null) }, null, 'g-lit')).toBeNull();
    expect(await clearTheWaitsTheRecordEnds(bed.prisma, null, null, 'g-lit')).toBeNull();
    expect(bed.updated).toEqual([]);
  });

  it('a backed correction is read as one more line, and only by the waits it bears on', async () => {
    const bed = aBed();
    const engine = { extract: jest.fn(async (_p: string, h: any[]) => {
      expect(h[0].content).toMatch(/correction, in a correction checked against the record/);
      return { over: [{ waitId: 'w-fn007', shownBy: 'correction', why: 'The correction, backed by the record, says FN-007 was paid.' }] };
    }) };
    const over = await clearTheWaitsTheRecordEnds(bed.prisma, engine, null, 'g-lit', [{ id: 'correction', who: 'Njeri', kind: 'correction', where: 'a correction checked against the record', on: at('2027-01-20'), text: 'That is wrong, FN-007 was paid on 16 October.', byUserId: 'u-njeri' }]);
    expect(over?.map((o) => o.id)).toEqual(['w-fn007']);
  });
});

describe('the model decides first, everywhere a wait can end', () => {
  const src = (f: string) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('after every check-in, the model reads the waits, and the word rules run only when it could not be reached', () => {
    const c = src('./conversation.service.ts');
    const model = c.indexOf('clearTheWaitsTheRecordEnds(this.prisma');
    expect(model).toBeGreaterThan(-1);
    for (const rule of ['clearTheWaitsSaidDone(this.prisma', 'clearTheWaitsAnEventEnded(this.prisma', 'clearTheWaitsOverAcrossTheOrganisation(this.prisma']) {
      expect(c.indexOf(rule)).toBeGreaterThan(model);
    }
    expect(c.slice(model, c.indexOf('clearTheWaitsSaidDone(this.prisma'))).toMatch(/if \(over\)[^\n]*return;/);
  });

  it('a correction backed in Ask closes the waits it shows are over, across the organisation', () => {
    const a = src('../assistant/assistant.service.ts');
    expect(a).toMatch(/checked\.verdict === 'backed'\) void this\.closeTheWaitsACorrectionEnds\(/);
    expect(a).toMatch(/clearTheWaitsTheRecordEnds\(db, this\.engine/);
  });
});
