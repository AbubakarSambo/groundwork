import { sameSentenceKey } from '../board/what-needs-you-and-what-to-do';
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
}

const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
const quoted = (x: string) => `“${x.replace(/[.\s]+$/, '')}”`;
const PLACE = '{in}';

/** "People in this check-in said different things. X. This needs settling." said as one plain thing for her to settle. */
export function aDecisionSheOwes(question: string, source?: string | null): string {
  const q = String(question ?? '').trim();
  if (source === 'divergence') {
    const core = q.replace(/^People in this check-in said different things\.\s*/i, '').replace(/\s*This needs settling\.?$/i, '').trim();
    if (core) return `${sentence(core).replace(/\.$/, '')}${PLACE}, and people said different things about it, so it needs settling.`;
  }
  return sentence(q).replace(/\.$/, `${PLACE}.`);
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
      add(out.needsYou, { ...base, text: aDecisionSheOwes(d.question, d.source), group: 1, about: { kind: 'decision', ids: [String(d.id ?? d.question)] } });
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

