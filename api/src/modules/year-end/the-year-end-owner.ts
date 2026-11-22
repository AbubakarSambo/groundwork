/**
 * THE TWO JOBS ACT (Fatima, increment 4; spec 30.4 and 31).
 *
 * Every night, after the jobs are recomputed from the record (outstanding/the-persistent-jobs.ts), this reads them for each principal and does
 * at most one of these for her, and otherwise stays silent:
 *   1. the draft is ready      make version 1, email both drafts with the supporting files, and (once the mail has gone) the WhatsApp line;
 *   2. a decision is needed    say what waits for her, once;
 *   3. a major gap             three or more months with nothing, said once in a fortnight;
 *   4. new coverage            enough new records to be worth a line, or newer records than the draft she has.
 * A progress note (a gap, new coverage, newer records) goes at most once in three days; a decision goes when it arises.
 * And, separately and without telling her, it asks the people who can fill a gap: the person who said "done" is asked the one question about it,
 * and a month with nothing is asked of the person who acts for her, or else of the person with most on the record. She is never the one asked,
 * nobody is asked the same thing twice, and each person gets at most one message a night with all of their questions in it.
 *
 * WHAT IS MEANINGFUL IS DECIDED HERE; WHEN IT MAY GO IS DECIDED BY THE SEAMS. A routine note respects her quiet hours and the one routine
 * message a day here as well as at the one door (email) and the WhatsApp gate, so a message the door would hold is not even tried. The draft-ready
 * mail is not routine: it is the work she is waiting for, so the door only holds it for quiet hours. Nothing is remembered in the process; every
 * "told" is a row in year_end_log and every question a row in information_gaps (asked only once its message went), so a restart loses nothing and
 * two copies of the API cannot say it twice.
 */
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { THE_TWO_KINDS } from '../outstanding/the-persistent-jobs';
import { inQuietHours } from '../email/nothing-lands-at-3am';
import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { latestDraft, loadTheRecord, makeTheFirstDraft, type TheDraftRow } from './the-year-end-versions';
import { contactOf, sendTheDraft, tellHerOnWhatsApp, deliverTheFinal, type ThePorts } from './the-year-end-delivery';
import { writeItOnce } from './the-year-end-log';
import { refFor } from './the-year-end-content';
import { THE_QUESTIONS_FOR_ONE_PERSON, progressFull, progressShort, type ASignal } from './the-year-end-words';
import { markItFinal } from './the-year-end-versions';
import { sendKeyOf } from './the-year-end-log';
import { anAskKey, giveTheAskBack, queueTheAsk, whatAGapKeyMeans } from '../executive-onboarding/information-gaps';
import { hasSheAskedForQuiet } from '../executive-onboarding/her-preferences';

export interface OwnerPorts extends ThePorts {
  progressEmail(to: string, subject: string, text: string): Promise<'sent' | 'held' | 'suppressed'>;
  /** A question by email. `askKey` is the questions it carries: the door marks them asked only when the mail really goes. */
  askByEmail(a: { organizationId: string; to: string; name: string; subject: string; text: string; askKey?: string }): Promise<'sent' | 'held' | 'suppressed'>;
}

export interface AnAction { principalUserId: string; action: string; detail?: string }

const startOfDay = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const MIN_NEW_RECORDS = 5;
const MAJOR_GAP_MONTHS = 3;

async function peopleOfTheGrounds(prisma: any, organizationId: string, principalUserId: string): Promise<{ name: string; email: string }[]> {
  const grounds: any[] = (await prisma.ground.findMany({ where: { organizationId, initiatorId: principalUserId }, select: { id: true } })) ?? [];
  const ps: any[] = grounds.length ? (await prisma.groundParticipant.findMany({ where: { groundId: { in: grounds.map((g) => g.id) } }, select: { email: true, userId: true } })) ?? [] : [];
  const ids = ps.map((p) => p.userId).filter(Boolean);
  const users: any[] = ids.length ? (await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, email: true } })) ?? [] : [];
  const out: { name: string; email: string }[] = [];
  /* The people she named and said yes to are the team too: they can be asked what is missing. */
  const named: any[] = (await prisma.outreachContact?.findMany?.({ where: { organizationId, principalUserId, state: 'introduced' } }).catch(() => [])) ?? [];
  for (const c of named) if (c.email && c.name && !out.some((o) => o.email === String(c.email).toLowerCase())) out.push({ name: c.name, email: String(c.email).toLowerCase() });
  if (!grounds.length && !named.length) return [];
  for (const p of ps) {
    const u = users.find((x) => x.id === p.userId);
    const name = [u?.firstName, u?.lastName].filter(Boolean).join(' ') || (p.email ?? '').split('@')[0];
    const email = (u?.email ?? p.email ?? '').toLowerCase();
    if (email && !email.endsWith('@unclaimed.invalid') && name && !out.some((o) => o.email === email)) out.push({ name, email });
  }
  return out;
}

