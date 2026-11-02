/**
 * THE RECORD'S LINES, READ FROM THE CONVERSATION'S ASSESSMENT (one source, part 2; Hafsah's brief of 31 October 2026).
 *
 * A check-in's lines in record_entries were read by a model call of their own (readTheRecord), at the close, beside the
 * assessment that reads the same conversation, so the two could disagree about what was said. The record is now the part of
 * the assessment everybody in the check-in may see, one line per thing said, written by one writer
 * (ConversationService.writeTheRecordFromTheAssessment). The end card still shows what it showed; the stored record is what
 * the assessment holds.
 *
 * EVERY PART EVERYBODY IN THE CHECK-IN MAY SEE becomes lines (assessment test, 2 November 2026). Only some sections were taken,
 * so what a person said about their role, a document they attached, and the asides the assessment kept under "everything else"
 * never reached the record, and the session report, which reads the record, never saw them. Which part becomes which kind:
 *   - this person's own promises are COMMITMENT; a promise somebody else made, which they told us of, is what happened (PROGRESS);
 *   - what they are waiting on or blocked by is WORRY; a decision or a rule is INTENT;
 *   - what they or the team aim at, the objective, and what success looks like, is SUCCESS_DEFINITION;
 *   - a date or timing is TIMEFRAME;
 *   - everything else (work, claims, numbers, documents, people, corrections, what changed since last time, what is still open,
 *     everything else) is PROGRESS, what they told us.
 * The sections the record always took come first; the parts added after them only add what no line already holds, so a
 * message kept whole never swallows the short lines read out of it.
 *
 * PRIVACY. Only items everybody in the check-in may see (whoMaySee, the one rule for the assessment) become lines, and only
 * items that came from what the person said in the check-in itself: setup's words, her notes on each person, the team, the
 * risks, observations, role and focus reads stay in the assessment and never reach the record, as they never did.
 */
import type { AnItem, TheAssessment } from './the-assessment';

export type ARecordLineType = 'COMMITMENT' | 'PROGRESS' | 'WORRY' | 'SUCCESS_DEFINITION' | 'TIMEFRAME' | 'INTENT';

export interface ARecordLineFromTheAssessment {
  type: ARecordLineType;
  text: string;
  verifiability: 'HIGH' | 'MEDIUM' | 'LOW';
  /** The area of work it belongs to, or the earlier item it goes on from: groups lines across sessions. */
  dimensionThreadKey: string | null;
}

/* In this order, so where two sections hold the same words the line takes the first one's kind: a promise is a promise
   before it is a date. Every section everybody in the check-in may see is here once (whoMaySee in the-assessment.ts); the
   lead-only ones (observations, role signals, areas, disagreements, the team, risks, private notes) are not, and the item check
   below holds even if one were added. */
