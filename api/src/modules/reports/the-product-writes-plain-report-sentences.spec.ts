import { RecordEntryType } from '@prisma/client';
import { atAGlanceTiles } from './what-this-session-holds';
import { theSessionReport, type SessionReportInputs } from './the-session-report';
import { commitmentsOverTime, dependenciesOverTime, patternsOverTime, gapsOverTime, whatThisCannotTellYou, toSettleFirst } from './what-the-record-shows-over-time';
import { whatChangedSinceLastTime } from './what-changed-since-last-time';
import { theSentenceAbout } from './the-weekly-sentence-about-each-person';
import { howThisHasMoved } from './how-this-has-moved';
import { whatIsNotPlainIn, everyProductSentence } from './a-product-sentence-is-plain';

/**
 * WEEK 26: EVERY SENTENCE THE REPORTS COMPOSE IN CODE IS PLAIN.
 *
 * Each builder is given every shape of input that changes which sentence it writes, and every string
 * it serves is run through the wording check (a-product-sentence-is-plain), which holds the scorer's
 * tests and the rules of task 1.6. Somebody's own words are not checked. A new sentence that joins
 * pieces with a colon, an arrow or a dash, leaves a fragment where a sentence belongs, mixes a word
 * and a figure for a count, or uses work jargon fails here.
 */
const failures = (name: string, value: unknown): string[] => {
  const out: string[] = [];
  for (const s of everyProductSentence(value)) {
    for (const f of whatIsNotPlainIn(s.text, { whole: s.whole })) out.push(`${name}${s.path.replace(/^board/, '').replace(/\[\d+\]/g, '[]')} [${f.rule}] ${JSON.stringify(f.found)} <= ${s.text.slice(0, 140)}`);
  }
  return out;
};

