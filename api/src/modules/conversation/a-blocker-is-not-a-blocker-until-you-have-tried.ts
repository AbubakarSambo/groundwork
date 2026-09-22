/**
 * MOST BLOCKERS ARE REAL. SOME ARE A PLACE TO PUT THE WEEK.
 *
 * From a live check-in, a salesperson three weeks from a quarter-end:
 *
 *   "I am waiting on finance to approve the Sokoto lease, been 3 weeks."
 *   "I emailed finance twice, no answer."
 *
 * The conversation asked what the next action was, connected it to his target, and called it "your
 * most critical dependency". All reasonable. What nobody asked is the only question that separates
 * a blocked person from a stuck one: two emails in three weeks is not trying. He has not called
 * anyone, has not named a person at finance, has not escalated, and has not said what he is doing
 * about the other twenty-nine units in the meantime.
 *
 * WHAT THIS IS AND IS NOT. It is not a suspicion engine and it never decides somebody is making an
 * excuse - that is a judgement about a person and this product does not make those. It reads three
 * facts that are either on the record or are not: is there a person who can move it, what has
 * actually been tried, and is there a date by which it gets chased. Where one is missing, the
 * conversation asks. Where the effort is thin, the lead is told what to ask for rather than told a
 * conclusion.
 *
 * "WAITING ON FINANCE" IS NOT WAITING ON ANYBODY. A function cannot answer an email, be chased, or
 * be escalated past. A blocker with no person on it is the commonest shape an excuse takes, because
 * there is nobody to have failed to call - and it is also, very often, just somebody who genuinely
 * does not know who owns it. Both are worth finding out, and the question is the same.
 *
 * IN CODE, NOT IN THE PROMPT. The prompt runs to 927 lines and 273 imperatives and mentions
 * "unblock" twice, neither as an instruction. A rule added there is rule 274.
 */

/** What somebody has actually done about a thing in their way, weakest first. */
export type Effort = 'nothing' | 'asked-once' | 'asked-again' | 'escalated' | 'went-around';

export const HOW_HARD_THEY_TRIED: Record<Effort, string> = {
  'nothing': 'nothing said yet',
  'asked-once': 'asked once',
  'asked-again': 'asked more than once, same channel',
  'escalated': 'taken above the person it was with',
  'went-around': 'found another way through',
};

/**
 * WHY ASKING TWICE IS ITS OWN TIER AND NOT PROGRESS.
 *
 * The second email is the one that feels like chasing and is not: same channel, same person, same
 * silence, and now two weeks gone. It is the single most common place a fortnight disappears, so it
 * is named rather than folded in with escalating.
 */
export const SAME_CHANNEL_TWICE_IS_NOT_CHASING =
  'Asking the same person the same way twice is not chasing. It is the same ask, sent again.';

const MENTIONS = (t: string, words: string[]) => words.some((w) => t.includes(w));

/** Read what they said they did. Their words only; nothing is inferred about what they meant. */
export function whatTheyTried(said: string): Effort {
  const t = (said ?? '').toLowerCase();
  if (!t.trim()) return 'nothing';
  if (MENTIONS(t, ['went around', 'worked around', 'another supplier', 'someone else did', 'found a way', 'bypass'])) return 'went-around';
  if (MENTIONS(t, ['escalat', 'went to his', 'went to her', 'went to their', 'raised it with', 'took it to', 'cc', 'copied in', 'his manager', 'her manager', 'their manager', 'head of'])) return 'escalated';
  if (MENTIONS(t, ['called', 'phoned', 'rang', 'walked over', 'in person', 'met them'])) return 'escalated';
  if (MENTIONS(t, ['twice', 'again', 'three times', 'several times', 'chased', 'followed up', 'a few times'])) return 'asked-again';
  if (MENTIONS(t, ['email', 'messaged', 'asked', 'sent', 'wrote', 'slack', 'whatsapp'])) return 'asked-once';
  return 'nothing';
}

export interface Standing {
  /** What is in the way, in their words. */
  what: string;
  /** The person who can move it. A team name is not a person - see the header. */
  owner: string | null;
  /** Days since they first raised it. */
  days: number;
  /** What they said they have done about it. */
  tried: Effort;
  /** A date they have committed to chasing by, where they gave one. */
  chaseBy: Date | null;
}

/** Past this, only waiting is a habit rather than a situation. See the module next door. */
export const A_FORTNIGHT = 14;

