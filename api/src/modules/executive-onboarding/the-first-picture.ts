/**
 * ONE USEFUL ANSWER FOR A WHOLE BATCH (Fatima, increment 5; plan section 5: "acknowledges concisely ... returns a useful first picture ...
 * asks whether others are handling related matters").
 *
 * Twenty forwards in a few minutes are one batch, and one message goes when it has been quiet for three minutes (the-intake.ts QUIET_FOR_MS). The
 * message says what came in and what became of every part of it (read, counted as a duplicate, could not be read, zip opened or not), what work and
 * matters are visible, what is outstanding and what is uncertain, what will be followed up, and then asks whether other people handle these matters,
 * for their contacts and her authority to write to them.
 *
 * It is built from the record, by code, never by a model reading what was forwarded: a forwarded message cannot put a word into it except as a
 * quoted subject line, and it cannot make anything happen. It goes to whoever sent the batch, by the channel it came in on, and when somebody acting
 * for her sent it, it speaks of her work as hers. A batch is claimed by one writer before anything is sent, so two copies of the API send one message.
 * Nothing goes while she has asked for quiet ("stop" or "slow down").
 */
import { buildTheRegister } from '../outstanding/the-outstanding-register';
import { whatTheRecordCoversNow } from '../outstanding/the-persistent-jobs';
import { MONTHS, theMonthsWithANote } from '../year-end/the-year-end-content';
import { theFilesWithTheirMonths } from './the-months-a-document-covers';
import { latestDraft } from '../year-end/the-year-end-versions';
import { A_COURTESY_IS_FEWER_THAN, QUIET_FOR_MS, theWordsIn } from './the-intake';
import { A_GAP_WAS_ANSWERED, THANK_YOU_TO_A_TEAM_MEMBER, THE_SUBJECT_OF_THE_FIRST_PICTURE, theFirstPicture, type ThePicture } from './the-words';
import { CONTACT_PREFIX } from './a-team-members-reply';
import { isHeldByHer } from './her-preferences';
import { A_TEAM_LOOP_KEY } from './information-gaps';
import { THE_INSTRUCTION_IS_UNCLEAR } from '../team-loop/the-team-words';

const addressOrDigits = (x: string) => (String(x).includes('@') ? String(x).trim().toLowerCase() : String(x).replace(/\D/g, ''));
const monthName = (key: string) => MONTHS[Number(key.slice(5)) - 1];

const theSubjectOnly = (s: string | null | undefined): string | null => {
  const t = String(s ?? '').replace(/^(?:\s*(?:fwd?|fw|re)\s*:\s*)+/i, '').replace(/https?:\/\/\S+/gi, '').replace(/\s+/g, ' ').trim();
  return t ? (t.length > 80 ? `${t.slice(0, 79).replace(/\s+\S*$/, '')}…` : t) : null;
};

