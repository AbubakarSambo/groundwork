/**
 * AN ASSESSMENT FOR A SPEC: the column a reader reads, holding only what the spec gives it. Used by the specs of the readers
 * that moved onto the conversation's assessment (the promises and the waits), so each gives the same input it gave its own
 * model call before, through the one source it reads now.
 */
import { THE_ASSESSMENT_KIND, THE_ASSESSMENT_VERSION, type TheAssessment } from './the-assessment';

export function anAssessmentHolding(parts: { promises?: any[]; blockers?: any[]; targets?: any[]; isTheLead?: boolean } = {}): TheAssessment {
  const items = (xs: any[] | undefined, section: string, words: (x: any) => string, extra: (x: any) => object = () => ({})) =>
    (xs ?? []).map((x, i) => ({ ...x, ...extra(x), id: `r1.${section}.${i}`, words: words(x), from: [1], whoMaySee: 'the people in this check-in' as const, saidWordForWord: false }));
  return {
    kind: THE_ASSESSMENT_KIND, version: THE_ASSESSMENT_VERSION,
    about: { checkInId: 'ci', groundId: 'g', participantId: 'p', who: 'Somebody', isTheLead: !!parts.isTheLead, checkIn: null, sessionNumber: 1, startedAt: null, endedAt: null, channel: 'the app', howItEnded: 'finished by the person' },
    summary: '',
    workUpdates: [], claims: [], numbers: [], people: [], dates: [], decisions: [], corrections: [], documents: [], setup: null,
    roleSignals: [], roleAgainstGiven: null, areas: [], observations: [], stillOpen: [], everythingElse: [],
    targets: items(parts.targets, 'targets', (t) => String(t.words ?? t.aim ?? '')),
    promises: items(parts.promises, 'promises', (p) => String(p.action ?? ''), (p) => ({ byThePerson: p.byThePerson ?? true })),
    blockers: items(parts.blockers, 'blockers', (b) => String(b.what ?? '')),
    comparedWithLastTime: { previousCheckInId: null, previousOn: null, promisesDue: [], figuresChanged: [], workMoved: [], blockers: [], repeated: [], disagreements: [] },
    messages: [{ n: 1, turnId: 't1', where: 'check-in', at: null }], nothingToRecord: [],
    completeness: { messages: 1, matchedByTheFirstRead: 1, addedByTheSecondRead: 0, keptWhole: 0, ready: true },
    promptVersionId: null, promptFromFile: 'file:assessment@spec',
    measure: { modelCalls: 1, msFromCloseToReady: 0, readyAt: new Date(0).toISOString(), modelFailed: false },
  };
}
