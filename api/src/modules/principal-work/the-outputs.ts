/**
 * THE DAILY BRIEFING AND THE WEEKLY WORKSTREAM UPDATE (Fatima, increment 6b; plan section 15). Both are written from what is already kept (the outstanding
 * register, the payments tracker as it stands against the record, and the weekly reports kept), on request ("Give me my day"), and, only when she has set it
 * as a standing preference, on schedule. They are short plain text for WhatsApp and fuller for email, and a scheduled one is sent only when there is something
 * meaningful in it. Nothing in them comes from a private coaching conversation: the register is built from commitments, dependencies, obligations and requests,
 * and the person who acts for her reads the register without her own private to-do list (the same `forADelegate` the register already has).
 *
 * The words are written here, from the facts, in code. A model is not asked to describe the day, so a number or a date in it cannot be wrong.
 */
import { asATask } from '../outstanding/a-promise-as-a-task';
import { buildTheRegister, type AWaitingForThePrincipal, type TheRegisterRow } from '../outstanding/the-outstanding-register';
import { dayWords } from '../year-end/the-year-end-content';
import { sayMoney } from './the-money';
import { isPaidWithProof } from './the-payments-reconcile';
import { thePaymentCounts, thePaymentsNow } from './the-payments-work';

/** Said after the short one on WhatsApp, only when the fuller one really went by email. */
export const THE_FULLER_ONE_WENT_BY_EMAIL = 'I have emailed you the fuller version.';

export interface TheOutput { subject: string; short: string; full: string; meaningful: boolean; snapshot: Record<string, string> }

const DAY = 86_400_000;
const SAYS_STATUS: Record<string, string> = {
  open: 'open', 'in progress': 'in progress', blocked: 'blocked', 'awaiting decision': 'waiting for a decision', 'awaiting external party': 'waiting for somebody outside the office',
  completed: 'done', cancelled: 'cancelled', unverified: 'said to be done, with nothing shown yet',
};
const plain = (s: string) => { const t = s.trim().replace(/[.!?]+$/, ''); return t; };
const named = (o: string) => o !== 'unconfirmed' && o !== 'you' && o.trim() !== '';
const owner = (o: string) => (named(o) ? ` (${o})` : '');
const theItem = (r: TheRegisterRow) => `${asATaskCapital(plain(r.item))}${owner(r.owner)}`;
/** "I will go next week" is "Go next week" on a list she reads about somebody else (the one place that takes the promise off its "I will": outstanding/a-promise-as-a-task.ts). */
const asATaskCapital = (t: string): string => { const x = asATask(t).replace(/[.!\s]+$/, ''); return x ? `${x[0].toUpperCase()}${x.slice(1)}` : x; };
const decisionLine = (r: TheRegisterRow, forName?: string | null) => {
  /* The question was put to her ("Did you approve ..."): read to somebody who acts for her it is about her, by name. */
  const q = forName ? r.decision!.question.replace(/^Did you\b/i, `Did ${forName}`).replace(/\byou\b/gi, forName).replace(/\byour\b/gi, `${forName}'s`) : r.decision!.question;
  return q.toLowerCase().includes(plain(r.item).toLowerCase()) ? q : `${q} (${plain(r.item)})`;
};
const lowerFirst = (s: string) => `${s[0]?.toLowerCase() ?? ''}${s.slice(1)}`;
const startOf = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const ORDER = ['awaiting decision', 'blocked', 'awaiting external party', 'in progress', 'open'];

const due = (r: TheRegisterRow, today: Date, within: number) => r.dueOn && !['completed', 'cancelled'].includes(r.status) && new Date(r.dueOn).getTime() <= today.getTime() + within * DAY;
const dueWords = (d: Date, today: Date) => (startOf(new Date(d)).getTime() < today.getTime() ? `was due on ${dayWords(d)}` : `is due on ${dayWords(d)}`);

async function theRows(prisma: any, a: { organizationId: string; principalUserId: string; forADelegate: boolean; now: Date; waiting?: AWaitingForThePrincipal[] }): Promise<TheRegisterRow[]> {
  return (await buildTheRegister(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, now: a.now, forADelegate: a.forADelegate, waitingForThePrincipal: a.waiting })).rows;
}

