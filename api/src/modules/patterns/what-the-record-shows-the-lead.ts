/**
 * WHAT THE RECORD SHOWS ABOUT EACH PERSON, AS THE LEAD READS IT (F2, Hafsah's decision of 2 November 2026: "yes to replacing
 * PatternDetection's lead-facing patterns with the assessment's single pattern layer").
 *
 * The lead reads layer 2 (patterns-across-the-assessments.ts), and nothing else, about how a person works: each pattern that holds,
 * with the check-ins, days and words it rests on, the role each person is really playing against the role they were given, where
 * their effort goes against the priorities, and the next step for each (layer 3). It is served in the same shape as a stored pattern
 * (AServedPattern), so every page that showed the lead "what keeps coming up" shows this instead, with no second shape to keep.
 *
 * THE WALLS (CLAUDE.md, privacy). Only whoever runs the check-in reads it (`reader.runsIt`, never every admin: runsItForAPattern),
 * and only where the organisation keeps judgements of a person on. A participant never reads it: it holds the lead's judgement,
 * observations, role signals and, for the lead's bias, her own setup words. The person's own patterns stay theirs to read first
 * (who-reads-a-pattern.ts, rule 5).
 */
import { theAssessmentIn } from '../conversation/the-assessment';
import { theRecordAcrossTimeIn, type APatternAcrossAssessments, type TheRecordAcrossTime } from './patterns-across-the-assessments';
import { theInstancesAsSentences, type AnIntervention } from './the-next-step-for-each-pattern';
import { thePersonJudgementsAreOnFor } from '../organisation/person-judgements';
import type { AServedPattern, APatternReader, ALeadPatternMark } from './who-reads-a-pattern';
import type { PlainKind } from './plain-pattern-names';

const KIND: Record<APatternAcrossAssessments['kind'], PlainKind> = { strength: 'good', 'too much on': 'carrying', 'needs work': 'attention' };

/** What the lead marked on a layer-2 pattern, kept on the person's newest assessment by the pattern's id (carried to the next). */
export interface ALeadsMarkOnAPattern {
  mark?: ALeadPatternMark | null;
  markedAt?: string | null;
  talkedAboutAt?: string | null;
  /** The user who marked it. */
  by?: string | null;
}
export type TheLeadsMarks = Record<string, ALeadsMarkOnAPattern>;

export interface TheNewestRecordOfAPerson {
  participantId: string;
  checkInId: string;
  sessionNumber: number;
  record: TheRecordAcrossTime;
  interventions: AnIntervention[];
  marks: TheLeadsMarks;
}

/** The id a layer-2 pattern is served and marked by: the person whose record it is in, and the pattern. */
export const theIdOfAPatternAcrossTime = (participantId: string, key: string) => `across:${participantId}:${key}`;
export function theIdReadBack(id: string): { participantId: string; key: string } | null {
  const m = /^across:([^:]+):([a-z-]+)$/.exec(String(id ?? ''));
  return m ? { participantId: m[1], key: m[2] } : null;
}

/** The lead's marks kept on an assessment, read back; anything else reads as none. */
export function theLeadsMarksOn(a: unknown): TheLeadsMarks {
  const m = (a as any)?.theLeadsMarks;
  return m && typeof m === 'object' && !Array.isArray(m) ? (m as TheLeadsMarks) : {};
}

/**
 * The newest assessment's record across time for each person, with its next steps and the lead's marks: on one check-in, or for
 * the given people wherever they are; up to a session where a report is read as of that session.
 */
export async function theNewestRecordOfEachPerson(
  prisma: any,
  where: string | { groundId?: string; participantIds?: string[]; upToSession?: number },
): Promise<TheNewestRecordOfAPerson[]> {
  const w = typeof where === 'string' ? { groundId: where } : where;
  const rows = ((await prisma.checkIn?.findMany?.({
    where: {
      ...(w.groundId ? { groundId: w.groundId } : {}),
      ...(w.participantIds ? { participantId: { in: w.participantIds } } : {}),
      ...(typeof w.upToSession === 'number' ? { sessionNumber: { lte: w.upToSession } } : {}),
      /* Nobody who has left is read for the lead: run 5 (19 November) still read "Mary has said 5 pieces of work were done without showing the proof" after she was removed. What she said stays stored. */
      participant: { leftAt: null },
    },
    orderBy: { sessionNumber: 'desc' },
    select: { id: true, participantId: true, sessionNumber: true, sessionReport: true },
  })?.catch?.(() => [])) ?? []) as any[];
  const out = new Map<string, TheNewestRecordOfAPerson>();
  for (const r of rows) {
    if (out.has(r.participantId)) continue;
    const a = theAssessmentIn(r.sessionReport);
    const record = theRecordAcrossTimeIn(a);
    if (a && record) {
      out.set(r.participantId, {
        participantId: r.participantId, checkInId: r.id, sessionNumber: r.sessionNumber, record,
        interventions: (Array.isArray(a.interventions) ? a.interventions : []) as AnIntervention[], marks: theLeadsMarksOn(a),
      });
    }
  }
  return [...out.values()];
}

/** The next step the lead reads for one pattern: hers to take, or the one already happening on its own. */
export function theStepFor(p: APatternAcrossAssessments, steps: AnIntervention[]): string | null {
  const s = steps.find((i) => i.key === p.key && i.participantId === p.participantId && (i.aboutWhom ?? '') === (p.aboutWhom ?? '') && (i.state === 'open' || i.state === 'waiting for the lead'));
  if (!s) return null;
  if (s.forWhom === 'the lead') return s.says;
  return `Groundwork will ask this in the next check-in: "${s.says}"`;
}

/** Each pattern that holds, in the served shape, for whoever runs the check-in. */
export function theRecordAsServedPatterns(people: TheNewestRecordOfAPerson[]): AServedPattern[] {
  const out: AServedPattern[] = [];
  for (const person of people) {
    for (const p of person.record.patterns.filter((x) => x.state === 'holds')) {
      const sessions = [...new Set(p.instances.map((i) => i.sessionNumber))].sort((a, b) => a - b);
      const id = theIdOfAPatternAcrossTime(person.participantId, p.key);
      const marked = person.marks[id] ?? {};
      out.push({
        id,
        /* The lead's bias is about the lead's view of this person: it is placed under the person it is about. */
        participantId: person.participantId,
        yours: false,
        kind: KIND[p.kind],
        heading: p.saying,
        whatHappened: theInstancesAsSentences(p),
        sessions,
        howOften: `This rests on ${p.instances.length === 1 ? 'one thing' : `${p.instances.length} separate things`} from ${sessions.length === 1 ? 'one check-in' : `${sessions.length} check-ins`}.`,
        askThem: theStepFor(p, person.interventions),
        theirWords: null,
        canAnswer: false,
        leadMark: marked.mark ?? null,
        talkedAbout: !!marked.talkedAboutAt,
        about: p.key === 'claims-rarely-proved' ? 'what is said against what happened' : 'the work',
      });
    }
  }
  return out;
}

/** What the record shows about each person, for this reader: everything for whoever runs it, nothing for anybody else. */
export async function whatTheRecordShowsTheLead(prisma: any, groundId: string, reader: APatternReader, opts: { upToSession?: number } = {}): Promise<AServedPattern[]> {
  if (!reader.runsIt) return [];
  if (!(await thePersonJudgementsAreOnFor(prisma, groundId))) return [];
  return theRecordAsServedPatterns(await theNewestRecordOfEachPerson(prisma, { groundId, ...opts }));
}