describe('every sentence the reports compose is plain', () => {
  it('the four quick-read tiles, in every state they can be in', () => {
    const out: string[] = [];
    const base = { agreed: 0, stillOpen: 0, movedOnTargets: null, blocked: 0, waiting: 0, numberWasSaid: false };
    const variants: any[] = [{}];
    for (const stillOpen of [0, 1, 3]) for (const agreed of [0, 2]) for (const theDifference of [null, 'Whether a price range counts as a budget']) for (const stillToAnswer of [undefined, 0, 1, 3]) variants.push({ stillOpen, agreed, theDifference, stillToAnswer });
    for (const movedOnTargets of [null, 0, 2]) for (const targetsSet of [0, 1, 13]) for (const numberWasSaid of [false, true]) variants.push({ movedOnTargets, targetsSet, numberWasSaid });
    for (const blocked of [0, 1, 4]) for (const waiting of [0, 2]) for (const theBlocker of [null, 'Legal has the contract.']) for (const worries of [0, 1, 4]) for (const theWorry of [null, 'Diesel costs more every single month now.']) variants.push({ blocked, waiting, theBlocker, worries, theWorry });
    for (const backedPct of [null, 0, 1, 15]) variants.push({ backedPct });
    for (const v of variants) out.push(...failures('tiles', atAGlanceTiles({ ...base, ...v })));
    expect([...new Set(out)]).toEqual([]);
  });

  it('the session report, with and without anything said', () => {
    const entries = (types: RecordEntryType[]) => types.map((type, i) => ({ type, text: `Line ${i} about the depot.`, who: i % 2 ? 'Rukia Mwangi' : 'Baraka Otieno', recallBased: i % 2 === 0, threadKey: null }));
    const all = [RecordEntryType.COMMITMENT, RecordEntryType.PROGRESS, RecordEntryType.ASK, RecordEntryType.WORRY, RecordEntryType.TENSION, RecordEntryType.TIMEFRAME, RecordEntryType.TOLERANCE, RecordEntryType.SUCCESS_DEFINITION, RecordEntryType.INTENT];
    const base: SessionReportInputs = {
      sessionNumber: 2, closed: true, agreements: ['Both want the depot keys sorted.'], divergences: [{ topic: 'Whether a price range counts as a budget' }],
      entries: entries(all), previousEntries: entries(all).map((e) => ({ ...e, text: `Earlier ${e.text}` })), baselineSuccess: 'Eight closed deals each.', startingPoint: 'Two deals closed.',
      previousSharedPicture: 'Both had answered.', evidence: [{ text: 'The price list.', who: 'Rukia Mwangi' }], specificityLevel: null, centralQuestion: 'Who signs off?',
      movedOnTargets: 1, targetsSet: 2, blocked: 1, waiting: 1, theFirstBlocker: 'the credit terms', worries: 1, theFirstWorry: 'Diesel costs more every single month now.',
      answeredThisSession: [{ who: 'Rukia Mwangi', isYou: false }, { who: 'Baraka Otieno', isYou: false }, { who: 'Amina Wanjiru', isYou: true }], peopleInAll: 4, plannedSessions: 6, saidInAll: 10, documentedInAll: 2,
    };
    const shapes: SessionReportInputs[] = [
      base,
      { ...base, closed: false },
      { ...base, runsUntilEnded: true, plannedSessions: null, whoEndsIt: 'Amina Wanjiru' },
      { ...base, entries: [], previousEntries: [], agreements: [], divergences: [], evidence: [], blocked: 0, waiting: 0, worries: 0, movedOnTargets: null, targetsSet: 0 },
      { ...base, sessionNumber: 1, previousEntries: [], previousSharedPicture: null, peopleInAll: 1 },
    ];
    const out = shapes.flatMap((s, i) => failures(`session report ${i}`, theSessionReport(s)));
    expect([...new Set(out)]).toEqual([]);
  });

  it('what the record cannot tell you, and what to settle first', () => {
    const out: string[] = [];
    for (const documentsAttached of [0, 2]) for (const peopleWhoAnswered of [2, 4]) for (const anybodyAskedWhoArrangedThings of [false, true]) {
      out.push(...failures('cannot tell', whatThisCannotTellYou({ documentsAttached, peopleWhoAnswered, peopleInvited: 4, anybodyAskedWhoArrangedThings })));
    }
    const commitments: any = [{ what: 'Send the quote', who: 'Rukia Mwangi', status: 'OPEN', restatedIn: [1, 2, 3], saidWordForWord: false }];
    const dependencies: any = [{ chased: false, onParticipantId: 'p-1' }, { chased: false, onParticipantId: null }];
    const patterns: any = [{ status: 'SURFACED', observation: 'Rukia Mwangi has moved the date twice.', seenInSessions: [1, 2], who: 'Rukia Mwangi' }];
    for (const c of [commitments, []]) for (const d of [dependencies, []]) for (const documentsAttached of [0, 1]) for (const anybodySaidWhoArrangedThings of [false, true]) {
      out.push(...failures('settle first', toSettleFirst({ commitments: c, dependencies: d, patterns, documentsAttached, anybodySaidWhoArrangedThings })));
    }
    expect([...new Set(out)]).toEqual([]);
  });

  it('what changed since last time, the weekly sentence about a person and how this has moved', () => {
    const out: string[] = [];
    const rounds = [{ topics: [], answered: 2 }, { topics: ['what a budget is'], answered: 2 }, { topics: ['what a budget is', 'who signs off'], answered: 3 }, { topics: ['who signs off'], answered: 4 }];
    for (const now of rounds) for (const before of rounds) out.push(...failures('changed', [whatChangedSinceLastTime(now, before)]));
    const line = (text: string, documented = false) => ({ text, type: 'PROGRESS', documented });
    const people = [
      { label: 'Rukia Mwangi', checkedIn: false, lines: [] },
      { label: 'Rukia Mwangi', checkedIn: true, lines: [line('I will call Green Mart on Friday.')] },
      { label: 'Rukia Mwangi', checkedIn: true, lines: [line('I visited Green Mart and Nyama Choma Palace.', true)] },
      { label: 'Rukia Mwangi', checkedIn: true, lines: [line('I will send it next week.')] },
      { label: 'Rukia Mwangi', checkedIn: true, lines: [line('It went fine.')] },
    ];
    for (const p of people) out.push(...failures('weekly', [theSentenceAbout(p)]));
    out.push(...failures('moved', howThisHasMoved([
      { round: 1, takenAt: new Date('2026-09-10T10:00:00Z'), sharedPicture: 'Both people have checked in.', divergences: [{}], amendedAt: null, amendedNote: null },
      { round: 2, takenAt: new Date('2026-09-17T10:00:00Z'), sharedPicture: 'They agree on two things.', divergences: [], amendedAt: new Date(), amendedNote: null },
    ] as any)));
    expect([...new Set(out)]).toEqual([]);
  });

  it('the record over time, for a commitment, a wait, a pattern and a role', () => {
    const labelOf = (id: string | null) => (id === 'marcus' ? 'Marcus Oyelaran' : id === 'amina' ? 'Amina Bello' : 'a colleague');
    const out: string[] = [];
    for (const settledBy of [null, 'SAID', 'PROVEN', 'CONFIRMED']) for (const status of ['UNKNOWN', 'DONE', 'NOT_DONE']) for (const explicit of [true, false]) for (const whenSaid of [null, 'by Friday']) for (const saidAgainIn of [[], [2], [2, 3, 5]]) for (const source of ['CHECK_IN', 'PASTE']) {
      out.push(...failures('commitment', commitmentsOverTime([{ participantId: 'marcus', text: 'I will arrange the meetings', whenSaid, explicit, status, source, statedInSession: source === 'PASTE' ? null : 1, saidAgainIn, settledBy, saidWordForWord: true, whenSaidWordForWord: true }], labelOf, 6, 'Wairimu')));
      out.push(...failures('commitment not word for word', commitmentsOverTime([{ participantId: 'marcus', text: 'arrange the meetings', whenSaid, explicit, status, source, statedInSession: 1, saidAgainIn, settledBy }], labelOf, 6, 'Wairimu')));
    }
    for (const status of ['WAITING', 'BLOCKING']) for (const onParticipantId of ['marcus', null]) for (const onLabel of [null, 'the county treasury']) for (const escalatedAt of [null, new Date('2026-09-01')]) {
      out.push(...failures('wait', dependenciesOverTime([{ what: 'the signed lease', fromParticipantId: 'amina', onParticipantId, onLabel, status, escalatedAt, statedInSession: 2 }], labelOf, 6)));
    }
    for (const status of ['SURFACED', 'CANDIDATE']) for (const seenInSessions of [[2], [2, 3], [2, 4, 6], [1, 2, 3]]) {
      out.push(...failures('pattern', patternsOverTime([{ participantId: 'marcus', code: 'E2', observationText: 'A commitment was replaced by a letter.', seenInSessions, periodsObserved: 1, lastPeriodNumber: 6, status }], (c) => c, labelOf, 6)));
    }
    for (const expected of ['', 'Covers the mainland branches. Ikeja and Yaba are theirs.', 'Relationship officer, Ikeja. Target 14 approved facilities this quarter.', 'Government Liaison Consultant']) for (const c of [{ lines: 0, checkable: 0, documented: 0, openCommitments: 0, owedToOthers: 0 }, { lines: 6, checkable: 1, documented: 1, openCommitments: 1, owedToOthers: 1 }, { lines: 20, checkable: 12, documented: 0, openCommitments: 5, owedToOthers: 9 }]) {
      out.push(...failures('gap', gapsOverTime([{ participantId: 'marcus', label: 'Marcus Oyelaran', expected, sessions: 1, ...c }])));
    }
    expect([...new Set(out)]).toEqual([]);
  });
});
