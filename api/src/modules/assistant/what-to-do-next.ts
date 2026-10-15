/**
 * "WHAT SHOULD I DO NEXT?" IS ANSWERED WITH ONE THING, AND WHY IT IS FIRST (week 17).
 *
 * The answer is built only from what the reader owns or is owed: their own open commitments, their
 * own to-dos, and what is waiting on them (the "needs you" list Today reads). It is one thing first
 * because a list of five is a list nobody reads; the rest are counted, not listed.
 *
 * THE ORDER, AND EACH REASON:
 *   1. a commitment whose date has passed - somebody is counting on it and the date is one the
 *      person gave themselves;
 *   2. somebody waiting on them - it is the one piece of work only they can clear;
 *   3. the to-do with the nearest date, or the oldest with none;
 *   4. the open commitment with the nearest date.
 *
 * Nothing here is about another person's load, report or questions. "Somebody is waiting on you" is
 * the reader's own queue, served to them on Today, and carries no judgement of the person waiting.
 */
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { quotedThenEnding } from './a-quote-takes-no-second-mark';
import { hasSlipped } from './what-somebody-said-they-would-do';
import { WHAT_NEEDS_YOU_SOURCE, YOUR_COMMITMENTS_SOURCE, YOUR_TO_DOS_SOURCE } from './a-source-says-where-it-came-from';
import { Reply, SourceBlock, rules, text } from './a-reply-is-a-payload-not-a-string';

const atTheStart = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export interface ACommitment { id: string; text: string; dueSaid: string | null; dueAt: Date | null; statedAt: Date; state: 'OPEN' | 'KEPT' | 'SLIPPED' | 'DROPPED'; lastFollowedUpAt: Date | null }
export interface AToDoRow { id: string; text: string; dueSaid: string | null; dueAt: Date | null; createdAt: Date }
/** `sinceSays` is the day the wait began ("since 10 September"); `waitingDays` is for the order only. */
/* Only the reader's own queue (WAITING_ON_YOU) is read here, on purpose; a wait taken further is "where am I needed". */
export interface SomebodyWaiting { who: string; says: string; waitingDays: number; sinceSays?: string | null }

export const NOTHING_TO_PUT_FIRST =
  'I have nothing to put first. You have no open commitments or to-dos, and nobody is waiting on you in the record. That can also mean something has been said somewhere I cannot see.';

const bare = (s: string) => s.trim().replace(/[.!]+$/, '');

/** How the date on a commitment or a to-do reads: a real date where there is one, their own words otherwise. */
function theDateOf(x: { dueSaid: string | null; dueAt: Date | null }): string | null {
  if (x.dueAt) return whenItWas(x.dueAt, 'dayAndMonthLong');
  return x.dueSaid?.trim() || null;
}

export function theOneToDoFirst(input: {
  commitments: ACommitment[];
  toDos: AToDoRow[];
  waitingOnYou: SomebodyWaiting[];
  now: Date;
}): Reply {
  const open = input.commitments.filter((c) => c.state === 'OPEN');
  const slipped = open.filter((c) => hasSlipped(c as any, input.now)).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime());
  const waiting = [...input.waitingOnYou].sort((a, b) => b.waitingDays - a.waitingDays);
  const toDos = [...input.toDos].sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
  const commitmentsByDate = open.filter((c) => !slipped.includes(c)).sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return a.statedAt.getTime() - b.statedAt.getTime();
  });

  const total = open.length + input.toDos.length + waiting.length;
  if (total === 0) return rules('what_next', text(NOTHING_TO_PUT_FIRST));

  let first: string;
  let why: string;
  let source: SourceBlock;

  if (slipped.length) {
    const c = slipped[0];
    const when = c.dueSaid?.trim();
    first = `Start with ${quotedThenEnding(c.text)}`;
    why = `You said you would do it${when ? ` by ${when}` : ''}, and the date you gave has passed, so whoever is counting on it is still waiting. Either do it, or tell them when it will happen.`;
    source = YOUR_COMMITMENTS_SOURCE;
  } else if (waiting.length) {
    const w = waiting[0];
    /*
     * The day it began, never a count of days from the moment of asking, so the answer reads the same at
     * any hour (request 117, part 9). `who` is the board's: a name, or "somebody in <the check-in>".
     */
    const who = atTheStart(w.who);
    first = `Start with ${w.who}.`;
    why = w.sinceSays
      ? `${who} has been ${bare(w.says)} ${bare(w.sinceSays)}. Nobody else can clear this one.`
      : `${who} is ${bare(w.says)}. Nobody else can clear this one.`;
    source = WHAT_NEEDS_YOU_SOURCE;
  } else if (toDos.length) {
    const t = toDos[0];
    const d = theDateOf(t);
    first = `Start with ${quotedThenEnding(t.text)}`;
    why = t.dueAt
      ? `It is on your to-do list for ${d}, the nearest date you have.`
      : d
        ? `It is on your to-do list, and you said ${d}.`
        : 'It is the oldest thing on your to-do list.';
    source = YOUR_TO_DOS_SOURCE;
  } else {
    const c = commitmentsByDate[0];
    const d = theDateOf(c);
    first = `Start with ${quotedThenEnding(c.text)}`;
    why = `You said you would do it${d ? `, ${c.dueAt ? `by ${d}` : `and you said ${d}`}` : ''}. Nothing else is waiting on you.`;
    source = YOUR_COMMITMENTS_SOURCE;
  }

  const left = total - 1;
  const rest = left > 0 ? ` After that, ${left === 1 ? 'one more thing is' : `${left} more things are`} open. Ask me what is on your list, or where you are needed, to see them.` : '';
  return rules('what_next', text(`${first} ${why}${rest}\n\n${source.says}`), source);
}

/** What the wording of this answer must keep: the thing named first, exactly as the record has it. */
export function whatMustSurviveIn(reply: Reply): string[] {
  const first = reply.blocks[0];
  if (!first || first.type !== 'text') return [];
  const m = first.body.match(/^Start with (?:"(.+?)"[.?!]?|([^.]+)\.)/);
  const kept = m?.[1] ?? m?.[2];
  return kept ? [kept] : [];
}
