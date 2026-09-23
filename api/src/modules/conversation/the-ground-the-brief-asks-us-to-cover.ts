/**
 * THE GROUND THE BRIEF ASKS US TO COVER.
 *
 * Hafsah, 23 September 2026: "the questions dont help us get what we want", against a brief that
 * names states, markets, products, volumes, quality, farmers, traders, agents, distributors, how
 * they find supply, how they vet people, what they do when things go wrong, fraud, theft, weather,
 * capacity gaps, informal knowledge and inertia.
 *
 * Measured across a hundred real conversations: 626 questions, of which 91 were about expansion
 * plans, 62 about volumes and 15 about how anybody vets anybody. The questions followed the
 * WORDING of the brief - what it repeated most - rather than its subjects. So a respondent could
 * answer five questions about volumes and never be asked the one thing that turned out to be the
 * network's strongest need.
 *
 * `what-we-have-so-far` fixed the other half of this: the conversation now pushes on holes in what
 * somebody SAID. That is depth, and on its own it will happily spend a whole check-in sharpening
 * one target while seven subjects go unasked. This is breadth.
 *
 * TWO THINGS ARE DELIBERATE.
 *
 * THE SUBJECTS ARE READ ONCE, FROM THE BRIEF, AND STORED. They are a property of the check-in, not
 * of a turn - every respondent is asked about the same ground, which is the only way a hundred
 * answers add up to one picture. Re-reading them per turn would let them drift between people.
 *
 * COVERAGE IS DECIDED DETERMINISTICALLY. Whether somebody has talked about vetting is a question
 * about words on a page, and asking a model to judge it every turn would cost a call and introduce
 * a disagreement between what the conversation thinks it has covered and what the report can find.
 * A subject is covered when their own answers use its words. Nothing more clever than that, and
 * nothing that can hallucinate coverage the record cannot show.
 */

export interface ASubject {
  /** Short and stable, for the coverage record. */
  id: string;
  /** The lead's own words for it: "which states you want to grow in", "how you vet people". */
  subject: string;
  /** What to ask, in one plain question, where nothing has been said about it. */
  ask: string;
  /** The words that show somebody has talked about it. The lead's, never ours. */
  words: string[];
}

export const READ_THE_BRIEF = [
  'You are given the brief somebody wrote for a check-in they are sending to a lot of people.',
  '',
  'List the SUBJECTS it asks about - the separate things they want to know. Five to nine of them. Not a summary, and not the brief rewritten: a list of the distinct things a person could be asked about one at a time.',
  '',
  'For each one give:',
  '  subject  what it is, in the brief\'s own words, a few words long',
  '  ask      one plain question to ask somebody who has said nothing about it. Short. No preamble.',
  '  words    three to eight words that would appear in an answer ABOUT this subject and not about the others. From the brief where possible. Nouns, not verbs like "need" or "want".',
  '',
  'Split anything that is really two things. "The markets and the volumes you need" is two subjects: a person can answer one and not the other, and an unasked half is the half the report cannot say anything about.',
  'Leave out anything that is about how the check-in runs, what happens to the answers, or who receives a report. Those are not subjects.',
  'Never invent a subject the brief does not ask about.',
].join('\n');

export const READ_THE_BRIEF_SCHEMA = {
  name: 'the_subjects_this_brief_asks_about',
  description: 'The separate things a brief wants to know, each with a question and the words that show somebody has covered it.',
  input_schema: {
    type: 'object',
    properties: {
      subjects: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'A short slug, e.g. "vetting" or "volumes".' },
            subject: { type: 'string' },
            ask: { type: 'string' },
            words: { type: 'array', items: { type: 'string' } },
          },
          required: ['id', 'subject', 'ask', 'words'],
        },
      },
    },
    required: ['subjects'],
  },
} as const;

/** Words too common to show that anybody covered anything. Mirrors the telling's own list. */
const SAYS_NOTHING = new Set([
  'need', 'needs', 'want', 'wants', 'thing', 'things', 'people', 'work', 'business', 'time', 'cost',
  'help', 'good', 'better', 'more', 'less', 'other', 'others', 'able', 'plan', 'plans',
]);

const meaningful = (w: string) => {
  const t = w.toLowerCase().trim();
  return t.length >= 4 && !SAYS_NOTHING.has(t);
};

/** Singular, so "markets" and "market" are the same word. */
const stem = (w: string) => {
  const t = w.toLowerCase();
  return t.length > 4 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t;
};

/**
 * Whether their answers have touched a subject.
 *
 * One of its words is enough. Deliberately generous: the cost of thinking a subject is covered when
 * it was mentioned in passing is one unasked question, and the cost of thinking it is uncovered when
 * somebody has just answered it at length is asking them the same thing twice - which is the thing
 * she has complained about most.
 */
export function theyHaveTalkedAbout(subject: ASubject, whatTheySaid: string[]): boolean {
  const said = new Set((whatTheySaid.join(' ').toLowerCase().match(/[a-z][a-z-]{3,}/g) ?? []).map(stem));
  return (subject.words ?? []).filter(meaningful).some((w) => said.has(stem(w)));
}

/** The subjects nobody has said anything about, in the brief's own order. */
export function whatIsStillUncovered(subjects: ASubject[] | null | undefined, whatTheySaid: string[]): ASubject[] {
  return (subjects ?? []).filter((s) => !theyHaveTalkedAbout(s, whatTheySaid));
}

/**
 * BREADTH OR DEPTH, AND THE RULE IS NOT A PREFERENCE.
 *
 * Both matter and they compete for the same turn. While most of the ground is untouched, one more
 * subject is worth more than one more field on a claim: an unasked subject produces NOTHING for the
 * report, where an unsharpened claim still produces something. Once most of it has been touched,
 * the holes are worth more, because a target nobody can verify is not a finding.
 *
 * Half is the line, and it is arbitrary in the way a threshold has to be - what is not arbitrary is
 * that both are always in play, so neither can starve.
 */
export function breadthFirst(subjects: ASubject[] | null | undefined, whatTheySaid: string[]): boolean {
  const all = (subjects ?? []).length;
  if (!all) return false;
  /*
   * AT EXACTLY HALF, BREADTH. Measured on her own five answers: four of eight subjects untouched -
   * quality, sourcing, vetting and what they do when things go wrong, which are precisely the four
   * she said were never asked about - and a strict majority test chose depth at that point. The
   * complaint was never that claims went unsharpened.
   */
  return whatIsStillUncovered(subjects, whatTheySaid).length * 2 >= all;
}

/** What the conversation is told, where a subject is the thing worth raising. */
export function whatToCoverNext(subjects: ASubject[] | null | undefined, whatTheySaid: string[]): string {
  const left = whatIsStillUncovered(subjects, whatTheySaid);
  if (!left.length) return '';
  const next = left[0];
  const rest = left.slice(1, 4).map((s) => s.subject);
  return [
    'THE BRIEF ASKS ABOUT SOMETHING NOBODY HAS TOUCHED YET:',
    `${next.subject}. Ask it like this, or closer to how they have been talking: "${next.ask}"`,
    rest.length ? `Still to come after that: ${rest.join('; ')}.` : '',
    '',
    'Answer whatever they just said first. Then this. One question, and do not stack it with anything else.',
    'If they have already told you about it in other words, do not ask - move to the next one.',
  ].filter(Boolean).join('\n');
}
