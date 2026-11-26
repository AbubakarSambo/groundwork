/**
 * STANDING INSTRUCTIONS, BY PLAIN WORDS (Ebele, increment 6a; plan 11, 19 and 31).
 *
 *   "Get everyone's updates and email me Friday."
 *   "Handle this with the team and come back when ready."
 *
 * The model recognises one (the-team-mind.ts readAnInstruction); this file repeats it back in one sentence with who will be asked and when, and acts
 * only on her yes. Only she can give or confirm one. A yes that is not about something asked, or that comes after a newer instruction replaced the
 * question, does nothing.
 *
 * It runs on the job machinery of increment 3: one `persistent_jobs` row of kind `standing:<id>` holds her words and its settings in `details`
 * (state proposed, active, stopped, done). Nothing is remembered in the process: every minute the sweep reads the rows, so a restart in the middle
 * loses nothing, and every ask and every email is claimed in the record first (the ask in `information_gaps`, the email by its send key at the one
 * mail door), so two copies of the API send each once.
 *
 *   collect and report   The team is asked the morning before her day (09:00 in the office's own time), and the email goes on her day (from 08:00) at least
 *                        six hours after the ask. A cycle that could not go (she asked for quiet) goes when she says carry on, saying which day it was for.
 *   handle with the team The team is asked once, now. She is told when everybody asked has answered, or after three days with who has not.
 * What the email says is from the record only, and each line says where it came from or that it is not verified (the-update-for-her.ts).
 */
import * as crypto from 'crypto';
import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { understandHerAnswer } from '../executive-onboarding/her-answer';
import { whoIsSpeakingForWhom } from '../executive-onboarding/her-words';
import { route, THE_REGISTER_QUESTIONS } from '../assistant/the-router-is-deterministic';
import { hasSheAskedForQuiet } from '../executive-onboarding/her-preferences';
import { THE_ASK_FOR_AN_UPDATE, THE_INSTRUCTION_BACK, THE_INSTRUCTION_IS_OFF, THE_INSTRUCTION_IS_ON, THE_INSTRUCTION_IS_UNCLEAR, THE_TEAM_WRITTEN_TO, NO_ONE_TO_ASK, ONLY_SHE_CAN_GIVE_ONE } from './the-team-words';
import { theirWorkNow } from './what-their-reply-says';
import { whatTheInstructionIs } from './the-plain-reading';
import { theAsksStillWaiting, theUpdateForHer } from './the-update-for-her';
import { howTheyCanBeWrittenToToday, whenWereTheyLastAsked } from './has-this-person-been-asked';
import { anAskKey } from '../executive-onboarding/information-gaps';
import type { TheTeamMind } from './the-team-mind';

export const STANDING = 'standing:';
const DAY = 86_400_000;
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export interface TheStandingPorts {
  /** `sendKey` is the questions the message carries (information-gaps.ts anAskKey): the gate marks them asked only when it really goes. */
  whatsapp: { send(a: { organizationId: string; phone: string; text: string; kind: string; sendKey?: string }): Promise<{ sent: boolean; error?: string }> };
  email: {
    send(a: { organizationId: string; to: string; subject: string; text: string; replyTo: string; askKey?: string }): Promise<unknown>;
    /** One mail for one key, ever: the mail door refuses a second with the same key. */
    sendOnce(a: { organizationId: string; to: string; subject: string; text: string; replyTo: string; sendKey: string }): Promise<'sent' | 'held' | 'suppressed'>;
  };
  replyTo?: (organizationId: string) => Promise<string | undefined>;
  mind?: TheTeamMind | null;
}