/**
 * WHAT THE CONVERSATION STILL HAS TO ASK, in the order that matters.
 *
 * Owner first: without a person, no other answer can be acted on. Then what was tried, because it
 * decides whether this is a blocker or a to-do. Then the date, which is what turns either into
 * something that moves before next week.
 */
export function stillToAsk(s: Standing): string[] {
  const asks: string[] = [];
  if (!s.owner?.trim()) {
    asks.push(`Who is the person at ${s.what.trim() ? 'the other end' : 'the other end'} who can actually approve this? A team is not a person.`);
  }
  if (s.tried === 'nothing') asks.push('What have you done about it so far?');
  else if (s.tried === 'asked-once' || s.tried === 'asked-again') {
    asks.push(
      s.days >= A_FORTNIGHT
        ? 'It has been a fortnight and it has only been asked. Have you spoken to anyone about it, or taken it above them?'
        : 'Have you spoken to anyone about it, rather than written?',
    );
  }
  if (!s.chaseBy) asks.push('What is the date you will have an answer by, and what do you do if you do not?');
  return asks;
}

/**
 * WHAT THEY COULD DO, offered as options rather than as an instruction.
 *
 * Coaching somebody to unblock themselves is the point of this whole module, and the moment it
 * reads as a telling-off it stops working. These are the four moves that actually shift a stuck
 * approval, in the order most people have not tried them.
 */
/**
 * A PRODUCT IS NOT SOMEBODY YOU CAN SPEAK TO.
 *
 * Read on a live board, 22 September 2026: "Ask them to speak to MarketView rather than write to
 * them." MarketView is the software the whole check-in was about; somebody had said they wanted one
 * and it had been recorded as a thing they were waiting on. The extraction no longer takes a wish
 * for a handoff (see the dependency prompt), and this is the second line of defence: where what is
 * named is a thing rather than a person, the advice stops assuming there is somebody to talk to.
 *
 * Deliberately a short list of the words that name a system rather than a person, not a guess at
 * what a name looks like: "Finance", "the bank" and "the client's legal team" are all things you can
 * genuinely speak to, and a rule clever enough to exclude a product would exclude those too.
 */
const NAMES_A_SYSTEM = /\b(platform|layer|system|tool|app|dashboard|software|portal|database|api|integration|feature|module|website|site)\b/i;
export const aThingRatherThanSomebody = (owner: string | null | undefined): boolean => {
  const o = (owner ?? '').trim();
  if (!o) return false;
  return NAMES_A_SYSTEM.test(o);
};

export function waysThrough(s: Standing): string[] {
  const who = s.owner?.trim() || 'whoever owns it';
  const out: string[] = [];
  if (!s.owner?.trim()) out.push('Find out who owns this by name. Everything else needs that first.');
  if (aThingRatherThanSomebody(s.owner)) {
    /* Nobody owes this yet, so the move is to find the person who could, not to chase a system. */
    return [
      `Find out who owns ${who} and whether anybody has promised it.`,
      'Ask what can move without it, so the work is not waiting on something nobody has committed to.',
    ];
  }
  if (s.tried === 'nothing' || s.tried === 'asked-once' || s.tried === 'asked-again') {
    out.push(`Speak to ${who} rather than write to them.`);
    out.push(`Put a date on it in writing: what you need, by when, and what happens if it slips.`);
  }
  if (s.tried !== 'escalated' && s.days >= A_FORTNIGHT) out.push(`Take it above ${who}.`);
  if (s.tried !== 'went-around') out.push('Ask what can move without this, so the whole thing is not waiting on one approval.');
  return out;
}

/**
 * WHAT THE LEAD IS TOLD, which is never a verdict on the person.
 *
 * "Musa is blocked" is not management information: it is a status anybody could read off the board.
 * What a lead can act on is the gap between how long it has sat and what has been tried, and the
 * thing to ask him to do next. So the sentence states both facts and hands over one instruction -
 * to Musa, through his manager, not about him.
 */
export function whatToAskThemToDo(who: string, s: Standing): string | null {
  if (s.tried === 'escalated' || s.tried === 'went-around') return null;
  if (s.days < A_FORTNIGHT && s.tried !== 'nothing') return null;
  const how = HOW_HARD_THEY_TRIED[s.tried];
  const first = waysThrough(s)[0];
  return `${who}: ${s.days} days on "${s.what}", ${how}. Ask them to ${first.charAt(0).toLowerCase()}${first.slice(1)}`;
}