async function paymentsDue(prisma: any, a: { organizationId: string; principalUserId: string; today: Date; within: number }): Promise<string[]> {
  const now = await thePaymentsNow(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId });
  const latest = new Map<string, (typeof now.lines)[number]>();
  for (const l of [...now.lines].sort((x, y) => x.receivedAt.getTime() - y.receivedAt.getTime() || x.rowNumber - y.rowNumber)) latest.set(l.paymentKey, l);
  return [...latest.values()]
    .filter((l) => l.dueOn && l.amount && !['cancelled', 'on hold'].includes(l.statedStatus ?? '') && !isPaidWithProof(l, now.linksOf(l.paymentKey)) && l.dueOn.getTime() <= a.today.getTime() + a.within * DAY)
    .sort((x, y) => x.dueOn!.getTime() - y.dueOn!.getTime())
    .map((l) => `The payment of ${sayMoney(l.amount!)} to ${l.payee} ${dueWords(l.dueOn!, a.today)}. ${l.statedStatus === 'paid' ? 'The tracker says it is paid, and I have not seen the proof.' : 'It is not shown as paid.'}`);
}

async function lastSnapshot(prisma: any, principalUserId: string, kind: 'day' | 'week'): Promise<Record<string, string> | null> {
  const rows: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId, kind: 'told', subject: { startsWith: `briefing:${kind}:` } }, orderBy: { at: 'desc' }, take: 1 })) ?? [];
  return rows[0]?.data?.rows ?? null;
}
export const snapshotOf = (rows: TheRegisterRow[]): Record<string, string> => Object.fromEntries(rows.filter((r) => r.status !== 'cancelled').map((r) => [r.key, r.status]));
export const rememberTheOutput = (prisma: any, a: { organizationId: string; principalUserId: string; kind: 'day' | 'week'; stamp: string; snapshot: Record<string, string>; now: Date }) =>
  prisma.yearEndLog.create({ data: { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'told', subject: `briefing:${a.kind}:${a.stamp}`, data: { rows: a.snapshot }, at: a.now } });

/** What changed since the last time she was told: new items, and items that moved. */
export function whatChanged(rows: TheRegisterRow[], before: Record<string, string> | null): string[] {
  if (!before) return [];
  const out: string[] = [];
  for (const r of rows) {
    if (r.status === 'cancelled') continue;
    const was = before[r.key];
    if (was === undefined) out.push(`${theItem(r)} is new on the record.`);
    else if (was !== r.status) out.push(r.status === 'completed' ? `${asATaskCapital(plain(r.item))} is now done, and the record shows it.` : `${asATaskCapital(plain(r.item))} is now ${SAYS_STATUS[r.status] ?? r.status}.`);
  }
  return out;
}

const NOTHING_TODAY = (first: string, forName?: string | null) => (forName ? `Nothing needs ${forName} today, ${first}.` : `Nothing needs you today, ${first}. I will tell you when something does.`);
const bullets = (xs: string[]) => xs.map((x) => `- ${x}`);

export async function theDay(prisma: any, a: { organizationId: string; principalUserId: string; first: string; forName?: string | null; forADelegate: boolean; now: Date; waiting?: AWaitingForThePrincipal[] }): Promise<TheOutput> {
  const today = startOf(a.now);
  const rows = await theRows(prisma, a);
  const decisions = rows.filter((r) => r.status === 'awaiting decision' && r.decision).map((r) => decisionLine(r, a.forName));
  const deadlines = [
    ...rows.filter((r) => due(r, today, 7)).sort((x, y) => new Date(x.dueOn!).getTime() - new Date(y.dueOn!).getTime()).map((r) => `${theItem(r)}. It ${dueWords(r.dueOn!, today)}.`),
    ...(await paymentsDue(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, today, within: 7 })),
  ];
  const shown = new Set(rows.filter((r) => (r.status === 'awaiting decision' && r.decision) || due(r, today, 7)).map((r) => r.key));
  const priorities = rows.filter((r) => ORDER.includes(r.status) && !shown.has(r.key)).sort((x, y) => ORDER.indexOf(x.status) - ORDER.indexOf(y.status)).slice(0, 5).map((r) => `${theItem(r)}. It is ${SAYS_STATUS[r.status]}.`);
  const changed = whatChanged(rows, await lastSnapshot(prisma, a.principalUserId, 'day'));
  const meaningful = decisions.length + deadlines.length + changed.length > 0;
  const section = (title: string, lines: string[], max = 99) => (lines.length ? [title, ...bullets(lines.slice(0, max)), ...(lines.length > max ? [`- And ${lines.length - max} more.`] : [])].join('\n') : null);
  const heading = a.forName ? `Here is ${a.forName}'s day, ${a.first}.` : `Here is your day, ${a.first}.`;
  const body = (max: number) => [section('What needs your decision', decisions, max), section('What is due', deadlines, max), section('What matters most', priorities, max), section('What has changed since I last told you', changed, max)].filter(Boolean) as string[];
  const fullParts = body(99);
  const shortParts = body(3);
  return {
    subject: `Your day, ${dayWords(a.now)}`, meaningful,
    full: fullParts.length ? [heading, ...fullParts].join('\n\n') : NOTHING_TODAY(a.first, a.forName),
    short: shortParts.length ? [heading, ...shortParts.slice(0, 3)].join('\n\n') : NOTHING_TODAY(a.first, a.forName),
    snapshot: snapshotOf(rows),
  };
}

