/**
 * WHAT A SENIOR PERSON'S ASSISTANT DOES WITH THE PAYMENTS, THE ASSEMBLY, THE VOICE AND THE DAY (Fatima, increment 6b). One class joins the pieces in this
 * folder to the channels and to the record. It is built by the onboarding service from what that service already holds (the database, the one mail
 * door, the one WhatsApp gate, the year-end words), so nothing here reaches a provider another way, and it is not a second place that decides who may
 * do what: the speaker is worked out once in executive-onboarding/her-words.ts and passed in.
 *
 *   hear                what she (or the person who acts for her) says in words: a yes or no to a question that is waiting, a name to add as a recipient,
 *                       "give me my day", a weekly update, a standing setting
 *   hearAVoiceNote      the words of a voice note, when they change the draft
 *   readTheQuietBatches the sheets, reports and voice notes in what she forwarded, once the forwarding has gone quiet
 *   sendWhatIsDue       the daily and weekly notes she has set as standing, only when there is something in them
 */
import { mightBeAnAnswer, understandHerAnswer } from '../executive-onboarding/her-answer';
import { answeredByTheWork, quietBatchesForWork, theContactWhoWrote, theTeamSheNamed, type ABatchForWork, type AMaterialItem } from '../executive-onboarding/the-material-for-work';
import { isHeldByHer } from '../executive-onboarding/her-preferences';
import { buildTheRegister, type AWaitingForThePrincipal } from '../outstanding/the-outstanding-register';
import { whoIsTheReader } from '../outstanding/a-delegate-acts-for-a-principal';
import { inQuietHours } from '../email/nothing-lands-at-3am';
import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { writeItOnce } from '../year-end/the-year-end-log';
import type { AnUnclearPhrase } from '../voice/the-transcriber';
import { isAPaymentTracker } from './the-payments-tracker';
import { readTheTrackersInABatch, type ThePerson } from './the-payments-work';
import { readTheAssemblyReports, type TheEngagementRow } from './the-assembly-work';
import { answerTheRecipient, hearARecipient, hearTheAddress, theQuestionWaiting, NOTHING_WAITING_TO_ADD } from './the-recipient-by-chat';
import { aVoiceChangeWaiting, answerAVoiceCheck, hearAVoiceNote, NO_VOICE_CHANGE_WAITING, type TheDraftWords } from './the-voice-revisions';
import { rememberTheOutput, THE_FULLER_ONE_WENT_BY_EMAIL, theDay, theWeek, type TheOutput } from './the-outputs';
import { answerTheOffer, NO_SUMMARY_WAITING, theOfferIfEarned, theOfferWaiting } from './the-performance-view';
import { mightBeAWeeklyReport, mightBeARequest, type TheWorkReader } from './the-work-reader';

export interface TheWorkPorts {
  email: {
    /** An answer to something she sent or asked for: never counted as the day's routine message. */
    reply(a: { organizationId: string; to: string; subject: string; text: string; replyTo: string }): Promise<'sent' | 'held' | 'suppressed'>;
    /** A message of Groundwork's own accord, counted as routine. */
    ask(a: { organizationId: string; to: string; name: string; subject: string; text: string }): Promise<'sent' | 'held' | 'suppressed'>;
  };
  whatsapp: { send(a: { organizationId: string; phone: string; text: string; kind: string }): Promise<{ sent: boolean; error?: string }> };
}

export interface TheWorkDeps {
  prisma: any;
  ports: TheWorkPorts;
  yearEnd: TheDraftWords | null;
  reader: TheWorkReader;
  replyTo(organizationId: string): Promise<string | undefined>;
  /** What waits for her to approve (leave, hours, spending), as the suites already serve it to her. Without it a briefing leaves those out. */
  waitingForHer?(organizationId: string, principalUserId: string): Promise<AWaitingForThePrincipal[]>;
}
export type AChannel = 'chat' | 'email' | 'whatsapp';