/** What the batch holds and what the record shows, as the message will say it. */
export async function buildThePicture(prisma: any, a: { organizationId: string; principalUserId: string; batchId: string; forName: string | null; first: string; now: Date; forADelegate: boolean }): Promise<ThePicture> {
  const rows: any[] = (await prisma.principalMaterial.findMany({ where: { principalUserId: a.principalUserId, batchId: a.batchId } })) ?? [];
  const top = rows.filter((r) => !r.insideArchive);
  const real = (r: any) => !(r.kind === 'file' && r.state === 'not_opened' && !r.hash && !r.insideArchive && /more attachments$/.test(r.fileName));
  const subjects: string[] = [];
  for (const r of rows.filter((x) => x.kind === 'message')) { const s = theSubjectOnly(r.subject); if (s && !subjects.includes(s)) subjects.push(s); }
  const register = await buildTheRegister(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, now: a.now, forADelegate: a.forADelegate });
  /* What the record covers is read in one place, with what she forwarded counted for the months it is about. */
  const { sources, coverage } = await whatTheRecordCoversNow(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, now: a.now, register });
  const outstanding = register.rows.filter((r) => r.status !== 'completed' && r.status !== 'cancelled' && r.status !== 'unverified');
  const contacts: any[] = (await prisma.outreachContact.findMany({ where: { principalUserId: a.principalUserId, state: 'introduced' } })) ?? [];
  /* "Asked" is said only of a person something really reached: the delivery rows say what reached whom (what-she-is-told-comes-from-the-delivery-state.spec.ts). */
  const sentTo = new Set(((await prisma.introductionDelivery?.findMany?.({ where: { principalUserId: a.principalUserId, audience: 'team', state: 'sent' } }).catch(() => [])) ?? []).map((d: any) => addressOrDigits(d.recipient)));
  const reached = (c: any) => [c.email, c.phone].filter(Boolean).some((x: string) => sentTo.has(addressOrDigits(x)));
  /* What the notes cover is the months she forwarded a monthly note for (year-end/the-year-end-content.ts), not every month something on the record is dated in: the clock's own month is always dated. */
  const notes = theMonthsWithANote(await theFilesWithTheirMonths(prisma, { principalUserId: a.principalUserId, year: a.now.getUTCFullYear() }), a.now);
  const draft = await latestDraft(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, year: a.now.getUTCFullYear() }).catch(() => null);
  const nameOfUnsure = rows.flatMap((r) => (Array.isArray(r.unsure) ? (r.unsure as string[]) : []));
  const onlyAFewWords = rows.length > 0 && rows.every((r) => r.kind === 'message') && rows.reduce((n, r) => n + theWordsIn(r.text), 0) < A_COURTESY_IS_FEWER_THAN;
  return {
    first: a.first, forName: a.forName, onlyAFewWords,
    messages: top.filter((r) => r.kind === 'message' && r.state !== 'duplicate').length,
    files: rows.filter((r) => (r.kind === 'file' || r.kind === 'archive') && r.state === 'kept').length,
    voiceNotes: rows.filter((r) => r.kind === 'voice' && r.state === 'kept').length,
    duplicates: rows.filter((r) => r.state === 'duplicate').length,
    couldNotRead: rows.filter((r) => r.state === 'unreadable' && real(r)).map((r) => ({ name: r.fileName, because: r.because ?? 'it would not open' })),
    archivesNotOpened: rows.filter((r) => r.state === 'not_opened').map((r) => ({ name: r.fileName, because: r.because ?? 'it would not open' })),
    insideArchives: rows.filter((r) => r.kind === 'archive' && r.state === 'kept').map((r) => ({ archive: r.fileName, files: rows.filter((x) => x.insideArchive === r.fileName && x.state !== 'not_opened').length })),
    voiceUnsure: nameOfUnsure,
    subjects,
    workstreams: [...new Set(register.rows.map((r) => r.workstream).filter((w): w is string => !!w))],
    open: outstanding.length,
    awaitingDecision: outstanding.filter((r) => r.status === 'awaiting decision').length,
    noOwner: outstanding.filter((r) => r.owner === 'unconfirmed').length,
    unverified: register.rows.filter((r) => r.status === 'unverified').length,
    months: (notes.months.length ? notes.months : Object.keys(coverage.months).sort()).map(monthName),
    monthsAreNotes: notes.months.length > 0,
    gapMonths: (notes.months.length >= 3 ? notes.missing : sources.length ? coverage.gaps : []).map(monthName),
    hasTeam: contacts.length > 0,
    team: contacts.filter(reached).map((c) => c.name),
    teamNotReached: contacts.filter((c) => !reached(c)).map((c) => c.name),
    draftVersion: draft?.version ?? null,
  };
}

/**
 * THE FACTS THE NARRATIVE MAY USE, from the record's counts and labels only. What was forwarded (its subject lines, its file names, its words) is
 * not in here: the narrative is written without reading any of it, so a forwarded message can put no word into it. Each fact says where it comes
 * from, and the one that is only somebody's word is marked, so whatever is written from it has to say so too.
 */
export function factsOfThePicture(p: ThePicture): { id: string; says: string; unverified?: boolean }[] {
  const facts: { id: string; says: string; unverified?: boolean }[] = [];
  const add = (says: string, unverified = false) => facts.push({ id: `f${facts.length + 1}`, says, ...(unverified ? { unverified } : {}) });
  if (p.workstreams.length) add(`The work visible in the record is ${p.workstreams.slice(0, 6).join(', ')}.`);
  if (p.months.length) add(`The records cover ${p.months.join(', ')}.`);
  if (p.gapMonths.length) add(`Nothing in the record covers ${p.gapMonths.join(', ')}.`);
  if (p.open) add(`${p.open} matters are still open.`);
  if (p.awaitingDecision) add(`${p.awaitingDecision} of them need a decision.`);
  if (p.noOwner) add(`${p.noOwner} have no confirmed owner.`);
  if (p.unverified) add(`${p.unverified} items are only something somebody said, with nothing to show it.`, true);
  return facts;
}

