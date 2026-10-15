import { THE_LINES_REWRITTEN } from './every-line-is-read-before-it-is-kept';
import { ReportsService } from './reports.service';
import { THE_PICTURE_SCHEMA } from './the-picture-in-plain-sentences';
import { THE_JUDGEMENT_SCHEMA, THE_ROOM_JUDGEMENT_SCHEMA } from './the-judgement-over-the-answers';
import { quotationsIn } from './a-quote-is-what-they-said';

/**
 * THE PROOF HAFSAH ASKED FOR: FOR EVERY QUOTE IN A SERVED REPORT, THE TEXT MATCHES THE ORIGINAL
 * ANSWER EXACTLY.
 *
 * Her words, 27 September 2026: "Every quote any person sees must be the person's original words,
 * taken from the record, never the model's copy of them. And add a test that proves it."
 *
 * End to end, through the service rather than through the helper: the record goes in, the
 * synthesis runs with a stand-in model, the report is stored, and the stored row is served by the
 * door every report read goes through (theReportAsItWasShared, which the board uses too) to the
 * lead, to the participant, and to a participant sent an anonymous copy. What is checked is what
 * each of them reads.
 *
 * The drift scenario, as it went wrong. Nadia Haddad is the lead. Zainab Suleiman said:
 *
 *   "Since March 11th, I've been almost entirely focused on inbound sales support as requested by
 *    Nadia, which has meant no progress on the three partnerships."
 *
 * The models now read that with "the initiator" where Zainab said "Nadia", so the stand-in writes
 * what a model writes from it: the lead's name as the label, inside a quote and outside one. The
 * quote must reach every reader as Zainab said it; the sentence around it must say "your request"
 * to Nadia and "Nadia Haddad's request" to Zainab.
 */

const ZAINAB_SAID =
  "Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia, which has meant no progress on the three partnerships.";
/* And a line of Nadia's that the read's own tidying would change if it reached inside a quote: the
   word "party" (notTheWordParty) and a dash (withoutDashes). */
const NADIA_SAID = 'We had three key targets for January. Neither party has signed the partnership terms yet — not even the first one.';

const PARTICIPANTS = [
  {
    id: 'pid-1', partyType: 'INITIATOR', createdAt: new Date('2026-03-01'), userId: 'uid-1', email: 'nadia@drift.test',
    roleAsDescribed: null, remitAsGiven: null, managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Nadia', lastName: 'Haddad', email: 'nadia@drift.test' },
  },
  {
    id: 'pid-2', partyType: 'PARTICIPANT', createdAt: new Date('2026-03-02'), userId: 'uid-2', email: 'zainab@drift.test',
    roleAsDescribed: 'Partnerships lead. Three named partnerships to close this year.', remitAsGiven: 'Partnerships lead. Three named partnerships to close this year.',
    managingOnly: false, nameGiven: null, organisationGiven: null,
    user: { firstName: 'Zainab', lastName: 'Suleiman', email: 'zainab@drift.test' },
  },
];
/* Labels as labelsForParties hands them out for these two. */
const ZAINABS_LABEL = 'Participant A';

/* A line the record reader tidied: what Zainab meant, in the reader's words. It is on the record and
   the report may read it, but it is not an original, so nothing may quote it. */
const TIDIED = 'The three partnerships have had no progress since the sales work began.';

const RECORD_ROWS = [
  { id: 'r1', participantId: 'pid-2', participant: { id: 'pid-2' }, checkIn: { sessionNumber: 1 }, type: 'WORRY', text: ZAINAB_SAID, disputedAt: null, saidWordForWord: true, createdAt: new Date() },
  { id: 'r2', participantId: 'pid-1', participant: { id: 'pid-1' }, checkIn: { sessionNumber: 1 }, type: 'SUCCESS_DEFINITION', text: NADIA_SAID, disputedAt: null, saidWordForWord: true, createdAt: new Date() },
  { id: 'r3', participantId: 'pid-2', participant: { id: 'pid-2' }, checkIn: { sessionNumber: 1 }, type: 'PROGRESS', text: TIDIED, disputedAt: null, saidWordForWord: false, createdAt: new Date() },
];
const THE_ORIGINALS = [ZAINAB_SAID, NADIA_SAID, PARTICIPANTS[1].roleAsDescribed!];

