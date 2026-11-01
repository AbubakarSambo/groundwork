/**
 * LAYER 2: PATTERNS ACROSS ASSESSMENTS (Hafsah's brief of 31 October 2026, part 3).
 *
 * Built across a person's assessments over time, never decided inside one. Each pattern names its instances: the
 * assessments, their dates and the words it rests on. What each assessment says about a single conversation (a promise not
 * kept, a claim only said, a sign of overload, the role somebody played) is the model's reading of that conversation; this
 * file only counts those readings across conversations, the way the three-period rule already counts detections.
 *
 * A pattern is "forming" when it is seen in two assessments and "holds" when it is seen in as many as the three-period rule
 * asks before a pattern is shown (who-reads-a-pattern.ts). Only a pattern that holds is given a next step (layer 3).
 *
 * Nothing here is a label on a person. Each line says what happened, in their words, and where.
 */
import { PERIODS_BEFORE_A_PATTERN_IS_SHOWN } from './who-reads-a-pattern';
import type { AnItem, TheAssessment } from '../conversation/the-assessment';

export const ASSESSMENTS_BEFORE_A_PATTERN_FORMS = 2;

export type APatternKey =
  | 'role-differs-from-given'
  | 'focus-away-from-the-priorities'
  | 'slipping-promises'
  | 'claims-rarely-proved'
  | 'quiet-excellence'
  | 'overload'
  | 'ownership'
  | 'the-leads-bias';

export interface AnInstance {
  checkInId: string;
  sessionNumber: number;
  on: string | null;
  words: string[];
}

export interface APatternAcrossAssessments {
  key: APatternKey;
  /** The participant it is about. For the lead's bias, the lead; `aboutWhom` names the person she is biased about. */
  participantId: string;
  aboutWhom?: string;
  /** A strength, something to work on, or something for the lead to look at in herself. */
  kind: 'strength' | 'needs work';
  /** What happened, in one plain sentence, for the lead. Never a label. */
  saying: string;
  instances: AnInstance[];
  state: 'forming' | 'holds';
}

export interface AnAssessmentSeen {
  checkInId: string;
  sessionNumber: number;
  on: string | null;
  assessment: TheAssessment;
}

const wordsOf = (items: AnItem[]) => items.map((i) => String(i.words ?? '').trim()).filter(Boolean).slice(0, 4);
const instanceOf = (s: AnAssessmentSeen, items: AnItem[]): AnInstance => ({ checkInId: s.checkInId, sessionNumber: s.sessionNumber, on: s.on, words: wordsOf(items) });

function aPattern(key: APatternKey, participantId: string, kind: 'strength' | 'needs work', saying: string, instances: AnInstance[], aboutWhom?: string): APatternAcrossAssessments | null {
  const seen = instances.filter((i) => i.words.length || i.checkInId);
  if (seen.length < ASSESSMENTS_BEFORE_A_PATTERN_FORMS) return null;
  return { key, participantId, kind, saying, instances: seen, state: seen.length >= PERIODS_BEFORE_A_PATTERN_IS_SHOWN ? 'holds' : 'forming', ...(aboutWhom ? { aboutWhom } : {}) };
}

/** Per assessment, the items that count towards each pattern; an assessment with none does not count. */
function perAssessment(seen: AnAssessmentSeen[], pick: (a: TheAssessment) => AnItem[] | null): AnInstance[] {
  const out: AnInstance[] = [];
  for (const s of seen) {
    const items = pick(s.assessment);
    if (items && items.length) out.push(instanceOf(s, items));
  }
  return out;
}

const own = (a: TheAssessment) => (a.promises ?? []).filter((p) => p.byThePerson !== false);

/**
 * THE PATTERNS FOR ONE PERSON, from their own assessments in order (oldest first). `team` is the other people's assessments
 * by participant id, read only for the lead's bias, which compares what the lead says of somebody with that person's own record.
 */
