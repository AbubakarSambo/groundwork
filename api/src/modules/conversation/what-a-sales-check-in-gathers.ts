import { theReleaseOneSalesBoardIsOn } from '../board/release-one-sales-board';
import { isASalesKind, KINDS_THAT_ARE_NOT_WORK } from '../board/the-kind-of-work';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { theCriteriaOnRecord, theCriteriaAsked, isAPriceRange, ASKED_AS, THE_FOUR, type ACriterion } from '../board/a-deals-four-criteria';
import { isADispatchNotADeal } from '../board/each-deal-in-its-group';
import { aLineIsAbout } from '../board/a-deals-value-and-buying-date';
import { aLineNamesTheCustomer } from '../board/one-deal-per-customer';
import { theReferencesIn } from './a-typed-reference-backs-its-line';

/**
 * WHAT A SALES CHECK-IN GATHERS (Hafsah, 16 October 2026: "Get Drop Access right end to end").
 *
 * The prototype's sales board shows what a sales check-in must collect: every deal (the customer, its stage, its value, the
 * last contact, the next step and the proof), every lead, and who is doing what by when. The board, the reports and the
 * lead's morning summary are built only from what people say in their check-in, so the conversation is told what the board
 * needs. As knowledge of what to learn, not a script: the questions stay the model's own, and every other part of the
 * conversation (patterns, coaching, the role map, the probes and the hard limits) is left as it is.
 *
 * THE VERSION THAT RUNS. The words below are seeded as the prompt `kind_of_work.sales_org` (prompt-library's SEED_PROMPTS), so
 * the version stored in the database is the one that runs, and its id is handed back with the turn as `promptVersionId`.
 * A SALES TEAM SHARES IT (Release 1): "sales team" and "sales org" both run this one stored prompt, under this one key, because
 * the words are about a sales team's daily check-in either way. No second key is seeded, so no second copy can drift from it.
 *
 * ONLY THEIR OWN. The deals and leads listed back to the person are their own records only, never a colleague's.
 *
 * THE FOUR CRITERIA, ONLY WHAT IS MISSING, ASKED ONCE (Hafsah's answer to Needs Hafsah 7, 17 October; release plan, Part 0: "the
 * conversation stays as it is ... the one exception is what it gathers"). For each of their open deals, by name, the knowledge
 * block says which of the customer's need, the budget the customer stated, the decision maker and the buying date the record
 * holds, which are missing, and which were already asked in one of their check-ins and not answered. "Asked" is read from the
 * check-in's own turns (theCriteriaAsked), so a criterion asked and not answered is not asked again in a later session. It is
 * knowledge, never a script: the questions stay the model's own.
 */
export const SALES_CHECK_IN_GATHERS_KEY = 'kind_of_work.sales_org';

export const SALES_CHECK_IN_GATHERS_PROMPT = `WHAT A SALES CHECK-IN GATHERS

This is a sales team's daily check-in. The team's board, its reports and the lead's morning summary are built only from what people say here. So by the end of this check-in, the record should hold these things about every customer this person worked on since they last checked in:
- The customer: the business's name, and the person they dealt with there.
- Where it stands now, as one of these stages: Contacted (a named customer, and when and how they were reached), Need established (what the customer needs, in the customer's words), Pitched (the offer presented to the person who decides or the buyer, and at what price), Qualified (the customer's need, a budget the customer stated, who decides, and the day the customer will buy: all four), Quoted (a quote the customer received, with a photo of it or the email it was sent in), Won (a signed order or a payment, with the document that shows it).
- What it is worth: how many units, and the amount.
- The last contact: when they last spoke to the customer, and how.
- The next step: what happens next, who does it, and by when.
- The proof, where there is some: a signed order, a payment record, a photo of the quote, or the email it was sent in.
And for each open deal, the four things that qualify it: the customer's need in the customer's own words, the budget the customer stated (an amount, or a range as the customer said it), who decides (by name or by role), and the day the customer will buy. Only what is still missing: the list below says, for each of their open deals, which of the four are on record, which are missing, and which were already asked.
And every new lead: the business, the person, how they were reached, and what they want.
And who is doing what by when: each thing they said they will do, with its day.

HOW TO USE THIS. It is what to learn, not a list to read out. Ask about one customer at a time and one thing at a time, and only for what is still missing about that customer. Use the customer's name in your question, so the answer is about that customer. When a deal or lead in their list below has not come up today, ask what has happened with it since they last spoke about it. Ask for each missing one of the four once, by the deal's name, when it fits what they are telling you. Never ask for one that is on record, and never ask again for one that was already asked, even if it was not answered. When a deal is called won, or a quote is said to be sent, and the list below says no proof of it is on record and it was not asked for yet, ask once, plainly, by the deal's name, for the proof: for a won deal, the signed order or the payment record; for a quote, a photo of it or the email it was sent in. Ask for it once only: when it was asked before, or the proof is on record, do not ask again. Never say there is proof unless it was added, and never ask again for anything they have already given, today or before. When every customer they named today has its stage, its next step with a day, its value or a plain reason the value is not known yet, and, for an open deal, each of its four that the list says is missing and not asked yet has been asked once, and, for a deal called won or quoted, its proof is on record or has been asked for once, you have what you need, so finish.`;

