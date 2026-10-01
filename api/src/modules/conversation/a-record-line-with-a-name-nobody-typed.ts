/**
 * "AMINA SET UP THE CLIENT MEETINGS I AM STILL ATTENDING." SHE SAID "HE DID. HE SET THEM UP."
 *
 * Read in the 1 October review, the senior-hire scenario. The lead was asked who arranged the client
 * meetings she is still attending and answered "He did. He set them up." The record reader wrote that
 * up as "Amina set up the client meetings I am still attending." - putting the lead's OWN first name on
 * the hire's work, in a line that sits in her list of what she said, in the first person ("I am still
 * attending"). Not her words, and the opposite of what she meant.
 *
 * THE STAMP WAS NOT THE FAULT. saidWordForWord was false for that line (the test below proves it, from the
 * live line and the live answers). The line was stored anyway, because the check that lets an extracted
 * line through (a-record-is-what-they-said) asks whether it shares words with what the person said, and
 * "set", "up", "client" and "meetings" are theirs. A NAME is the one thing that line changed that the
 * check never asked about.
 *
 * THE RULE. A line that carries a name the person never typed is not stored. It is better to hold no line
 * about who arranged the meetings than one that names the wrong person. This is the same test the reply
 * gate already uses for names (namesWorthReporting), applied at the other door.
 */

import { namesWorthReporting } from './the-record-holds-what-was-said';

/** The reader's own commentary is not the person's and carries names of its own. */
const THE_READERS_BRACKETS = /\[(?:inferred|verifiability)[^\]]*\]/gi;

const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The names in a line that this person never typed. `roster` is everybody in the check-in by name: the
 * names the reader is most likely to swap in, and the ones a sentence-opening capital would otherwise hide
 * ("Amina set up..." opens with its capital by grammar, so the reply gate's rule never reads it as a name).
 */
export function aNameNobodyTyped(line: string, whatTheyTyped: string, roster: string[] = []): string[] {
  const text = (line ?? '').replace(THE_READERS_BRACKETS, ' ');
  const typed = (whatTheyTyped ?? '').toLowerCase();
  const out = new Set(namesWorthReporting(text, [whatTheyTyped]));
  for (const name of roster.flatMap((n) => (n ?? '').split(/\s+/)).map((n) => n.trim()).filter((n) => n.length >= 3)) {
    if (new RegExp(`\\b${escape(name)}\\b`).test(text) && !typed.includes(name.toLowerCase())) out.add(name);
  }
  return [...out];
}