async function isQuietFor(prisma: any, organizationId: string, principalUserId: string, now: Date): Promise<boolean> {
  try {
    const person: any = await prisma.person.findFirst({ where: { organizationId, linkedUserId: principalUserId }, select: { externalId: true, timezone: true } });
    if (!person) return false;
    const prefs = await prisma.emailPreference?.findUnique?.({ where: { organizationId_personExternalId: { organizationId, personExternalId: person.externalId } }, select: { quietBeforeHour: true, quietAfterHour: true } }).catch(() => null);
    const zone = person.timezone ?? (await theOrganisationsZone(prisma, organizationId).catch(() => null));
    return inQuietHours(now, zone, prefs ?? null);
  } catch {
    return false;
  }
}

/** The most questions one message carries. The rest wait, are counted in it, and go once these are answered. */
const MOST_IN_ONE_MESSAGE = 5;
/** The year-end work's own questions. */
const A_YEAR_END_ASK = /^(?:owner|match|gap):/;

type AQuestion = { key: string; what: string; question: string | null; month: string | null };

/**
 * The people who can fill a gap are asked, and she is not. ONE MESSAGE FOR ONE PERSON IN ONE PASS (Dangote stress test, D4: 1,713 mails to Maryam in one night,
 * one for each pair of lines). Every question for a person is gathered first, and goes in one message with at most a few questions, the rest counted. Somebody
 * who still has an earlier question waiting (not yet gone, or gone and not answered) is sent nothing new: the earlier message stands. Each question is claimed
 * as waiting before the message goes, and becomes asked only when the door says the message really went. Returns whose message was handed to the door.
 */
