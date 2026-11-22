import { Injectable } from '@nestjs/common';
import { AnthropicService } from '../conversation/anthropic.service';

/**
 * WHERE A VOICE NOTE BECOMES WORDS, SWAPPABLE.
 *
 * The model stays Gemini: the default reads the audio through the same client the documents module uses for
 * photos and scanned PDFs (AnthropicService.respondWithMedia). It sits behind this small interface so a test,
 * or the local recorder, can hand back a fixed transcript with no network. Every door that receives audio
 * (WhatsApp, a forwarded email) asks here and nowhere else.
 */

export interface AnAudioFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  /** The names this organisation uses, spelled as it spells them (D16: "Dangote" was heard as "Dango"). Given to the transcriber as how to spell, never as words that were said. */
  names?: string[];
}

/**
 * THE NAMES THE TRANSCRIBER IS GIVEN (Batch D, R7, D16). The organisation's own name, the names of the people on its roster and the payees on its payment sheets, so a name said in a voice
 * note is written the way the organisation writes it. One reader for every door that receives audio.
 */
export async function theNamesThisOrganisationUses(prisma: any, organizationId: string | null | undefined): Promise<string[]> {
  if (!organizationId) return [];
  const org: any = await Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: organizationId }, select: { name: true } })).catch(() => null);
  const people: any[] = (await Promise.resolve(prisma?.person?.findMany?.({ where: { organizationId }, select: { displayName: true, givenName: true, familyName: true }, take: 300 })).catch(() => [])) ?? [];
  /* The payees on the office's payment sheets are names it uses too (Dangote rerun, N4: "Orchid Events" was heard as "Oked Events"). */
  const payees: any[] = (await Promise.resolve(prisma?.paymentTrackerLine?.findMany?.({ where: { organizationId }, select: { payee: true }, distinct: ['payee'], take: 200 })).catch(() => [])) ?? [];
  const names = [String(org?.name ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim(), ...people.map((p) => String(p.displayName || [p.givenName, p.familyName].filter(Boolean).join(' ')).trim()), ...payees.map((p) => String(p.payee ?? '').trim())];
  return [...new Set(names.filter((n) => n && n.length <= 80))].slice(0, 300);
}

/** The instructions, with the names to spell by when there are any. */
export function whatToDoWith(names: string[] | undefined): string {
  return names?.length
    ? `${SAYS_WHAT_TO_DO} These are names the speaker's organisation uses, spelled the way it spells them. When you hear one of them, write it exactly so, and do not list it as unclear for its spelling. They are a spelling list only, not words that were said: ${names.join('; ')}.`
    : SAYS_WHAT_TO_DO;
}

/** A stretch the transcriber was not sure it heard right, with its best guess where it has one. */
export interface AnUnclearPhrase {
  heard: string;
}

export type ATranscription =
  | { ok: true; text: string; unclear: AnUnclearPhrase[] }
  | { ok: false };

export interface Transcriber {
  /** Never throws: a failure is `{ ok: false }`, so the caller can say so plainly. */
  transcribe(audio: AnAudioFile): Promise<ATranscription>;
}

export const TRANSCRIBER = 'TRANSCRIBER';

const AT_MOST_UNCLEAR = 3;

const SAYS_WHAT_TO_DO =
  'You are writing down a voice note somebody sent to their work assistant. Write exactly what the speaker said, in the language they spoke, ' +
  'with ordinary punctuation. Do not summarise, translate, correct or add anything. ' +
  'If a name, a number, a date or a phrase was hard to hear and you are guessing, list your guess under "unclear", copied as it appears in your text. ' +
  'If you cannot hear any speech, return an empty "text". Answer with JSON only, in this shape: {"text": "...", "unclear": ["..."]}';

/** Reads the model's answer, which may come wrapped in a code fence. Anything that is not the shape asked for is a failure. */
export function readATranscription(raw: string): ATranscription {
  const cleaned = String(raw ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    const text = typeof parsed?.text === 'string' ? parsed.text.trim() : '';
    if (!text) return { ok: false };
    const unclear = (Array.isArray(parsed?.unclear) ? parsed.unclear : [])
      .filter((u: unknown) => typeof u === 'string' && u.trim() && text.includes(u.trim()))
      .slice(0, AT_MOST_UNCLEAR)
      .map((u: string) => ({ heard: u.trim() }));
    return { ok: true, text, unclear };
  } catch {
    return { ok: false };
  }
}

@Injectable()
export class GeminiTranscriber implements Transcriber {
  constructor(private readonly anthropic: AnthropicService) {}

  async transcribe(audio: AnAudioFile): Promise<ATranscription> {
    try {
      const raw = await this.anthropic.respondWithMedia(whatToDoWith(audio.names), 'Write down this voice note.', { mimeType: audio.mimeType.split(';')[0], base64: audio.buffer.toString('base64') });
      return readATranscription(raw);
    } catch {
      return { ok: false };
    }
  }
}

/** Audio by its type, or by its name where a mail program sent it as a plain binary. */
export function isAudio(mimeType: string | null | undefined, fileName?: string | null): boolean {
  if (/^audio\//i.test(mimeType ?? '')) return true;
  return /\.(?:m4a|mp3|ogg|oga|opus|wav|aac|amr|flac|webm)$/i.test(fileName ?? '') && !/^video\//i.test(mimeType ?? '');
}

/* ---- What a person reads. Plain, full sentences. ---- */

export const COULD_NOT_FETCH_THE_VOICE_NOTE = 'I could not fetch that voice note from WhatsApp. Please send it again, or type what you wanted to say.';
export const COULD_NOT_HEAR_THE_VOICE_NOTE = 'I could not make out that voice note. Please send it again, or type what you wanted to say.';

/** One short question, never a guess put into their record. */
export function isThisWhatYouSaid(unclear: AnUnclearPhrase[]): string {
  return `I think you said "${unclear[0].heard}", but I am not sure I heard it right. Is that right? Reply yes, or type what you meant.`;
}

export function theVoiceNoteInTheMail(fileName: string): string {
  return `I could not make out the voice note ${fileName}. Please send it again, or type what it says.`;
}

/**
 * The same question for a voice note that came in a mail or a forward, and for one that was sent on WhatsApp but is read later with the rest. It names no
 * file (nobody knows a name like "audio-wamid.in.1794350176655.2.ogg"), and says "reply here", which is right on either channel (round 1, I-06).
 */
export function isThisWhatYouSaidInTheMail(_fileName: string, unclear: AnUnclearPhrase[]): string {
  return `In your voice note, I think you said "${unclear[0].heard}", but I am not sure I heard it right. Is that right? Reply here and tell me, or tell me what you meant.`;
}

/** Everything a voice note left unsure, said once: one question for the whole note, however many words were in doubt. */
export function theWordsInDoubt(heard: string[]): string {
  const quoted = heard.map((h) => `“${h}”`);
  if (quoted.length === 1) return `In your voice note, I think you said ${quoted[0]}, but I am not sure I heard it right. Is that right? Reply here and tell me, or tell me what you meant.`;
  const list = `${quoted.slice(0, -1).join(', ')} and ${quoted[quoted.length - 1]}`;
  return `In your voice note, I was not sure I heard these words right, ${list}. Are they right? Reply here and tell me, or tell me what you meant.`;
}
