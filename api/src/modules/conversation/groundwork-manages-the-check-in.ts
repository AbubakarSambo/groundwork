import { intoSentences } from './nothing-invented-reaches-them';
import { aQuestionNotYetAsked, WHAT_ELSE } from './nobody-is-left-looking-at-a-paragraph';
import { aClaimIn, aSentenceNames } from '../board/the-persons-record';
import type { ThePersonsRecord, ACoaching } from '../board/the-persons-record';
import { readThePersonsRecord } from '../board/the-persons-record-store';

/**
 * INSIDE THE CHECK-IN, GROUNDWORK MANAGES (Groundwork does the managing, part 1; Hafsah, 21 October 2026). Behind the direct morning
 * (organisation/the-direct-morning-switch.ts); the coaching line also behind the person's judgements switch (person-judgements.ts).
 *
 * The conversation stays model-led: the model is given the facts from the person's own record (board/the-persons-record.ts, as it was
 * last built) and the duty, and it decides what to ask and when. Nothing here is a sentence sent to them. The facts are:
 *  - WHAT IS LATE: their own promises past the day they were due, with the day, to chase.
 *  - WHAT THEY SAID AND NOTHING SHOWS: each time they said something was sold, paid or signed and nothing is on file, and whether
 *    Groundwork has asked them for what would show it already. Asked once per claim, never again (the M-Pesa rule of #388 stays: a code in
 *    words counts as proof of payment, and its screenshot is asked for once, in an-mpesa-code-is-asked-about-once).
 *  - A FIGURE THAT CHANGED: a figure they gave for one customer that changed since last time (#389's figures per customer), to put side
 *    by side, plainly, never accusing.
 *  - ONE LINE OF COACHING on their own pattern, where it fits, never a lecture.
 *
 * And one check on what is sent (`withProofAskedOnce`): a sentence that asks again for what would show a claim Groundwork has already
 * asked about, with no new claim about it since, is not sent.
 */

export interface WhatTheyHaveSaidHere { text: string; at: Date | string; checkInId?: string | null }

const quote = (s: string) => `"${String(s ?? '').trim().replace(/^["“]|["”]$/g, '')}"`;

/** The block the model reads. Empty where there is nothing to manage. */
export function whatGroundworkManagesHere(
  r: ThePersonsRecord | null,
  coaching: readonly ACoaching[],
  opts: { coach: boolean },
): string {
  if (!r) return '';
  const late = r.promises.filter((p) => p.outcome === 'late');
  const unproven = r.claims.filter((c) => !c.proven && !c.takenBack);
  const changed = r.changes.filter((c) => c.what === 'units' && !c.putRight);
  const open = opts.coach ? coaching.find((c) => !c.done) ?? null : null;
  const parts: string[] = [];
  if (late.length) {
    parts.push([
      'WHAT IS LATE. Their own promises, past the day they were due. Ask what happened to one of them, and say the day it was due, in their own words. Once each in this check-in.',
      ...late.slice(-3).map((p) => `  - ${quote(p.said)} was due on ${p.dueOn}, and nothing they have said since shows it done.`),
    ].join('\n'));
  }
  if (unproven.length) {
    parts.push([
      'WHAT THEY SAID AND NOTHING SHOWS. Each time they said something was sold, paid or signed, and nothing on file shows it. Where it has not been asked for yet, ask once, plainly, for what would show it: the slip, the bank statement, the M-Pesa message or the signed order. Where it was asked for already, never ask for it again. Never call what they said doubtful.',
      ...unproven.slice(-4).map((c) => `  - On ${c.on} they said ${quote(c.said)} Nothing on file shows it.${c.askedForProof ? ' It was asked for already: do not ask for it again.' : ' It has not been asked for yet.'}`),
    ].join('\n'));
  }
  if (changed.length) {
    parts.push([
      'A FIGURE THAT CHANGED. Put the two figures side by side, plainly and without accusing, and ask which stands now and what shows it. For example: "On Monday you said 10 units for Mama Pima Stores, and on Tuesday 15. Which is it now, and what shows it?" Once for each, and never where it was asked about already.',
      ...changed.slice(-2).map((c) => `  - ${c.about}: ${c.from} units on ${c.fromOn}, then ${c.to} units on ${c.toOn}.${c.askedAbout ? ' It was asked about already: do not ask again.' : ' It has not been asked about yet.'}`),
    ].join('\n'));
  }
  if (!parts.length && !open) return '';
  return [
    'GROUNDWORK MANAGES THIS PERSON\'S WORK HERE. These are facts from their own record, kept from what they said and what is on file. Use one where it fits what they are telling you. Never read them out as a list, never more than one in a turn, and never as an accusation. Their own words may be quoted to them.',
    ...parts,
    'WHEN THEY SAY IN THIS CHECK-IN that something was sold, paid or signed, and nothing they sent or typed shows it, ask once, plainly, what would show it. An M-Pesa code they type counts as proof of payment: never question it.',
    ...(open ? [`ONE LINE OF COACHING, from their own pattern. Say it at most once in this check-in, in one short sentence, only after they say something it fits, and never as a lecture. The line is ${quote(open.said)}${open.outcome ? ` It was first given after their check-in on ${open.givenOn}, and since then it has ${open.outcome === 'better' ? 'got better' : open.outcome === 'worse' ? 'got worse' : 'stayed the same'}.` : ''}`] : []),
  ].join('\n\n');
}

