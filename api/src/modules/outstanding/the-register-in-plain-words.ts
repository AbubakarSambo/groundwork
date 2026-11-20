/**
 * THE THREE QUESTIONS A SENIOR PERSON ASKS OF THE REGISTER, ANSWERED IN PLAIN SENTENCES.
 *
 *   "What is outstanding?"                      -> every matter not finished, and what is waiting on whom.
 *   "What needs my decision?"                   -> the exact question, and the options where there are some.
 *   "Which items can the team close this week?" -> items one person can finish or prove in the next seven days.
 *
 * The words are the product's, never a model's, so a name or a date cannot change on the way to the reader.
 * Each answer reads only the register it is given. The register is built for the principal and, for a
 * delegate, without the principal's private to-do list (the-outstanding-register.ts), so nothing here can
 * say what the reader may not read. A delegate reads the same words with the principal's name where "you"
 * would be.
 */
import { theDay } from '../assistant/a-change-said-back-first';
import { asATask } from './a-promise-as-a-task';
import { dayWords } from '../year-end/the-year-end-content';
import type { TheRegister, TheRegisterRow } from './the-outstanding-register';

export interface TheView {
  /** Null when the principal is reading. The principal's first name when a delegate is. */
  forName: string | null;
  now: Date;
}

const SEE_MORE = 8;

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const sentence = (s: string) => { const t = asATask(s).trim().replace(/[.!?]+$/, ''); return t ? `${t[0].toUpperCase()}${t.slice(1)}.` : ''; };
const you = (v: TheView) => v.forName ?? 'you';
const yours = (v: TheView) => (v.forName ? `${v.forName}'s` : 'your');

function whoHasIt(r: TheRegisterRow, v: TheView): string {
  if (r.owner === 'unconfirmed') return 'Nobody has confirmed who owns it';
  if (r.owner === 'you') return v.forName ? `${v.forName} has it` : 'You have it';
  return `${r.owner} has it`;
}

function whenIsIt(r: TheRegisterRow, v: TheView): string | null {
  if (!r.dueOn) return r.whenSaid ? `it was said to be for "${r.whenSaid}"` : null;
  const day = theDay(r.dueOn, v.now);
  const late = r.dueOn.getTime() < Date.UTC(v.now.getUTCFullYear(), v.now.getUTCMonth(), v.now.getUTCDate());
  if (r.dueInferred) return `${late ? 'it was due' : 'it is due'} ${day}, a day I worked out from "${r.whenSaid}"`;
  return `${late ? 'it was due' : 'it is due'} ${day}`;
}

function oneItem(r: TheRegisterRow, v: TheView): string {
  const bits: string[] = [whoHasIt(r, v)];
  const when = whenIsIt(r, v);
  if (when) bits.push(when);
  const onWhom = r.dependency ? r.dependency.replace(/^Waiting on /, '') : null;
  if (r.status === 'awaiting external party') bits.push(onWhom ? `it is waiting on ${onWhom}` : 'it is waiting on somebody outside');
  else if (r.status === 'blocked') bits.push(onWhom ? `it is blocked while it waits on ${onWhom}` : 'it is blocked');
  else if (r.status === 'awaiting decision') bits.push(`it is waiting for ${yours(v)} decision`);
  const sourceCount = r.sources.length;
  const tail = sourceCount > 1 ? ` I have it from ${sourceCount} places.` : '';
  const joined = bits.length === 1 ? `${bits[0]}.` : `${bits[0]}, and ${bits.slice(1).join(', and ')}.`;
  return `${sentence(r.item)} ${joined}${tail}`;
}

const isOutstanding = (r: TheRegisterRow) => r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'unverified';

export const NOTHING_IN_THE_REGISTER = (v: TheView) =>
  v.forName
    ? `I have nothing outstanding for ${v.forName} yet. The check-ins ${v.forName} runs have no open commitments, handoffs or agreements on record.`
    : 'I have nothing outstanding for you yet. The check-ins you run have no open commitments, handoffs or agreements on record.';

function theOneMatchToAsk(register: TheRegister): string | null {
  const m = register.toAsk[0];
  return m ? m.question : null;
}

/**
 * "What is outstanding?" The number said is the number of lines on one list, and the lines read out are taken from that same list (Fatima round 1, I-10:
 * "5 matters" over ten lines). Something said to be done with nothing to show it is not finished, so it is on the list.
 */
