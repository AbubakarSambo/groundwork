/**
 * A NUDGE THAT HELPS, OR NO NUDGE (Fatima, increment 6a; plan 6.3, 10 and 11).
 *
 *   Dependency-aware   Something that waits on an approval is not chased from its owner. The approver is told, once, with the context, and only when the
 *                      approver is somebody she has already let Groundwork write to. Something that waits on her, or on somebody outside, moves nobody.
 *   Evidence-seeking   A promise still open after a few days with nothing sent since is asked about once, in one sentence, asking for what would show it.
 *   Considerate        Never in the organisation's quiet hours, never on two days running to one person, never more than two in a week, never about something
 *                      already followed up in the last three days, and never when the person has just written (they are in the middle of it).
 *   Silent             When there is nothing useful to say, nothing is sent. A quiet day is the normal day.
 * The rules about when something may be sent are fixed because they are about what is sent. What is worth saying is plain: an open promise, who it
 * waits on, and what is already shown. The words that go are the plain sentences in the-team-words.ts. Messages go through the one WhatsApp gate
 * and the one mail door, whose own rules (the day's one routine message, STOP, the window and the template) hold as well.
 *
 * Every nudge is written down in `information_gaps` before it goes (one row per person and thing, the same record the questions use) and given up if it
 * could not be sent, so a restart sends nothing twice and loses nothing.
 */
import { heldUntilTheMorning } from '../whatsapp/quiet-hours-are-the-organisations';
import { MONTHS } from '../year-end/the-year-end-content';
import { NUDGE_FOR_AN_APPROVER, NUDGE_FOR_EVIDENCE, NUDGE_FOR_SOMETHING_SENT } from './the-team-words';
import { SOURCE, thePersonBehind } from './what-their-reply-says';

const DAY = 86_400_000;
export const QUIET_FOR_A_PROMISE = 3 * DAY;
export const MOST_IN_A_WEEK = 2;

export interface TheNudgePorts {
  whatsapp: { send(a: { organizationId: string; phone: string; text: string; kind: string }): Promise<{ sent: boolean; error?: string }> };
  email: { send(a: { organizationId: string; to: string; subject: string; text: string; replyTo: string }): Promise<unknown> };
  replyTo?: (organizationId: string) => Promise<string | undefined>;
}

export interface ANudge { to: string; text: string; about: string; kind: 'evidence' | 'approver' }
export interface TheNudgeRun { sent: ANudge[]; left: { who: string; why: string }[] }

/** "I will send the Kilele letter" is said back as "send the Kilele letter". */
export { theThingOf } from '../outstanding/a-promise-as-a-task';
import { theThingOf } from '../outstanding/a-promise-as-a-task';

/** The thing with the day it was said for, once: "send the letter" and "by Friday" is "send the letter by Friday", and a thing that already says it is left alone. */
export const theThingWithItsDay = (thing: string, dueSaid: string | null): string => {
  if (!dueSaid || thing.toLowerCase().endsWith(dueSaid.toLowerCase())) return thing;
  /* A date on its own ("1 Oct 2026") is joined with "by", so the sentence reads: "send the briefing note by 1 Oct 2026". */
  return /^(?:\d|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b)/i.test(dueSaid.trim()) ? `${thing} by ${dueSaid.trim()}` : `${thing} ${dueSaid}`;
};
export { isAPromiseInTheirVoice } from '../outstanding/a-promise-as-a-task';
import { isAPromiseInTheirVoice } from '../outstanding/a-promise-as-a-task';

const dayOf = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
const firstOf = (name: string) => String(name ?? '').split(/\s+/)[0] || 'there';

/** Who a "waiting on" names among the people she has introduced Groundwork to. Null for her, for outsiders, and for names that match nobody or more than one. */
export function theApproverNamed(waitingOn: string, contacts: any[], principalFirst: string, self: any): any | 'her' | null {
  const said = ` ${String(waitingOn).toLowerCase().replace(/[^\p{L}\s]/gu, ' ').replace(/\s+/g, ' ')} `;
  if (new RegExp(`\\b(?:you|${principalFirst.toLowerCase()})\\b`).test(said) || /\bmrs?\.?\s+fatima\b/.test(said)) return 'her';
  const hits = contacts.filter((c) => c.id !== self.id && String(c.name).toLowerCase().split(/\s+/).filter((p) => p.length > 2).some((p) => said.includes(` ${p} `)));
  return hits.length === 1 ? hits[0] : null;
}