export async function askTheOwners(prisma: any, ports: OwnerPorts, a: { organizationId: string; principalUserId: string; principalFirst: string; gaps: string[]; owners: { name: string; email: string }[]; rows: { owner: string; questionForTheOwner: string | null }[]; matches: { a: { key: string }; b: { key: string }; question: string }[]; peopleCounts: Record<string, number>; now: Date }): Promise<string[]> {
  const handed: string[] = [];
  const team = await peopleOfTheGrounds(prisma, a.organizationId, a.principalUserId);
  const hers = (await contactOf(prisma, a.organizationId, a.principalUserId)).email?.toLowerCase();
  const forPerson = new Map<string, { who: { name: string; email: string }; items: AQuestion[] }>();
  const put = (who: { name: string; email: string }, q: AQuestion) => {
    if (!who.email || who.email === hers) return;
    const there = forPerson.get(who.email) ?? forPerson.set(who.email, { who, items: [] }).get(who.email)!;
    if (!there.items.some((x) => x.key === q.key)) there.items.push(q);
  };
  /* The one question about a "done" with nothing shown goes to whoever said it. */
  for (const r of a.rows) {
    if (!r.questionForTheOwner || r.owner === 'unconfirmed' || r.owner === 'you') continue;
    const who = team.find((t) => t.name.toLowerCase() === r.owner.toLowerCase());
    const key = `owner:${r.questionForTheOwner.slice(0, 80)}`;
    if (who) put(who, { key, what: whatAGapKeyMeans(key, r.questionForTheOwner), question: r.questionForTheOwner, month: null });
  }
  /* Two lines that may be one matter go to the person who acts for her. With nobody to act for her, they are put to her once, as a decision. */
  const delegate = a.owners[0];
  if (delegate) for (const m of a.matches) { const key = `match:${m.a.key}|${m.b.key}`; put(delegate, { key, what: whatAGapKeyMeans(key), question: m.question, month: null }); }
  /* Months with nothing go to the person who acts for her, else to whoever has most on the record. */
  if (a.gaps.length) {
    const target = delegate ?? team.map((t) => ({ t, n: a.peopleCounts[t.name] ?? 0 })).sort((x, y) => y.n - x.n)[0]?.t ?? null;
    if (target) for (const g of a.gaps) put(target, { key: `gap:${g}`, what: whatAGapKeyMeans(`gap:${g}`), question: null, month: g });
  }

  for (const { who, items } of forPerson.values()) {
    const onRecord: any[] = (await prisma.informationGap?.findMany?.({ where: { principalUserId: a.principalUserId, askedOfEmail: who.email } }).catch(() => [])) ?? [];
    const mine = onRecord.filter((g) => A_YEAR_END_ASK.test(String(g.gapKey ?? '')));
    /* An earlier message still waits to go, or to be answered: it stands, and nothing new is added beside it. */
    if (mine.some((g) => g.state === 'queued' || g.state === 'asked')) continue;
    const known = new Set(mine.map((g) => String(g.gapKey)));
    const fresh = items.filter((q) => !known.has(q.key));
    if (!fresh.length) continue;
    /* The months are one question, however many there are. */
    const months = fresh.filter((q) => q.month);
    const questions = fresh.filter((q) => !q.month);
    const room = MOST_IN_ONE_MESSAGE - (months.length ? 1 : 0);
    const give = [...months, ...questions.slice(0, room)];
    const more = questions.length - Math.min(questions.length, room);
    const claimed: AQuestion[] = [];
    for (const q of give) if (await queueTheAsk(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, gapKey: q.key, what: q.what, askedOfEmail: who.email, askedOfName: who.name })) claimed.push(q);
    if (!claimed.length) continue;
    const message = THE_QUESTIONS_FOR_ONE_PERSON(who.name, a.principalFirst, { questions: claimed.filter((q) => q.question).map((q) => q.question!), months: claimed.filter((q) => q.month).map((q) => q.month!), more });
    const askKey = anAskKey(a.principalUserId, 'year-end', who.email);
    const outcome = await ports.askByEmail({ organizationId: a.organizationId, to: who.email, name: who.name, subject: message.subject, text: message.text, askKey }).catch(() => 'suppressed' as const);
    if (outcome === 'suppressed') { await giveTheAskBack(prisma, askKey); continue; }
    handed.push(who.name);
  }
  return handed;
}