export interface TheAcknowledgementPorts {
  email: { reply(a: { organizationId: string; to: string; subject: string; text: string; replyTo: string }): Promise<'sent' | 'held' | 'suppressed'> };
  whatsapp: { send(a: { organizationId: string; phone: string; text: string; kind: string }): Promise<{ sent: boolean; error?: string }> };
  /** The narrative of the picture, from the facts above only. Swappable; null (or no port) means the facts are told plainly. */
  narrate?: (facts: { id: string; says: string; unverified?: boolean }[]) => Promise<{ says: string; from: string[] }[] | null>;
  /** A team member's reply as their check-in (team-loop). Null when it could not be read, and the plain thank-you goes. */
  theirCheckIn?: (a: { batchId: string; organizationId: string; principalUserId: string; contact: any; now: Date }) => Promise<string | null>;
  /**
   * Whether somebody forwarded a matter for the team with nobody to do it or no day (round 2, C5: "Madam said we should sort out the Kano thing before the visit.
   * Not sure who is doing what" was filed with no question). The forwarded words are only read to decide what ONE question to ask the sender; nothing is made from them.
   */
  anUnclearMatter?: (texts: string[]) => Promise<{ matter: string | null; missing: ('owner' | 'date')[] } | null>;
}

/**
 * Answers every batch that has gone quiet, once. Returns what was answered. One batch failing never stops the others, and one that could not be
 * sent is let go of so the next minute tries again.
 */
