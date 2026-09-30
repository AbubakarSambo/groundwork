import { PLAIN_WORDS } from '../conversation/plain-words';
import type { Compose } from './the-engine-drafts-it-the-model-words-it';
import type { AServedPattern } from '../patterns/who-reads-a-pattern';

/**
 * A PATTERN'S EVIDENCE, IN PLAIN WORDS, WORDED ONCE.
 *
 * `whatHappenedIn` (who-reads-a-pattern.ts) keeps the detector's own sentence, and that sentence is
 * written for a courtroom, not a person: "Lack of progress is attributed to an external factor, and
 * the plan is to repeat the same action rather than change the approach." A participant reading it
 * about their own work is never called "you"; a lead reading it about somebody else's work is never
 * told whose work it is without already knowing.
 *
 * Reworded once, like every other line on a report (decision 7, a-line-worded-once-is-kept): the
 * person's own reading speaks to them as "you", never their name; the lead's reading names the
 * person, by their first name, every time, never a pronoun, because more than one person's pattern
 * can sit on the same board and a "they" would drift onto the wrong one. `compose` decides whether
 * a new line may be worded at all (the warm-up only, decision 7): outside the warm-up it is given a
 * function that always returns null, so the kept wording is read and nothing is asked of the model.
 * Until a pattern's evidence is worded, `whatHappenedIn`'s own sentence is served exactly as it is.
 */

const RULES = `Rules:
- Keep every fact, number, name and date exactly as the draft has them. Change nothing factual.
- Do not add facts. If the draft does not say it, you do not know it.
- Plain and direct: no jargon, no praise, no scripted warmth, no "I'd be happy to".
- British spelling. No em dashes. Straight quotes.
- Reply with the one sentence only. No preamble, no explanation, no quotes around it.

${PLAIN_WORDS}`;

const STYLE_FOR_THE_PERSON = `You are Groundwork, writing one plain, full sentence to somebody about a pattern the record shows in their own work.

You will be given a DRAFT: a sentence already written about what happened. Say the same thing better, as one sentence spoken to them - "you", never their name, never "they".

${RULES}`;

const styleForTheLead = (firstName: string) => `You are Groundwork, writing one plain, full sentence to whoever runs a check-in, about a pattern the record shows in ${firstName}'s work.

You will be given a DRAFT: a sentence already written about what happened. Say the same thing better, as one sentence that names ${firstName} every time the subject comes up. Never "you", and never a pronoun such as "they", "he" or "she" - use ${firstName}'s name instead.

${RULES}`;

/** The system prompt for one pattern's evidence: the person's own reading, or the lead's about them. */
export function systemForPatternEvidence(yours: boolean, firstName: string | null): string {
  return yours ? STYLE_FOR_THE_PERSON : styleForTheLead(firstName?.trim() || 'this person');
}

/**
 * THE SAME GUARD AS `safeToUse`, WITHOUT THE ONE RULE THIS LANE IS ASKED TO BREAK ON PURPOSE.
 *
 * `safeToUse` (the-model-words-it-and-nothing-more.ts) refuses a line that starts attributing
 * speech to the reader - "you said" - where the draft did not already say it, because everywhere
 * else on a report that is the composer putting words in somebody's mouth. Here it is the job: the
 * detector's own sentence ("Lack of progress is attributed to an external factor...") IS a record
 * of what the person said and did in their own check-in, and turning it into "You said..." or
 * "Femi said..." is the whole point of this rewording, not an invention. Everything else `safeToUse`
 * checks - no invented or dropped number, no invented proper noun, no refusal-shaped reply, no
 * runaway length - still applies unchanged; only the attribution rule is left out, and only here.
 */
function evidenceIsSafeToUse(draft: string, composed: string | null | undefined, extraKnownWords: string[]): boolean {
  const text = (composed ?? '').trim();
  if (!text) return false;
  if (text.length > draft.length * 1.6 + 120) return false;
  if (/^(sure|certainly|of course|here'?s|i'?d be happy)/i.test(text)) return false;

  const inDraft = new Set(draft.match(/\d+/g) ?? []);
  const inText = new Set(text.match(/\d+/g) ?? []);
  for (const n of inText) if (!inDraft.has(n)) return false;
  for (const n of inDraft) if (!inText.has(n)) return false;

  const draftWords = new Set([
    ...(draft.toLowerCase().match(/[a-z][a-z'-]*/g) ?? []),
    ...extraKnownWords.map((w) => w.toLowerCase()),
  ]);
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  for (const sentence of sentences) {
    const words = sentence.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
    for (const w of words.slice(1)) {
      if (!/^[A-Z][a-z]/.test(w)) continue;
      if (!draftWords.has(w.toLowerCase())) return false;
    }
  }
  return true;
}

/**
 * Reword `whatHappened` on each pattern that has one, for the reader it was already served to.
 * `compose` is `rememberedCompose(...)`, already keyed by system+draft, so this asks the model at
 * most once per pattern per voice and otherwise reads the kept wording or falls back to the
 * detector's own sentence. Never throws: a pattern whose wording fails to compose, or fails the
 * guard, keeps its stored sentence exactly as it was.
 */
export async function wordPatternEvidence<T extends AServedPattern>(
  patterns: readonly T[],
  firstNameOf: (participantId: string) => string | null,
  compose: Compose,
): Promise<T[]> {
  return Promise.all(patterns.map(async (p) => {
    if (!p.whatHappened) return p;
    const firstName = p.yours ? null : firstNameOf(p.participantId);
    const system = systemForPatternEvidence(p.yours, firstName);
    try {
      const said = await compose(system, p.whatHappened);
      if (said && evidenceIsSafeToUse(p.whatHappened, said, firstName ? [firstName] : [])) {
        return { ...p, whatHappened: said.trim() };
      }
    } catch {
      /* The stored sentence ships. See above. */
    }
    return p;
  }));
}
