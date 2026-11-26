/**
 * WHAT A SENIOR PERSON'S ASSISTANT DOES WITH THE PAYMENTS, THE ASSEMBLY, THE VOICE AND THE DAY (Ebele, increment 6b). One class joins the pieces in this
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
import { answeredByTheWork, quietBatchesForWork, theContactWhoWrote, theEarlierVersionOf, theTeamSheNamed, type ABatchForWork, type AMaterialItem } from '../executive-onboarding/the-material-for-work';
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
import { rememberTheOutput, SAYS_STATUS, THE_FULLER_ONE_WENT_BY_EMAIL, theBriefAsAPdf, theDay, theWeek, type TheOutput } from './the-outputs';
import type { AnAttachment } from '../email/attachments';
import { answerTheOffer, NO_SUMMARY_WAITING, theOfferIfEarned, theOfferWaiting } from './the-performance-view';
import { mightBeAWeeklyReport, mightBeARequest, type TheWorkReader } from './the-work-reader';
import { itemsFromRows, keepTheRows, rowKeyId, whereTheRowIs } from './the-rows-in-a-report';
import { aChangeSaid, whatChanged } from './the-deck-changes';
import type { TheCells } from '../documents/a-file-as-cells';
import { askAboutTheReports, THE_ROW_ASK_HEADING, theNamedOwner, theQuestionFor } from './the-row-asks';
import { theFlags, theThresholds } from './the-row-rules';
import { theWordsThatMatter, type TheRegisterRow } from '../outstanding/the-outstanding-register';
import { anAskKey, giveTheAskBack, queueTheAsk } from '../executive-onboarding/information-gaps';
import { dayWords } from '../year-end/the-year-end-content';
import type { AnItemAct } from './the-work-reader';
import { readTheCells } from '../documents/a-file-as-cells';

export interface TheWorkPorts {
  email: {
    /** An answer to something she sent or asked for: never counted as the day's routine message. */
    reply(a: { organizationId: string; to: string; subject: string; text: string; replyTo: string }): Promise<'sent' | 'held' | 'suppressed'>;
    /** A message of Groundwork's own accord, counted as routine. */
    ask(a: { organizationId: string; to: string; name: string; subject: string; text: string; /** The questions it carries: asked only when the mail goes. */ askKey?: string; /** A file it carries: the weekly brief as a PDF. */ attachments?: AnAttachment[] }): Promise<'sent' | 'held' | 'suppressed'>;
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