const PROGRESS = () => 'PROGRESS' as const;
const THE_SECTIONS: { section: string; pick: (a: TheAssessment) => AnItem[]; type: (i: AnItem) => ARecordLineType; onlyWhatIsNew?: true }[] = [
  { section: 'promises', pick: (a) => a.promises ?? [], type: (i) => ((i as any).byThePerson === true ? 'COMMITMENT' : 'PROGRESS') },
  { section: 'blockers', pick: (a) => a.blockers ?? [], type: () => 'WORRY' },
  { section: 'decisions', pick: (a) => a.decisions ?? [], type: () => 'INTENT' },
  { section: 'targets', pick: (a) => a.targets ?? [], type: () => 'SUCCESS_DEFINITION' },
  { section: 'setup.success', pick: (a) => (a.setup as any)?.success ?? [], type: () => 'SUCCESS_DEFINITION' },
  { section: 'claims', pick: (a) => a.claims ?? [], type: PROGRESS },
  { section: 'workUpdates', pick: (a) => a.workUpdates ?? [], type: PROGRESS },
  { section: 'numbers', pick: (a) => a.numbers ?? [], type: PROGRESS },
  { section: 'dates', pick: (a) => a.dates ?? [], type: () => 'TIMEFRAME' },
  ...([
    ['setup.objective', (a) => (a.setup as any)?.objective ?? [], () => 'SUCCESS_DEFINITION'],
    ['setup.timing', (a) => (a.setup as any)?.timing ?? [], () => 'TIMEFRAME'],
    ['setup.rules', (a) => (a.setup as any)?.rules ?? [], () => 'INTENT'],
    ['documents', (a) => a.documents ?? [], PROGRESS],
    ['corrections', (a) => a.corrections ?? [], PROGRESS],
    ['people', (a) => a.people ?? [], PROGRESS],
    ['compared.promisesDue', (a) => a.comparedWithLastTime?.promisesDue ?? [], PROGRESS],
    ['compared.figuresChanged', (a) => a.comparedWithLastTime?.figuresChanged ?? [], PROGRESS],
    ['compared.workMoved', (a) => a.comparedWithLastTime?.workMoved ?? [], PROGRESS],
    ['compared.blockers', (a) => a.comparedWithLastTime?.blockers ?? [], () => 'WORRY'],
    ['compared.repeated', (a) => a.comparedWithLastTime?.repeated ?? [], PROGRESS],
    ['stillOpen', (a) => a.stillOpen ?? [], PROGRESS],
    ['everythingElse', (a) => a.everythingElse ?? [], PROGRESS],
  ] as [string, (a: TheAssessment) => AnItem[], (i: AnItem) => ARecordLineType][]).map(([section, pick, type]) => ({ section, pick, type, onlyWhatIsNew: true as const })),
];

const squash = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[.!?\s]+$/, '').replace(/\s+/g, ' ').trim();

/**
 * The lines the assessment holds for the record, one per thing said: the same words in two sections are one line, and words
 * that sit inside a longer line already kept ("on Friday" inside "I will call Westgate on Friday") are that line.
 * `hasSpecifics` says whether a line is checkable on its face (a name, a number, a date), for its verifiability.
 */
export function theRecordLinesIn(a: TheAssessment, hasSpecifics: (text: string) => boolean): ARecordLineFromTheAssessment[] {
  const inTheCheckIn = new Set((a.messages ?? []).filter((m) => m.where === 'check-in').map((m) => m.n));
  const candidates: (ARecordLineFromTheAssessment & { key: string; onlyWhatIsNew?: true })[] = [];
  for (const s of THE_SECTIONS) {
    for (const item of s.pick(a)) {
      if (item.whoMaySee !== 'the people in this check-in') continue;
      if (!(item.from ?? []).some((n) => inTheCheckIn.has(n))) continue;
      const text = String(item.words ?? '').trim();
      if (!text) continue;
      const proved = (item as any).proof === 'proved';
      candidates.push({
        key: squash(text),
        onlyWhatIsNew: s.onlyWhatIsNew,
        type: s.type(item),
        text,
        verifiability: proved ? 'HIGH' : hasSpecifics(text) ? 'MEDIUM' : 'LOW',
        dimensionThreadKey: String((item as any).area ?? (item as any).previousItem ?? '').trim() || null,
      });
    }
  }
  const kept: typeof candidates = [];
  for (const c of candidates) {
    if (kept.some((k) => k.key.includes(c.key) || (c.onlyWhatIsNew && c.key.includes(k.key)))) continue;
    /* A longer line holding shorter ones kept before it takes the first one's place, and its kind. */
    const first = kept.findIndex((k) => c.key.includes(k.key));
    if (first < 0) { kept.push(c); continue; }
    const line = { ...c, type: kept[first].type };
    for (let i = kept.length - 1; i >= 0; i--) if (c.key.includes(kept[i].key)) kept.splice(i, 1);
    kept.splice(Math.min(first, kept.length), 0, line);
  }
  return kept.map(({ key: _k, onlyWhatIsNew: _n, ...line }) => line);
}