export function whatIsOutstandingSaid(register: TheRegister, v: TheView): string {
  const open = register.rows.filter(isOutstanding);
  const unproven = register.rows.filter((r) => r.status === 'unverified');
  const list = [...open.map((r) => ({ r, line: oneItem(r, v) })), ...unproven.map((r) => {
    const who = r.owner === 'unconfirmed' || r.owner === 'you' ? 'It was' : `${r.owner} said it was`;
    if (r.disputed) return { r, line: `${sentence(r.item)} That is a claim somebody has marked as not backed up, so I have not counted it as finished.` };
    return { r, line: `${sentence(r.item)} ${who} done, but nothing shows it yet, so I have not counted it as finished.` };
  })];
  if (!list.length) return NOTHING_IN_THE_REGISTER(v);
  const parts: string[] = [v.forName ? `${count(list.length, 'matter is', 'matters are')} outstanding for ${v.forName}.` : `You have ${count(list.length, 'matter', 'matters')} outstanding.`];
  for (const x of list.slice(0, SEE_MORE)) parts.push(x.line);
  if (list.length > SEE_MORE) parts.push(`${count(list.length - SEE_MORE, 'more is', 'more are')} on the list, and I can read them out if you ask.`);
  const ask = theOneMatchToAsk(register);
  if (ask) parts.push(ask);
  return parts.join('\n');
}

