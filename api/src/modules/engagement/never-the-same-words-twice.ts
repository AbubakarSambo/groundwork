import { theOrganisationsZone, THE_PRODUCTS_OWN_ZONE } from '../../common/the-organisations-own-day';
import { theirDay, aDayByName, type ASessionOnRecord } from './who-answers-and-when';

/**
 * AFTER TWO MISSED DAYS, NEVER THE SAME OPENING OR REMINDER TWICE IN A ROW (nudges that get answers; Hafsah, 20 October 2026; behind
 * `organizations.direct_morning_on`).
 *
 * Joseph did not check in on Tuesday or on Wednesday. On Thursday the same "your check-in for Sales team, Q4 is open" would reach him a
 * third time, and it has not worked twice. So once somebody has missed two days in a row (who-answers-and-when.ts), an opening or a
 * reminder whose words are the same as the last one they were sent is not sent. The next session's opening still goes where its words
 * are different (their own line about the one thing that matters to them today, conversation/the-one-thing-today.ts). The lead's summary
 * says the same two days, and she is told to call.
 *
 * WHAT IS COMPARED: the words the person would read, as the sender composed them, against the last words an opening or a reminder said to
 * them on any channel. Kept in one `platform_settings` row per person, written only with the switch on, after a message went.
 *
 * WRITTEN DOWN, NOT SILENT: a message not sent for this is a row in the notifications ledger (`outcome: 'skipped'`, with the reason
 * below), so the daily delivery alert reports it as a choice, not as a message that did not go out.
 */
export const SKIPPED = 'skipped';
export const THE_SAME_WORDS_AFTER_TWO_MISSED_DAYS = 'Not sent again: they had not checked in for 2 days or more, and these were the same words as the last message they were sent.';

const KEY = (participantId: string) => `engagement.last-words.${participantId}`;
const plain = (s: string) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

export interface TheSameWords {
  /** The days they missed, by name: "Tuesday 20 October and Wednesday 21 October". */
  days: string[];
}

/** Null where the message may go; otherwise the days they missed. */
export async function theSameWordsAgain(prisma: any, opts: { groundId: string; participantId: string; words: string; now?: Date }): Promise<TheSameWords | null> {
  try {
    if (!opts.words) return null;
    const now = opts.now ?? new Date();
    const g = await prisma?.ground?.findUnique?.({ where: { id: opts.groundId }, select: { organizationId: true } });
    const zone = (g?.organizationId ? await theOrganisationsZone(prisma, g.organizationId).catch(() => null) : null) ?? THE_PRODUCTS_OWN_ZONE;
    const sessions: ASessionOnRecord[] = (await prisma?.checkIn?.findMany?.({
      where: { groundId: opts.groundId, participantId: opts.participantId },
      select: { id: true, participantId: true, sessionNumber: true, status: true, isSetup: true, completedAt: true, availableFrom: true, createdAt: true, closedReason: true },
    })) ?? [];
    const day = theirDay(opts.participantId, sessions, now, zone);
    if (day.missedDays.length < 2) return null;
    const last = await prisma?.platformSetting?.findUnique?.({ where: { key: KEY(opts.participantId) } });
    const before = (last?.value as any)?.words;
    if (!before || plain(before) !== plain(opts.words)) return null;
    return { days: day.missedDays.map(aDayByName) };
  } catch {
    /* Unreadable: the message goes, as it always did. */
    return null;
  }
}

/** The words an opening or a reminder said to this person, kept after it went. */
export async function rememberTheWords(prisma: any, groundId: string, participantId: string, words: string, now: Date = new Date()): Promise<void> {
  try {
    if (!words) return;
    const value = { words, at: now.toISOString() };
    try { await prisma.platformSetting.create({ data: { key: KEY(participantId), value, updatedBy: 'engagement' } }); }
    catch { await prisma.platformSetting.update({ where: { key: KEY(participantId) }, data: { value, updatedBy: 'engagement' } }); }
  } catch { /* a record that cannot be written never stops a message */ }
}

/** The ledger row for a message not sent for this reason. */
export async function writeDownTheSkip(prisma: any, row: { channel: 'whatsapp' | 'email'; to: string; sender: string; organizationId?: string | null; subject?: string | null }): Promise<void> {
  await Promise.resolve(prisma?.notification?.create?.({
    data: { channel: row.channel, organizationId: row.organizationId ?? null, toAddress: row.to, sender: row.sender, subject: row.subject ?? null, outcome: SKIPPED, because: THE_SAME_WORDS_AFTER_TWO_MISSED_DAYS, createdAt: new Date() },
  })).catch(() => undefined);
}
