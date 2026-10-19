import { sameSentenceKey } from '../board/what-needs-you-and-what-to-do';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import type { AThingOutstanding, WhatIsOutstanding } from './the-leads-daily-nudge';

/**
 * THE MORNING SUMMARY SAYS WHAT THE LEAD'S BOARD SAYS (Hafsah, 19 October, point 1). The template lead_daily_summary is unchanged;
 * only its {{2}} changes.
 *
 * In the messages test of 19 October Grace's summary on Thursday 15 October was the one line "Joseph promised Mercy samples today.",
 * while her board, read the same morning, said under What needs you that "A decision on a discount for a potential 10-unit sale is
 * holding up progress", and the team still needed 55 more units to reach 120. Her summary is now filled from the same board she opens,
 * in its three parts, most important first:
 *  - Needs you: each decision on her board that is hers to make (the board's own owner is "You"), and each wait on her the board
 *    lists, where the summary does not already say it;
 *  - Overdue on your team: as before, from the record, never a promise the record says is done;
 *  - Risks: behind Release 1's switch, on a sales check-in, how many more the team's target needs and whether the open deals would
 *    close it, and each deal at the lead's own stall rule or gone quiet. Every other check-in reads its risks as before.
 * Only what the board already serves the lead: nothing a participant may not read is added, because the board is served to her.
 */

export interface TheLeadsBoard {
  label: string;
  groundId: string;
  keptInTheApp?: boolean;
  board: any;
  /* What was said in the check-in, for a decision said with its customer, its person and its day (the-summary-reads-the-board, 19 October). */
  record?: TheRecordBesideTheBoard;
}

/** The check-in's own lines and who said them: everything here is the lead's to read, because she is in the check-in. */
export interface TheRecordBesideTheBoard {
  lines: { text: string; participantId: string; createdAt: Date | string; type?: string | null }[];
  /** The name the lead reads for a person in the check-in, or null. */
  nameOf: (participantId: string) => string | null;
  /** The lead's own rows on the check-in. */
  hers: Set<string>;
}

