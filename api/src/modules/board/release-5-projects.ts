/**
 * RELEASE 5, PROJECTS ("Plan and deliver a project"; release plan, Release 5; the Check-in Reports file's "A project", Mastercard market
 * study). One switch per organisation, `Organization.release5ProjectsOn`, off for every organisation. On, a check-in whose kind of work
 * is "a funded project" gets the project board: the plan (milestones, when each is due and what share of the contract it pays), money
 * in and out by month with the tightest month, the stakeholders and what each needs, what is coming up (the funder's next update, with a
 * brief drawn from the record, and the next milestone's invoice), and what is off track. Every line is read from the project's own
 * records (work items: milestone, money, stakeholder). Nothing is guessed; a part with no records says so.
 */
import { BILL, F, NOT_YET_RAISED, aDay } from './the-collections-record';
import { FROM_A_MILESTONE, type AMilestoneKept } from './raising-invoices-on-time';

/** ALWAYS ON (Hafsah, 15 November 2026: everything has a board; reverses the October hide, decisions 88 and 91). The column is no longer read and nothing stored is changed. */
export async function theRelease5ProjectsIsOn(_prisma?: any, _organizationId?: string | null): Promise<boolean> {
  return true;
}

export const THE_PROJECT_KIND = 'a funded project';
/** The kinds of work that are projects: a funded project, and client delivery (Hafsah, 25 October: client delivery is a type of project). */
export const THE_PROJECT_KINDS: readonly string[] = [THE_PROJECT_KIND, 'client delivery'];
export const isAProject = (kind: string | null | undefined): boolean => THE_PROJECT_KINDS.includes(String(kind ?? ''));