/** One principal. Returns what was done, in order. */
async function actForOne(prisma: any, ports: OwnerPorts, a: { organizationId: string; principalUserId: string; now: Date; replyTo?: string }): Promise<AnAction[]> {
  const out: AnAction[] = [];
  const { organizationId, principalUserId, now } = a;
  const me = await contactOf(prisma, organizationId, principalUserId);
  const year = now.getUTCFullYear();
  const jobs: any[] = (await prisma.persistentJob.findMany({ where: { organizationId, principalUserId, kind: { in: THE_TWO_KINDS } } })) ?? [];
  if (!jobs.length) return out;
  const draft = await latestDraft(prisma, { organizationId, principalUserId, year });
  /* She asked for quiet ("stop" or "slow down"): nothing goes to her. What the team is asked, and what is recorded, carries on. */
  const sheAskedForQuiet = await hasSheAskedForQuiet(prisma, organizationId, principalUserId, now);

  /* Mail that was held and has now gone: the draft's WhatsApp line, and the final becoming final. */
  if (draft) {
    if (draft.status === 'approved') {
      const principalEmail = me.email?.toLowerCase() ?? '';
      const wentToHer = await prisma.yearEndLog.findFirst({ where: { principalUserId, kind: 'sent', subject: sendKeyOf({ principalUserId, year, version: draft.version, kind: 'final', recipient: principalEmail }) } });
      if (wentToHer && (await markItFinal(prisma, draft))) { out.push({ principalUserId, action: 'final' }); if (!sheAskedForQuiet) await tellHerOnWhatsApp(prisma, ports, { organizationId, principalUserId, row: { ...draft, status: 'final' }, kind: 'final', now }); }
    }
    if (!sheAskedForQuiet && await tellHerOnWhatsApp(prisma, ports, { organizationId, principalUserId, row: draft, kind: 'draft', now })) out.push({ principalUserId, action: 'whatsapp_draft_ready', detail: `v${draft.version}` });
  }

  const record = await loadTheRecord(prisma, { organizationId, principalUserId, now });
  const delegates: any[] = (await prisma.delegate?.findMany?.({ where: { organizationId, principalUserId, revokedAt: null } }).catch(() => [])) ?? [];
  const owners = delegates.map((d) => ({ name: d.delegateName as string, email: String(d.delegateEmail).toLowerCase() }));
  const coverage: any = jobs.find((j) => j.kind === 'annual_report')?.coverage ?? {};

  const asked = await askTheOwners(prisma, ports, { organizationId, principalUserId, principalFirst: me.firstName, gaps: record.gaps, owners, rows: record.register.rows, matches: record.register.toAsk, peopleCounts: coverage.people ?? {}, now });
  for (const n of asked) out.push({ principalUserId, action: 'asked', detail: n });

  if (sheAskedForQuiet) return out;

  /* 1. The draft is ready. */
  const bothReady = jobs.length >= 2 && jobs.every((j) => j.state === 'draft_ready');
  if (!draft && bothReady) {
    const made = await makeTheFirstDraft(prisma, { organizationId, principalUserId, now, onlyWithSomethingToSay: true });
    if (made.made) {
      const sent = await sendTheDraft(prisma, ports, { organizationId, principalUserId, row: made.row, replyTo: a.replyTo, now });
      out.push({ principalUserId, action: 'draft_ready', detail: sent.map((s) => `${s.to}:${s.outcome}`).join(',') });
      if (await tellHerOnWhatsApp(prisma, ports, { organizationId, principalUserId, row: made.row, kind: 'draft', now })) out.push({ principalUserId, action: 'whatsapp_draft_ready', detail: `v${made.row.version}` });
      return out;
    }
  }

  /* The rest are routine notes: not in her quiet hours, and not a second one in a day. */
  if (await isQuietFor(prisma, organizationId, principalUserId, now)) return out;
  const today: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId, kind: 'told', at: { gte: startOfDay(now) } } })) ?? [];
  if (today.some((t) => String(t.subject).startsWith('progress:'))) return out;

  const told = async (subject: string, data?: Record<string, unknown>) => writeItOnce(prisma, { organizationId, principalUserId, kind: 'told', subject, data: data ?? null, at: now });
  const alreadyTold = async (subject: string) => !!(await prisma.yearEndLog.findFirst({ where: { principalUserId, kind: 'told', subject } }));
  const decisions = record.register.rows.filter((r) => r.status === 'awaiting decision' && r.decision);
  const newDecisions: { key: string; question: string }[] = [];
  for (const d of decisions) if (!(await alreadyTold(`decision:${d.key}`))) newDecisions.push({ key: d.key, question: d.decision!.question });
  /* With somebody who acts for her, a question about two lines is theirs to answer (asked above). Without, it is hers. */
  if (!owners.length) for (const m of record.register.toAsk) if (!(await alreadyTold(`decision:${m.a.key}|${m.b.key}`))) newDecisions.push({ key: `${m.a.key}|${m.b.key}`, question: m.question });

  let signal: ASignal | null = null;
  let markers: string[] = [];
  let data: Record<string, unknown> | undefined;
  if (newDecisions.length) { signal = { kind: 'decision', questions: newDecisions.map((d) => d.question) }; markers = newDecisions.map((d) => `decision:${d.key}`); }
  /* Once a draft has gone, its gaps are in it ("What the record does not cover"), so a note about them says nothing new. */
  else if (!draft && record.gaps.length >= MAJOR_GAP_MONTHS && !(await alreadyTold(`gap:${year}:${Math.floor((now.getTime() - Date.UTC(year, 0, 1)) / (14 * 86_400_000))}`))) {
    /* Who the months were asked of, from what was really asked: the person who acts for her, or whoever has most on the record. */
    const gapAsks: any[] = (await prisma.informationGap?.findMany?.({ where: { principalUserId, state: { in: ['asked', 'answered'] }, gapKey: { startsWith: 'gap:' } } }).catch(() => [])) ?? [];
    const team = await peopleOfTheGrounds(prisma, organizationId, principalUserId);
    const names = [...new Set(gapAsks.map((r) => r.askedOfEmail).filter(Boolean))].slice(0, 1).map((e: string) => owners.find((o) => o.email === e)?.name ?? team.find((t) => t.email === e)?.name ?? null);
    signal = { kind: 'gap', gaps: record.gaps, askedOf: names[0] ?? null };
    markers = [`gap:${year}:${Math.floor((now.getTime() - Date.UTC(year, 0, 1)) / (14 * 86_400_000))}`];
  } else {
    const ids = new Set(record.register.rows.flatMap((r) => r.sources.map((s) => s.id)).concat(record.reports.map((r) => r.id), record.documents.map((d) => d.id)));
    const total = ids.size;
    if (draft) {
      const known = new Set((draft.content.evidence ?? []).map((e) => e.ref));
      const have = record.register.rows.flatMap((r) => r.sources).filter((s) => !known.has(refFor(s.kind, s.id))).length;
      if (have > 0 && draft.status !== 'approved' && draft.status !== 'final' && !(await alreadyTold(`newer:${year}:v${draft.version}`))) { signal = { kind: 'newer', version: draft.version }; markers = [`newer:${year}:v${draft.version}`]; }
    } else {
      const lastRow: any = (await prisma.yearEndLog.findMany({ where: { principalUserId, kind: 'told', subject: { startsWith: 'coverage:' } }, orderBy: { at: 'desc' }, take: 1 }))?.[0];
      const lastTotal = Number(lastRow?.data?.total ?? 0);
      const lastMonths: string[] = lastRow?.data?.months ?? [];
      const months = Object.keys(coverage.months ?? {}).sort();
      const newMonth = months.some((m) => !lastMonths.includes(m));
      if (total - lastTotal >= MIN_NEW_RECORDS || (total > lastTotal && newMonth && lastTotal > 0) || (!lastRow && total > 0)) {
        signal = { kind: 'coverage', newRecords: total - lastTotal, first: !lastRow, months, gaps: record.gaps };
        markers = [`coverage:${total}`];
        data = { total, months };
      }
    }
  }
  /* A decision is hers to make and goes at once. Everything else is a progress note, and one is enough for three days. */
  if (signal && signal.kind !== 'decision') {
    const lastNote: any = (await prisma.yearEndLog.findMany({ where: { principalUserId, kind: 'told', subject: { startsWith: 'progress:' } }, orderBy: { at: 'desc' }, take: 1 }))?.[0];
    if (lastNote && now.getTime() - new Date(lastNote.at).getTime() < 3 * 86_400_000) signal = null;
  }
  if (!signal) { out.push({ principalUserId, action: 'silent' }); return out; }

  /* Short on WhatsApp where there is a number; the fuller email where there is not, or where WhatsApp could not take it. */
  let went = false;
  if (me.phone) went = !!(await ports.whatsapp.send({ organizationId, phone: me.phone, text: progressShort(me.firstName, signal), kind: 'year-end-progress' }).catch(() => ({ sent: false }))).sent;
  if (!went && me.email) { const full = progressFull(me.firstName, signal); went = (await ports.progressEmail(me.email, full.subject, full.text).catch(() => 'suppressed' as const)) !== 'suppressed'; }
  if (!went) { out.push({ principalUserId, action: 'not_sent', detail: signal.kind }); return out; }
  for (const m of markers) await told(m, m.startsWith('coverage:') ? data : undefined);
  await told(`progress:${now.toISOString().slice(0, 10)}`);
  out.push({ principalUserId, action: `told_${signal.kind}` });
  return out;
}

/** The nightly pass over every principal who has the two jobs. One principal failing never stops the others. */
export async function actOnTheJobs(prisma: any, ports: OwnerPorts, now: Date = new Date(), replyToFor?: (organizationId: string) => string | undefined): Promise<AnAction[]> {
  const jobs: any[] = (await prisma.persistentJob.findMany({ where: { kind: { in: THE_TWO_KINDS } } })) ?? [];
  const seen = new Set<string>();
  const out: AnAction[] = [];
  for (const j of jobs) {
    const k = `${j.organizationId}|${j.principalUserId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    try {
      out.push(...(await actForOne(prisma, ports, { organizationId: j.organizationId, principalUserId: j.principalUserId, now, replyTo: replyToFor?.(j.organizationId) })));
    } catch {
      /* The next night reads the same record and tries again. */
    }
  }
  return out;
}

export type { TheDraftRow };
export { deliverTheFinal };