export const STANDING_IS_HERS = (first: string) => `Only ${first} can set up a regular briefing. I have not changed anything.`;
export const aStandingNote = (what: 'day' | 'week', on: boolean, hour: number | null, weekday: number | null): string => {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const at = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? ' in the morning' : h < 17 ? ' in the afternoon' : ' in the evening'}`;
  if (!on) return what === 'day' ? 'I have stopped your daily briefing. You can still ask me for your day whenever you like.' : 'I have stopped your weekly update. You can still ask me for it whenever you like.';
  return what === 'day'
    ? `I will send you your day each morning at ${at(hour ?? 7)}, only when there is something to tell you. Tell me if you want me to stop.`
    : `I will send you the update on the work every ${DAYS[weekday ?? 5]} at ${at(hour ?? 16)}, only when there is something in it. Tell me if you want me to stop.`;
};

const localParts = (now: Date, zone: string | null) => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: zone ?? 'UTC', hour: 'numeric', hour12: false, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  return { hour: Number(get('hour')) % 24, weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), date: `${get('year')}-${get('month')}-${get('day')}` };
};

export class PrincipalWork {
  constructor(private readonly d: TheWorkDeps) {}

  /** The cheap look first: a message that cannot be about any of this reads nothing and asks no model. */
  static mightBeWork(message: string): boolean {
    return mightBeAnAnswer(message) || mightBeARequest(message) || /@/.test(message);
  }

  private get db(): any { return this.d.prisma; }

  /* ---------------------------------------------------------------- her words */

  async hear(a: { organizationId: string; principalUserId: string; principalFirst: string; speaker: { userId: string; isPrincipal: boolean }; message: string; channel?: AChannel; now: Date }): Promise<string | null> {
    const base = { organizationId: a.organizationId, principalUserId: a.principalUserId, principalFirst: a.principalFirst, speaker: a.speaker, now: a.now };
    /* A yes or no answers the newest question that is really waiting, and only that one. What she meant is read once, below, only when something waits. */
    let answer: 'yes' | 'no' | null = null;
    const waiting = [
      await (async () => { const p = await theQuestionWaiting(this.db, a.principalUserId, a.now); return p && p.kind === 'say' ? { at: p.at, question: `Shall I send the year-end files to ${p.data?.name ?? 'the person you named'}${p.data?.email ? ` (${p.data.email})` : ''} too?`, say: () => answerTheRecipient(this.db, { ...base, answer: answer!, pending: p }) } : null; })(),
      await (async () => { const p = await theOfferWaiting(this.db, a.principalUserId); return p ? { at: p.at, question: 'Would you like a summary of how the team is doing, made from the record as it is now?', say: () => answerTheOffer(this.db, { organizationId: a.organizationId, principalUserId: a.principalUserId, first: a.principalFirst, speakerIsPrincipal: a.speaker.isPrincipal, answer: answer!, now: a.now }) } : null; })(),
      await (async () => { const p = this.d.yearEnd ? await aVoiceChangeWaiting(this.db, { principalUserId: a.principalUserId, userId: a.speaker.userId, now: a.now }) : null; return p ? { at: p.at, question: 'Did I hear the change you asked for to the draft correctly, and shall I make it?', say: () => answerAVoiceCheck(this.db, this.d.yearEnd!, { organizationId: a.organizationId, principalUserId: a.principalUserId, userId: a.speaker.userId, answer: answer!, waiting: p, now: a.now }) } : null; })(),
    ].filter(Boolean) as { at: Date; question: string; say: () => Promise<string | null> }[];
    if (waiting.length) {
      const newest = waiting.sort((x, y) => y.at.getTime() - x.at.getTime())[0];
      answer = await understandHerAnswer(this.d.reader, { question: newest.question, text: a.message });
      if (answer) return newest.say();
    }

    /* Her answer to "which address?" or "which one?". */
    const pending = await theQuestionWaiting(this.db, a.principalUserId, a.now);
    if (pending?.kind === 'need') {
      const said = await hearTheAddress(this.db, { ...base, message: a.message, pending });
      if (said) return said;
    }

    if (!mightBeARequest(a.message)) return null;
    const request = await this.d.reader.readARequest(a.message);
    if (!request) return null;
    if (request.kind === 'add_recipient') return hearARecipient(this.db, { ...base, who: request.who, email: request.email });
    if (request.kind === 'standing') return this.setStanding(a, request);
    const channel = a.channel ?? 'chat';
    const whatWaits = await this.waiting(a.organizationId, a.principalUserId);
    const out = await (request.kind === 'my_day' ? theDay : theWeek)(this.db, { waiting: whatWaits, organizationId: a.organizationId, principalUserId: a.principalUserId, first: a.speaker.isPrincipal ? a.principalFirst : await this.firstNameOf(a.speaker.userId), forName: a.speaker.isPrincipal ? null : a.principalFirst, forADelegate: !a.speaker.isPrincipal, now: a.now });
    await rememberTheOutput(this.db, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: request.kind === 'my_day' ? 'day' : 'week', stamp: a.now.toISOString(), snapshot: out.snapshot, now: a.now }).catch(() => undefined);
    /* The offer of the team summary is hers alone, and only after the record has earned it. */
    const offer = a.speaker.isPrincipal && !(await theOfferWaiting(this.db, a.principalUserId)) ? await theOfferIfEarned(this.db, { organizationId: a.organizationId, principalUserId: a.principalUserId, first: a.principalFirst, now: a.now }).catch(() => null) : null;
    const withOffer = (t: string) => (offer ? `${t}\n\n${offer}` : t);
    if (channel !== 'whatsapp') return withOffer(out.full);
    /* On WhatsApp the short one is the answer, and the fuller one goes by email where there is an address. */
    const emailed = out.full !== out.short ? await this.emailTheFullerOne(a, out) : false;
    return withOffer(emailed ? `${out.short}\n\n${THE_FULLER_ONE_WENT_BY_EMAIL}` : out.short);
  }

  private async waiting(organizationId: string, principalUserId: string): Promise<AWaitingForThePrincipal[]> {
    return (await this.d.waitingForHer?.(organizationId, principalUserId).catch(() => [])) ?? [];
  }

  private async firstNameOf(userId: string): Promise<string> {
    const u: any = await this.db.user.findUnique({ where: { id: userId }, select: { firstName: true } }).catch(() => null);
    return u?.firstName ?? 'there';
  }

  private async emailTheFullerOne(a: { organizationId: string; speaker: { userId: string } }, out: TheOutput): Promise<boolean> {
    const u: any = await this.db.user.findUnique({ where: { id: a.speaker.userId }, select: { email: true } }).catch(() => null);
    if (!u?.email) return false;
    const r = await this.d.ports.email.reply({ organizationId: a.organizationId, to: u.email, subject: out.subject, text: out.full, replyTo: (await this.d.replyTo(a.organizationId)) ?? '' }).catch(() => 'suppressed' as const);
    return r !== 'suppressed';
  }

  private async setStanding(a: { organizationId: string; principalUserId: string; principalFirst: string; speaker: { isPrincipal: boolean } }, r: { what: 'day' | 'week'; on: boolean; hour: number | null; weekday: number | null }): Promise<string> {
    if (!a.speaker.isPrincipal) return STANDING_IS_HERS(a.principalFirst);
    const setup: any = await this.db.principalSetup.findFirst({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } });
    if (!setup) return STANDING_IS_HERS(a.principalFirst);
    const key = r.what === 'day' ? 'dailyBriefing' : 'weeklyUpdate';
    const preferences = { ...(setup.preferences ?? {}), [key]: r.on ? { on: true, hour: r.hour ?? (r.what === 'day' ? 7 : 16), ...(r.what === 'week' ? { weekday: r.weekday ?? 5 } : {}) } : { on: false } };
    await this.db.principalSetup.update({ where: { id: setup.id }, data: { preferences } });
    return aStandingNote(r.what, r.on, r.hour, r.weekday);
  }

  /* ---------------------------------------------------------------- a voice note */

  hearAVoiceNote(a: { organizationId: string; userId: string; text: string; unclear: AnUnclearPhrase[]; channel: 'whatsapp' | 'email'; fileName?: string; now: Date }): Promise<string | null> {
    if (!this.d.yearEnd) return Promise.resolve(null);
    return hearAVoiceNote(this.db, this.d.yearEnd, this.d.reader, a);
  }

  /* ---------------------------------------------------------------- what she forwarded */

  private async toTheSender(a: { organizationId: string; batch: ABatchForWork; subject: string; text: string; short?: string }): Promise<string> {
    const { batch } = a;
    if (batch.channel === 'whatsapp') {
      const r = await this.d.ports.whatsapp.send({ organizationId: a.organizationId, phone: batch.fromAddress, text: a.short ?? a.text, kind: 'intake-picture' }).catch(() => ({ sent: false }));
      if (r.sent) return 'sent';
      const email = await this.senderEmail(batch);
      if (!email) return 'not_sent';
      return this.d.ports.email.reply({ organizationId: a.organizationId, to: email, subject: a.subject, text: a.text, replyTo: (await this.d.replyTo(a.organizationId)) ?? '' });
    }
    return this.d.ports.email.reply({ organizationId: a.organizationId, to: batch.fromAddress, subject: a.subject, text: a.text, replyTo: (await this.d.replyTo(a.organizationId)) ?? '' });
  }

  private async senderEmail(batch: ABatchForWork): Promise<string | null> {
    if (batch.sender.kind === 'contact') return (await theContactWhoWrote(this.db, batch.sender.contactId!))?.email ?? null;
    const u: any = await this.db.user.findUnique({ where: { id: batch.fromUserId }, select: { email: true } }).catch(() => null);
    return u?.email ?? null;
  }

  private async peopleAround(batch: ABatchForWork): Promise<{ who: { principal: ThePerson; sender: ThePerson | null; team: ThePerson[]; delegates: ThePerson[] }; senderName: string | null; theSender: ThePerson | null }> {
    const p: any = await this.db.user.findUnique({ where: { id: batch.principalUserId }, select: { firstName: true, lastName: true, email: true } });
    const principal: ThePerson = { name: [p?.firstName, p?.lastName].filter(Boolean).join(' ') || 'there', email: String(p?.email ?? '').toLowerCase(), isPrincipal: true };
    const team: ThePerson[] = (await theTeamSheNamed(this.db, batch.organizationId, batch.principalUserId)).filter((t) => t.email).map((t) => ({ name: t.name, email: t.email!, isPrincipal: false }));
    const grants: any[] = (await this.db.delegate?.findMany?.({ where: { organizationId: batch.organizationId, principalUserId: batch.principalUserId, revokedAt: null } }).catch(() => [])) ?? [];
    const delegates: ThePerson[] = grants.map((g) => ({ name: g.delegateName, email: String(g.delegateEmail).toLowerCase(), isPrincipal: false }));
    let sender: ThePerson | null = null;
    if (batch.sender.kind === 'contact') { const c = await theContactWhoWrote(this.db, batch.sender.contactId!); if (c?.email) sender = { name: c.name, email: c.email, isPrincipal: false }; }
    else if (batch.sender.kind === 'delegate') { const u: any = await this.db.user.findUnique({ where: { id: batch.fromUserId }, select: { firstName: true, lastName: true, email: true } }).catch(() => null); if (u?.email) sender = { name: [u.firstName, u.lastName].filter(Boolean).join(' '), email: String(u.email).toLowerCase(), isPrincipal: false }; }
    else sender = principal;
    return { who: { principal, sender: sender && !sender.isPrincipal ? sender : null, team, delegates }, senderName: sender && !sender.isPrincipal ? sender.name : null, theSender: sender };
  }

  /**
   * The batches that have gone quiet. Each is looked at once (a row in the year-end log claims it before anything is written or sent). A batch that is
   * only a tracker, a weekly report or a voice note that changed the draft is answered here and not again by the first picture.
   */
  async readTheQuietBatches(now: Date): Promise<number> {
    let handled = 0;
    for (const batch of await quietBatchesForWork(this.db, now)) {
      try {
        const items = batch.items.filter((i) => i.state === 'kept' && i.text);
        const trackers = items.filter((i) => i.kind === 'file' && isAPaymentTracker(i.text));
        const reports = items.filter((i) => i.kind !== 'voice' && i.kind !== 'archive' && !trackers.includes(i) && mightBeAWeeklyReport(i.text ?? ''));
        const voices = items.filter((i) => i.kind === 'voice');
        if (!trackers.length && !reports.length && !voices.length) continue;
        if (!(await writeItOnce(this.db, { organizationId: batch.organizationId, principalUserId: batch.principalUserId, kind: 'told', subject: `work-batch:${batch.id}`, at: now }))) continue;
        const around = await this.peopleAround(batch);
        const toTheSender = (x: { organizationId: string; batch: ABatchForWork; subject: string; text: string; short?: string }) => this.toTheSender(x);
        let answered = 0;
        if (trackers.length) answered += (await readTheTrackersInABatch(this.db, { toTheSender, askByEmail: (x) => this.d.ports.email.ask(x) }, { batch, trackers, who: around.who, senderName: around.senderName, theSender: around.theSender, now })).length;
        if (reports.length) {
          const mayRead = batch.sender.kind !== 'contact';
          const rows: TheEngagementRow[] | null = mayRead ? (await buildTheRegister(this.db, { organizationId: batch.organizationId, principalUserId: batch.principalUserId, now, forADelegate: true })).rows.map((r) => ({ key: r.key, item: r.item, workstream: r.workstream, owner: r.owner, status: r.status })) : null;
          answered += (await readTheAssemblyReports(this.db, { toTheSender }, { batch, candidates: reports, reader: this.d.reader, engagementRows: rows, now })).length;
        }
        for (const v of voices) answered += (await this.reviseFromAVoiceFile(batch, v, now, toTheSender)) ? 1 : 0;
        const others = batch.items.filter((i) => i.kind === 'file' && !trackers.includes(i) && !reports.includes(i) && i.state !== 'duplicate');
        if (answered && !others.length) await answeredByTheWork(this.db, batch.id, now);
        handled++;
      } catch {
        /* What was kept stays kept. The first picture still answers a batch that was not claimed here. */
      }
    }
    return handled;
  }

  private async reviseFromAVoiceFile(batch: ABatchForWork, v: AMaterialItem, now: Date, toTheSender: (x: any) => Promise<string>): Promise<boolean> {
    if (batch.sender.kind === 'contact' || !this.d.yearEnd) return false;
    const unclear: AnUnclearPhrase[] = v.unsure.map((s) => ({ heard: /I think you said "(.+?)"/.exec(s)?.[1] ?? s })).filter((u) => u.heard);
    const said = await hearAVoiceNote(this.db, this.d.yearEnd, this.d.reader, { organizationId: batch.organizationId, userId: batch.fromUserId, text: v.text!, unclear, channel: batch.channel, fileName: v.fileName, now });
    if (!said) return false;
    await toTheSender({ organizationId: batch.organizationId, batch, subject: 'Your voice note', text: said });
    return true;
  }

  /* ---------------------------------------------------------------- the standing notes */

  /** Every few minutes: the daily briefing and the weekly update she has set as standing, each only when there is something in it. */
  async sendWhatIsDue(now: Date): Promise<number> {
    if (now.getUTCMinutes() % 15 !== 0) return 0;
    const setups: any[] = (await this.db.principalSetup.findMany({ where: {} })) ?? [];
    let sent = 0;
    for (const s of setups) {
      try {
        const prefs = s.preferences ?? {};
        if ((!prefs.dailyBriefing?.on && !prefs.weeklyUpdate?.on) || isHeldByHer(prefs, now)) continue;
        const zone = await theOrganisationsZone(this.db, s.organizationId, now.getTime()).catch(() => null);
        const local = localParts(now, zone);
        if (inQuietHours(now, zone, { quietBeforeHour: prefs.quietBeforeHour ?? null, quietAfterHour: prefs.quietAfterHour ?? null })) continue;
        const me: any = await this.db.user.findUnique({ where: { id: s.principalUserId }, select: { firstName: true, email: true } });
        const person: any = await this.db.person.findFirst({ where: { organizationId: s.organizationId, linkedUserId: s.principalUserId }, select: { phone: true } }).catch(() => null);
        const phone = s.whatsappNumber ?? person?.phone ?? null;
        const base = { organizationId: s.organizationId, principalUserId: s.principalUserId, first: me?.firstName ?? 'there', forADelegate: false, now, waiting: await this.waiting(s.organizationId, s.principalUserId) };
        if (prefs.dailyBriefing?.on && local.hour >= (prefs.dailyBriefing.hour ?? 7)) sent += (await this.sendOne(s, me, phone, 'day', `${local.date}`, await theDay(this.db, base), now)) ? 1 : 0;
        if (prefs.weeklyUpdate?.on && local.weekday === (prefs.weeklyUpdate.weekday ?? 5) && local.hour >= (prefs.weeklyUpdate.hour ?? 16)) sent += (await this.sendOne(s, me, phone, 'week', `${local.date}`, await theWeek(this.db, base), now)) ? 1 : 0;
      } catch {
        /* The next look reads the same record and tries again. */
      }
    }
    return sent;
  }

  private async sendOne(s: any, me: any, phone: string | null, kind: 'day' | 'week', date: string, out: TheOutput, now: Date): Promise<boolean> {
    if (!out.meaningful) return false;
    const claimed = await writeItOnce(this.db, { organizationId: s.organizationId, principalUserId: s.principalUserId, kind: 'told', subject: `briefing-scheduled:${kind}:${date}`, at: now });
    if (!claimed) return false;
    const give = () => this.db.yearEndLog.deleteMany({ where: { principalUserId: s.principalUserId, kind: 'told', subject: `briefing-scheduled:${kind}:${date}` } }).catch(() => undefined);
    let went = false;
    if (kind === 'week' && me?.email) went = (await this.d.ports.email.ask({ organizationId: s.organizationId, to: me.email, name: me.firstName ?? '', subject: out.subject, text: out.full }).catch(() => 'suppressed' as const)) !== 'suppressed';
    if (phone) went = !!(await this.d.ports.whatsapp.send({ organizationId: s.organizationId, phone, text: out.short, kind: 'briefing' }).catch(() => ({ sent: false }))).sent || went;
    if (!went && kind === 'day' && me?.email) went = (await this.d.ports.email.ask({ organizationId: s.organizationId, to: me.email, name: me.firstName ?? '', subject: out.subject, text: out.full }).catch(() => 'suppressed' as const)) !== 'suppressed';
    if (!went) { await give(); return false; }
    await rememberTheOutput(this.db, { organizationId: s.organizationId, principalUserId: s.principalUserId, kind, stamp: now.toISOString(), snapshot: out.snapshot, now }).catch(() => undefined);
    return true;
  }
}

export { NOTHING_WAITING_TO_ADD, NO_SUMMARY_WAITING, NO_VOICE_CHANGE_WAITING, whoIsTheReader };