export function thePatternsAcrossTheAssessments(
  participantId: string,
  seen: AnAssessmentSeen[],
  team: { participantId: string; name: string; seen: AnAssessmentSeen[] }[] = [],
): APatternAcrossAssessments[] {
  const name = seen[seen.length - 1]?.assessment.about.who ?? 'This person';
  const isTheLead = !!seen[seen.length - 1]?.assessment.about.isTheLead;
  const found: (APatternAcrossAssessments | null)[] = [];

  /* Role: the role they are actually playing differs from the one they were given. */
  found.push(aPattern('role-differs-from-given', participantId, 'needs work',
    `${name}'s check-ins show work that differs from the role ${name} was given.`,
    perAssessment(seen, (a) => (a.roleAgainstGiven?.fits === 'differs' ? (a.roleSignals?.length ? a.roleSignals : [{ words: a.roleAgainstGiven.playing ?? '' } as AnItem]) : null))));

  /* Focus: more than half of what they talked about sits outside the team's priorities. */
  found.push(aPattern('focus-away-from-the-priorities', participantId, 'needs work',
    `Most of what ${name} talked about sits outside the team's priorities.`,
    perAssessment(seen, (a) => {
      const judged = (a.areas ?? []).filter((x) => x.fitsAPriority === 'yes' || x.fitsAPriority === 'no');
      const off = judged.filter((x) => x.fitsAPriority === 'no');
      return judged.length >= 2 && off.length * 2 > judged.length ? off : null;
    })));

  /* Slipping promises: promises due since last time that were not kept, or not mentioned. */
  found.push(aPattern('slipping-promises', participantId, 'needs work',
    `Promises ${name} made were not kept, or not mentioned, when they came due.`,
    perAssessment(seen, (a) => {
      const slipped = (a.comparedWithLastTime?.promisesDue ?? []).filter((p) => p.outcome === 'not kept' || p.outcome === 'not mentioned');
      return slipped.length ? slipped : null;
    })));

  /* Claims rarely proved: in a conversation with three or more claims, at most one in four proved. */
  found.push(aPattern('claims-rarely-proved', participantId, 'needs work',
    `${name} says a lot is done or true, and rarely shows the proof.`,
    perAssessment(seen, (a) => {
      const claims = a.claims ?? [];
      const said = claims.filter((c) => c.proof !== 'proved');
      return claims.length >= 3 && (claims.length - said.length) * 4 <= claims.length ? said : null;
    })));

  /* Quiet excellence: promises kept and claims proved, with nothing slipping, conversation after conversation. */
  found.push(aPattern('quiet-excellence', participantId, 'strength',
    `${name} keeps promises and proves what is done, without making much of it.`,
    perAssessment(seen, (a) => {
      const due = a.comparedWithLastTime?.promisesDue ?? [];
      const kept = due.filter((p) => p.outcome === 'kept');
      const slipped = due.some((p) => p.outcome !== 'kept');
      const proved = (a.claims ?? []).filter((c) => c.proof === 'proved');
      return !slipped && (kept.length || proved.length) ? [...kept, ...proved] : null;
    })));

  /* Overload: signs of too much on their plate, in their own words. */
  found.push(aPattern('overload', participantId, 'needs work',
    `${name} has shown signs of having too much on.`,
    perAssessment(seen, (a) => {
      const o = (a.observations ?? []).filter((x) => x.observed === 'overload');
      return o.length ? o : null;
    })));

  /* Ownership: they say what they tried before raising a blocker, and own their next steps. */
  found.push(aPattern('ownership', participantId, 'strength',
    `${name} says what they tried before raising a blocker, and owns the next step.`,
    perAssessment(seen, (a) => {
      const tried = (a.blockers ?? []).filter((b) => typeof b.triedSaid === 'string' && b.triedSaid.trim());
      const owned = (a.workUpdates ?? []).filter((w) => w.nextStep && w.nextStepDay);
      return tried.length || owned.length >= 2 ? [...tried, ...owned] : null;
    })));

  /* The lead's bias: what the lead says of a person, against that person's own record, in the same direction again and again. */
  if (isTheLead) {
    for (const member of team) {
      const theirOwn = thePatternsAcrossTheAssessments(member.participantId, member.seen);
      const doesWell = theirOwn.some((p) => p.kind === 'strength');
      const slips = theirOwn.some((p) => p.key === 'slipping-promises' || p.key === 'claims-rarely-proved');
      const spokenOf = (tone: 'praise' | 'criticism') => perAssessment(seen, (a) => {
        const about = (a.people ?? []).filter((x) => x.spokenOf === tone && aboutThem(x, member.name));
        return about.length ? about : null;
      });
      if (doesWell && !slips) {
        const p = aPattern('the-leads-bias', participantId, 'needs work',
          `${name} speaks critically of ${member.name}, while ${member.name}'s own record shows promises kept and work proved.`, spokenOf('criticism'), member.name);
        if (p) found.push(p);
      }
      if (slips && !doesWell) {
        const p = aPattern('the-leads-bias', participantId, 'needs work',
          `${name} praises ${member.name}, while ${member.name}'s own record shows promises slipping or claims not proved.`, spokenOf('praise'), member.name);
        if (p) found.push(p);
      }
    }
  }
  return found.filter((p): p is APatternAcrossAssessments => !!p);
}

function aboutThem(item: AnItem, name: string): boolean {
  const first = name.trim().split(/\s+/)[0]?.toLowerCase();
  const said = String(item.name ?? item.words ?? '').toLowerCase();
  return !!first && said.split(/[^a-z']+/).includes(first);
}

/** The patterns as the pattern detector is given them: what they rest on, in a block of plain lines. */
export function thePatternsAsTheDetectorReadsThem(patterns: APatternAcrossAssessments[]): string {
  if (!patterns.length) return '';
  const lines = patterns.map((p) => `- ${p.saying} (${p.state === 'holds' ? 'seen' : 'forming'} in ${p.instances.length} check-ins: ${p.instances.map((i) => `session ${i.sessionNumber}${i.on ? `, ${i.on.slice(0, 10)}` : ''}${i.words.length ? `, "${i.words[0]}"` : ''}`).join('; ')})`);
  return `\n\nWHAT THEIR ASSESSMENTS SHOW OVER TIME (counted across their check-ins, never from one):\n${lines.join('\n')}`;
}