/** Sentences, without breaking after "Mr." or "Mrs.": "Mr. Baraka was so clear that it was paid." is one sentence about Mr. Baraka. */
const TITLE = /\b(Mr|Mrs|Ms|Dr|Prof|St)\./g;
export const theSentencesOf = (text: string) => intoSentences(String(text ?? '').replace(TITLE, '$1\u2024')).map((x) => x.replace(/\u2024/g, '.'));

/* A sentence that asks for what would show something. */
const ASKS_FOR_PROOF = /\b(?:slip|receipt|statement|screenshot|screen shot|proof|signed order|signed purchase order|document|photo|m-?pesa (?:message|confirmation)|confirmation|what (?:would )?shows? it|evidence)\b/i;
const ASKS = /\?|\b(?:send|add|share|forward|upload|attach)\b/i;

/**
 * THE REPLY, WITHOUT A SECOND ASK FOR WHAT WOULD SHOW A CLAIM (once per claim). A sentence asking for proof of something named in it is
 * cut where Groundwork already asked for proof of it after the latest time they said it was sold, paid or signed. A new claim about it
 * may be asked about once again.
 */
export function withProofAskedOnce(
  reply: string,
  /** Each item's names, together: ["FN-006", "Baraka Hardware"] is one. */
  items: readonly (string | readonly string[])[],
  theirWords: readonly WhatTheyHaveSaidHere[],
  ourTurns: readonly { content: string; at: Date | string; checkInId?: string | null }[],
  alreadyAsked: string[] = [],
): { text: string; cut: string[] } {
  const groups = items.map((x) => (typeof x === 'string' ? [x] : [...x])).filter((g) => g.length);
  if (!reply || !groups.length) return { text: reply, cut: [] };
  const says = (s: string, n: string) => aSentenceNames(s, n);
  /* The items a sentence names, each as its group of names. */
  const named = (s: string) => groups.filter((g) => g.some((n) => says(s, n)));
  const ms = (d: Date | string) => new Date(d).getTime();
  /* Each claim about it, and each time we asked for what would show it. */
  const claims = (g: string[]) => theirWords.filter((w) => theSentencesOf(w.text).some((s) => aClaimIn(s) && named(s).includes(g)));
  const asks = (g: string[]) => ourTurns
    .filter((o) => theSentencesOf(String(o.content ?? '')).some((s) => ASKS.test(s) && ASKS_FOR_PROOF.test(s) && named(s).includes(g)))
    .sort((a, b) => ms(a.at) - ms(b.at));
  /* Asked about already, and nothing new said of it since in a later check-in: said again in the same check-in is the same claim. */
  const askedAlready = (g: string[]) => {
    const asked = asks(g);
    const last = asked[asked.length - 1];
    if (!last) return false;
    const cs = claims(g);
    if (!cs.some((c) => ms(c.at) < ms(last.at))) return false;
    return !cs.some((c) => ms(c.at) > ms(last.at) && (!c.checkInId || !last.checkInId || c.checkInId !== last.checkInId));
  };
  const cut: string[] = [];
  const kept = intoSentences(reply).filter((s) => {
    const t = s.replace(/"[^"\n]*"|“[^”]*”/g, ' ');
    if (!ASKS.test(t) || !ASKS_FOR_PROOF.test(t)) return true;
    const about = named(t);
    if (!about.length) return true;
    const goes = about.every(askedAlready);
    if (goes) cut.push(s.trim());
    return !goes;
  });
  if (!cut.length) return { text: reply, cut };
  let text = kept.join('').replace(/[ \t]{2,}/g, ' ').trim();
  if (cut.some((c) => /\?\s*$/.test(c)) && !/\?/.test(text)) text = `${text ? `${text} ` : ''}${aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE}`;
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}

