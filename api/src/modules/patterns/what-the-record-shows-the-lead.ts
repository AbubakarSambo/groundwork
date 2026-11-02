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
import type { AServedPattern, APatternReader } from './who-reads-a-pattern';
import type { PlainKind } from './plain-pattern-names';

const KIND: Record<APatternAcrossAssessments['kind'], PlainKind> = { strength: 'good', 'too much on': 'carrying', 'needs work': 'attention' };

/** The newest assessment's record across time for each person on the check-in, with its next steps. */
export async function theNewestRecordOfEachPerson(prisma: any, groundId: string): Promise<{ participantId: string; record: TheRecordAcrossTime; interventions: AnIntervention[] }[]> {
  const rows = ((await prisma.checkIn?.findMany?.({
    where: { groundId },
    orderBy: { sessionNumber: 'desc' },
    select: { participantId: true, sessionReport: true },
  })?.catch?.(() => [])) ?? []) as any[];
  const out = new Map<string, { participantId: string; record: TheRecordAcrossTime; interventions: AnIntervention[] }>();
  for (const r of rows) {
    if (out.has(r.participantId)) continue;
    const a = theAssessmentIn(r.sessionReport);
    const record = theRecordAcrossTimeIn(a);
    if (a && record) out.set(r.participantId, { participantId: r.participantId, record, interventions: (Array.isArray(a.interventions) ? a.interventions : []) as AnIntervention[] });
  }
  return [...out.values()];
}

/** The next step the lead reads for one pattern: hers to take, or the one already happening on its own. */
function theStepFor(p: APatternAcrossAssessments, steps: AnIntervention[]): string | null {
  const s = steps.find((i) => i.key === p.key && i.participantId === p.participantId && (i.aboutWhom ?? '') === (p.aboutWhom ?? '') && (i.state === 'open' || i.state === 'waiting for the lead'));
  if (!s) return null;
  if (s.forWhom === 'the lead') return s.says;
  return `Groundwork will ask this in the next check-in: "${s.says}"`;
}

/** Each pattern that holds, in the served shape, for whoever runs the check-in. */
export function theRecordAsServedPatterns(people: { participantId: string; record: TheRecordAcrossTime; interventions: AnIntervention[] }[]): AServedPattern[] {
  const out: AServedPattern[] = [];
  for (const person of people) {
    for (const p of person.record.patterns.filter((x) => x.state === 'holds')) {
      const sessions = [...new Set(p.instances.map((i) => i.sessionNumber))].sort((a, b) => a - b);
      out.push({
        id: `across:${person.participantId}:${p.key}${p.aboutWhom ? `:${p.aboutWhom}` : ''}`,
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
        whoSeesIt: 'Only you see this. Nothing is decided from it.',
        leadMark: null,
        talkedAbout: false,
        secondReadNote: null,
        about: p.key === 'claims-rarely-proved' ? 'what is said against what happened' : 'the work',
        coachTowards: null,
        oneStep: null,
      });
    }
  }
  return out;
}

/** What the record shows about each person, for this reader: everything for whoever runs it, nothing for anybody else. */
export async function whatTheRecordShowsTheLead(prisma: any, groundId: string, reader: APatternReader): Promise<AServedPattern[]> {
  if (!reader.runsIt) return [];
  if (!(await thePersonJudgementsAreOnFor(prisma, groundId))) return [];
  return theRecordAsServedPatterns(await theNewestRecordOfEachPerson(prisma, groundId));
}