/**
 * READ LAST, BESIDE THE TURN'S OWN QUESTION. The block above sits among many others and, on a person's first check-in, the goal
 * and role questions carried every turn: Kevin's first check-in never asked about a single customer until "What else should I
 * know?". A rule deep in a long prompt behaves like a suggestion, so one plain reminder is read last, in a sales check-in only.
 */
export const THE_SALES_REMINDER = 'THIS IS A SALES CHECK-IN. Before general questions about goals, plans or support, make sure the customers they worked on since they last checked in are on the record: ask which customers, by name, and for each one what is still missing of its stage, its value, its next step with a day, its proof where the list says it is missing and not asked yet, and, for an open deal, any of its four criteria the list says is missing and not asked yet. Before you finish, ask once for each of those that is still not asked, naming the deal. One question at a time, about one customer.';

export interface ADealOfTheirs { name: string; stage: string | null; fields?: unknown; updatedAt?: Date | string | null }

/** Their own deals and leads, as the record holds them, one line each. Nothing about anybody else. */
export function theirDealsAndLeads(rows: ADealOfTheirs[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of rows) {
    const name = (r.name ?? '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    const f = (r.fields && typeof r.fields === 'object' && !Array.isArray(r.fields) ? r.fields : {}) as Record<string, unknown>;
    const value = ['Value', 'Amount', 'Worth'].map((k) => f[k]).find((v) => typeof v === 'string' && v.trim()) as string | undefined;
    const next = typeof f['Next step'] === 'string' && (f['Next step'] as string).trim() ? (f['Next step'] as string).trim() : null;
    const when = r.updatedAt ? whenItWas(new Date(r.updatedAt), 'weekdayAndDay') : null;
    const bits = [
      r.stage ? `stage ${r.stage}` : 'no stage said yet',
      value ? `worth ${value}` : 'no value said yet',
      next ? `next step said: ${next.replace(/[.\s]+$/, '')}` : 'no next step said yet',
      when ? `last spoken about on ${when}` : '',
    ].filter(Boolean);
    lines.push(`- ${name}: ${bits.join(', ')}.`);
  }
  return lines.length
    ? `THEIR OWN DEALS AND LEADS SO FAR, from the record (only theirs):\n${lines.join('\n')}`
    : 'THEIR OWN DEALS AND LEADS SO FAR: none on record yet.';
}

/**
 * WHAT EACH OF THEIR OPEN DEALS STILL NEEDS, from the record: for each deal not yet won, which of the four criteria are on record,
 * which are missing and not asked yet, and which were asked in one of their check-ins and not answered (so not to be asked again).
 * `turns` are Groundwork's own turns in this person's check-ins in this check-in, oldest first.
 */
export function whatEachOpenDealStillNeeds(rows: ADealOfTheirs[], turns: readonly { content: string; createdAt: Date | string }[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of rows) {
    const name = (r.name ?? '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    if (/^won$/i.test(String(r.stage ?? '').trim()) || isADispatchNotADeal({ name, said: '' } as any)) continue;
    const f = (r.fields && typeof r.fields === 'object' && !Array.isArray(r.fields) ? r.fields : {}) as Record<string, string>;
    const c = theCriteriaOnRecord(f);
    const asked = theCriteriaAsked(turns, { name, fields: f });
    const on = THE_FOUR.filter((k) => c[k]);
    const missing = THE_FOUR.filter((k) => !c[k]);
    const notAskedYet = missing.filter((k) => !asked.has(k));
    const askedBefore = missing.filter((k) => asked.has(k));
    const onRecord = (k: ACriterion) => (k === 'budget' && isAPriceRange(c.budget) ? `${ASKED_AS[k]} ("${c[k]}", a range)` : k === 'buying date' ? `${ASKED_AS[k]} (${c[k]})` : `${ASKED_AS[k]} ("${c[k]}")`);
    if (!missing.length) { lines.push(`- ${name}. All four are on record, so ask for none of them: ${on.map(onRecord).join('; ')}.`); continue; }
    const bits = [
      on.length ? `On record, so not to be asked: ${on.map(onRecord).join('; ')}.` : 'None of the four is on record yet.',
      notAskedYet.length ? `Missing, not asked yet, so ask each once: ${notAskedYet.map((k) => ASKED_AS[k]).join('; ')}.` : '',
      askedBefore.length ? `Asked before and not answered, so do not ask again: ${askedBefore.map((k) => `${ASKED_AS[k]} (asked on ${whenItWas(asked.get(k)!, 'weekdayAndDay')})`).join('; ')}.` : '',
    ].filter(Boolean);
    lines.push(`- ${name}. ${bits.join(' ')}`);
  }
  return lines.length
    ? `WHAT EACH OF THEIR OPEN DEALS STILL NEEDS TO BE QUALIFIED, from the record (only theirs):\n${lines.join('\n')}`
    : '';
}

/*
 * PROOF, ASKED FOR ONCE (Drop Access run 1, item 32; engine value "proof asked for"). In ten days nobody was asked for a proof:
 * all five documents were added because the person chose to. The prompt said "ask once, plainly, for the proof", but the list of
 * their deals said nothing about proof, and a won deal was left out of it altogether. Now each deal they called won or quoted is
 * listed with whether its proof is on record and whether it was already asked for, read from the check-in's own turns, so it is
 * asked for once, by the deal's name, and never again. As knowledge, never a script.
 */
const ASKS_FOR_PROOF = /\b(?:proof|photo|picture|screenshot|copy|receipt|m-?pesa|payment (?:record|message|slip|confirmation)|bank slip|remittance|signed order|purchase order|the email it was sent|attach|send (?:it|me|us|a|the))\b/i;
/** The words a proof says, so it can be matched to the deal it is about: its file name, what was said of it and what it reads. */
export interface AProofOfTheirs { fileName?: string | null; uploaderNote?: string | null; content?: string | null }
const proofWords = (d: AProofOfTheirs) => `${d.fileName ?? ''} ${d.uploaderNote ?? ''} ${(d.content ?? '').slice(0, 2000)}`.replace(/[-_]+/g, ' ');
const isWon = (stage: string | null | undefined) => /^won$/i.test(String(stage ?? '').trim());
const isQuoted = (stage: string | null | undefined) => /^quoted$/i.test(String(stage ?? '').trim());

/** The day a Groundwork turn first asked for this deal's proof, or null. */
export function theProofAskedFor(turns: readonly { content: string; createdAt: Date | string }[], deal: { name: string; fields?: Record<string, string> | null }): Date | null {
  let first: Date | null = null;
  for (const t of turns) {
    const text = String(t.content ?? '');
    if (!text.includes('?') && !/\b(?:please send|send it|attach it)\b/i.test(text)) continue;
    if (!aLineIsAbout(text, deal) && !aLineNamesTheCustomer(text, deal.name)) continue;
    const asks = [...(text.match(/[^.!?\n]*\?/g) ?? []), ...(text.match(/[^.!?\n]*\b(?:please send|send it|attach it)\b[^.!?\n]*[.!]?/gi) ?? [])].join(' ');
    if (!ASKS_FOR_PROOF.test(asks)) continue;
    const at = new Date(t.createdAt);
    if (!first || at < first) first = at;
  }
  return first;
}

/**
 * For each of their deals called won or quoted: whether its proof is on record (a document of theirs, or a payment reference they
 * typed in full, that names the customer), and, where not, whether it was asked for already.
 */
export function theProofEachDealStillNeeds(
  rows: ADealOfTheirs[],
  turns: readonly { content: string; createdAt: Date | string }[],
  proofs: readonly AProofOfTheirs[],
  theirLines: readonly string[] = [],
): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const r of rows) {
    const name = (r.name ?? '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    if (!isWon(r.stage) && !isQuoted(r.stage)) continue;
    const f = (r.fields && typeof r.fields === 'object' && !Array.isArray(r.fields) ? r.fields : {}) as Record<string, string>;
    const deal = { name, fields: f };
    const said = isWon(r.stage) ? 'called won' : 'called quoted';
    const shown = proofs.filter((d) => aLineNamesTheCustomer(proofWords(d), name) || aLineIsAbout(proofWords(d), deal));
    const typed = theirLines.filter((l) => theReferencesIn(l).length && (aLineNamesTheCustomer(l, name) || aLineIsAbout(l, deal)));
    if (shown.length || typed.length) {
      const what = shown.length ? shown.map((d) => `"${d.fileName ?? 'a document'}"`).join(', ') : 'a payment reference they typed';
      lines.push(`- ${name} (${said}). Its proof is on record: ${what}. Do not ask for it.`);
      continue;
    }
    const asked = theProofAskedFor(turns, deal);
    if (asked) { lines.push(`- ${name} (${said}). No proof on record. It was asked for on ${whenItWas(asked, 'weekdayAndDay')}, so do not ask again.`); continue; }
    const which = isWon(r.stage) ? 'the signed order or the payment record' : 'a photo of the quote or the email it was sent in';
    lines.push(`- ${name} (${said}). No proof on record, and not asked for yet, so ask once, by name: ${which}.`);
  }
  return lines.length ? `THE PROOF OF THEIR DEALS CALLED WON OR QUOTED, from the record (only theirs):\n${lines.join('\n')}` : '';
}

interface Deps {
  prisma: any;
  prompts?: { getActive?: (key: string) => Promise<{ id: string; content: string } | null> } | null;
}

async function attempt<T>(read: () => Promise<T> | T, otherwise: T): Promise<T> {
  try { const v = await read(); return v === undefined ? otherwise : v; } catch { return otherwise; }
}

/**
 * THE BLOCK FOR THIS TURN, and the stored version it came from. Empty unless the check-in's kind of work is a sales kind, Release
 * 1's sales board is on for its organisation, and the person checking in is not the lead (the lead's own check-in sets the check-in up). The stored version runs; the code's text is
 * used only where no version is stored, and then the id is null.
 */
export async function whatThisSalesCheckInGathers(
  deps: Deps,
  checkIn: { groundId: string; participantId?: string | null; participant?: { id?: string; partyType?: string | null } | null },
): Promise<{ block: string; promptVersionId: string | null; last: string }> {
  const none = { block: '', promptVersionId: null, last: '' };
  const participantId = checkIn.participantId ?? checkIn.participant?.id ?? null;
  if (!participantId) return none;
  const ground = await attempt(() => deps.prisma.ground?.findUnique?.({ where: { id: checkIn.groundId }, select: { kindOfWork: true, organizationId: true } }), null);
  if (!isASalesKind(ground?.kindOfWork)) return none;
  /* What a person is asked changes, so only where Release 1's sales board is on for the organisation (release-one-sales-board). Off,
     a sales check-in is asked exactly as before, and the stored prompt kind_of_work.sales_org is never read. */
  if (!(await theReleaseOneSalesBoardIsOn(deps.prisma, ground?.organizationId ?? null).catch(() => false))) return none;
  const party = checkIn.participant?.partyType
    ?? (await attempt(() => deps.prisma.groundParticipant?.findUnique?.({ where: { id: participantId }, select: { partyType: true } }), null))?.partyType;
  if (party === 'INITIATOR') return none;
  const stored = await attempt(() => deps.prompts?.getActive?.(SALES_CHECK_IN_GATHERS_KEY) ?? null, null);
  const version = stored?.content?.trim() ? { content: stored.content, id: stored.id ?? null } : { content: SALES_CHECK_IN_GATHERS_PROMPT, id: null };
  const rows = ((await attempt(() => deps.prisma.workItem?.findMany?.({
    where: { groundId: checkIn.groundId, ownerParticipantId: participantId, kind: { notIn: KINDS_THAT_ARE_NOT_WORK } },
    select: { name: true, stage: true, fields: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 25,
  }), [])) ?? []) as ADealOfTheirs[];
  /* Groundwork's own turns in this person's check-ins here, so a criterion asked and not answered is not asked again. */
  const theirCheckIns = ((await attempt(() => deps.prisma.checkIn?.findMany?.({ where: { groundId: checkIn.groundId, participantId }, select: { id: true } }), [])) ?? []) as { id: string }[];
  const turns = theirCheckIns.length
    ? (((await attempt(() => deps.prisma.conversationTurn?.findMany?.({
      where: { checkInId: { in: theirCheckIns.map((c) => c.id) }, role: 'AI' },
      select: { content: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }), [])) ?? []) as { content: string; createdAt: Date }[])
    : [];
  const stillNeeds = whatEachOpenDealStillNeeds(rows, turns);
  /* Their own documents on this check-in, and the lines they said, for the proof of each deal called won or quoted (item 32). */
  const proofs = ((await attempt(() => deps.prisma.groundDocument?.findMany?.({
    where: { groundId: checkIn.groundId, participantId, isConversation: false },
    select: { fileName: true, uploaderNote: true, content: true },
  }), [])) ?? []) as AProofOfTheirs[];
  const theirLines = theirCheckIns.length
    ? (((await attempt(() => deps.prisma.conversationTurn?.findMany?.({
      where: { checkInId: { in: theirCheckIns.map((c) => c.id) }, role: 'PERSON' },
      select: { content: true },
    }), [])) ?? []) as { content: string }[]).map((t) => t.content ?? '')
    : [];
  const proofNeeds = theProofEachDealStillNeeds(rows, turns, proofs, theirLines);
  return { block: [version.content, theirDealsAndLeads(rows), stillNeeds, proofNeeds].filter(Boolean).join('\n\n'), promptVersionId: version.id, last: THE_SALES_REMINDER };
}