/** Each kind of flag, as she would say it after "every item where". */
const QUIET_KIND_SAID: Record<string, string> = {
  'approved, not paid': 'something was approved and is not shown paid',
  'awaiting approval': 'an approval is awaited',
  'colour and words': "a row's colour and its words disagree",
  overdue: 'something has waited past the overdue point',
};

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
      await (async () => { const q = await this.aQuietRuleWaiting(a.organizationId, a.principalUserId); return q ? { at: q.at, question: `Shall I put every item where ${QUIET_KIND_SAID[q.kind] ?? q.kind} under monitoring from now on?`, say: () => this.answerTheQuietRule(a.organizationId, a.principalUserId, q.kind, answer!) } : null; })(),
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
    if (request.kind === 'about_an_item') return this.aboutAnItem(a, request.act, request.about);
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

  /**
   * WHAT SHE SAYS ABOUT ONE ITEM (change 5, A6 to A11): "chase the waiver", "the site report is not urgent", "this needs me", "what happened with the
   * refund?", "who is on the permits?". The item is found on her own register by its words; when none fits, she is asked to say it as the report does.
   * Where she puts an item stays put: it is written on the item's own note, which every brief reads.
   */
  private async aboutAnItem(a: { organizationId: string; principalUserId: string; principalFirst: string; speaker: { userId: string; isPrincipal: boolean }; now: Date }, act: AnItemAct, about: string): Promise<string> {
    const reg = await buildTheRegister(this.db, { organizationId: a.organizationId, principalUserId: a.principalUserId, now: a.now, forADelegate: !a.speaker.isPrincipal });
    const want = theWordsThatMatter(about);
    const scored = reg.rows.map((r) => { const have = theWordsThatMatter(r.item); const hit = [...want].filter((w) => have.has(w)).length; return { r, score: want.size ? hit / want.size : 0 }; }).filter((x) => x.score >= 0.5).sort((x, y) => y.score - x.score);
    if (!scored.length || (scored.length > 1 && scored[0].score === scored[1].score && scored[0].r.key !== scored[1].r.key)) {
      return scored.length ? `I found more than one item that could be "${about}": ${scored.slice(0, 3).map((x) => `"${x.r.item}"`).join(', ')}. Which one do you mean?` : `I could not find "${about}" on the record. Say a few words of it as the report writes it, and I will look again.`;
    }
    const r = scored[0].r;
    if (act === 'not_urgent' || act === 'needs_me') {
      if (!a.speaker.isPrincipal) return `Only ${a.principalFirst} can say where an item goes in her brief. I have not changed anything.`;
      const bucket = act === 'not_urgent' ? 'monitoring' : 'attention';
      for (const s of r.sources) {
        const where = { principalUserId_sourceKind_sourceId: { principalUserId: a.principalUserId, sourceKind: s.kind, sourceId: s.id } };
        await this.db.registerNote.upsert({ where, create: { organizationId: a.organizationId, principalUserId: a.principalUserId, sourceKind: s.kind, sourceId: s.id, herBucket: bucket }, update: { herBucket: bucket } });
      }
      if (act === 'needs_me') return `"${r.item}" is now under what needs your attention, and it stays there until you tell me otherwise.`;
      const said = `I have put "${r.item}" under monitoring. It stays there, and I will not raise it as needing you until you tell me otherwise.`;
      /* The third of one kind she has put there: she is asked once whether that kind always belongs there (change 5, acceptance case 10). */
      const kind = r.flag?.kind;
      if (!kind) return said;
      const after = await buildTheRegister(this.db, { organizationId: a.organizationId, principalUserId: a.principalUserId, now: a.now, forADelegate: false });
      const ofThisKind = after.rows.filter((x) => x.flag?.kind === kind && x.herBucket === 'monitoring').length;
      const setup: any = await this.db.principalSetup.findFirst({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } });
      const prefs = setup?.preferences ?? {};
      if (!setup || ofThisKind < 3 || (prefs.quietKindsAsked ?? []).includes(kind)) return said;
      await this.db.principalSetup.update({ where: { id: setup.id }, data: { preferences: { ...prefs, quietKindsAsked: [...(prefs.quietKindsAsked ?? []), kind], quietRuleWaiting: { kind, at: a.now.toISOString() } } } });
      return `${said}\n\nThat is the third item where ${QUIET_KIND_SAID[kind] ?? kind} that you have put there. Shall I put every one like it under monitoring from now on?`;
    }
    if (act === 'who') {
      const f = r.flag;
      const has = r.owner === 'unconfirmed' ? 'Nobody is named for it on the record.' : `${r.owner} has it.`;
      const asked = f?.answeredOn ? ` ${f.askedOf} answered on ${dayWords(f.answeredOn)}.` : f?.askedOn ? ` I asked ${f.askedOf} about it on ${dayWords(f.askedOn)} and have had no answer yet.` : '';
      return `${r.item}. ${has}${asked}`;
    }
    if (act === 'history') return this.whatHappenedWith(a, r);
    return this.chase(a, r);
  }

  private async aQuietRuleWaiting(organizationId: string, principalUserId: string): Promise<{ kind: string; at: Date } | null> {
    const setup: any = await this.db.principalSetup.findFirst({ where: { organizationId, principalUserId } }).catch(() => null);
    const w = setup?.preferences?.quietRuleWaiting;
    return w?.kind ? { kind: w.kind, at: new Date(w.at) } : null;
  }

  /** Her yes makes it a standing rule she can undo by saying so; her no leaves each item where she puts it. Asked once either way. */
  private async answerTheQuietRule(organizationId: string, principalUserId: string, kind: string, answer: 'yes' | 'no'): Promise<string> {
    const setup: any = await this.db.principalSetup.findFirst({ where: { organizationId, principalUserId } });
    const { quietRuleWaiting, ...prefs } = setup?.preferences ?? {};
    const quietKinds = answer === 'yes' ? [...new Set([...(prefs.quietKinds ?? []), kind])] : prefs.quietKinds ?? [];
    await this.db.principalSetup.update({ where: { id: setup.id }, data: { preferences: { ...prefs, quietKinds } } });
    return answer === 'yes'
      ? `From now on, every item where ${QUIET_KIND_SAID[kind] ?? kind} goes under monitoring. Tell me if one of them needs you, and it will.`
      : `I will leave each one where it comes, and you can tell me item by item.`;
  }

  /** What happened with one item, from the record, each step with its day and where it is written. */
  private async whatHappenedWith(a: { organizationId: string; principalUserId: string }, r: TheRegisterRow): Promise<string> {
    const lines: string[] = [];
    const rowIds = new Set(r.sources.filter((s) => s.kind === 'row').map((s) => s.id));
    if (rowIds.size) {
      const rows: any[] = (await Promise.resolve(this.db.reportRow?.findMany?.({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } })).catch(() => [])) ?? [];
      for (const it of itemsFromRows(rows.filter((x) => rowIds.has(rowKeyId(x.rowKey))))) {
        const versions = rows.filter((x) => x.rowKey === it.rowKey).sort((x, y) => new Date(x.receivedAt).getTime() - new Date(y.receivedAt).getTime());
        let last = '';
        for (const v of versions) {
          const said = [v.status, v.note].filter(Boolean).join('. ');
          if (said === last) continue;
          last = said;
          lines.push(`On ${dayWords(new Date(v.receivedAt))}, the report said ${said ? `"${said}"` : 'nothing about where it stands'} (${whereTheRowIs(v)}).`);
        }
      }
    }
    for (const s of r.sources.filter((x) => x.kind !== 'row')) lines.push(`On ${dayWords(new Date(s.at))}, ${s.from} said "${s.said}".`);
    const f = r.flag;
    if (f?.askedOn) lines.push(f.answeredOn ? `I asked ${f.askedOf} on ${dayWords(f.askedOn)}, and they answered on ${dayWords(f.answeredOn)}${f.answer ? `: "${f.answer}"` : '.'}` : `I asked ${f.askedOf} on ${dayWords(f.askedOn)}, and they have not answered.`);
    return [`Here is what the record holds on "${r.item}".`, ...lines.map((l) => `- ${l}`), `It is ${SAYS_STATUS[r.status] ?? r.status} now.`].join('\n');
  }

  /** "Chase it": the person who can answer is asked now, once, with the row it rests on. */
  private async chase(a: { organizationId: string; principalUserId: string; principalFirst: string; now: Date }, r: TheRegisterRow): Promise<string> {
    const rowIds = new Set(r.sources.filter((s) => s.kind === 'row').map((s) => s.id));
    const rows: any[] = rowIds.size ? ((await Promise.resolve(this.db.reportRow?.findMany?.({ where: { organizationId: a.organizationId, principalUserId: a.principalUserId } })).catch(() => [])) ?? []).filter((x: any) => rowIds.has(rowKeyId(x.rowKey))) : [];
    const latest = rows.sort((x, y) => new Date(y.receivedAt).getTime() - new Date(x.receivedAt).getTime())[0];
    if (!latest) return `"${r.item}" is not from the office reports, so I cannot chase it from here. ${r.owner === 'unconfirmed' ? '' : `${r.owner} has it.`}`.trim();
    const team = await theTeamSheNamed(this.db, a.organizationId, a.principalUserId);
    const named = theNamedOwner(latest.owner ?? null, team);
    const sentFrom = String(latest.sentFrom ?? '').toLowerCase();
    const me: any = await this.db.user.findUnique({ where: { id: a.principalUserId }, select: { email: true } }).catch(() => null);
    const who = named ?? (/@/.test(sentFrom) && sentFrom !== String(me?.email ?? '').toLowerCase() ? { name: team.find((t) => t.email === sentFrom)?.name ?? sentFrom.split('@')[0], email: sentFrom } : null);
    if (!who) return `There is nobody on your team with an address I can ask about "${r.item}". Tell me who has it and I will ask them.`;
    const f = theFlags(rows, { now: a.now, thresholds: theThresholds(null) })[0];
    const question = f ? theQuestionFor(f) : `${latest.item} (${whereTheRowIs(latest)}). What is happening with it now, and what is the next step?`;
    const gapKey = `row:${rowKeyId(latest.rowKey)}:chase-${a.now.toISOString().slice(0, 10)}`;
    if (!(await queueTheAsk(this.db, { organizationId: a.organizationId, principalUserId: a.principalUserId, gapKey, what: question, askedOfEmail: who.email, askedOfName: who.name }))) return `I have already asked ${who.name} about "${r.item}" today. I will tell you what they say.`;
    const askKey = anAskKey(a.principalUserId, 'rows', who.email);
    const outcome = await this.d.ports.email.ask({ organizationId: a.organizationId, to: who.email, name: who.name, subject: THE_ROW_ASK_HEADING, text: [`${who.name.split(' ')[0]}, ${a.principalFirst} asked me to follow this up with you.`, question, 'Please reply to this message. What you say goes to her with the item, in your words.'].join('\n\n'), askKey }).catch(() => 'suppressed' as const);
    if (outcome === 'suppressed') { await giveTheAskBack(this.db, askKey); return `I could not send the question to ${who.name}. Nothing was sent.`; }
    return outcome === 'held' ? `I will ask ${who.name} about "${r.item}" first thing in the morning, and tell you what they say.` : `I have asked ${who.name} about "${r.item}", and I will tell you what they say.`;
  }

  /**
   * A DECK OR SHEET THAT REPEATS WEEK TO WEEK, COMPARED WITH ITS LAST VERSION (the-deck-changes.ts). The changes are kept with the file, and whoever sent it
   * is asked once what is behind them, with each change said in full; her weekly brief reads them, with their answer when it comes.
   */
  private async whatChangedSinceLastTime(batch: ABatchForWork, item: AMaterialItem, cells: TheCells, sentFrom: string | null, now: Date): Promise<void> {
    /* Decks only: a register that grows every quarter is followed row by row instead (the-rows-in-a-report.ts). */
    if (cells.kind !== 'deck') return;
    const earlier = await theEarlierVersionOf(this.db, item, batch.principalUserId);
    if (!earlier?.bytes) return;
    const changes = whatChanged(await readTheCells(earlier.bytes, earlier.fileName, earlier.mimeType), cells);
    if (!changes.length) return;
    const kept = await writeItOnce(this.db, { organizationId: batch.organizationId, principalUserId: batch.principalUserId, kind: 'told', subject: `deck-changes:${item.id}`, data: { file: item.fileName, earlier: earlier.fileName, earlierOn: earlier.receivedAt.toISOString(), changes } as any, at: now });
    const principal: any = await this.db.user.findUnique({ where: { id: batch.principalUserId }, select: { firstName: true, email: true } }).catch(() => null);
    const to = String(sentFrom ?? '').toLowerCase();
    if (!kept || !/@/.test(to) || to === String(principal?.email ?? '').toLowerCase()) return;
    const team = await theTeamSheNamed(this.db, batch.organizationId, batch.principalUserId);
    const name = team.find((t) => t.email === to)?.name ?? to.split('@')[0];
    const what = `${item.fileName}, compared with ${earlier.fileName}: ${changes.length === 1 ? 'one change' : `${changes.length} changes`}.`;
    if (!(await queueTheAsk(this.db, { organizationId: batch.organizationId, principalUserId: batch.principalUserId, gapKey: `row:deck-${item.id}`, what, askedOfEmail: to, askedOfName: name }))) return;
    const shown = changes.slice(0, 12).map((c) => `- ${aChangeSaid(c)}`);
    const text = [`${name.split(' ')[0]}, I compared ${item.fileName} with the version of ${dayWords(earlier.receivedAt)}, for ${principal?.firstName ?? 'the director'}. These are what changed.`, [...shown, ...(changes.length > 12 ? [`- And ${changes.length - 12} more.`] : [])].join('\n'), 'What is behind these changes? Please reply to this message. What you say goes to her with the changes, in your words.'].join('\n\n');
    const askKey = anAskKey(batch.principalUserId, 'rows', to);
    const outcome = await this.d.ports.email.ask({ organizationId: batch.organizationId, to, name, subject: 'What changed in your report', text, askKey }).catch(() => 'suppressed' as const);
    if (outcome === 'suppressed') await giveTheAskBack(this.db, askKey);
  }

  /** Each day, each flag past its threshold is put once to whoever can answer it (the-row-asks.ts), in the office's working hours. */
  async askAboutTheReports(now: Date): Promise<number> {
    if (now.getUTCMinutes() % 30 !== 0) return 0;
    const setups: any[] = (await this.db.principalSetup.findMany({ where: {} })) ?? [];
    let went = 0;
    for (const s of setups) {
      try {
        const zone = await theOrganisationsZone(this.db, s.organizationId, now.getTime()).catch(() => null);
        const local = localParts(now, zone);
        if (local.weekday === 0 || local.weekday === 6 || local.hour < 9 || local.hour >= 16) continue;
        const me: any = await this.db.user.findUnique({ where: { id: s.principalUserId }, select: { firstName: true } }).catch(() => null);
        went += await askAboutTheReports(this.db, { askByEmail: (x) => this.d.ports.email.ask(x) }, { organizationId: s.organizationId, principalUserId: s.principalUserId, principalFirst: me?.firstName ?? 'the director', preferences: s.preferences ?? {}, now, day: local.date });
      } catch {
        /* The next look reads the same record and tries again. */
      }
    }
    return went;
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
        /* Every other Office file is read as its cells, and its tables' rows are kept on the record (the-rows-in-a-report.ts). Nothing is said for it:
           the rows reach her through the register, with where each one is. */
        const tabled = (await Promise.all(items.filter((i) => i.kind === 'file' && i.bytes && !trackers.includes(i)).map(async (i) => ({ i, cells: await readTheCells(i.bytes, i.fileName, i.mimeType) })))).filter((x) => x.cells);
        if (!trackers.length && !reports.length && !voices.length && !tabled.length) continue;
        if (!(await writeItOnce(this.db, { organizationId: batch.organizationId, principalUserId: batch.principalUserId, kind: 'told', subject: `work-batch:${batch.id}`, at: now }))) continue;
        const sentFrom = tabled.length ? (batch.channel === 'email' ? batch.fromAddress : await this.senderEmail(batch).catch(() => null)) : null;
        for (const t of tabled) {
          await keepTheRows(this.db, { organizationId: batch.organizationId, principalUserId: batch.principalUserId, materialId: t.i.id, fileName: t.i.fileName, receivedAt: t.i.receivedAt, sentFrom, cells: t.cells }).catch(() => 0);
          await this.whatChangedSinceLastTime(batch, t.i, t.cells!, sentFrom, now).catch(() => undefined);
        }
        if (!trackers.length && !reports.length && !voices.length) { handled++; continue; }
        const around = await this.peopleAround(batch);
        const toTheSender = (x: { organizationId: string; batch: ABatchForWork; subject: string; text: string; short?: string }) => this.toTheSender(x);
        let answered = 0;
        if (trackers.length) answered += (await readTheTrackersInABatch(this.db, { toTheSender, askByEmail: (x) => this.d.ports.email.ask(x) }, { batch, trackers, who: around.who, senderName: around.senderName, theSender: around.theSender, now, readHeadings: this.d.reader.readTheHeadings ?? null })).length;
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
    /* The week goes as the page in the mail and the same page as a PDF she can keep or forward (change 5: "the one-page view, by email"). */
    if (kind === 'week' && me?.email) {
      const pdf = await theBriefAsAPdf(out).catch(() => null);
      went = (await this.d.ports.email.ask({ organizationId: s.organizationId, to: me.email, name: me.firstName ?? '', subject: out.subject, text: out.full, ...(pdf ? { attachments: [pdf] } : {}) }).catch(() => 'suppressed' as const)) !== 'suppressed';
    }
    if (phone) went = !!(await this.d.ports.whatsapp.send({ organizationId: s.organizationId, phone, text: out.short, kind: 'briefing' }).catch(() => ({ sent: false }))).sent || went;
    if (!went && kind === 'day' && me?.email) went = (await this.d.ports.email.ask({ organizationId: s.organizationId, to: me.email, name: me.firstName ?? '', subject: out.subject, text: out.full }).catch(() => 'suppressed' as const)) !== 'suppressed';
    if (!went) { await give(); return false; }
    await rememberTheOutput(this.db, { organizationId: s.organizationId, principalUserId: s.principalUserId, kind, stamp: now.toISOString(), snapshot: out.snapshot, now }).catch(() => undefined);
    return true;
  }
}

export { NOTHING_WAITING_TO_ADD, NO_SUMMARY_WAITING, NO_VOICE_CHANGE_WAITING, whoIsTheReader };