/** "What needs my decision?" */
export function whatNeedsTheDecisionSaid(register: TheRegister, v: TheView): string {
  const waiting = register.rows.filter((r) => r.status === 'awaiting decision' && r.decision);
  if (!waiting.length) return v.forName ? `Nothing needs ${v.forName}'s decision right now.` : 'Nothing needs your decision right now.';
  const parts: string[] = [v.forName ? `${count(waiting.length, 'thing needs', 'things need')} ${v.forName}'s decision.` : `${count(waiting.length, 'thing needs', 'things need')} your decision.`];
  for (const r of waiting.slice(0, SEE_MORE)) {
    const d = r.decision!;
    const opts = d.options.length ? ` ${you(v) === 'you' ? 'Your' : `${v.forName}'s`} options are ${d.options.length <= 2 ? d.options.map((o) => o.charAt(0).toLowerCase() + o.slice(1)).join(' or ') : `${d.options.slice(0, -1).map((o) => o.charAt(0).toLowerCase() + o.slice(1)).join(', ')} or ${d.options[d.options.length - 1].charAt(0).toLowerCase()}${d.options[d.options.length - 1].slice(1)}`}.` : '';
    const day = r.dueOn ? ` It is wanted by ${theDay(r.dueOn, v.now)}.` : '';
    /* The question was put to her ("Did you approve ..."). Read to somebody who acts for her it is about her, and her own yes and no are not options for the person reading. */
    const asked = v.forName ? d.question.trim().replace(/^Did you\b/i, `Did ${v.forName}`).replace(/\byou\b/gi, v.forName).replace(/\byour\b/gi, `${v.forName}'s`) : d.question.trim();
    parts.push(`${asked.replace(/[?.]*$/, '?')}${v.forName ? '' : opts}${day}`);
  }
  if (waiting.length > SEE_MORE) parts.push(`${count(waiting.length - SEE_MORE, 'more is', 'more are')} waiting after these.`);
  return parts.join('\n');
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** Whether one person can finish or prove it within the week: an owner, nothing in the way, and a date that is close or past, or a "done" that needs one proof. */
export function canCloseThisWeek(r: TheRegisterRow, now: Date): 'prove' | 'finish' | null {
  if (r.owner === 'unconfirmed') return null;
  if (r.status === 'unverified') return 'prove';
  if (r.status !== 'open' && r.status !== 'in progress') return null;
  if (r.dueOn && r.dueOn.getTime() <= now.getTime() + SEVEN_DAYS) return 'finish';
  return null;
}

/** "Which items can the team close this week?" */
export function whatTheTeamCanCloseSaid(register: TheRegister, v: TheView): string {
  const close = register.rows.map((r) => ({ r, how: canCloseThisWeek(r, v.now) })).filter((x) => x.how);
  if (!close.length) return `Nothing can be closed this week without more from somebody who is not on the team. Items that are blocked, waiting on ${you(v) === 'you' ? 'you' : v.forName}, waiting on an outside party or without an owner are not counted.`;
  const parts: string[] = [`${count(close.length, 'item', 'items')} could be closed this week.`];
  for (const { r, how } of close.slice(0, SEE_MORE)) {
    if (how === 'prove') parts.push(`${sentence(r.item)} ${r.owner} says it is done. It can close once ${r.owner} shows what was sent and to whom.`);
    else {
      const late = r.dueOn!.getTime() < Date.UTC(v.now.getUTCFullYear(), v.now.getUTCMonth(), v.now.getUTCDate());
      parts.push(`${sentence(r.item)} ${r.owner === 'you' ? you(v) === 'you' ? 'You have' : `${v.forName} has` : `${r.owner} has`} it, and it ${late ? 'was due' : 'is due'} ${theDay(r.dueOn!, v.now)}.`);
    }
  }
  if (close.length > SEE_MORE) parts.push(`${count(close.length - SEE_MORE, 'more is', 'more are')} close too.`);
  return parts.join('\n');
}

/* ------------------------------------------------------------------ "What is outstanding?" as an assistant would say it */

const DAYS_OF = (d: Date) => dayWords(d);
const THE_OUTSTANDING_INSTRUCTIONS = `Tell the matters as a capable assistant tells a busy person: group the ones that belong together (by person, by workstream or by what they wait on), and name the most pressing first. Use at most six sentences, and leave the rest unmentioned, because the person is told how many more there are. Never read the matters out one by one. Keep every name, date and amount exactly as the facts give them.`;

/** One matter as a fact: who has it, what it is, when, what it waits on, and where it came from. The item is the words it was kept in, which the account does not repeat as a quote. */
function theFactOf(r: TheRegisterRow, v: TheView): string {
  const bits: string[] = [`Matter, as it was kept: ${r.item.trim().replace(/[.!?]+$/, '')}.`, `${whoHasIt(r, v)}.`];
  if (r.status === 'unverified') bits.push(r.disputed ? 'It is only a claim that somebody has marked as not backed up, so it is not counted as finished.' : 'It was said to be done, with nothing to show it, so it is not counted as finished and is only what somebody said.');
  const when = whenIsIt(r, v);
  if (when) bits.push(`${sentence(when)}`);
  const onWhom = r.dependency ? r.dependency.replace(/^Waiting on /, '') : null;
  if (r.status === 'awaiting decision') bits.push(`It waits for ${yours(v)} decision.`);
  else if (onWhom) bits.push(`It waits on ${onWhom}.`);
  if (r.workstream) bits.push(`Workstream: ${r.workstream}.`);
  const from = [...new Set(r.sources.map((s) => `${s.from} on ${DAYS_OF(s.at)}`))].slice(0, 2).join(' and ');
  if (from) bits.push(`Source: ${from}.`);
  return bits.join(' ');
}

/**
 * "What is outstanding?" told by the model from the register's facts: a concise third-person account, grouped and capped, with the number and the "more" count
 * written by code. The names, dates, amounts and sources are the register's and nothing else; a sentence that rests on something only said must say so. With no
 * model, or nothing safe from it, the plain list above is what is said.
 */
export async function whatIsOutstandingTold(register: TheRegister, v: TheView, narrate: ((a: { facts: { id: string; says: string; unverified?: boolean }[]; instructions?: string }) => Promise<{ says: string; from: string[] }[] | null>) | null | undefined): Promise<string> {
  const rows = [...register.rows.filter(isOutstanding), ...register.rows.filter((r) => r.status === 'unverified')];
  if (!rows.length || !narrate) return whatIsOutstandingSaid(register, v);
  const shown = rows.slice(0, 16);
  const facts = shown.map((r, i) => ({ id: `m${i + 1}`, says: theFactOf(r, v), ...(r.status === 'unverified' ? { unverified: true } : {}) }));
  const told = await narrate({ facts, instructions: THE_OUTSTANDING_INSTRUCTIONS }).catch(() => null);
  if (!told?.length) return whatIsOutstandingSaid(register, v);
  const covered = new Set(told.flatMap((s) => s.from));
  const unmentioned = rows.length - shown.filter((_, i) => covered.has(`m${i + 1}`)).length;
  const parts: string[] = [v.forName ? `${count(rows.length, 'matter is', 'matters are')} outstanding for ${v.forName}.` : `You have ${count(rows.length, 'matter', 'matters')} outstanding.`, told.map((s) => s.says.trim()).join('\n')];
  if (unmentioned > 0) parts.push(`${count(unmentioned, 'more is', 'more are')} on the list, and I can read them out if you ask.`);
  const ask = theOneMatchToAsk(register);
  if (ask) parts.push(ask);
  return parts.join('\n');
}