function harness() {
  const upserts: any[] = [];
  const corpora: string[] = [];
  const any = () => jest.fn(async () => [] as any[]);
  const prisma: any = new Proxy({
    groundBaseline: { findFirst: jest.fn(async () => null) },
    personObjective: { findMany: any() },
    ground: {
      findUnique: jest.fn(async () => ({
        id: 'g-drift', initiatorId: 'uid-1', organizationId: 'o1', scenario: 'DRIFT', label: 'The partnerships work',
        brief: 'The partnerships work has been quiet since March.', peopleWorkTogether: true, participants: PARTICIPANTS,
      })),
      update: jest.fn(async () => ({})),
    },
    user: { findUnique: jest.fn(async () => ({ role: 'MEMBER', organizationId: 'o1' })) },
    groundParticipant: {
      findMany: jest.fn(async (args: any) => (args?.select?.checkIns ? PARTICIPANTS.map((p) => ({ ...p, checkIns: [] })) : PARTICIPANTS)),
      findFirst: jest.fn(async () => null),
    },
    recordEntry: {
      findMany: jest.fn(async (args: any) => RECORD_ROWS.filter((r) => !(args?.where?.disputedAt === null && r.disputedAt))),
      count: jest.fn(async () => RECORD_ROWS.length),
    },
    checkIn: {
      count: jest.fn(async () => 2),
      findMany: jest.fn(async () => [
        { participantId: 'pid-1', sessionNumber: 1, status: 'COMPLETED', turns: [] },
        { participantId: 'pid-2', sessionNumber: 1, status: 'COMPLETED', turns: [] },
      ]),
      findFirst: jest.fn(async () => ({ specificityDimensions: null, sessionNumber: 1 })),
    },
    groundDocument: { count: jest.fn(async () => 0), groupBy: any(), findMany: any() },
    adminProfile: { findUnique: jest.fn(async () => null), upsert: jest.fn(async () => ({})) },
    report: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async (a: any) => { upserts.push(a); return { id: 'r1', groundId: 'g-drift', ...a.create }; }),
      update: jest.fn(async () => ({})),
    },
  } as any, {
    /* Every other table the synthesis reads is empty here: nothing on it, nothing to quote from it. */
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'then' || typeof prop === 'symbol') return undefined;
      target[prop] = new Proxy({}, {
        get: (_t, method: string) => (method === 'count' ? jest.fn(async () => 0) : /^find(First|Unique)$/.test(method) ? jest.fn(async () => null) : jest.fn(async () => [])),
      });
      return target[prop];
    },
  });

  /* A stand-in for each model, writing what the models write once they read labels. */
  const anthropic: any = {
    respond: jest.fn(async (_s: string, h: any[]) => String(h?.[0]?.content ?? '')),
    extract: jest.fn(async (_system: string, history: any[], schema: any) => {
      /* The check before the report is kept sends every failing line in one call: the unquoted
         judgement line below reads "Whether The three partnerships ... began. is still true.", a
         lower-case start the check finds and has rewritten. See every-line-is-read-before-it-is-kept. */
      if (schema === THE_LINES_REWRITTEN) {
        const blocks = [...String(history?.[0]?.content ?? '').matchAll(/^id: (\S+)\n  as stored: (.*)$/gm)];
        return {
          lines: blocks
            .filter((m) => m[2].includes('is still true'))
            .map((m) => ({ id: m[1], sentence: 'Whether the three partnerships have had no progress since the sales work began is still true.' })),
        };
      }
      const corpus = String(history?.[0]?.content ?? '');
      corpora.push(corpus);
      if (schema === THE_PICTURE_SCHEMA) {
        return {
          opening: 'Two of two people have answered. They disagree on what Partnerships lead has been working on.',
          perPerson: [
            { participantId: 'pid-1', text: 'The initiator set three key targets for January and is asking for an update on them.', headline: null },
            {
              participantId: 'pid-2',
              /* The quote as a model writes it: the label where Zainab said the name, and her words a little tidied. */
              text: `${ZAINABS_LABEL} has been on inbound sales support since March, at the initiator's request. In ${ZAINABS_LABEL}'s words, "since March 11th, I've been almost entirely focused on inbound sales support as requested by the initiator".`,
              headline: `${ZAINABS_LABEL} has been working on inbound sales support at the initiator's request.`,
            },
          ],
        };
      }
      if (schema === THE_ROOM_JUDGEMENT_SCHEMA || schema === THE_JUDGEMENT_SCHEMA) {
        return {
          theGap: `The initiator moved ${ZAINABS_LABEL} onto sales support, and the three partnerships have not moved since.`,
          whatTheNumbersSay: [],
          whatToDo: [{
            /* Changed 1 October: this move asked the initiator, who is the reader, to ask herself, and such a
               step is no longer served (the review, section 2). It now names what to find out. */
            move: 'Find out what is holding the partnership terms.',
            because: 'The initiator said "neither party has signed the partnership terms yet — not even the first one."',
            startWith: 'the initiator',
          }, {
            move: `Tell ${ZAINABS_LABEL} which of the two pieces of work comes first now.`,
            because: `${ZAINABS_LABEL} said it plainly: "as requested by the initiator, which has meant no progress on the three partnerships."`,
            startWith: ZAINABS_LABEL,
          }],
          whatThisCannotTellYou: [],
          whatWeFailedToAsk: [{ about: `Whether "${TIDIED}" is still true.` }],
        };
      }
      /* The synthesis itself. One quote the record holds, one it does not. */
      return {
        sharedPicture: `${ZAINABS_LABEL} was hired for "Partnerships lead. Three named partnerships to close this year" and says the work has stopped.`,
        agreements: [],
        divergences: [{
          topic: `What ${ZAINABS_LABEL} has been working on since March.`,
          positions: [
            { participantLabel: 'the initiator', view: `The initiator expected progress on the "three key targets for January".` },
            /* A misquote: Zainab never said "mostly". */
            { participantLabel: ZAINABS_LABEL, view: `${ZAINABS_LABEL} says "I have mostly been doing sales support at the initiator's request".` },
          ],
          evidence: [`"I've been almost entirely focused on inbound sales support as requested by the initiator"`],
        }],
        centralQuestion: 'What should come first now?',
      };
    }),
  };

  const service = new ReportsService(prisma, { getActive: jest.fn(async () => ({ id: 'pv1', content: 'synthesize this.' })) } as any, anthropic, {} as any, {} as any, { emit: () => Promise.resolve() } as any, {} as any, { tell: async () => [] } as any);
  return { service, upserts, corpora };
}