export async function answerTheQuietBatches(prisma: any, ports: TheAcknowledgementPorts, now: Date, replyToFor: (organizationId: string) => Promise<string | undefined>): Promise<{ batchId: string; to: string; outcome: string }[]> {
  const batches: any[] = (await prisma.intakeBatch.findMany({ where: { acknowledgedAt: null } })) ?? [];
  const done: { batchId: string; to: string; outcome: string }[] = [];
  for (const b of batches) {
    if (now.getTime() - new Date(b.lastItemAt).getTime() < QUIET_FOR_MS) continue;
    try {
      const setup: any = await prisma.principalSetup.findFirst({ where: { organizationId: b.organizationId, principalUserId: b.principalUserId } });
      /* Asked for quiet: the material is kept and the answer waits. (This is about messages to her, not about thanking a colleague.) */
      if (setup && !String(b.fromUserId).startsWith(CONTACT_PREFIX) && isHeldByHer(setup.preferences, now)) continue;
      const claimed = await prisma.intakeBatch.updateMany({ where: { id: b.id, acknowledgedAt: null }, data: { acknowledgedAt: now } });
      if (claimed && claimed.count === 0) continue;
      const principal: any = await prisma.user.findUnique({ where: { id: b.principalUserId }, select: { firstName: true } });
      let text: string;
      let subject = THE_SUBJECT_OF_THE_FIRST_PICTURE;
      let phone: string | null | undefined = null;
      if (String(b.fromUserId).startsWith(CONTACT_PREFIX)) {
        /* A team member who wrote back: thanked once for the batch, with nothing of anybody else's in it. */
        const contact: any = await prisma.outreachContact.findFirst({ where: { id: String(b.fromUserId).slice(CONTACT_PREFIX.length) } });
        const rows: any[] = (await prisma.principalMaterial.findMany({ where: { principalUserId: b.principalUserId, batchId: b.id } })) ?? [];
        const answered: any[] = (await prisma.informationGap?.findMany?.({ where: { organizationId: b.organizationId, askedOfEmail: String(contact?.email ?? '').toLowerCase(), state: 'answered' } }).catch(() => [])) ?? [];
        const first = String(contact?.name ?? '').split(' ')[0];
        /* Their reply is their check-in: what it says is on the record, and the one thing still worth asking, if any, is the reply (team-loop). Otherwise the plain thank-you. */
        const theirs = contact && ports.theirCheckIn ? await ports.theirCheckIn({ batchId: b.id, organizationId: b.organizationId, principalUserId: b.principalUserId, contact, now }).catch(() => null) : null;
        text = theirs ?? THANK_YOU_TO_A_TEAM_MEMBER(first, principal?.firstName ?? 'They', rows.filter((r) => r.state === 'kept' && !r.insideArchive && r.kind !== 'message').map((r) => r.fileName), rows.filter((r) => r.state === 'unreadable').map((r) => r.fileName));
        /* "That fills the gap I asked about" is not said in a reply that asks them something else (round 8: it was said under a request to forward a message). */
        /* Only the plain thank-you says it: a reply written from what they sent already says what was done with it (round 10). */
        if (!theirs && !text.includes('?') && answered.some((g) => !A_TEAM_LOOP_KEY.test(String(g.gapKey ?? '')) && g.answeredAt && new Date(g.answeredAt).getTime() >= new Date(b.openedAt).getTime())) text = `${text}\n\n${A_GAP_WAS_ANSWERED(first || 'there')}`;
        subject = 'Thank you';
        phone = contact?.phone;
      } else {
        const sender: any = await prisma.user.findUnique({ where: { id: b.fromUserId }, select: { firstName: true } });
        const byAnother = b.fromUserId !== b.principalUserId;
        const picture = await buildThePicture(prisma, { organizationId: b.organizationId, principalUserId: b.principalUserId, batchId: b.id, forName: byAnother ? principal?.firstName ?? null : null, first: sender?.firstName ?? 'there', now, forADelegate: byAnother });
        /* Something handed over with no owner or no day, by somebody who forwards for her, is asked about once, in one question, and that question is the batch's only one. */
        if (byAnother && ports.anUnclearMatter) {
          const texts = ((await prisma.principalMaterial.findMany({ where: { principalUserId: b.principalUserId, batchId: b.id } })) ?? []).filter((r: any) => r.kind === 'message' && r.state === 'kept' && r.text).map((r: any) => String(r.text));
          const unclear = texts.length ? await ports.anUnclearMatter(texts).catch(() => null) : null;
          if (unclear) picture.ask = THE_INSTRUCTION_IS_UNCLEAR(sender?.firstName ?? 'there', unclear.matter, unclear.missing.length ? unclear.missing : ['owner', 'date']);
        }
        /* A first picture is told once. What comes after it is thanked and added to, with what the record now covers. */
        picture.later = ((await prisma.intakeBatch.count({ where: { principalUserId: b.principalUserId, id: { not: b.id }, openedAt: { lt: b.openedAt }, acknowledgedAt: { not: null }, NOT: { fromUserId: { startsWith: CONTACT_PREFIX } } } }).catch(() => 0)) ?? 0) > 0;
        const story = ports.narrate && !picture.later ? await ports.narrate(factsOfThePicture(picture)).catch(() => null) : null;
        text = theFirstPicture(picture, story?.length ? story.map((s) => s.says) : null);
        const person: any = b.channel === 'whatsapp' ? await prisma.person.findFirst({ where: { organizationId: b.organizationId, linkedUserId: b.fromUserId }, select: { phone: true } }) : null;
        phone = person?.phone ?? setup?.whatsappNumber;
      }
      let outcome: string;
      const byMail = async () => ports.email.reply({ organizationId: b.organizationId, to: b.fromAddress, subject, text, replyTo: (await replyToFor(b.organizationId)) ?? '' });
      try {
        if (b.channel === 'whatsapp' && phone) {
          const r = await ports.whatsapp.send({ organizationId: b.organizationId, phone, text, kind: 'intake-picture' });
          /* WhatsApp would not take it: the same words go by email, to the address she writes from, so a batch is never answered with nothing. */
          outcome = r.sent ? 'sent' : b.fromAddress && b.fromAddress.includes('@') ? await byMail() : 'not_sent';
        } else outcome = await byMail();
      } catch (err) {
        await prisma.intakeBatch.updateMany({ where: { id: b.id }, data: { acknowledgedAt: null } });
        continue;
      }
      done.push({ batchId: b.id, to: b.fromAddress, outcome });
    } catch {
      /* The next minute reads the same record and tries again. */
    }
  }
  return done;
}