export interface ARecord { id: string; kind: string; name: string; stage: string | null; owner?: string | null; due?: string | null; fields: Record<string, string> }
export interface ARow { id: string; title: string; says: string; tone: 'rec' | 'att' | 'act' | 'con' }
export interface AProjectBoard {
  plan: ARow[]
  money: { months: { month: string; says: string; tightest: boolean }[]; tightestSays: string | null }
  stakeholders: ARow[]
  comingUp: (ARow & { brief?: string; rehearse?: boolean })[]
  offTrack: string[]
  offTrackSays: string
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const lower = (s: string) => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
const f = (r: ARecord, k: string) => String(r.fields?.[k] ?? '').trim();
const iso = (v: string | null | undefined): string | null => { const s = String(v ?? '').trim(); return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null; };
const dayAndMonth = (d: string) => `${Number(d.slice(8, 10))} ${MONTHS[Number(d.slice(5, 7)) - 1]}`;
const money = (n: number, cur: string) => `${cur} ${Math.round(Math.abs(n)).toLocaleString('en-GB')}`;
const amount = (s: string): number | null => { const m = s.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
const currencyOf = (records: ARecord[]) => (records.map((r) => (f(r, 'In') + ' ' + f(r, 'Out')).match(/\b([A-Z]{3})\b/)?.[1]).find(Boolean)) ?? 'KES';
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
const DONE = new Set(['Delivered', 'Accepted', 'Paid for']);
const ACCEPTED = new Set(['Accepted', 'Paid for']);

/** The milestones in the order they are due. */
export function theMilestones(records: ARecord[]): ARecord[] {
  return records.filter((r) => r.kind === 'milestone').sort((a, b) => String(iso(a.due ?? f(a, 'Due')) ?? '9999').localeCompare(String(iso(b.due ?? f(b, 'Due')) ?? '9999')));
}

export function theProjectBoard(records: ARecord[], today: string, opts: { invoicesFollow?: boolean; financeName?: string | null } = {}): AProjectBoard {
  const milestones = theMilestones(records);
  const plan: ARow[] = milestones.map((m, i) => {
    const due = iso(m.due ?? f(m, 'Due'));
    const share = f(m, 'Share');
    const overdue = !!due && due < today && !DONE.has(String(m.stage));
    const parts = [
      due ? `Due ${dayAndMonth(due)}.` : 'Nobody has said when it is due.',
      share ? `${share} of the contract is paid when it is accepted.` : '',
      m.stage && m.stage !== 'Planned' ? `It is ${lower(String(m.stage))}${overdue ? ', and it is late' : ''}.` : overdue ? 'It is late.' : '',
    ].filter(Boolean);
    return { id: m.id, title: `Milestone ${i + 1}, ${lower(m.name)}`, says: parts.join(' '), tone: overdue ? 'con' : ACCEPTED.has(String(m.stage)) ? 'rec' : m.stage === 'At risk' ? 'att' : 'act' };
  });

  /* Money in and out, month by month, and where the running total is lowest: the tightest month. */
  const { months, cur, lowest, lowestAt, tightestSays } = theTightestMonth(records);
  const moneyMonths = months.map((m, i) => {
    const ym = f(m, 'Month');
    const said = [
      f(m, 'In for') ? `${f(m, 'In for')} comes in${f(m, 'In') ? `, ${money(amount(f(m, 'In')) ?? 0, cur)}` : ''}.` : '',
      f(m, 'Out for') ? `${f(m, 'Out for')} goes out${f(m, 'Out') ? `, ${money(amount(f(m, 'Out')) ?? 0, cur)}` : ''}.` : '',
    ].filter(Boolean).join(' ');
    return { month: /^\d{4}-\d{2}/.test(ym) ? MONTHS[Number(ym.slice(5, 7)) - 1] : (ym || m.name), says: said || 'Nothing is on record for this month yet.', tightest: i === lowestAt };
  });

  const stakeholders: ARow[] = records.filter((r) => r.kind === 'stakeholder').map((s) => {
    const owner = s.owner ? s.owner.split(/\s+/)[0] : null;
    const needs = f(s, 'Needs');
    return {
      id: s.id,
      title: s.name,
      says: [owner ? `${owner} keeps in touch with them.` : 'Nobody keeps in touch with them yet.', needs ? `They need ${lower(needs).replace(/[.]+$/, '')}.` : 'What they need is still to be learned.'].join(' '),
      tone: !owner || !needs ? 'att' : 'rec',
    };
  });

  const comingUp: AProjectBoard['comingUp'] = [];
  for (const s of records.filter((r) => r.kind === 'stakeholder')) {
    const next = iso(f(s, 'Next update'));
    if (!next || next < today) continue;
    const days = daysBetween(today, next);
    if (days > 31) continue;
    comingUp.push({
      id: `update-${s.id}`, title: `Update for ${s.name} ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`,
      says: 'Groundwork has gathered what they asked last time and where the plan and the money stand, and drafted a brief.',
      tone: 'act', brief: theFundersBrief(records, s, today), rehearse: true,
    });
  }
  const nextMilestone = milestones.find((m) => !ACCEPTED.has(String(m.stage)));
  if (nextMilestone && opts.invoicesFollow) {
    comingUp.push({
      id: `invoice-${nextMilestone.id}`, title: `${nextMilestone.name.charAt(0).toUpperCase()}${nextMilestone.name.slice(1)}, and its invoice`,
      says: `When it is accepted, ${opts.financeName ?? 'whoever raises invoices'} is told the amount and terms, so the invoice goes out the same day.`, tone: 'act',
    });
  }

  const offTrack: string[] = [];
  for (const [i, m] of milestones.entries()) {
    const due = iso(m.due ?? f(m, 'Due'));
    if (due && due < today && !DONE.has(String(m.stage))) offTrack.push(`Milestone ${i + 1}, ${lower(m.name)}, was due on ${dayAndMonth(due)} and is not delivered yet.`);
  }
  if (tightestSays && lowest < 0) offTrack.push(tightestSays);
  for (const s of stakeholders.filter((x) => x.tone === 'att')) offTrack.push(`${s.title} could be at risk. ${s.says}`);
  return {
    plan, money: { months: moneyMonths, tightestSays }, stakeholders, comingUp, offTrack,
    offTrackSays: offTrack.length
      ? 'When the plan changes, the recovery goes through the same loop as any change of direction, so nobody is judged against the old plan.'
      : 'Nothing is off track. If a milestone slips or the money runs short, this shows what happened, the money gap and the stakeholders at risk.',
  };
}

/** Money in and out by month, and where the running total is lowest (the tightest month), with how short it is. */
function theTightestMonth(records: ARecord[]) {
  const months = records.filter((r) => r.kind === 'money').sort((a, b) => f(a, 'Month').localeCompare(f(b, 'Month')));
  const cur = currencyOf(months);
  let running = 0; let lowest = 0; let lowestAt = -1;
  months.forEach((m, i) => { running += (amount(f(m, 'In')) ?? 0) - (amount(f(m, 'Out')) ?? 0); if (running < lowest) { lowest = running; lowestAt = i; } });
  const tightestSays = lowestAt >= 0 ? `The tightest month is ${MONTHS[Number(f(months[lowestAt], 'Month').slice(5, 7)) - 1]}, ${money(lowest, cur)} short if nothing else comes in by then.` : null;
  return { months, cur, lowest, lowestAt, tightestSays };
}

/**
 * THE FUNDER'S BRIEF, before each update ("Groundwork has gathered what they asked last time, and drafted a brief"). Drawn from the
 * record only, in plain sentences: what they asked last time, in their words; where each milestone stands; the money. No model writes it.
 */
export function theFundersBrief(records: ARecord[], s: ARecord, today: string): string {
  const asked = f(s, 'Asked last time');
  const lines: string[] = [`The update for ${s.name}.`];
  if (asked) lines.push(`Last time they asked: “${asked.replace(/[“”"]/g, '')}”`);
  const ms = theMilestones(records);
  for (const [i, m] of ms.entries()) {
    const due = iso(m.due ?? f(m, 'Due'));
    const late = !!due && due < today && !DONE.has(String(m.stage));
    lines.push(`Milestone ${i + 1}, ${lower(m.name)}, is ${lower(String(m.stage ?? 'planned'))}${due ? `, due ${dayAndMonth(due)}` : ''}${late ? ', and it is late' : ''}.`);
  }
  const tight = theTightestMonth(records).tightestSays;
  if (tight) lines.push(tight);
  const needs = f(s, 'Needs');
  if (needs) lines.push(`They need ${lower(needs).replace(/[.]+$/, '')}.`);
  return lines.join(' ');
}

/**
 * A MILESTONE ACCEPTED IS AN INVOICE TO RAISE (release plan, Release 5: "a milestone accepted leads to invoice raising (Release 3),
 * then COLLECTIONS (Release 2)"). With Release 5 and Release 3 on, a milestone at Accepted becomes, once, a bill at "Not yet raised"
 * in the organisation's latest "Collect what's owed" check-in, due from the day it was accepted, for its amount where one is on record.
 */
export async function aMilestoneAcceptedIsAnInvoiceToRaise(prisma: any, groundId: string, now: Date = new Date()): Promise<number> {
  const g = await Promise.resolve(prisma?.ground?.findUnique?.({ where: { id: groundId }, select: { organizationId: true, scenario: true, kindOfWork: true, label: true } })).catch(() => null);
  if (!g?.organizationId || g.scenario === 'COLLECTIONS' || !isAProject(g.kindOfWork)) return 0;
  const o = await Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: g.organizationId }, select: { release3InvoicesOn: true, release5ProjectsOn: true } })).catch(() => null);
  if (o?.release3InvoicesOn !== true || o?.release5ProjectsOn !== true) return 0;
  const accepted = ((await Promise.resolve(prisma?.workItem?.findMany?.({ where: { groundId, kind: 'milestone', stage: { in: ['Accepted'] } }, select: { id: true, name: true, fields: true, updatedAt: true } })).catch(() => [])) ?? []) as any[];
  if (!accepted.length) return 0;
  const target = ((await Promise.resolve(prisma?.ground?.findMany?.({ where: { organizationId: g.organizationId, scenario: 'COLLECTIONS' }, select: { id: true }, orderBy: { createdAt: 'desc' }, take: 1 })).catch(() => [])) ?? [])[0];
  if (!target) return 0;
  const bills = ((await Promise.resolve(prisma?.workItem?.findMany?.({ where: { groundId: target.id, kind: BILL }, select: { fields: true } })).catch(() => [])) ?? []) as any[];
  const already = new Set(bills.map((b) => String(((b.fields ?? {}) as any)[FROM_A_MILESTONE]?.milestoneId ?? '')).filter(Boolean));
  let wrote = 0;
  for (const m of accepted) {
    if (already.has(m.id)) continue;
    const fields = (m.fields ?? {}) as Record<string, unknown>;
    const day = aDay(String(fields['Accepted on'] ?? '')) ? String(fields['Accepted on']).slice(0, 10) : new Date(m.updatedAt ?? now).toISOString().slice(0, 10);
    const kept: AMilestoneKept & { milestoneId: string } = { milestone: `${String(g.label ?? 'The project')}'s ${String(m.name ?? '').trim()}`, day, milestoneId: m.id };
    const value = String(fields.Amount ?? '').trim();
    await prisma.workItem.create({
      data: { groundId: target.id, kind: BILL, name: `${String(g.label ?? 'Project')}, ${String(m.name ?? '').trim()}`, stage: NOT_YET_RAISED, fields: { [F.client]: String(fields.Client ?? g.label ?? '').trim(), ...(value ? { [F.amount]: value } : {}), [FROM_A_MILESTONE]: kept } },
    });
    wrote++;
  }
  return wrote;
}
