/**
 * A QUESTION IS ANSWERED, FROM THE DOCUMENTS, TO THE PERSON WHO ASKED (pilots, 13 October 2026, problem 1).
 *
 * Njeri asked "When is the Kamau defence due?" and Grace asked "What's the price of 40 units?", and Ask offered
 * each question back as a line for everybody in the check-in: "Shall I add 'What's the price of 40 units?' to this
 * check-in's context as a note? Everybody in this check-in will read it." A question is not a line. It is asked of
 * Groundwork, and the answer is the asker's alone (questions to Ask Groundwork are private, always).
 *
 * WHAT IS READ. Only the documents this person may open, by the one rule every document read uses
 * (documentWhereFor): on the check-in they asked about, or on every check-in they are in when they asked from
 * Today or the Chat page.
 *
 * WHAT IS SAID. The model finds the answer; the product checks it. Every figure in the answer has to be in one of
 * those documents, written the same way, so a number and its unit reach the person exactly as the document wrote
 * them ("KES 12,400", "16%", "KES 466,450.00"). An answer that carries a figure no document holds is not said.
 */
import { documentWhereFor } from '../documents/who-can-see-a-document';
import { aDaySaidInFull } from '../board/a-day-said-in-full';
import { theFactsOnRecord, aFactAsALine, type TheReader } from '../conversation/the-facts-on-record';
import { thePersonJudgementsAreOn, NOT_SHOWN_IN_THIS_ORGANISATION } from '../organisation/person-judgements';
import { isASalesKind } from '../board/the-kind-of-work';
import { theDealsOnRecord, theAimsTheDealsCount, theSalesStages, theSalesAnswer, theUnitsOf, theMoneyOf, whatWasSold, type ADealOnRecord } from '../board/a-sales-aim-is-counted-from-the-deals';
import { aDepositSaid } from '../board/a-deals-proof-is-about-that-deal';
import { aNumberPeopleCanRead } from '../board/an-aim-is-a-sentence-about-somebody';

