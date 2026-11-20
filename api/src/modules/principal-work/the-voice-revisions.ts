/**
 * A VOICE NOTE THAT CHANGES THE DRAFT (Fatima, increment 6b; plan sections 8 and 14). "Make the presentation shorter", "add March" and "this is wrong: the
 * Kilele date" said aloud, on WhatsApp or as an audio file on a forwarded mail, change the CURRENT year-end draft as a new version and nothing else: no new
 * document, and no task made from the words. The earlier version is kept, as it is for typed words, because the change goes through the same year-end code.
 *
 *   - The model reads what she meant (the-work-reader.ts), so it is not matched to three phrases.
 *   - The words are then said as one of the three plain instructions the year-end code already knows, so one reading of "shorter" is acted on, not two.
 *   - Where the transcriber was not sure of a phrase, one question goes back first and nothing changes until she answers. A guess is never put in her draft.
 *   - Words that are not about the draft are left alone (null), so the voice note carries on as any other would.
 */
import { writeItOnce } from '../year-end/the-year-end-log';
import { latestDraft } from '../year-end/the-year-end-versions';
import { isThisWhatYouSaid, isThisWhatYouSaidInTheMail, type AnUnclearPhrase } from '../voice/the-transcriber';
import { MONTHS } from '../year-end/the-year-end-content';
import { whoIsTheReader } from '../outstanding/a-delegate-acts-for-a-principal';
import type { TheChange } from '../year-end/the-year-end-versions';
import type { TheWorkReader } from './the-work-reader';

export const A_VOICE_CHANGE_NOT_MADE = 'Thank you. I have not changed the draft. Please type what you meant, or send the voice note again.';
export const NO_VOICE_CHANGE_WAITING = 'I am not waiting for an answer about a voice note, so I have not changed the draft.';
const DAY = 86_400_000;

/** The change, said as one of the instructions the year-end code understands. Her own words ride along only where they are hers (a month's note, a correction). */
export function saidAsAnInstruction(c: TheChange): string {
  if (c.kind === 'shorten') return 'Shorten this';
  if (c.kind === 'add_month') return `Add ${MONTHS[Number(c.month.slice(5)) - 1]}${c.text ? `: ${c.text}` : ''}`;
  return `This is wrong: ${c.text}`;
}

export interface TheDraftWords { handle(a: { organizationId: string; userId: string; message: string; channel: string; now?: Date }): Promise<string | null> }

/**
 * A voice note's words, from her or from the person who acts for her. Returns what to say back, or null when they are not a change to the draft (or there is
 * no draft), so the caller carries on as before.
 */
export async function hearAVoiceNote(prisma: any, yearEnd: TheDraftWords, reader: TheWorkReader, a: { organizationId: string; userId: string; text: string; unclear: AnUnclearPhrase[]; channel: 'whatsapp' | 'email'; fileName?: string; now: Date }): Promise<string | null> {
  const who = await whoIsTheReader(prisma, a.organizationId, a.userId, null);
  if (who.kind !== 'own' && who.kind !== 'delegate') return null;
  const year = a.now.getUTCFullYear();
  if (!(await latestDraft(prisma, { organizationId: a.organizationId, principalUserId: who.principalUserId, year }))) return null;
  const change = await reader.readARevision(a.text, year);
  if (!change) return null;
  const instruction = saidAsAnInstruction(change);
  if (a.unclear.length) {
    await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: who.principalUserId, kind: 'asked', subject: `voice:${a.userId}:${a.now.toISOString()}`, data: { instruction, byUserId: a.userId, channel: a.channel }, at: a.now });
    return a.channel === 'email' ? isThisWhatYouSaidInTheMail(a.fileName ?? 'your voice note', a.unclear) : isThisWhatYouSaid(a.unclear);
  }
  return yearEnd.handle({ organizationId: a.organizationId, userId: a.userId, message: instruction, channel: 'voice', now: a.now });
}

/** A voice change that is waiting for her yes, if she has one, for this person. Not older than a day. */
export async function aVoiceChangeWaiting(prisma: any, a: { principalUserId: string; userId: string; now: Date }): Promise<{ subject: string; instruction: string; channel: string; at: Date } | null> {
  const asked: any[] = (await prisma.yearEndLog.findMany({ where: { principalUserId: a.principalUserId, kind: 'asked', subject: { startsWith: `voice:${a.userId}:` } }, orderBy: { at: 'desc' } })) ?? [];
  for (const r of asked) {
    if (a.now.getTime() - new Date(r.at).getTime() > DAY) continue;
    if (!(await prisma.yearEndLog.findFirst({ where: { principalUserId: a.principalUserId, kind: 'told', subject: `answer:${r.subject}` } }))) return { subject: r.subject, instruction: r.data?.instruction, channel: r.data?.channel, at: new Date(r.at) };
  }
  return null;
}

/** Her yes makes the change she said; her no leaves the draft as it is. Either way the question is closed, once. */
export async function answerAVoiceCheck(prisma: any, yearEnd: TheDraftWords, a: { organizationId: string; principalUserId: string; userId: string; answer: 'yes' | 'no'; waiting: { subject: string; instruction: string; channel: string }; now: Date }): Promise<string | null> {
  const closed = await writeItOnce(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, kind: 'told', subject: `answer:${a.waiting.subject}`, detail: a.answer, at: a.now });
  if (!closed) return null;
  if (a.answer === 'no') return A_VOICE_CHANGE_NOT_MADE;
  return yearEnd.handle({ organizationId: a.organizationId, userId: a.userId, message: a.waiting.instruction, channel: 'voice', now: a.now });
}