const sentence = (s: string) => (/[.!?][”"’)]?$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const quoted = (x: string) => `“${x.replace(/[.\s]+$/, '')}”`;
const PLACE = '{in}';

/** What is waited for, said so two sentences about one wait read as the same thing. */
export const theThingWaitedFor = (t: string): string => String(t ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** The thing waited for in the board's decision made from a wait ("Peter Njoroge is waiting on you for X." or "... waiting on X, so it needs deciding."). */
export function aWaitInADecision(question: string): string {
  const q = String(question ?? '').trim();
  const m = /\bwaiting on (.+?), so it needs deciding\.$/.exec(q) ?? /\bwaiting (?:on [^.]*? for|for) (.+?)(?:, and nobody has been named to provide it)?\.$/.exec(q);
  return m ? m[1] : '';
}

/** "People in this check-in said different things. X. This needs settling." said as one plain thing for her to settle. */
export function aDecisionSheOwes(question: string, source?: string | null): string {
  const q = String(question ?? '').trim();
  if (source === 'divergence') {
    const core = q.replace(/^People in this check-in said different things\.\s*/i, '').replace(/\s*This needs settling\.?$/i, '').trim();
    if (core) return `${sentence(core).replace(/\.$/, '')}${PLACE}, and people said different things about it, so it needs settling.`;
  }
  return sentence(q).replace(/\.$/, `${PLACE}.`);
}

/*
 * A DECISION SAID WITH ITS CUSTOMER, ITS PERSON AND ITS DAY (Hafsah, 19 October: "Never fix a message by making it vaguer; fix it by
 * making it true and specific from the record."). Grace's summary read "A decision on a discount for a potential 10-unit sale is holding
 * up progress, and people said different things about it, so it needs settling." It named no customer, no person and no day. The record
 * had all three: the deal on her board (Mama Pima, 10 units), and Joseph's own line of Monday 12 October, "Wanjiru is still deciding.
 * She wants a discount." It now reads "Decide on the discount Mama Pima wants on 10 units. Joseph said on Monday 12 October, “Wanjiru is
 * still deciding. She wants a discount.”" Only where the record has the deal, the person and the line; otherwise the board's sentence.
 */
const WHAT_IS_DECIDED = ['discount', 'price', 'pricing', 'quote', 'offer', 'terms', 'deposit', 'credit', 'refund', 'budget', 'deadline', 'role', 'target', 'date'];
const squashed = (t: string) => String(t ?? '').toLowerCase().replace(/[‘’“”'"]/g, '').replace(/\s+/g, ' ').trim();
const aDay = (at: Date | string) => whenItWas(at, 'weekdayAndDay');
const A_PRONOUN_FIRST = /^(?:she|he|they|it|this|that|these|those|we|i)\b/i;
const unitsOf = (fields: Record<string, unknown> | null | undefined): string | null => {
  const u = String((fields as any)?.Units ?? '').trim();
  return /^\d[\d,]*$/.test(u) ? u : null;
};

export function aDecisionSaidFromTheRecord(d: { question?: string | null; source?: string | null }, board: any, record: TheRecordBesideTheBoard | undefined): string | null {
  if (!record) return null;
  const topic = squashed(String(d?.question ?? ''));
  const noun = WHAT_IS_DECIDED.find((w) => new RegExp(`\\b${w}\\b`).test(topic));
  if (!noun) return null;
  /* The deal it is about: one on her board named in the decision, or in what the board says each person said about it. */
  const items: any[] = Array.isArray(board?.divergence?.items) ? board.divergence.items : [];
  const theItem = items.find((x) => topic.includes(squashed(String(x?.topic ?? '')).replace(/[.!?]+$/, '')) && String(x?.topic ?? '').trim());
  const about = [topic, ...(theItem ? [String(theItem.settledBy ?? ''), ...((theItem.positions ?? []) as any[]).map((x) => String(x?.view ?? ''))] : [])].map(squashed).join(' ');
  const rows: any[] = ((Array.isArray(board?.workRecords) ? board.workRecords : []) as any[]).flatMap((sec: any) => (Array.isArray(sec?.rows) ? sec.rows : []));
  const deals = rows.filter((r) => r?.kind === 'deal' && String(r?.name ?? '').trim().length >= 3 && about.includes(squashed(r.name)));
  if (deals.length !== 1) return null;
  const deal = deals[0];
  /* The person's own line that asks it: said by somebody on the team, not the lead, naming what is to be decided. */
  const said = record.lines
    .filter((l) => !record.hers.has(l.participantId) && new RegExp(`\\b${noun}\\b`, 'i').test(l.text) && record.nameOf(l.participantId))
    /* By the deal's own person, or naming the deal; never a line that names another deal. */
    .filter((l) => (deal.ownerParticipantId ? l.participantId === deal.ownerParticipantId : squashed(l.text).includes(squashed(deal.name)))
      && !rows.some((r) => r !== deal && r?.kind === 'deal' && String(r?.name ?? '').trim().length >= 3 && squashed(l.text).includes(squashed(r.name))))
    .sort((a, b) => Number(A_PRONOUN_FIRST.test(a.text.trim())) - Number(A_PRONOUN_FIRST.test(b.text.trim())) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const line = said[0];
  if (!line) return null;
  const who = record.nameOf(line.participantId)!;
  const units = unitsOf(deal.fields);
  const words = String(line.text).trim().replace(/\s+/g, ' ');
  return `Decide on the ${noun} ${deal.name} wants${units ? ` on ${units} ${units === '1' ? 'unit' : 'units'}` : ''}${PLACE}. ${who} said on ${aDay(line.createdAt)}, “${/[.!?]$/.test(words) ? words : `${words}.`}”`;
}

/** How many more the target needs, and whether the open deals would close it, from the board's own "To close the gap". */
export function theGapSaid(gap: { gap: number; aim: string; says?: string | null }, target: number | null, counts: string | null): string | null {
  if (!gap || typeof gap.gap !== 'number' || gap.gap <= 0) return null;
  const units = counts === 'units';
  const more = `${gap.gap} more${units ? ` ${gap.gap === 1 ? 'unit' : 'units'}` : ''} ${gap.gap === 1 ? 'is' : 'are'} needed`;
  const toReach = typeof target === 'number' ? ` to reach the target of ${target}${units ? ' units' : ''}` : ` for the target ${quoted(gap.aim)}`;
  /* The board's own sentence about the open deals, said for a message: "here" is the board's list, which a message does not have. */
  const deals = String(gap.says ?? '')
    .replace(/^\d[\d,]* more (?:units? )?(?:is|are) needed[^.]*\.\s*/i, '')
    .replace(/\bEven if all (\w+) here close\b/g, 'Even if all $1 open deals close')
    .replace(/\bEven if this one closes\b/g, 'Even if the one open deal closes')
    .trim();
  return `${more}${toReach}${PLACE}.${deals ? ` ${deals}` : ''}`;
}

/** What the lead's boards add to her summary, kept out where the summary already says it. */
export function withWhatTheBoardsSay(o: WhatIsOutstanding, boards: TheLeadsBoard[]): WhatIsOutstanding {
  const out: WhatIsOutstanding = { ...o, needsYou: [...o.needsYou], risks: [...o.risks] };
  const said = new Set([...out.needsYou, ...out.overdueOnYourTeam, ...out.risks, ...(out.dueToday ?? [])].map((t) => sameSentenceKey(t.text.split(PLACE).join(''))));
  const aboutIds = new Set([...out.needsYou, ...out.risks].flatMap((t) => t.about?.ids ?? []));
  /*
   * ONE WAIT ON HER IS SAID ONCE (engine test, second run, Drop Access, from Friday 16 October). Grace read every morning "Peter is
   * waiting on you for a specific area to focus on since Thursday 15 October. Peter Njoroge is waiting on you for a specific area to
   * focus on.": the first from the record, the second the same wait as her board's decision. A decision the board made from a wait
   * the summary already says, for the same thing, is not said again.
   */
  const waitsSaid = new Set([...out.needsYou, ...out.risks].map((t) => theThingWaitedFor(t.waitFor ?? '')).filter(Boolean));
  const add = (list: AThingOutstanding[], t: AThingOutstanding, at?: number): boolean => {
    const key = sameSentenceKey(t.text.split(PLACE).join(''));
    if (!key || said.has(key)) return false;
    said.add(key);
    if (typeof at === 'number') list.splice(at, 0, t); else list.push(t);
    return true;
  };
  for (const b of boards) {
    const board = b.board ?? {};
    const base = { keptInTheApp: !!b.keptInTheApp, place: b.label, groundId: b.groundId };
    /* NEEDS YOU: a decision on her board that is hers. A decision a customer owes is the customer's, never hers. */
    for (const d of (Array.isArray(board.decisions) ? board.decisions : []) as any[]) {
      if (String(d?.owner ?? '') !== 'You' || !String(d?.question ?? '').trim()) continue;
      if (d?.source === 'blocker' && waitsSaid.has(theThingWaitedFor(aWaitInADecision(String(d.question))))) continue;
      add(out.needsYou, { ...base, text: aDecisionSaidFromTheRecord(d, board, b.record) ?? aDecisionSheOwes(d.question, d.source), group: 1, about: { kind: 'decision', ids: [String(d.id ?? d.question)] } });
    }
    /* A wait on her the board lists, that the summary does not already say from the record. */
    for (const a of (Array.isArray(board.leadActions) ? board.leadActions : []) as any[]) {
      const id = String(a?.id ?? '');
      if (!id.startsWith('waiting-on-the-lead-')) continue;
      if (aboutIds.has(id.replace('waiting-on-the-lead-', ''))) continue;
      const text = String(a?.text ?? a?.says ?? '').trim();
      if (text) add(out.needsYou, { ...base, text: sentence(text).replace(/\.$/, `${PLACE}.`), group: 1, about: { kind: 'decision', ids: [id.replace('waiting-on-the-lead-', '')] } });
    }
    /* RISKS, behind Release 1's switch, on a sales board: the gap to the target, then the deals at risk. After the missed check-ins, which come first. */
    if (!o.releaseOne) continue;
    const first = out.risks.filter((t) => t.about?.kind === 'missed').length;
    const risks: AThingOutstanding[] = [];
    const gap = board.toCloseTheGap;
    if (gap) {
      const aim = ((Array.isArray(board.objectives) ? board.objectives : []) as any[]).find((x) => String(x?.name ?? '').trim().replace(/[.!?]+$/, '') === String(gap.aim ?? '').trim());
      const already = out.risks.some((t) => t.about?.kind === 'target' && aim?.id && (t.about.ids ?? []).includes(aim.id));
      const text = already ? null : theGapSaid(gap, typeof aim?.target === 'number' ? aim.target : null, aim?.fromTheDeals?.counts ?? null);
      if (text) risks.push({ ...base, text, about: { kind: 'target', ids: aim?.id ? [aim.id] : [] } });
    }
    for (const s of (Array.isArray(board.atTheStallRule) ? board.atTheStallRule : []) as any[]) {
      if (String(s?.title ?? '').trim()) risks.push({ ...base, text: sentence(s.title).replace(/\.$/, `${PLACE}.`), about: { kind: 'deal', ids: s.deals ?? [] } });
    }
    const rows = ((Array.isArray(board.workRecords) ? board.workRecords : []) as any[]).flatMap((sec: any) => (Array.isArray(sec?.rows) ? sec.rows : []) as any[]);
    for (const r of rows.filter((x) => x?.kind === 'deal' && x.group === 'cooling' && x.name)) {
      risks.push({ ...base, text: `Nobody has spoken about ${r.name}${PLACE} in the last week, and nobody has said what happens next.`, about: { kind: 'deal', ids: [String(r.id ?? r.name)] } });
    }
    let at = first;
    for (const t of risks) if (add(out.risks, t, at)) at += 1;
  }
  return out;
}