/* Never a label on a person in what is sent: "you are at risk", "a poor performer", a performance improvement plan. */
const A_LABEL_ON_THEM = /\b(?:you(?:['’]re| are)\s+(?:now\s+)?(?:at risk|underperforming|on a pip|on (?:a )?performance improvement plan|a (?:low|poor|weak|bad) performer)|performance improvement plan|\bPIP\b)\b/i;

/** The reply, without a sentence that puts a label on the person. */
export function withNoLabelOnThem(reply: string, alreadyAsked: string[] = []): { text: string; cut: string[] } {
  if (!reply) return { text: reply, cut: [] };
  const cut: string[] = [];
  const kept = intoSentences(reply).filter((s) => {
    const goes = A_LABEL_ON_THEM.test(s.replace(/"[^"\n]*"|“[^”]*”/g, ' '));
    if (goes) cut.push(s.trim());
    return !goes;
  });
  if (!cut.length) return { text: reply, cut };
  let text = kept.join('').replace(/[ \t]{2,}/g, ' ').trim();
  if (cut.some((c) => /\?\s*$/.test(c)) && !/\?/.test(text)) text = `${text ? `${text} ` : ''}${aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE}`;
  return { text: text || (aQuestionNotYetAsked(WHAT_ELSE, alreadyAsked) ?? WHAT_ELSE), cut };
}

/**
 * THE BLOCK FOR ONE TURN OF ONE CHECK-IN, as the conversation asks for it: only where the direct morning is on for the check-in's
 * organisation, from the person's record as it was last built, with the coaching line only where `coach` (judgements of a person on).
 * Off, nothing: the prompt is byte for byte what it was.
 */
export async function theManagingBlockFor(prisma: any, checkIn: { groundId: string; participantId: string }, coach: boolean): Promise<string> {
  const stored = await readThePersonsRecord(prisma, checkIn.participantId).catch(() => null);
  return whatGroundworkManagesHere(stored?.record ?? null, stored?.coaching ?? [], { coach });
}

/**
 * WHAT IS SENT, CHECKED, as every saved turn comes through: what would show a claim asked for once only, and no label on the person.
 * Only where the direct morning is on; off, the turn is returned exactly as written.
 */
export async function theTurnManaged(prisma: any, checkIn: { id?: string; groundId?: string; participantId?: string }, raw: string, alreadyAsked: string[] = []): Promise<{ text: string; cut: string[] }> {
  if (!raw || !checkIn?.participantId || !checkIn?.groundId) return { text: raw, cut: [] };
  const cut: string[] = [];
  let text = raw;
  const stored = await readThePersonsRecord(prisma, checkIn.participantId).catch(() => null);
  const seen = new Set<string>();
  const names = (stored?.record?.claims ?? []).filter((c) => !!c.about && !seen.has(c.about) && !!seen.add(c.about)).map((c) => [c.about as string, ...(c.aboutAlso ?? [])]);
  if (names.length && ASKS.test(text) && ASKS_FOR_PROOF.test(text)) {
    const turns: any[] = await Promise.resolve(prisma?.conversationTurn?.findMany?.({ where: { checkIn: { participantId: checkIn.participantId } }, select: { role: true, content: true, createdAt: true, checkInId: true }, orderBy: { createdAt: 'asc' }, take: 2000 })).catch(() => []);
    const rows = Array.isArray(turns) ? turns : [];
    const once = withProofAskedOnce(
      text, names,
      rows.filter((t) => String(t.role) === 'PERSON').map((t) => ({ text: String(t.content ?? ''), at: t.createdAt, checkInId: t.checkInId ?? null })),
      rows.filter((t) => String(t.role) === 'AI').map((t) => ({ content: String(t.content ?? ''), at: t.createdAt, checkInId: t.checkInId ?? null })),
      alreadyAsked,
    );
    cut.push(...once.cut);
    text = once.text;
  }
  const label = withNoLabelOnThem(text, alreadyAsked);
  cut.push(...label.cut);
  return { text: label.text, cut };
}