/** Whether a message asks something, rather than tells something. Read by its shape, never by a model. */
const STARTS_A_QUESTION = /^\s*(?:(?:and|so|but|also|please|ok|okay)[\s,]+)?(?:what|what's|whats|when|where|which|who|whom|whose|why|how|is|are|was|were|does|do|did|can|could|will|would|should|has|have|according to|tell me|do you know)\b/i;

export function isAQuestion(message: string): boolean {
  const m = String(message ?? '').trim();
  if (!m || m.length > 600) return false;
  /* "Ask Brian when he files" is a question for a person, and has its own door. */
  if (/^\s*ask\s+\w+/i.test(m)) return false;
  return /\?\s*$/.test(m) || STARTS_A_QUESTION.test(m);
}

export const ANSWER_FROM_THE_DOCUMENTS_PROMPT = `You answer one question for one person, using only the documents given below.

Rules:
- Answer only from the documents. If they do not say, set found to false and leave answer empty.
- Copy every number exactly as the document writes it, with its currency, unit or percent sign: write "KES 12,400", never "12400" or "12,400 shillings".
- Where the answer needs a sum the document does not state, show it from the document's own figures, for example "40 units are in the 30 to 99 band, at KES 12,400 a unit, so 40 units cost KES 496,000."
- Say which document the answer comes from, by its file name. When it comes from "the record of" a check-in, say "on the record" instead, and name the day it was said.
- In "the record of" a check-in, a line marked "their word" is what the person said, with nothing to show it yet; say so plainly. A line marked "proven by a document", "proven by the M-Pesa code they typed", "proven by a reference they typed" or "confirmed by a colleague" has its proof. Name people by their names.
- For what is sold, how much of it has proof of payment, and how far a sales target is from being met, use "THE SALES ON RECORD" in the record. It is counted the way the board counts it, and it is the only count to give.
- Write plain, full sentences that a person with basic English understands. Speak to the person as "you". No lists, no headings, no colons joining pieces.
- At most three sentences.
- A short question names things loosely. "The Kamau defence" is the defence in "Kamau v. Apex Ltd"; "Kilele" is "Kilele Hotel". Match a short name to the fuller one in the documents, and answer when one thing clearly fits.`;

const ANSWER_SCHEMA = {
  name: 'answer_from_the_documents',
  description: 'The answer to the question, from the documents only.',
  input_schema: {
    type: 'object',
    properties: {
      found: { type: 'boolean', description: 'True only when the documents answer the question.' },
      answer: { type: 'string', description: 'The answer in plain full sentences, with every figure exactly as written in the document.' },
      judgesAPerson: { type: 'boolean', description: 'True when the question asks how well or badly a named person is doing, or who does best or worst.' },
    },
    required: ['found', 'answer'],
  },
};

export const NOT_IN_THE_DOCUMENTS = 'I could not find the answer to that in the documents you can open. If it is in a file that is not here yet, add it with Choose a file and ask me again.';
export const NO_DOCUMENTS_TO_READ = 'There are no documents here that you can open yet, so I cannot answer that from them. Add one with Choose a file and ask me again.';

const MOST_WE_READ_FROM_ONE = 12_000;
const MOST_WE_READ_IN_ALL = 40_000;

/* The figures in a text as digits, so "KES 496,000" and "496,000" are the same figure and "16%" is 16. */
const figuresIn = (t: string): string[] => (String(t ?? '').match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((d) => d.replace(/,/g, '').replace(/\.0+$/, ''));

/** True when every figure in the answer appears in at least one of the documents. */
export function everyFigureIsInTheDocuments(answer: string, documents: { content: string }[]): boolean {
  const held = new Set(documents.flatMap((d) => figuresIn(d.content)));
  return figuresIn(answer).every((f) => held.has(f));
}

export interface ADocumentToAnswerFrom { fileName: string; content: string }

/** The documents this person may open: on the named check-in, or on every check-in they are in. */
export async function theDocumentsTheyMayOpen(
  prisma: any,
  input: { organizationId: string; userId: string; groundId?: string | null; contextEnabled?: boolean },
): Promise<ADocumentToAnswerFrom[]> {
  const contextEnabled = input.contextEnabled ?? process.env.CONTEXT_ENABLED !== 'false';
  const grounds = ((await prisma.ground?.findMany?.({
    where: {
      organizationId: input.organizationId,
      ...(input.groundId ? { id: input.groundId } : {}),
      OR: [{ initiatorId: input.userId }, { participants: { some: { userId: input.userId } } }],
    },
    select: { id: true, initiatorId: true, participants: { where: { userId: input.userId }, select: { id: true } } },
  }).catch?.(() => [])) ?? []) as { id: string; initiatorId: string | null; participants: { id: string }[] }[];
  const out: ADocumentToAnswerFrom[] = [];
  for (const g of grounds) {
    const reader = { participantId: g.participants[0]?.id ?? null, isLead: g.initiatorId === input.userId };
    const docs = ((await prisma.groundDocument?.findMany?.({
      where: documentWhereFor(g.id, reader, contextEnabled),
      orderBy: { createdAt: 'desc' },
      select: { fileName: true, content: true, isConversation: true },
    }).catch?.(() => [])) ?? []) as { fileName: string; content: string | null; isConversation?: boolean }[];
    for (const d of docs) {
      if (d.isConversation || !(d.content ?? '').trim()) continue;
      out.push({ fileName: d.fileName, content: String(d.content).slice(0, MOST_WE_READ_FROM_ONE) });
    }
  }
  return out;
}

/**
 * THE RECORD IS READ TOO, AS EACH READER MAY READ IT (polish round 1, 26 October 2026). Grace asked "Has Joseph proved his Mama Pima
 * sale?", "What did Kevin promise this week?" and "Who's my best performer this month?", and read "I could not find the answer to that
 * in the documents you can open" each time, while the answers were on her own board. A lead may read what a manager would see in a
 * staff assessment: what each person in their check-ins said, on which day, what is proven, their deals and the proof filed on them.
 * Anybody else reads only their own. It is given to the same answer as one more document, and the same figure check applies.
 *
 * FROM THE ASSESSMENTS, THROUGH THE ONE READER (1 November 2026). What each person said is read from their conversations' assessments
 * (theFactsOnRecord), which the board and the reports read too, not from the record's lines alone: on the assessment test the lead's
 * record lines were lost to one failed write while her assessment held every word, and Ask answered from the empty store. What judges
 * a person reaches a lead only while the organisation's person-judgements switch is on (thePersonJudgementsAreOn).
 */
const DAY_SAID = (d: Date) => aDaySaidInFull(new Date(d));
const MOST_FACTS_FOR_ONE = 40;

export async function theRecordTheyMayRead(
  prisma: any,
  input: { organizationId: string; userId: string; groundId?: string | null },
  now: Date = new Date(),
): Promise<ADocumentToAnswerFrom[]> {
  const grounds = ((await Promise.resolve(prisma.ground?.findMany?.({
    where: {
      organizationId: input.organizationId,
      ...(input.groundId ? { id: input.groundId } : {}),
      OR: [{ initiatorId: input.userId }, { participants: { some: { userId: input.userId } } }],
    },
    select: { id: true, label: true, initiatorId: true, kindOfWork: true, workStages: true },
  })).catch(() => [])) ?? []) as { id: string; label: string; initiatorId: string | null; kindOfWork?: unknown; workStages?: unknown }[];
  const out: ADocumentToAnswerFrom[] = [];
  const since = new Date(now.getTime() - 45 * 86_400_000);
  const judgements = await thePersonJudgementsAreOn(prisma, input.organizationId);
  for (const g of grounds) {
    const isLead = g.initiatorId === input.userId;
    const people = ((await Promise.resolve(prisma.groundParticipant?.findMany?.({
      where: { groundId: g.id, ...(isLead ? {} : { userId: input.userId }) },
      select: { id: true, userId: true, email: true, nameGiven: true },
    })).catch(() => [])) ?? []) as any[];
    if (!people.length) continue;
    const users = ((await Promise.resolve(prisma.user?.findMany?.({
      where: { id: { in: people.map((p) => p.userId).filter(Boolean) } }, select: { id: true, firstName: true, lastName: true },
    })).catch(() => [])) ?? []) as any[];
    for (const p of people) if (!p.user) p.user = users.find((u) => u.id === p.userId) ?? null;
    const nameOf = (p: any) => [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || p.nameGiven || String(p.email ?? '').split('@')[0];
    const reader: TheReader = isLead ? { kind: 'the lead', judgements } : { kind: 'the person', participantId: people[0].id };
    const facts = await theFactsOnRecord(prisma, { groundId: g.id, reader, participantIds: people.map((p) => p.id), since });
    const lines: string[] = [];
    /* The team first and the reader's own last, so a long record of their own never pushes the team out. */
    people.sort((a, b) => Number(a.userId === input.userId) - Number(b.userId === input.userId));
    for (const p of people) {
      const theirs = facts.filter((f) => f.participantId === p.id).slice(-MOST_FACTS_FOR_ONE);
      lines.push(`PERSON: ${p.userId === input.userId ? `${nameOf(p)} (you)` : nameOf(p)}`);
      for (const f of theirs) lines.push(aFactAsALine(f, DAY_SAID));
      if (!theirs.length) lines.push('- Nothing on record in the last six weeks.');
    }
    const items = ((await Promise.resolve(prisma.workItem?.findMany?.({
      where: { groundId: g.id, ...(isLead ? {} : { ownerParticipantId: { in: people.map((p) => p.id) } }) },
      select: { id: true, kind: true, name: true, stage: true, fields: true, ownerParticipantId: true },
    })).catch(() => [])) ?? []) as any[];
    const proof = ((await Promise.resolve(prisma.itemEvidence?.findMany?.({
      where: { groundId: g.id, countsAsProof: true, workItemId: { in: items.map((i) => i.id) } },
      select: { workItemId: true, readAs: true },
    })).catch(() => [])) ?? []) as any[];
    const owners = new Map(people.map((p) => [p.id, nameOf(p)]));
    const work = items.filter((i) => !String(i.kind).startsWith('request') && !String(i.kind).startsWith('idea'));
    if (work.length) {
      lines.push('THE WORK ON RECORD:');
      for (const i of work) {
        const f = i.fields && typeof i.fields === 'object' ? i.fields : {};
        const plain = Object.entries(f).filter(([k, v]) => !k.startsWith('_') && typeof v === 'string').map(([k, v]) => `${k} ${v}`).join('; ');
        const filed = proof.filter((x) => x.workItemId === i.id).map((x) => x.readAs.toLowerCase());
        lines.push(`- ${i.name}${owners.get(i.ownerParticipantId) ? `, ${owners.get(i.ownerParticipantId)}'s` : ''}${i.stage ? `, at ${i.stage}` : ''}${plain ? `. ${plain}` : ''}. ${filed.length ? `Proof on file: ${filed.join(', ')}.` : 'No proof on file.'}`);
      }
    }
    /* The sales, counted as the board counts them, first: a long record must never push them out (polish round 15, U3 and U4). */
    const sales = isASalesKind(g.kindOfWork) ? await theSalesOnRecord(prisma, g, people, nameOf, isLead, now).catch(() => [] as string[]) : [];
    const content = [...sales, ...lines].join('\n');
    out.push({ fileName: `the record of ${g.label}`, content: content.slice(0, MOST_WE_READ_FROM_ONE) });
  }
  return out;
}

/**
 * THE SALES ON RECORD, COUNTED AS THE BOARD COUNTS THEM (polish round 15, U3 and U4). Ask told Grace "The only sale with proof is from
 * Kilele Hotel for 40 units... 80 units away" and Kevin "You have sold 40 units with proof", while the board said 53 and 51: Ask counted
 * from the twenty latest lines of each person and the raw deal rows. It is given the board's own count (theDealsOnRecord and
 * theAimsTheDealsCount), so it cannot count differently. A lead reads every deal and every aim; anybody else only their own.
 */
async function theSalesOnRecord(
  prisma: any,
  g: { id: string; workStages?: unknown },
  people: any[],
  nameOf: (p: any) => string,
  isLead: boolean,
  now: Date,
): Promise<string[]> {
  const theirs = new Set(people.map((p) => p.id));
  const all: ADealOnRecord[] = await theDealsOnRecord(prisma, g.id, { paymentRecord: true });
  const deals = isLead ? all : all.filter((d) => !!d.ownerParticipantId && theirs.has(d.ownerParticipantId));
  const aims = (((await Promise.resolve(prisma.groundObjective?.findMany?.({ where: { groundId: g.id } })).catch(() => [])) ?? []) as any[])
    .filter((o) => isLead || (!!o.ownerParticipantId && theirs.has(o.ownerParticipantId)));
  const stages = theSalesStages(g.workStages);
  if (!stages.length) return [];
  const last = stages[stages.length - 1].toLowerCase();
  const owner = (pid: string | null) => { const p = people.find((x) => x.id === pid); return p ? nameOf(p) : null; };
  const out: string[] = ['THE SALES ON RECORD, COUNTED THE WAY THE BOARD COUNTS THEM:'];
  const counts = theAimsTheDealsCount(aims.map((o) => ({ id: o.id, name: o.name, ownerParticipantId: o.ownerParticipantId ?? null })), deals, stages, now, 'Africa/Nairobi');
  for (const o of aims) {
    const c = counts.get(o.id);
    const target = Number(o.target);
    if (!c || !(target > 0) || c.counts === 'new leads') continue;
    const whose = o.ownerParticipantId ? `${owner(o.ownerParticipantId) ?? 'One person'}’s own aim` : 'The team’s aim';
    const n = (v: number) => (c.counts === 'value' && c.currency ? `${c.currency} ${aNumberPeopleCanRead(v)}` : aNumberPeopleCanRead(v));
    const short = target - c.count;
    out.push(`- ${whose}, “${String(o.name ?? '').trim()}”, is ${n(target)}. ${c.says} ${theSalesAnswer(c, target, 0)}${short > 0 ? ` It is ${n(short)} short of the ${n(target)}.` : ''}`);
  }
  const sold = deals.filter((d) => !d.dropped && ((d.stage ?? '').toLowerCase() === last || d.paymentOnFile));
  for (const d of sold) {
    const f = whatWasSold(d);
    const units = theUnitsOf(f);
    const money = theMoneyOf(f);
    const worth = [units !== null ? `${aNumberPeopleCanRead(units)} ${units === 1 ? 'unit' : 'units'}` : '', money ? `${money.currency ? `${money.currency} ` : ''}${aNumberPeopleCanRead(money.amount)}` : ''].filter(Boolean).join(' for ');
    const shows = d.deposit ? `It is on a deposit. ${aDepositSaid(d.deposit)}`
      : d.paid ? (d.mpesaCode ? `It is paid, and the M-Pesa code ${d.mpesaCode} shows it.` : 'It is paid, and a payment record shows it.')
        : d.signed ? 'A signed order shows it, and it is not paid yet.'
          : 'Nothing on file shows it yet. It rests on what was said.';
    out.push(`- ${d.name} is sold${owner(d.ownerParticipantId) ? ` by ${owner(d.ownerParticipantId)}` : ''}${worth ? `, ${worth}` : ''}. ${shows}`);
  }
  if (!sold.length) out.push('- Nothing is sold on record yet.');
  return out;
}

/** The answer to say, or the sentence that says it is not in the documents. Never offered as a line. */
export async function answerFromTheDocuments(
  deps: { prisma: any; engine: { extract: (system: string, history: any[], tool: any) => Promise<any> } },
  input: { organizationId: string; userId: string; groundId?: string | null; question: string },
): Promise<string> {
  const records = await theRecordTheyMayRead(deps.prisma, input).catch(() => [] as ADocumentToAnswerFrom[]);
  const documents = [...records, ...(await theDocumentsTheyMayOpen(deps.prisma, input))];
  if (!documents.length) return NO_DOCUMENTS_TO_READ;
  let room = MOST_WE_READ_IN_ALL;
  const given: ADocumentToAnswerFrom[] = [];
  /* The documents that share the question's words go first, so a short question is not answered from whatever was added last (A6). */
  for (const d of theMostLikelyFirst(documents, input.question)) {
    if (room <= 0) break;
    given.push({ fileName: d.fileName, content: d.content.slice(0, room) });
    room -= d.content.length;
  }
  const read = await deps.engine.extract(
    ANSWER_FROM_THE_DOCUMENTS_PROMPT,
    [{ role: 'user', content: `${given.map((d) => `DOCUMENT "${d.fileName}":\n${d.content}`).join('\n\n')}\n\nQUESTION: ${input.question.trim()}` }],
    ANSWER_SCHEMA,
  ).catch(() => null);
  /* A judgement of a named person is not given where the organisation turned those off (person-judgements.ts): the model says what
     the question asks, and the switch decides, here, whatever the answer says. */
  if (read?.judgesAPerson === true && !(await thePersonJudgementsAreOn(deps.prisma, input.organizationId))) return NOT_SHOWN_IN_THIS_ORGANISATION;
  const answer = String(read?.answer ?? '').replace(/\s+/g, ' ').trim();
  if (!read?.found || !answer) return NOT_IN_THE_DOCUMENTS;
  /* A figure no document holds is not said: the person would take it as the document's. */
  if (!everyFigureIsInTheDocumentsOrSums(answer, given, input.question)) return NOT_IN_THE_DOCUMENTS;
  return answer;
}

/**
 * A SUM SHOWN FROM THE DOCUMENT'S OWN FIGURES IS ALLOWED: "40 units at KES 12,400 a unit is KES 496,000". A figure
 * the documents do not hold passes only where it is the product or sum of two figures that they do, or of one of
 * them and a number the person asked about.
 */
export function everyFigureIsInTheDocumentsOrSums(answer: string, documents: { content: string }[], question = ''): boolean {
  const held = new Set(documents.flatMap((d) => figuresIn(d.content)));
  const asked = figuresIn(question);
  const heldOrAsked = [...new Set([...held, ...asked])].map(Number).filter((n) => Number.isFinite(n) && n !== 0 && n !== 1);
  return figuresIn(answer).every((f) => {
    if (held.has(f) || asked.includes(f)) return true;
    const v = Number(f);
    /* Small counts in the answer ("40 units", "30 to 99") are read with the question and the bands. */
    if (v < 10) return true;
    return heldOrAsked.some((a) => heldOrAsked.some((b) => Math.abs(a * b - v) < 0.5 || Math.abs(a + b - v) < 0.5));
  });
}

/*
 * A SHORT QUESTION IS SEARCHED FOR TOO (pilots after fixes, A6). "When is the Kamau defence due?" read "I could not find the
 * answer" while "What date is the Kamau v. Apex defence due, according to the matter list?" was answered: the documents were
 * read newest first up to the limit, so the matter list could fall outside what was read. Each document is ranked by how many
 * of the question's own words it holds (names and nouns, not small words), and read in that order.
 */
const SMALL_WORDS = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'when', 'what', 'who', 'where', 'which', 'how', 'due', 'date', 'for', 'of', 'to', 'in', 'on', 'my', 'our', 'do', 'does', 'did', 'it', 'this', 'that', 'and', 'according', 'by']);
const wordsOfTheQuestion = (q: string): string[] => [...new Set((q ?? '').toLowerCase().match(/[a-z0-9]+/g) ?? [])].filter((w) => w.length > 2 && !SMALL_WORDS.has(w));

export function theMostLikelyFirst<T extends { content: string; fileName: string }>(documents: T[], question: string): T[] {
  const words = wordsOfTheQuestion(question);
  if (!words.length) return documents;
  const score = (d: T) => {
    const text = `${d.fileName} ${d.content}`.toLowerCase();
    return words.filter((w) => text.includes(w)).length;
  };
  return documents.map((d, i) => ({ d, i, s: score(d) })).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.d);
}