export async function nudgeWhereItHelps(prisma: any, ports: TheNudgePorts, now: Date): Promise<TheNudgeRun> {
  const run: TheNudgeRun = { sent: [], left: [] };
  const setups: any[] = (await prisma.principalSetup?.findMany?.({}).catch(() => [])) ?? [];
  const today = now.toISOString().slice(0, 10);
  for (const setup of setups) {
    const principal: any = await prisma.user.findUnique({ where: { id: setup.principalUserId }, select: { firstName: true } }).catch(() => null);
    const contacts: any[] = (await prisma.outreachContact.findMany({ where: { principalUserId: setup.principalUserId, state: 'introduced', kind: 'team' } })) ?? [];
    if (!contacts.length) continue;
    /* Quiet hours are the organisation's, read once for it. */
    if (await heldUntilTheMorning(prisma, setup.organizationId, now)) { run.left.push({ who: 'everyone', why: 'it is quiet hours' }); continue; }
    const toldToday = new Set<string>();

    const ledger = async (c: any) => ((await prisma.informationGap.findMany({ where: { principalUserId: setup.principalUserId, askedOfEmail: c.contactKey } })) ?? []).filter((g: any) => /^(?:nudge|approver):/.test(g.gapKey)) as any[];
    const mayWrite = async (c: any): Promise<string | null> => {
      const rows = await ledger(c);
      if (toldToday.has(c.id) || rows.some((g) => g.askedAt && new Date(g.askedAt).toISOString().slice(0, 10) === today || g.askedAt && now.getTime() - new Date(g.askedAt).getTime() < 2 * DAY)) return 'they have had a message in the last two days';
      if (rows.filter((g) => g.askedAt && now.getTime() - new Date(g.askedAt).getTime() < 7 * DAY).length >= MOST_IN_A_WEEK) return 'they have had enough messages this week';
      const recent: any[] = (await prisma.principalMaterial.findMany({ where: { principalUserId: setup.principalUserId, fromUserId: `contact:${c.id}` } })) ?? [];
      if (recent.some((m) => now.getTime() - new Date(m.receivedAt).getTime() < 2 * DAY)) return 'they have just written';
      return null;
    };
    const deliver = async (c: any, text: string, key: string, about: string, kind: ANudge['kind']): Promise<boolean> => {
      /* Written down before it goes, given up if it could not go, so two copies of the API send one message. */
      const claimed: any = await prisma.informationGap.create({ data: { organizationId: setup.organizationId, principalUserId: setup.principalUserId, gapKey: key, what: `A nudge about ${about}.`, askedOfEmail: c.contactKey, askedOfName: c.name, state: 'asked', askedAt: now } }).catch(() => null);
      if (!claimed) return false;
      let went = false;
      let to = c.email ?? c.phone;
      if (c.phone) { went = !!(await ports.whatsapp.send({ organizationId: setup.organizationId, phone: c.phone, text, kind: 'team-nudge' }).catch(() => ({ sent: false }))).sent; if (went) to = c.phone; }
      if (!went && c.email) { to = c.email; await ports.email.send({ organizationId: setup.organizationId, to: c.email, subject: 'A quick question about your work', text, replyTo: (await ports.replyTo?.(setup.organizationId)) ?? '' }).then(() => { went = true; }).catch(() => undefined); }
      if (!went) { await prisma.informationGap.deleteMany({ where: { id: claimed.id } }); return false; }
      toldToday.add(c.id);
      run.sent.push({ to, text, about, kind });
      return true;
    };

    for (const c of contacts) {
      const person = await thePersonBehind(prisma, c);
      if (!person) continue;
      /* A claim somebody has marked as not backed up is nobody's task: the person who said so is not asked whether it has moved (Fatima round 6, Adaeze). */
      const open: any[] = ((await prisma.commitment.findMany({ where: { organizationId: setup.organizationId, personExternalId: person.externalId, source: SOURCE, state: 'OPEN' } })) ?? []).filter((m: any) => !String(m.provenBy ?? '').startsWith('disputed:')).sort((a: any, b: any) => new Date(a.statedAt ?? a.createdAt).getTime() - new Date(b.statedAt ?? b.createdAt).getTime());
      if (!open.length) continue;
      const items = open.filter((m) => !m.lastFollowedUpAt || now.getTime() - new Date(m.lastFollowedUpAt).getTime() >= QUIET_FOR_A_PROMISE);
      if (!items.length) { run.left.push({ who: c.name, why: 'everything open was followed up in the last three days' }); continue; }

      /*
       * Something that waits on an approver: the approver hears of it once, with the context. The owner is not chased about it. One approver hears from one
       * owner once, however many lines the owner said about the same wait ("pay as soon as she says yes" and "the payment is stuck" are one wait), so the
       * lines are grouped by approver, the first is told, and every line in the group is written down as told (round 2, C6: Grace was nudged on two days).
       */
      const byApprover = new Map<string, { approver: any; lines: any[] }>();
      for (const m of items.filter((x) => x.waitingOn)) {
        const approver = theApproverNamed(m.waitingOn, contacts, principal?.firstName ?? 'Fatima', c);
        if (approver === 'her' || !approver) { run.left.push({ who: c.name, why: approver === 'her' ? `“${theThingOf(m.text)}” waits on ${principal?.firstName ?? 'the executive'}, so nobody is chased` : `“${theThingOf(m.text)}” waits on somebody Groundwork may not write to` }); continue; }
        byApprover.set(approver.id, { approver, lines: [...(byApprover.get(approver.id)?.lines ?? []), m] });
      }
      for (const { approver, lines } of byApprover.values()) {
        const told = await Promise.all(lines.map((m) => prisma.informationGap.findFirst({ where: { principalUserId: setup.principalUserId, gapKey: `approver:${m.id}`, askedOfEmail: approver.contactKey } })));
        if (told.some(Boolean)) {
          /* Already told once about this wait: the other lines are covered by that, and nobody is told again. */
          for (const m of lines) if (!(await prisma.informationGap.findFirst({ where: { principalUserId: setup.principalUserId, gapKey: `approver:${m.id}`, askedOfEmail: approver.contactKey } }))) await prisma.informationGap.create({ data: { organizationId: setup.organizationId, principalUserId: setup.principalUserId, gapKey: `approver:${m.id}`, what: `A nudge about ${theThingOf(m.text)}.`, askedOfEmail: approver.contactKey, askedOfName: approver.name, state: 'asked', askedAt: now } }).catch(() => undefined);
          continue;
        }
        const m = lines[0];
        const why = await mayWrite(approver);
        if (why) { run.left.push({ who: approver.name, why }); continue; }
        if (await deliver(approver, NUDGE_FOR_AN_APPROVER(firstOf(approver.name), firstOf(c.name), theThingOf(m.text), dayOf(new Date(m.statedAt ?? m.createdAt))), `approver:${m.id}`, theThingOf(m.text), 'approver')) {
          for (const x of lines) {
            if (x.id !== m.id) await prisma.informationGap.create({ data: { organizationId: setup.organizationId, principalUserId: setup.principalUserId, gapKey: `approver:${x.id}`, what: `A nudge about ${theThingOf(x.text)}.`, askedOfEmail: approver.contactKey, askedOfName: approver.name, state: 'asked', askedAt: now } }).catch(() => undefined);
            await prisma.commitment.update({ where: { id: x.id }, data: { lastFollowedUpAt: now } });
          }
        }
      }

      /* The owner is asked about the oldest promise that waits on nobody, once, for what shows it. */
      const stale = items.find((m) => !m.waitingOn && now.getTime() - new Date(m.statedAt ?? m.createdAt).getTime() >= QUIET_FOR_A_PROMISE);
      if (!stale) { if (!items.some((x) => x.waitingOn)) run.left.push({ who: c.name, why: 'nothing is old enough to ask about' }); continue; }
      const why = await mayWrite(c);
      if (why) { run.left.push({ who: c.name, why }); continue; }
      if (await deliver(c, isAPromiseInTheirVoice(stale.text) ? NUDGE_FOR_EVIDENCE(firstOf(c.name), theThingWithItsDay(theThingOf(stale.text), stale.dueSaid ?? null)) : NUDGE_FOR_SOMETHING_SENT(firstOf(c.name), theThingOf(stale.text)), `nudge:${stale.id}:${today}`, theThingOf(stale.text), 'evidence')) {
        await prisma.commitment.update({ where: { id: stale.id }, data: { lastFollowedUpAt: now } });
      }
    }
  }
  return run;
}
