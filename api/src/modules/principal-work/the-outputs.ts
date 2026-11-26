/**
 * THE DAILY BRIEFING AND THE WEEKLY WORKSTREAM UPDATE (Ebele, increment 6b; plan section 15). Both are written from what is already kept (the outstanding
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
import { pdfOf, type Block } from '../year-end/the-year-end-files';
import type { AnAttachment } from '../email/attachments';
import { aChangeSaid, type AChange } from './the-deck-changes';
import { theQuestionsAndAnswers } from '../executive-onboarding/information-gaps';
import { sayMoney } from './the-money';
import { isPaidWithProof } from './the-payments-reconcile';
import { thePaymentCounts, thePaymentsNow } from './the-payments-work';

/** Said after the short one on WhatsApp, only when the fuller one really went by email. */
export const THE_FULLER_ONE_WENT_BY_EMAIL = 'I have emailed you the fuller version.';

export interface TheOutput { subject: string; short: string; full: string; meaningful: boolean; snapshot: Record<string, string> }

const DAY = 86_400_000;
export const SAYS_STATUS: Record<string, string> = {
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

/**
 * WHICH OF HER THREE BUCKETS AN ITEM IS IN (change 5: "Needs your attention, For monitoring, For information").
 *   attention    a decision waiting for her; a flag past the office's threshold whose owner has answered, has been silent two days or more, or
 *                nobody has asked yet (so nothing that costs money or a relationship sits unseen)
 *   monitoring   a flag that is not past its threshold, or whose owner was asked less than two days ago; anything stuck, waiting on somebody
 *                outside, said done with nothing shown, or due within the week
 *   information  everything else still open
 * Where she has put an item herself ("not urgent", "this needs me"), it stays where she put it.
 */
export type ABucket = 'attention' | 'monitoring' | 'information';
export function theBucketOf(r: TheRegisterRow, now: Date): ABucket {
  if (r.herBucket) return r.herBucket;
  if (r.flag?.standing) return 'monitoring';
  if (r.status === 'awaiting decision' && r.decision) return 'attention';
  const f = r.flag;
  if (f?.due) {
    const waitingForTheirAnswer = !!f.askedOn && !f.answeredOn && now.getTime() - f.askedOn.getTime() < 2 * DAY;
    return waitingForTheirAnswer ? 'monitoring' : 'attention';
  }
  if (f || ['blocked', 'awaiting external party', 'unverified'].includes(r.status) || due(r, startOf(now), 7)) return 'monitoring';
  return 'information';
}

const daysSince = (d: Date, now: Date) => Math.max(0, Math.floor((now.getTime() - d.getTime()) / DAY));
const daysSaid = (n: number) => (n === 1 ? 'one day' : `${n} days`);
/** One line of the brief: what it is, where it stands, how long it has been open, what its owner said or that they have not, and where it comes from. */
export function aBriefLine(r: TheRegisterRow, now: Date): string {
  const first = r.sources.reduce<Date | null>((m, s) => (!m || s.at < m ? new Date(s.at) : m), null);
  const where = r.flag?.where ?? r.sources[r.sources.length - 1]?.from ?? null;
  const stands = r.flag ? r.flag.says : r.status === 'awaiting decision' && r.decision ? decisionLine(r) : `It is ${SAYS_STATUS[r.status] ?? r.status}.`;
  const open = first ? `Open for ${daysSaid(daysSince(first, now))}.` : '';
  const f = r.flag;
  const theirs = !f ? '' : f.answeredOn
    ? `${f.askedOf ?? 'The owner'} answered on ${dayWords(f.answeredOn)}${f.answer ? `: "${f.answer}"` : '.'}`
    : f.askedOn ? `I asked ${f.askedOf} on ${dayWords(f.askedOn)} and have had no answer for ${daysSaid(daysSince(f.askedOn, now))}.`
      : f.due ? 'Nobody on your team has been asked about it yet.' : '';
  return [`${theItem(r)}.`, stands, open, theirs.replace(/([^.!?"])$/, '$1.'), where ? `(${where})` : ''].filter(Boolean).join(' ');
}

export async function theWeek(prisma: any, a: { organizationId: string; principalUserId: string; first: string; forName?: string | null; forADelegate: boolean; now: Date; waiting?: AWaitingForThePrincipal[] }): Promise<TheOutput> {
  const rows = await theRows(prisma, a);
  const weekAgo = a.now.getTime() - 7 * DAY;
  const live = rows.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');
  const inBucket = (b: ABucket) => live.filter((r) => theBucketOf(r, a.now) === b);
  const attention = inBucket('attention');
  const monitoring = inBucket('monitoring');
  const information = inBucket('information');
  const done = rows.filter((r) => r.status === 'completed' && new Date(r.lastVerifiedAt).getTime() >= weekAgo);
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
  const decks = await whatChangedThisWeek(prisma, { principalUserId: a.principalUserId, since: new Date(weekAgo) });
  const silences = await whoHasNotAnswered(prisma, { principalUserId: a.principalUserId, now: a.now });
  const section = (title: string, lines: string[], max = 99) => (lines.length ? [title, ...bullets(lines.slice(0, max)), ...(lines.length > max ? [`- And ${lines.length - max} more. Ask me "what is open" for all of them.`] : [])].join('\n') : null);
  const forYou = a.forName ? `${a.forName}'s` : 'your';
  const parts = [
    section(`Needs ${a.forName ? `${a.forName}'s` : 'your'} attention`, attention.map((r) => aBriefLine(r, a.now))),
    section('For monitoring', [...monitoring.map((r) => aBriefLine(r, a.now)), ...silences], 25),
    section('For information', [
      ...done.map((r) => `${theItem(r)}. It is done, and the record shows it.`),
      ...information.map((r) => aBriefLine(r, a.now)),
      ...decks,
      ...payments,
      ...assembly,
    ], 30),
  ].filter(Boolean) as string[];
  const heading = `Here is ${forYou} week to ${dayWords(a.now)}, ${a.first}.`;
  const meaningful = attention.length + monitoring.length + information.length + done.length + assembly.length + decks.length > 0;
  const info = information.length + done.length;
  /* The WhatsApp line is counts only, with no figures in it: the page with the items goes by email. */
  const short = `${heading} ${attention.length === 1 ? 'One item needs' : `${attention.length} items need`} ${a.forName ? `${a.forName}'s` : 'your'} attention, ${monitoring.length === 1 ? 'one is' : `${monitoring.length} are`} for monitoring, and ${info === 1 ? 'one is' : `${info} are`} for information.`;
  return { subject: `Your week, ${dayWords(a.now)}`, meaningful, full: parts.length ? [heading, ...parts].join('\n\n') : `There is nothing to report on the work this week, ${a.first}.`, short, snapshot: snapshotOf(rows) };
}

/** The weekly brief as a one-page PDF, the same words as the mail: its heading, its three buckets and their lines. */
export async function theBriefAsAPdf(out: TheOutput): Promise<AnAttachment> {
  const blocks: Block[] = [];
  out.full.split('\n\n').forEach((part, i) => {
    const [first, ...rest] = part.split('\n');
    if (i === 0) { blocks.push({ t: 'h1', text: out.subject }, { t: 'p', text: first }); return; }
    blocks.push({ t: 'h2', text: first });
    for (const l of rest) blocks.push({ t: 'li', text: l.replace(/^- /, '') });
  });
  return { filename: `${out.subject.replace(/[^A-Za-z0-9 ,-]+/g, '').trim()}.pdf`, contentType: 'application/pdf', content: await pdfOf(blocks, out.subject) };
}

/** The reports that changed this week against their last version (the-deck-changes.ts), each change said, and what the sender said about them. */
async function whatChangedThisWeek(prisma: any, a: { principalUserId: string; since: Date }): Promise<string[]> {
  const kept: any[] = (await Promise.resolve(prisma.yearEndLog?.findMany?.({ where: { principalUserId: a.principalUserId, kind: 'told', subject: { startsWith: 'deck-changes:' } } })).catch(() => [])) ?? [];
  const gaps = await theQuestionsAndAnswers(prisma, a.principalUserId, 'row:deck-');
  const out: string[] = [];
  for (const k of kept.filter((x) => new Date(x.at).getTime() >= a.since.getTime())) {
    const d = k.data ?? {};
    const changes: AChange[] = Array.isArray(d.changes) ? d.changes : [];
    const gap = gaps.find((g) => g.gapKey === `row:deck-${String(k.subject).slice('deck-changes:'.length)}`);
    const said = gap?.answeredAt ? ` ${gap.askedOfName ?? 'The sender'} answered on ${dayWords(new Date(gap.answeredAt))}.` : gap?.askedAt ? ` I asked ${gap.askedOfName} what is behind them on ${dayWords(new Date(gap.askedAt))}, with no answer yet.` : '';
    out.push(`${d.file} changed in ${changes.length === 1 ? 'one place' : `${changes.length} places`} since ${d.earlier}.${said} ${changes.slice(0, 5).map(aChangeSaid).join(' ')}${changes.length > 5 ? ` And ${changes.length - 5} more.` : ''}`);
  }
  return out;
}

/**
 * HOW EACH OWNER ANSWERS (change 8, patterns: "every item has an owner; outcomes feed that owner's pattern"). From the questions put about the reports in
 * the last thirty days: who has left two or more without an answer for two days or more, with each one named and its day. A pattern of what was asked
 * and what came back, never a judgement of the person, and never what anybody said to the coach.
 */
async function whoHasNotAnswered(prisma: any, a: { principalUserId: string; now: Date }): Promise<string[]> {
  const asked = (await theQuestionsAndAnswers(prisma, a.principalUserId, 'row:')).filter((g) => g.askedAt && a.now.getTime() - g.askedAt.getTime() <= 30 * DAY);
  const byPerson = new Map<string, typeof asked>();
  for (const g of asked) { const who = g.askedOfName ?? g.askedOfEmail ?? ''; if (who) byPerson.set(who, [...(byPerson.get(who) ?? []), g]); }
  const out: string[] = [];
  for (const [who, gs] of byPerson) {
    const silent = gs.filter((g) => !g.answeredAt && a.now.getTime() - g.askedAt!.getTime() >= 2 * DAY);
    if (silent.length < 2) continue;
    const days = silent.map((g) => dayWords(g.askedAt!)).join(', ');
    out.push(`${who} has not answered ${silent.length} of the ${gs.length} questions I put about the reports in the last thirty days, asked on ${days}.`);
  }
  return out;
}
