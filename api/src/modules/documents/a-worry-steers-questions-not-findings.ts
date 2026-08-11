/**
 * A WORRY STEERS WHAT GETS ASKED. IT NEVER BECOMES A FINDING. (G39)
 *
 * The real reason a ground exists is usually a worry, and it is usually unsaid. A
 * manager opening a new-hire ground is rarely curious in the abstract; they have
 * noticed something. Asking directly, into closed context, surfaces the thing
 * that should shape the probing.
 *
 * THIS IS THE MOST PREJUDICIAL DATA IN THE SYSTEM. One person's private,
 * unverified concern about a named colleague, recorded before that colleague has
 * said a word. Three rules:
 *
 *   1. It never enters a report, quoted or paraphrased, in any form.
 *   2. It never reaches the person it is about, including through the private
 *      post-report guide.
 *   3. It steers what gets ASKED. It never becomes a finding.
 *
 * Get it wrong and the product becomes a place to file private complaints about
 * colleagues, which is the worst available version of it.
 *
 * AND THE PERSON IT IS ABOUT IS NOT TOLD IT EXISTS. Decided 9 August 2026, and
 * the reasoning holds: being told a note exists that you cannot see creates worry
 * with no remedy, and it would change what somebody writes in the very check-in
 * the note is meant to inform. A person who suspects they are being written about
 * writes defensively, and a defensive account is worth less than no account.
 *
 * THAT DECISION RAISES THE BAR RATHER THAN LOWERING IT. Because the subject
 * cannot object to, correct, or weigh what they cannot see, these three rules are
 * the only thing protecting them. There is no human backstop. So every one of
 * them is structural, tested, and bite-checked, and this module exists so that
 * "we told the model not to" is never the answer.
 *
 * WHAT A WORRY IS ALLOWED TO DO, precisely: raise a hypothesis, which the
 * existing a-hypothesis-is-not-a-finding machinery may then use to choose what to
 * probe. Confirmation still requires the person's own account across the three
 * periods, and raisedByLead is never consulted in the confirmation branch. A
 * worry is a place to look and nothing else.
 */

export interface Worry {
  /** Who wrote it. */
  authorParticipantId: string;
  /** Who it is about, when it is about somebody. Often null: many worries are about the work. */
  aboutParticipantId: string | null;
  text: string;
}

/** Every surface a worry could reach, named so the test can enumerate them. */
export type Surface =
  | 'shared-report'
  | 'board'
  | 'post-report-guide'
  | 'solo-artifact'
  | 'probe-selection'
  | 'closed-context';

/**
 * May a worry reach this surface at all?
 *
 * Two, out of six. It may inform which question gets asked, and it may be read
 * back by the person who wrote it. Everything else is a no, including the board -
 * the lead already knows what they wrote, and putting it on a screen next to a
 * read of the person it is about is how it stops being a question and starts
 * being a case.
 */
export function worryMayReach(surface: Surface): boolean {
  return surface === 'probe-selection' || surface === 'closed-context';
}

/**
 * May this person read this worry?
 *
 * Its author, and nobody else. Not the subject, by the decision above. Not other
 * participants, obviously. And not the lead either when somebody else wrote it,
 * which is the case people forget: a participant's worry about the work is not
 * material for the person running the ground.
 */
export function worryIsReadableBy(worry: Worry, readerParticipantId: string | null): boolean {
  return !!readerParticipantId && readerParticipantId === worry.authorParticipantId;
}

/**
 * RULE 3, at the only point where a worry is allowed to do anything: turning it
 * into something to ask about.
 *
 * The probe carries no trace of the worry. Not the wording, not a paraphrase, and
 * not the fact that anybody is worried - because "somebody has raised concerns
 * about your ownership" is an accusation wearing a question mark, and the person
 * would answer the accusation rather than the question.
 *
 * What comes out is a neutral question about the WORK that would be a fair thing
 * to ask anybody in that role on any ground. If the worry turns out to be
 * unfounded, the question was still worth asking; that is the test of whether it
 * is neutral.
 */
export function neutralProbeFrom(worry: Worry, topic: string): string {
  return `Which parts of ${topic} are yours to decide, and which do you take to somebody else?`;
}

/**
 * Does this text carry a worry into somewhere it must not go?
 *
 * Used as a last-line detector on report and guide output, on the same principle
 * as the forensic-voice and counts-accounts detectors: the model has the closed
 * context in its window when it writes, so the only reliable check is on what
 * comes out.
 *
 * Deliberately crude and deliberately noisy. A false positive costs a log line; a
 * false negative costs somebody their standing with their colleagues.
 */
const WORRY_LEAK = [
  /\b(?:concern|concerns|concerned|worried|worry|worries) (?:about|that|has been raised)/i,
  /\bhas (?:raised|flagged|expressed) (?:a )?(?:concern|worry|doubt)/i,
  /\bit has been (?:noted|observed|suggested) that\b/i,
  /\bthere are doubts?\b/i,
  /\bsomebody has (?:said|noticed|mentioned)\b/i,
  /\bprivately\b/i,
];

export function worryLeakIn(text: string, worries: Worry[]): string | null {
  if (!text) return null;

  for (const pattern of WORRY_LEAK) {
    const hit = text.match(pattern);
    if (hit) return hit[0];
  }

  /**
   * And the literal check, which catches the case the patterns cannot: a
   * distinctive phrase lifted straight out of what somebody wrote. Six words is
   * long enough that a coincidence is implausible and short enough that
   * paraphrase-by-truncation does not slip through.
   */
  for (const worry of worries) {
    const words = worry.text.toLowerCase().split(/\s+/).filter(Boolean);
    for (let i = 0; i + 6 <= words.length; i++) {
      const phrase = words.slice(i, i + 6).join(' ');
      if (text.toLowerCase().includes(phrase)) return phrase;
    }
  }

  return null;
}