/** The office's own date and hour, and its weekday (Monday is 1). */
export function localParts(now: Date, zone: string | null): { ymd: string; hour: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone || 'Africa/Lagos', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short' }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return { ymd: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')), weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1 };
}
const addDays = (ymd: string, n: number): string => new Date(Date.parse(`${ymd}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

const firstOf = (name: string) => String(name ?? '').split(/\s+/)[0] || 'there';

export async function theTeamSheMayAsk(prisma: any, principalUserId: string): Promise<any[]> {
  return ((await prisma.outreachContact.findMany({ where: { principalUserId, state: 'introduced', kind: 'team' } })) ?? []) as any[];
}

async function theInstructionWaiting(prisma: any, organizationId: string, principalUserId: string): Promise<any | null> {
  const rows: any[] = (await prisma.persistentJob.findMany({ where: { organizationId, principalUserId, state: 'proposed' } })) ?? [];
  return rows.filter((j) => String(j.kind).startsWith(STANDING)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null;
}

/** Her words, when they are a standing instruction or her answer to one. Null when they are neither, so the caller carries on as it was. */
/* `principalUserId` is set only for somebody who acts for several senior people and has said which one this is for (executive-onboarding/an-assistant-for-several-principals.ts). */
export async function hearAStandingInstruction(prisma: any, mind: TheTeamMind | null | undefined, a: { organizationId: string; userId: string | null; message: string; now: Date; principalUserId?: string }): Promise<string | null> {
  const who = await whoIsSpeakingForWhom(prisma, a.organizationId, a.userId, a.principalUserId);
  if (!who) return null;
  const waiting = await theInstructionWaiting(prisma, a.organizationId, who.principalUserId);
  /* Her yes or no, in any words that mean it, only where an instruction is waiting for it. */
  const answer = waiting ? await understandHerAnswer(mind, { question: String(waiting.details?.question ?? 'Shall I go ahead with what you asked me to do for the team?'), text: a.message }) : null;
  /*
   * WHAT SHE SAYS NEXT ABOUT THE ONE WAITING IS READ WITH IT (D18). "No, not Thursday. I need it today." changes the instruction, it does not end it: her
   * first words and these are read together, and when they make a different instruction it is said back again, in place of the one waiting.
   */
  if (waiting && answer !== 'yes' && a.message.trim().split(/\s+/).length >= 4) {
    const together = await whatTheInstructionIs(mind, `${String(waiting.details?.words ?? waiting.title ?? '')}\nThen she said: ${a.message}`);
    const before = waiting.details ?? {};
    const changed = together.kind !== 'none' && together.kind !== 'unclear' && (!!together.today !== !!before.today || (together.reportWeekday ?? null) !== (before.reportWeekday ?? null) || together.kind !== before.kind);
    if (changed) return proposeIt(prisma, a, who, together, `${String(before.words ?? '')} ${a.message}`.trim(), waiting);
  }
  if (answer && waiting) {
    if (!who.speaker.isPrincipal) return ONLY_SHE_CAN_GIVE_ONE(who.principalFirst);
    if (answer === 'no') { await prisma.persistentJob.update({ where: { id: waiting.id }, data: { state: 'stopped', nextAction: 'The answer was no.' } }); return THE_INSTRUCTION_IS_OFF; }
    const details = { ...(waiting.details ?? {}), confirmedAt: a.now.toISOString() };
    await prisma.persistentJob.update({ where: { id: waiting.id }, data: { state: 'active', details, nextAction: details.kind === 'handle_with_team' ? 'Ask the team now, and report when they have answered.' : 'Ask the team the day before, and email the summary on the day asked.' } });
    return THE_INSTRUCTION_IS_ON;
  }
  /* A message of a few words cannot be an instruction about a team. Beyond that the model reads what she means, in any words. */
  if (a.message.trim().split(/\s+/).length < 4) return null;
  /* A question the rules place on her register ("What can the team close this week") is hers to have answered by Ask, never an instruction to write to her
     team (release test 21 November, 81): it is the one reading Ask places it with. */
  if (THE_REGISTER_QUESTIONS.has(route(a.message).lane)) return null;
  const said = await whatTheInstructionIs(mind, a.message);
  if (said.kind === 'none') return null;
  /* A matter handed to the team with no owner or no day is asked about once, in one question, and nothing is made until it is clear. */
  if (said.kind === 'unclear') return THE_INSTRUCTION_IS_UNCLEAR(who.byName.split(' ')[0] || who.principalFirst, said.matter, said.missing ?? ['owner', 'date']);
  return proposeIt(prisma, a, who, said, a.message, waiting);
}

/**
 * The instruction said back, and kept waiting for her yes. The people are the ones on her record (D2): she is never asked who her team is. Something for
 * today is asked now and reported the same day; with no day said, it is not put off to a Friday she never named (D18).
 */
async function proposeIt(prisma: any, a: { organizationId: string; now: Date }, who: NonNullable<Awaited<ReturnType<typeof whoIsSpeakingForWhom>>>, said0: Awaited<ReturnType<typeof whatTheInstructionIs>>, words: string, waiting: any | null): Promise<string> {
  if (!who.speaker.isPrincipal) return ONLY_SHE_CAN_GIVE_ONE(who.principalFirst);
  const team = await theTeamSheMayAsk(prisma, who.principalUserId);
  const named = said0.who.length ? team.filter((c) => said0.who.some((n) => String(c.name).toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(firstOf(c.name).toLowerCase()))) : team;
  if (!named.length) {
    const notIntroducedYet = ((await prisma.outreachContact.findMany({ where: { principalUserId: who.principalUserId, kind: 'team', state: { in: ['proposed', 'held_external'] } } }).catch(() => [])) ?? []).length;
    return NO_ONE_TO_ASK(who.principalFirst, { notIntroducedYet, namedButNotOnIt: team.length ? said0.who : [] });
  }
  /* Today, or no day at all, is asked now: "collect and report" on a weekday only when she named one. */
  const now = !!said0.today || (said0.kind === 'collect_and_report' && !said0.reportWeekday);
  const said = now ? { ...said0, kind: 'handle_with_team' as const, reportWeekday: null } : said0;
  /* The newest instruction is the one her yes answers, so an older question that was never answered is let go. */
  if (waiting) await prisma.persistentJob.update({ where: { id: waiting.id }, data: { state: 'stopped', nextAction: 'Replaced by a newer instruction.' } });
  const day = said.kind === 'collect_and_report' ? said.reportWeekday ?? 5 : null;
  const zone = await theOrganisationsZone(prisma, a.organizationId).catch(() => null);
  const id = crypto.randomUUID();
  const created: any = await prisma.persistentJob.create({
    data: {
      organizationId: a.organizationId, principalUserId: who.principalUserId, kind: `${STANDING}${id}`, title: words.replace(/\s+/g, ' ').trim().slice(0, 140), state: 'proposed',
      nextAction: 'Waiting for the yes.', authorisedActorUserId: who.principalUserId,
      details: { kind: said.kind, reportWeekday: day, matter: said.matter, contactIds: said.who.length ? named.map((c) => c.id) : [], words: words.slice(0, 500), proposedAt: a.now.toISOString(), ...(said0.today ? { today: true, dueOn: localParts(a.now, zone).ymd } : {}) },
    },
  });
  let back: string;
  if (said.kind === 'handle_with_team') {
    /* Each person with what is still open with them, from their own part of the record, and how they are reached. */
    const people: { name: string; how: 'WhatsApp' | 'email'; about: string | null; more: number; tomorrow: boolean }[] = [];
    for (const c of named) {
      const work = (await theirWorkNow(prisma, c).catch(() => null))?.work;
      const open = work?.commitments ?? [];
      const how = await howTheyCanBeWrittenToToday(prisma, c, a.now);
      people.push({ name: String(c.name ?? '').trim() || 'one person', how: how ?? (c.phone ? 'WhatsApp' : 'email'), about: open[0]?.text ?? null, more: Math.max(0, open.length - 1), tomorrow: !how });
    }
    back = THE_TEAM_WRITTEN_TO({ first: who.principalFirst, matter: said.matter, today: !!said0.today, people });
  } else {
    back = THE_INSTRUCTION_BACK({
      first: who.principalFirst, who: named.map((c) => firstOf(c.name)), matter: said.matter,
      askWhen: day ? `on ${WEEKDAY_NAMES[(day + 5) % 7]} morning` : '', emailWhen: day ? `on ${WEEKDAY_NAMES[day - 1]} morning` : null,
    });
  }
  /* The question as she read it is kept with the instruction, so her answer is read against the words she was actually asked. */
  await prisma.persistentJob.update({ where: { id: created.id }, data: { details: { ...(created.details ?? {}), question: back } } }).catch(() => undefined);
  return back;
}

/**
 * Asks each person once for this cycle. Returns how many were asked now. A person already asked for this key is not asked again. Somebody who cannot be
 * written to today (howTheyCanBeWrittenToToday, the same owner the say-back read) is not tried, and has no row: the next day's run asks them, and the update
 * for her names them until it has (Halden rerun, N1). Each door gets its own claim, because a door that could not take the message gives its claim back.
 */
async function askTheTeam(prisma: any, ports: TheStandingPorts, job: any, contacts: any[], key: string, principalFirst: string, now: Date): Promise<number> {
  let asked = 0;
  const claim = (c: any) => prisma.informationGap.create({ data: { organizationId: job.organizationId, principalUserId: job.principalUserId, gapKey: key, what: `An update asked for by ${principalFirst}.`, askedOfEmail: c.contactKey, askedOfName: c.name, state: 'queued', askedAt: null } }).catch(() => null);
  for (const c of contacts) {
    if (await prisma.informationGap.findFirst({ where: { principalUserId: job.principalUserId, gapKey: key, askedOfEmail: c.contactKey } })) continue;
    const how = await howTheyCanBeWrittenToToday(prisma, c, now);
    if (!how) continue;
    /* Claimed as waiting before it goes; it becomes asked only when the gate or the door says the message went (Halden stress test, D4). */
    const claimed = await claim(c);
    if (!claimed) continue;
    /* Somebody already asked for their work in the last three days, and who has not written since, is not asked a second time for the same thing in a second message: the earlier ask stands, and this one was asked when it was. A matter she named is a different thing from "what are you working on", so it is always asked. */
    const earlier = job.details?.matter ? null : await whenWereTheyLastAsked(prisma, { principalUserId: job.principalUserId, contact: c, now, exceptKey: key });
    if (earlier) { await prisma.informationGap.update({ where: { id: claimed.id }, data: { state: 'asked', askedAt: earlier } }); asked += 1; continue; }
    const work = (await theirWorkNow(prisma, c).catch(() => null))?.work;
    const text = THE_ASK_FOR_AN_UPDATE(firstOf(c.name), principalFirst, job.details?.matter ?? null, { open: (work?.commitments ?? []).map((x) => ({ text: x.text, dueSaid: x.dueSaid })), held: work?.alreadyHeld ?? [], today: !!job.details?.today });
    const askKey = anAskKey(job.principalUserId, 'team', c.contactKey);
    let went = false;
    /* The way she was told, so what she read is what happened. */
    if (how === 'WhatsApp') went = !!(await ports.whatsapp.send({ organizationId: job.organizationId, phone: c.phone, text, kind: 'team-ask', sendKey: askKey }).catch(() => ({ sent: false }))).sent;
    if (!went && c.email) {
      /* A refused WhatsApp gave its claim back; the email gets its own. */
      if (!(await prisma.informationGap.findFirst({ where: { principalUserId: job.principalUserId, gapKey: key, askedOfEmail: c.contactKey } }))) await claim(c);
      went = (await ports.email.send({ organizationId: job.organizationId, to: c.email, subject: `Your update for ${principalFirst}`, text, replyTo: (await ports.replyTo?.(job.organizationId)) ?? '', askKey }).catch(() => 'suppressed')) !== 'suppressed';
    }
    if (!went) { await prisma.informationGap.deleteMany({ where: { principalUserId: job.principalUserId, gapKey: key, askedOfEmail: c.contactKey, state: 'queued' } }); continue; }
    asked += 1;
  }
  return asked;
}

/** The people this cycle has not written to yet: no row for its key. */
const notWrittenToYet = (contacts: any[], gaps: any[]) => contacts.filter((c) => !gaps.some((g) => String(g.askedOfEmail ?? '').toLowerCase() === String(c.contactKey ?? '').toLowerCase()));
/** The day as the one-a-day count reads it (UTC), so a person held back today is tried again once the count allows. */
const theCountsDay = (now: Date) => now.toISOString().slice(0, 10);

/** Every minute. Returns what was done, for the logs and the tests. */
export async function runTheStandingInstructions(prisma: any, ports: TheStandingPorts, now: Date): Promise<string[]> {
  const did: string[] = [];
  const jobs: any[] = ((await prisma.persistentJob.findMany({ where: { state: 'active' } })) ?? []).filter((j: any) => String(j.kind).startsWith(STANDING));
  for (const job of jobs) {
    try {
      const d = { ...(job.details ?? {}) } as any;
      const setup: any = await prisma.principalSetup.findFirst({ where: { organizationId: job.organizationId, principalUserId: job.principalUserId } });
      const principal: any = await prisma.user.findUnique({ where: { id: job.principalUserId }, select: { firstName: true } });
      if (!setup || !principal) continue;
      const everyone = await theTeamSheMayAsk(prisma, job.principalUserId);
      const contacts = d.contactIds?.length ? everyone.filter((c) => d.contactIds.includes(c.id)) : everyone;
      const zone = await theOrganisationsZone(prisma, job.organizationId).catch(() => null);
      const local = localParts(now, zone);
      const save = (patch: any) => prisma.persistentJob.update({ where: { id: job.id }, data: { details: { ...d, ...patch }, lastCheckedAt: now } });

      if (d.kind === 'handle_with_team') {
        /* Asked once a day until everybody has been written to: the first run asks everybody who can be written to, and a later day asks the rest. */
        if (d.triedOn !== theCountsDay(now)) {
          const asked = await askTheTeam(prisma, ports, job, contacts, `instr:${job.id}:ask`, principal.firstName, now);
          if (asked) did.push(`asked ${asked} for ${job.id}`);
          const first = !d.askedAt && (asked || !contacts.length);
          Object.assign(d, { triedOn: theCountsDay(now), ...(first ? { askedAt: now.toISOString() } : {}) });
          await save({});
          if (first) continue;
        }
        if (!d.askedAt) continue;
        const gaps: any[] = (await prisma.informationGap.findMany({ where: { principalUserId: job.principalUserId, gapKey: `instr:${job.id}:ask` } })) ?? [];
        /* Told already, and still writing to the people who could not be written to that day: done once they all have been, or after three days. */
        if (d.reportedAt) {
          if (!notWrittenToYet(contacts, gaps).length || now.getTime() - new Date(d.reportedAt).getTime() >= 3 * DAY) await prisma.persistentJob.update({ where: { id: job.id }, data: { state: 'done', details: { ...d, doneAt: now.toISOString() }, nextAction: 'Reported. Nothing more to do.', lastCheckedAt: now } });
          continue;
        }
        const still = await theAsksStillWaiting(prisma, { principalUserId: job.principalUserId, contacts, asks: gaps });
        const waitingStill = [...still.quiet, ...still.notGone];
        /* Asked for today: she hears the same evening, at five in the office's own time, with whatever there is and who has not answered (D18). */
        const overdue = d.dueOn ? local.ymd > d.dueOn || (local.ymd === d.dueOn && local.hour >= 17) : now.getTime() - new Date(d.askedAt).getTime() >= 3 * DAY;
        if (waitingStill.length && !overdue) continue;
        if (await hasSheAskedForQuiet(prisma, job.organizationId, job.principalUserId, now)) continue;
        const text = await theUpdateForHer(prisma, ports.mind, { organizationId: job.organizationId, principalUserId: job.principalUserId, first: principal.firstName, contacts, since: new Date(d.askedAt), now, lead: waitingStill.length ? 'partial' : 'ready', matter: d.matter ?? null, asks: gaps });
        await ports.email.sendOnce({ organizationId: job.organizationId, to: setup.email, subject: d.matter ? `Where things stand on ${d.matter}` : 'Where things stand with the team', text, replyTo: (await ports.replyTo?.(job.organizationId)) ?? '', sendKey: `standing:${job.id}:ready` });
        const left = notWrittenToYet(contacts, gaps).length;
        await prisma.persistentJob.update({ where: { id: job.id }, data: left ? { details: { ...d, reportedAt: now.toISOString() }, nextAction: 'Reported. Writing to the people who could not be written to yet.', lastMeaningfulContactAt: now, lastCheckedAt: now } : { state: 'done', details: { ...d, doneAt: now.toISOString() }, nextAction: 'Reported. Nothing more to do.', lastMeaningfulContactAt: now, lastCheckedAt: now } });
        did.push(`told her ${job.id}`);
        continue;
      }

      /* collect and report */
      const day = d.reportWeekday ?? 5;
      if (!d.pending) {
        let reportDate = addDays(local.ymd, (day - local.weekday + 7) % 7);
        if (d.lastReport && reportDate <= d.lastReport) reportDate = addDays(reportDate, 7);
        if (local.ymd >= addDays(reportDate, -1) && local.hour >= 9) {
          const asked = await askTheTeam(prisma, ports, job, contacts, `instr:${job.id}:${reportDate}`, principal.firstName, now);
          if (asked || !contacts.length) { await save({ pending: { reportDate, askedAt: now.toISOString() } }); did.push(`asked ${asked} for ${reportDate}`); }
        }
        continue;
      }
      const due = local.ymd > d.pending.reportDate || (local.ymd === d.pending.reportDate && local.hour >= 8);
      if (!due || now.getTime() - new Date(d.pending.askedAt).getTime() < 6 * 3_600_000) continue;
      /* She asked for quiet: the email waits, and goes when she says carry on, with the day it was for. */
      if (await hasSheAskedForQuiet(prisma, job.organizationId, job.principalUserId, now)) continue;
      const gaps: any[] = (await prisma.informationGap.findMany({ where: { principalUserId: job.principalUserId, gapKey: `instr:${job.id}:${d.pending.reportDate}` } })) ?? [];
      const text = await theUpdateForHer(prisma, ports.mind, { organizationId: job.organizationId, principalUserId: job.principalUserId, first: principal.firstName, contacts, since: new Date(d.pending.askedAt), now, lead: 'week', forDay: d.pending.reportDate, asks: gaps });
      await ports.email.sendOnce({ organizationId: job.organizationId, to: setup.email, subject: 'What your team has told me', text, replyTo: (await ports.replyTo?.(job.organizationId)) ?? '', sendKey: `standing:${job.id}:${d.pending.reportDate}` });
      await prisma.persistentJob.update({ where: { id: job.id }, data: { details: { ...d, pending: null, lastReport: d.pending.reportDate }, nextAction: `The next update goes on ${WEEKDAY_NAMES[day - 1]}.`, lastMeaningfulContactAt: now, lastCheckedAt: now } });
      did.push(`emailed her for ${d.pending.reportDate}`);
    } catch {
      /* The next minute reads the same record and tries again. */
    }
  }
  return did;
}
