import { GroundScenario } from '@prisma/client';
import { boardAs, AMINA, RUKIA, BARAKA, JUMA, SETUP_ADMIN } from './the-switchboards-sections-harness';
import { THE_SPINE, WHAT_EACH_SITUATION_ADDS } from '../conversation/what-every-check-in-owes';
import { theOwedThingAskedPlainly } from '../conversation/each-owed-thing-asked-plainly';

/**
 * NO WORKING NOTE EVER REACHES A SCREEN (request 107 a, Hafsah, 1 October).
 *
 * The board served the line the model is given about what the record is missing, raw, to the lead:
 * "Amani Wekesa — how they are making their number. Not the total: what kind of sales or work, on
 * what terms, with whom. This matters most where the aim set a condition on the mix." and "Rukia
 * Otieno — who is responsible for which part of that plan", to Rukia herself.
 *
 * This serves the board as every reader, with a gap open for every owed line in every situation, and
 * finds no run of six words from any of those lines anywhere in what is served.
 */
const EVERY_OWED_LINE = [...new Set([...THE_SPINE, ...Object.values(WHAT_EACH_SITUATION_ADDS).flat()].map((o) => o.what))];

const runsOfSix = (text: string): string[] => {
  const words = text.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i + 6 <= words.length; i++) out.push(words.slice(i, i + 6).join(' '));
  return out;
};

const everyString = (v: any, out: string[] = []): string[] => {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => everyString(x, out));
  return out;
};

const gaps = EVERY_OWED_LINE.flatMap((what, i) => [
  { participantId: 'p-rukia', what, firstRound: 1, asked: 2, certain: i % 3 !== 0 },
  { participantId: 'p-baraka', what, firstRound: 2, asked: 3, certain: true },
]);

const READERS = { Amina: AMINA, Rukia: RUKIA, Baraka: BARAKA, Juma: JUMA, 'the admin who set it up': SETUP_ADMIN };

describe('no working note reaches a board, for any reader', () => {
  it('there are owed lines to look for', () => {
    expect(EVERY_OWED_LINE.length).toBeGreaterThan(20);
  });

  for (const scenario of [GroundScenario.OKR_ALIGNMENT, GroundScenario.PIP]) {
    for (const [name, [userId, role]] of Object.entries(READERS)) {
      it(`as ${name}, on a ${scenario} check-in`, async () => {
        /* A reader refused the board altogether (an admin without access to a performance plan) is
           served nothing, so nothing can leak to them. */
        const board = await boardAs({ scenario, gaps }, userId, role).catch((e: any) => {
          if (/not a participant|not found|could not be found|not one of the people/i.test(String(e?.message))) return null;
          throw e;
        });
        const served = everyString(board).join(' \n ');
        const servedRuns = new Set(runsOfSix(served));
        /* A short owed line can share its words with the plain question it is asked as ("what is getting
           in the way now" and "What is getting in the way now?"); those words are the question, not the note. */
        const leaks = EVERY_OWED_LINE.filter((line) => {
          const asked = new Set(runsOfSix(theOwedThingAskedPlainly(line) ?? ''));
          return runsOfSix(line).some((r) => servedRuns.has(r) && !asked.has(r));
        });
        expect(leaks).toEqual([]);
      });
    }
  }
});

describe('what is still unanswered, as a sentence for the reader', () => {
  const one = [{ participantId: 'p-rukia', what: 'how they are making their number. Not the total: what kind of sales or work, on what terms, with whom. This matters most where the aim set a condition on the mix.', firstRound: 1, asked: 2, certain: true }];

  it('the lead reads who was asked what, in plain words', async () => {
    const b = await boardAs({ gaps: one }, ...AMINA);
    expect(b.stillUnanswered).toEqual([
      { who: 'Rukia Mwangi', what: 'How are you making your number?', says: 'In session 1, Rukia Mwangi was asked, "How are you making your number?" Rukia Mwangi has not answered it yet.', sinceRound: 1, certain: true },
    ]);
  });

  it('a line nothing on record can confirm says so', async () => {
    const b = await boardAs({ gaps: [{ ...one[0], certain: false }] }, ...AMINA);
    expect(b.stillUnanswered[0].says).toBe('In session 1, Rukia Mwangi was asked, "How are you making your number?" Nothing on record can confirm the answer yet.');
  });

  it('a line with no plain question still says nothing of the note', async () => {
    const b = await boardAs({ gaps: [{ ...one[0], what: 'a working note nobody has written a question for yet' }] }, ...AMINA);
    expect(b.stillUnanswered[0].says).toBe('Rukia Mwangi has something from session 1 that is still not answered.');
    expect(JSON.stringify(b)).not.toContain('a working note nobody');
  });
});