function everyString(v: any, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => everyString(x, out));
  else if (v && typeof v === 'object' && !(v instanceof Date)) Object.values(v).forEach((x) => everyString(x, out));
  return out;
}

/** Every quote in what this reader is served, and whether it is, character for character, in the record. */
function quotesServed(served: any) {
  return everyString(served).flatMap((s) => quotationsIn(s).map((q) => ({ quote: q.inner, inTheRecord: THE_ORIGINALS.some((o) => o.includes(q.inner)) })));
}

describe('the quote a person reads is what they said', () => {
  let stored: any;
  let corpora: string[];
  let served: { lead: any; zainab: any; anonymous: any };

  beforeAll(async () => {
    const h = harness();
    await h.service.synthesize('g-drift');
    expect(h.upserts.length).toBe(1);
    stored = h.upserts[0].create;
    corpora = h.corpora;
    const ground = (sharedAs: string | null) => ({ scenario: 'DRIFT', peersVisibleToEachOther: true, participants: PARTICIPANTS, report: { ...stored, sharedAs } });
    served = {
      lead: h.service.theReportAsItWasShared(ground(null), 'pid-1', true),
      zainab: h.service.theReportAsItWasShared(ground(null), 'pid-2', false),
      anonymous: h.service.theReportAsItWasShared(ground('ANONYMOUS'), 'pid-2', false),
    };
  });

  it('the models read Zainab\'s words with the lead as the lead', () => {
    const synthesis = corpora.find((c) => c.includes('inbound sales support'))!;
    expect(synthesis).toContain('as requested by the initiator, which has meant no progress');
    expect(corpora.join('\n')).not.toMatch(/requested by Nadia/);
  });

  it('what is stored quotes her as she said it, and a misquote in her mouth is not stored at all', () => {
    expect(stored.findings.find((f: any) => f.participantId === 'pid-2').text).toContain(
      `"Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia"`,
    );
    /* "Participant A says I have mostly been doing sales support at the initiator's request" would be
       served to Nadia as Zainab saying "your". The sentence goes, and it was the whole of that side of
       the difference, so the side goes rather than being stored blank. */
    expect(stored.divergences[0].positions.map((p: any) => p.participantLabel)).toEqual(['the initiator']);
  });

  it('nothing the pass touched is stored blank where the model wrote a sentence', () => {
    const blanks: string[] = [];
    const look = (v: any, at: string) => {
      if (typeof v === 'string') { if (!v.trim()) blanks.push(at); return; }
      if (Array.isArray(v)) v.forEach((x, i) => look(x, `${at}[${i}]`));
      else if (v && typeof v === 'object' && !(v instanceof Date)) for (const [k, x] of Object.entries(v)) look(x, `${at}.${k}`);
    };
    for (const f of ['sharedPicture', 'theOpening', 'findings', 'agreements', 'divergences', 'centralQuestion', 'theJudgement', 'inferences']) look(stored[f], f);
    expect(blanks).toEqual([]);
  });

  for (const who of ['lead', 'zainab', 'anonymous'] as const) {
    it(`for every quote ${who === 'anonymous' ? 'an anonymous copy' : `served to ${who === 'lead' ? 'Nadia, the lead' : 'Zainab'}`}, the text matches the original answer exactly`, () => {
      const quotes = quotesServed(served[who]);
      expect(quotes.length).toBeGreaterThan(0);
      expect(quotes.filter((q) => !q.inTheRecord)).toEqual([]);
    });
  }

  it('a quote of a line the record reader tidied is never served as a quote, to anybody', () => {
    for (const who of ['lead', 'zainab', 'anonymous'] as const) {
      const all = everyString(served[who]).join('\n');
      expect(all).not.toContain(`"${TIDIED}"`);
      expect(all).not.toContain(`“${TIDIED}”`);
    }
    /* The line is in the stored judgement, as a plain statement about the record: unquoted by the
       quote pass, and then made one sentence by the check before the report is kept, because
       unquoted it read "Whether The three partnerships ... began. is still true." */
    expect(stored.theJudgement.whatWeFailedToAsk[0].about).toBe('Whether the three partnerships have had no progress since the sales work began is still true.');
    expect(stored.theJudgement.whatWeFailedToAsk[0].about).not.toContain('"');
  });

  it('Nadia reads Zainab\'s quote with "Nadia" in it, and the sentence around it says "your request"', () => {
    const finding = served.lead.findings.find((f: any) => f.participantId === 'pid-2').text;
    expect(finding).toBe(
      `Zainab Suleiman has been on inbound sales support since March, at your request. In Zainab's words, "Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia".`,
    );
    const move = served.lead.theJudgement.whatToDo.find((m: any) => /plainly/.test(m.because));
    expect(move.because).toBe('Zainab Suleiman said it plainly: "as requested by Nadia, which has meant no progress on the three partnerships."');
  });

  it('the read\'s own tidying never reaches inside a quote: "party" and the dash stay as Nadia said them', () => {
    const because = served.lead.theJudgement.whatToDo.map((m: any) => m.because).find((b: string) => /partnership terms/.test(b));
    expect(because).toBe('You said "Neither party has signed the partnership terms yet — not even the first one."');
  });

  it('Zainab reads the same quote, and the sentence around it names who asked', () => {
    const finding = served.zainab.findings.find((f: any) => f.participantId === 'pid-2').text;
    expect(finding).toBe(
      `You have been on inbound sales support since March, at Nadia Haddad's request. In your words, "Since March 11th, I've been almost entirely focused on inbound sales support as requested by Nadia".`,
    );
  });

  it('an anonymous copy has no name in it anywhere, and a quote it had to change is no longer a quote', () => {
    const all = everyString(served.anonymous).join('\n');
    expect(all).not.toMatch(/Nadia|Haddad/);
    const finding = served.anonymous.findings.find((f: any) => f.participantId === 'pid-2').text;
    /* "In your words, Since March 11th, ... as requested by somebody in this check-in." announced her
       words and then gave words that are no longer hers, so that sentence is not in the copy. */
    expect(finding).toBe("You have been on inbound sales support since March, at somebody in this check-in's request.");
  });
});