export async function theWeek(prisma: any, a: { organizationId: string; principalUserId: string; first: string; forName?: string | null; forADelegate: boolean; now: Date; waiting?: AWaitingForThePrincipal[] }): Promise<TheOutput> {
  const rows = await theRows(prisma, a);
  const weekAgo = a.now.getTime() - 7 * DAY;
  const done = rows.filter((r) => r.status === 'completed' && new Date(r.lastVerifiedAt).getTime() >= weekAgo);
  const stuck = rows.filter((r) => r.status === 'blocked' || r.status === 'awaiting external party').map((r) => `${theItem(r)}. It is ${r.dependency ? lowerFirst(plain(r.dependency)) : SAYS_STATUS[r.status]}.`);
  const waiting = rows.filter((r) => r.status === 'awaiting decision' && r.decision).map((r) => decisionLine(r, a.forName));
  const unclear = rows.filter((r) => r.status === 'unverified').map((r) => `${asATaskCapital(plain(r.item))}.`);
  const moving = rows.filter((r) => r.status === 'in progress' || r.status === 'open').length;
  const byWorkstream = new Map<string, number>();
  for (const r of rows.filter((r) => ORDER.includes(r.status))) byWorkstream.set(r.workstream ?? 'Other work', (byWorkstream.get(r.workstream ?? 'Other work') ?? 0) + 1);
  const pay = await thePaymentsNow(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId });
  const counts = thePaymentCounts(pay);
  const { payments: nPay, paidWithProof: paidCount, saidPaidNoProof: saidPaid } = counts;
  const payments = nPay ? [[
    `${nPay === 1 ? 'One payment is' : `${nPay} payments are`} on the tracker.`,
    paidCount ? `${paidCount === 1 ? 'One is' : `${paidCount} are`} paid, and the record shows it.` : 'None is shown as paid yet.',
    saidPaid ? `${saidPaid === 1 ? 'One is' : `${saidPaid} are`} said to be paid without proof.` : '',
    pay.discrepancies.length ? `${pay.discrepancies.length === 1 ? 'One thing does' : `${pay.discrepancies.length} things do`} not agree with the record.` : 'Nothing on it disagrees with the record.',
  ].filter(Boolean).join(' ')] : [];
  const digests: any[] = ((await prisma.weeklyDigest?.findMany?.({ where: { principalUserId: a.principalUserId } }).catch(() => [])) ?? []).filter((d: any) => new Date(d.updatedAt ?? d.createdAt).getTime() >= weekAgo);
  const assembly = digests.map((d) => `The ${d.institution} report for the week ${d.weekKey.replace('-W', ', week ')} was kept, with ${(d.developments as any[]).length} ${(d.developments as any[]).length === 1 ? 'development' : 'developments'} in it.`);
  const section = (title: string, lines: string[]) => (lines.length ? [title, ...bullets(lines)].join('\n') : null);
  const parts = [
    section('What moved this week', done.map((r) => `${theItem(r)}. It is done, and the record shows it.`)),
    byWorkstream.size ? ['What is still in progress', ...bullets([...byWorkstream.entries()].map(([w, n]) => `${w}: ${n === 1 ? 'one item' : `${n} items`}.`))].join('\n') : null,
    section('What is stuck, and what would help', stuck),
    section('What waits for your decision', waiting),
    section('Said to be done, with nothing shown yet', unclear),
    section('Payments', payments),
    section('National Assembly', assembly),
  ].filter(Boolean) as string[];
  const heading = `Here is the update on ${a.forName ? `${a.forName}'s` : 'the'} work for the week to ${dayWords(a.now)}, ${a.first}.`;
  const meaningful = done.length + stuck.length + waiting.length + assembly.length > 0 || moving > 0;
  const short = [heading, `${done.length ? `${done.length === 1 ? 'One thing' : `${done.length} things`} moved and the record shows it. ` : 'Nothing was shown as done this week. '}${stuck.length ? `${stuck.length === 1 ? 'One thing is' : `${stuck.length} things are`} stuck. ` : ''}${waiting.length ? `${waiting.length === 1 ? 'One decision waits' : `${waiting.length} decisions wait`} for you.` : ''}`.trim()].join('\n\n');
  return { subject: `The week's update, ${dayWords(a.now)}`, meaningful, full: parts.length ? [heading, ...parts].join('\n\n') : `There is nothing to report on the work this week, ${a.first}.`, short, snapshot: snapshotOf(rows) };
}
