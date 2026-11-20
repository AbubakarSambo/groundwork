import { BadRequestException, NotFoundException } from '@nestjs/common';
import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { readsAsAnAdmin, theAdminsWhoAlsoReadYourPeopleNotes } from './who-may-read-this-check-in';
import { whatSomeoneWhoDoesNotRunItReads } from './what-someone-who-does-not-run-it-reads';
import { theReferencesTemplateFor, theCollectionsReferencesTemplate, type TheReferencesTemplate } from './the-references-template';
import { theRelease2CollectionsIsOn } from './release-2-collections';
import { theCollectionsTypeFor } from '../board/the-collections-record';
import { documentWhereFor } from '../documents/who-can-see-a-document';
import { withoutBankDetails } from '../documents/bank-details-are-never-kept';

/**
 * REFERENCES AND RESOURCES, AS EACH READER IS SERVED IT (Release 1B, pull request 2 of 3; Hafsah's references-and-my-work.md
 * of 17 October 2026 and her brief of 18 October: "The Context tab is renamed 'References and resources' and rebuilt as in the
 * spec"). The wording is the B6 pictures' (docs/prototype/screens/B6-references-and-resources/*.txt).
 *
 * THE SECTIONS, IN THIS ORDER, FOR EVERY SCENARIO: the top line, About this work, Suggested from your check-ins (the lead only,
 * and only when there is one), How we work (Rules, What each stage needs, Coaching, Risks to watch for), Documents, Evidence,
 * Questions and answers, and People (the lead only). Only the words and the data change, from the kind of work's template
 * (the-references-template.ts).
 *
 * WHO READS WHAT, DECIDED HERE AND NOWHERE ELSE (the privacy rules are kept in the payload, never on the screen):
 *  - the lead (the person who runs it): every section. Only she may add to it (the writes below refuse anybody else).
 *  - a team member: About this work, How we work (the lines shared with everyone), the documents they may open, their own
 *    evidence, and the questions. NEVER People, the lead's notes, what to help each person with, the suggestions waiting for
 *    her, a line she kept to herself, or a document they may not open: those keys are not in what they are sent.
 *  - an admin who does not run it: the same as a team member, with the whole evidence list (as the board shows them every
 *    deal), and no documents (the people in the check-in share those, U.7).
 *  - anybody else who may open the check-in: About this work and How we work.
 *
 * TODAY'S CONTEXT CONTENT, READ INTO THE NEW SECTIONS, NEVER REWRITTEN (Hafsah: "Their current Context content moves into the
 * new sections"). Every line stays where it is stored; this only reads it into its new place, so switching off returns the
 * old page with everything as it was:
 *  - the brief (what everyone reads) and the lead's words from setup: About this work, the purpose;
 *  - "How we work" and "The strategy" lines: How we work, Rules;
 *  - "Notes" lines and the lead's note to everyone: About this work, "Also worth knowing";
 *  - the lead's notes about one person (her older notes, and her read of them): People, under that person, marked as written
 *    before References and resources, and still read into no check-in (decision 32);
 *  - a plan's proposals still waiting for her: Suggested from your check-ins, with Add, Edit and Dismiss;
 *  - the documents: Documents, each with who can see it; a document added as proof in a check-in: Evidence.
 * "Still to decide" and "Not settled" lines are decisions, which the spec puts on the board ("Anything that needs a decision
 * or shows progress stays on the board"); the targets, the plan as agreed, each person's card and what people are down as
 * doing are progress and promises, which belong on the board and in My work (pull request 3 of 3). None of them is drawn here.
 *
 * THIS ONLY READS. Opening it writes nothing. With Release 1B's switch off it serves `{ on: false }`, and the Context tab reads
 * exactly as it did.
 */

export interface ALine {
  id: string;
  text: string;
  /** Groundwork's starting line for this kind of work, not one the lead wrote. */
  fromTheTemplate?: boolean;
  /** The lead kept this line to herself. Sent to the lead only. */
  onlyYou?: boolean;
}

export interface AKeyFact { id: string; label: string; fact: string }

export interface ADocument {
  id: string;
  name: string;
  /** "Grace, 1 October". */
  added: string;
  addedOn: string;
  summary: string | null;
  /** What it is used for: the line the person gave when they added it, else what Groundwork will do with it (26 October 2026). */
  usedFor?: string | null;
  whoCanSee: string;
  kind: 'Photos' | 'Spreadsheets' | 'PDFs' | 'Documents';
}

export interface APieceOfEvidence {
  id: string;
  readAs: string;
  shows: string | null;
  /** What is in it, in a sentence or two, from the document's own reading (its assessment), when it has been read. */
  summary?: string | null;
  /** What it is used for: proof for the item it is filed on, or what Groundwork will do with it. */
  usedFor?: string | null;
  belongsTo: string;
  addedBy: string;
  addedById: string | null;
  addedOn: string;
  on: string;
  countsAsProof: boolean;
  group: 'Orders and quotes' | 'Payments' | 'Photos' | 'Other documents' | 'Court filings' | 'Client letters';
}

export interface AnEvidencePage {
  total: number;
  page: number;
  pageSize: number;
  items: APieceOfEvidence[];
  /** The people this reader may filter by (the lead only). */
  people: { id: string; name: string }[];
}

export interface ASuggestion {
  id: string;
  /** "a rule", "a goal", "a role", "a commitment". */
  what: string;
  from: string;
  says: string;
  saidAs: string;
}

export interface APersonInPeople {
  participantId: string;
  name: string;
  role: string | null;
  note: ALine | null;
  helpWith: ALine | null;
  /** The lead's notes about this person from before References and resources. Read into no check-in (decision 32). */
  earlier: string[];
}

export type ReferencesAndResources =
  | { on: false }
  | {
      on: true;
      view: 'lead' | 'member' | 'admin' | 'reader';
      checkInName: string;
      leadName: string | null;
      topLine: string;
      mayAdd: boolean;
      itemWord: string;
      about: {
        purpose: string | null;
        whose: string | null;
        keyFacts: AKeyFact[];
        alsoWorthKnowing: ALine[];
        emptySays: string | null;
        /** The lead's own brief, to the lead alone, where what everyone reads is Groundwork's short version of it. */
        yourOwnWords?: string;
      };
      suggested?: ASuggestion[];
      howWeWork: {
        rules: ALine[];
        stageNeeds: ALine[];
        coaching: ALine[];
        risks: ALine[];
        startingSetSays: string | null;
      };
      documents: { total: number; items: ADocument[]; notOpenToYou: boolean } | null;
      evidence: AnEvidencePage | null;
      evidenceSays: string;
      /** The evidence groups to filter by, where they are not the usual four: a "Collect what's owed" check-in's, as the fee-notes pictures draw them. */
      evidenceGroups?: APieceOfEvidence['group'][];
      questions: { total: number; items: { asked: string; answer: string; who: string }[]; emptySays: string };
      people?: APersonInPeople[];
      /** Who else sees People, for the lead: "Otieno, the admin who set up this check-in", or empty where nobody else does. Lead only. */
      peopleAlsoSeenBy?: string;
    };

const firstOf = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || '';
const fullName = (u: { firstName?: string | null; lastName?: string | null } | null | undefined, given?: string | null) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || (given ?? '').trim();

export function aDayIn(d: Date | string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone }).format(new Date(d));
}

/** What kind of document it is, from its type alone: the filter on Documents. */
export function theKindOfDocument(mimeType: string | null | undefined, fileName: string | null | undefined): ADocument['kind'] {
  const m = String(mimeType ?? '').toLowerCase();
  const n = String(fileName ?? '').toLowerCase();
  if (m.startsWith('image/')) return 'Photos';
  if (/sheet|excel|csv/.test(m) || /\.(xlsx?|csv|ods)$/.test(n)) return 'Spreadsheets';
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'PDFs';
  return 'Documents';
}

/** Who can open a document, as the reader reads it: "Everyone", "Only you", "Joseph and you". */
export function whoCanSeeIt(
  d: { visibility: string; participantId: string | null },
  reader: { participantId: string | null; isLead: boolean },
  uploaderFirst: string,
  leadFirst: string,
): string {
  if (d.visibility === 'OPEN') return 'Everyone';
  const mine = !!reader.participantId && d.participantId === reader.participantId;
  if (d.visibility === 'CLOSED') {
    if (reader.isLead && mine) return 'Only you';
    if (reader.isLead) return `${uploaderFirst || 'The person who added it'} and you`;
    return mine ? `You and ${leadFirst || 'the person who runs it'}` : `${uploaderFirst} and ${leadFirst}`;
  }
  return mine ? 'Only you' : `Only ${uploaderFirst || 'the person who added it'}`;
}

/** The evidence list's groups, from what each piece was read as. */
export function theGroupOf(readAs: string): APieceOfEvidence['group'] {
  if (/order|quote/i.test(readAs)) return 'Orders and quotes';
  if (/payment/i.test(readAs)) return 'Payments';
  if (/photo/i.test(readAs)) return 'Photos';
  return 'Other documents';
}

/**
 * THE EVIDENCE GROUPS OF A "COLLECT WHAT'S OWED" CHECK-IN, as the fee-notes pictures draw them: Court filings, Payments, Client
 * letters. Anything else is Other documents.
 */
export function theCollectionsGroupOf(readAs: string): APieceOfEvidence['group'] {
  if (/payment|slip|remittance|m-?pesa|receipt/i.test(readAs)) return 'Payments';
  if (/court|filing|filed|stamped|pleading/i.test(readAs)) return 'Court filings';
  if (/client|letter|email|message/i.test(readAs)) return 'Client letters';
  return 'Other documents';
}

/** Where a piece of evidence was filed, in the organisation's word for the bill: "Fee note FN-004", or "Kasarani Foods, fee note". */
export function theBillItBelongsTo(itemName: string, billWord: string): string {
  const n = String(itemName ?? '').trim();
  if (/^[A-Za-z]{0,6}[-\s]?\d{1,8}$/.test(n)) return `${billWord.charAt(0).toUpperCase()}${billWord.slice(1)} ${n}`;
  return `${n}, ${billWord}`;
}

/**
 * THE TEMPLATE FOR THIS CHECK-IN: the kind of work's, or, for a "Collect what's owed" check-in where Release 2 is on too, the
 * collections starting set in the organisation's own word for the bill. Null for collections where Release 2 is off, so the page
 * reads exactly as Release 1B drew it.
 */
async function theTemplateHere(prisma: any, ground: any): Promise<{ template: TheReferencesTemplate; collections: boolean }> {
  if (ground.scenario === 'COLLECTIONS' && (await theRelease2CollectionsIsOn(prisma, ground.organizationId).catch(() => false))) {
    const it = await theCollectionsTypeFor(prisma, ground.id).catch(() => null);
    if (it) return { template: theCollectionsReferencesTemplate(it.type, it.billWord), collections: true };
  }
  return { template: theReferencesTemplateFor(ground.kindOfWork), collections: false };
}

/** A key fact is kept as its label on the first line and the fact on the next. */
export function aKeyFactFrom(id: string, text: string): AKeyFact | null {
  const [label, ...rest] = String(text ?? '').split('\n');
  const fact = rest.join(' ').trim();
  if (!label?.trim() || !fact) return null;
  return { id, label: label.trim(), fact };
}

const SUGGESTION_WORD: Record<string, string> = { RULE: 'a rule', GOAL: 'a goal', ROLE: 'a role', COMMITMENT: 'a commitment' };

export const EVIDENCE_PAGE_SIZE = 25;

export interface EvidenceQuery { page?: number; q?: string; group?: string; person?: string; when?: 'week' | 'month' | 'quarter' | 'any' }

/** The reader, decided once: the lead, a person in it, an admin who does not run it, or another reader. */
async function whoIsReading(prisma: any, ground: any, userId: string) {
  const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, organizationId: true, email: true } });
  const isLead = ground.initiatorId === userId;
  const mine = (ground.participants ?? []).find((p: any) => p.userId === userId) ?? null;
  const isAdmin = !isLead && !mine && readsAsAnAdmin({ ...viewer, userId }, ground);
  const view: 'lead' | 'member' | 'admin' | 'reader' = isLead ? 'lead' : mine ? 'member' : isAdmin ? 'admin' : 'reader';
  return { view, mine, isLead };
}

const GROUND_SELECT = {
  id: true, label: true, organizationId: true, initiatorId: true, createdByUserId: true, scenario: true, status: true, approvedById: true,
  brief: true, toldToParticipants: true, kindOfWork: true,
  initiator: { select: { firstName: true, lastName: true } },
  organization: { select: { name: true, timeZone: true } },
  participants: {
    select: {
      id: true, userId: true, email: true, nameGiven: true, partyType: true, managingOnly: true, roleAsDescribed: true,
      user: { select: { firstName: true, lastName: true, jobTitle: true } },
    },
  },
};

/** The evidence this reader may read, one page of it, with the filters applied at the read. */
export async function readTheEvidence(
  prisma: any,
  input: { groundId: string; userId: string },
  query: EvidenceQuery = {},
  now: Date = new Date(),
): Promise<AnEvidencePage | null> {
  const ground = await prisma.ground.findFirst({ where: { id: input.groundId }, select: GROUND_SELECT });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  const { view, mine } = await whoIsReading(prisma, ground, input.userId);
  return theEvidencePage(prisma, ground, view, mine, query, now);
}

async function theEvidencePage(prisma: any, ground: any, view: string, mine: any, query: EvidenceQuery, now: Date): Promise<AnEvidencePage | null> {
  /* The lead and an admin read every piece; a person only what they added; anybody else none. At the read. */
  if (view === 'reader') return null;
  if (view === 'member' && !mine) return null;
  const timeZone = ground.organization?.timeZone || (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) || 'Africa/Lagos';
  const where: any = { groundId: ground.id };
  if (view === 'member') where.participantId = mine.id;
  else if (query.person) where.participantId = query.person;
  const since = query.when === 'week' ? 7 : query.when === 'month' ? 31 : query.when === 'quarter' ? 92 : 0;
  if (since) where.createdAt = { gte: new Date(now.getTime() - since * 86400000) };
  const rows: any[] = (await prisma.itemEvidence?.findMany?.({ where, orderBy: { createdAt: 'desc' }, take: 5000 }).catch(() => [])) ?? [];
  const people = new Map<string, string>((ground.participants ?? []).map((p: any) => [p.id, fullName(p.user, p.nameGiven) || 'Somebody']));
  const here = await theTemplateHere(prisma, ground);
  const itemWord = here.template.itemWord;
  /* Each piece's summary and what it is used for, from its document's assessment (Hafsah, 26 October 2026: every upload "filed into References and
     resources, where its summary and what it's used for appear"). */
  const assessed: any[] = (await Promise.resolve(prisma.groundDocument?.findMany?.({ where: { id: { in: rows.map((r) => r.documentId).filter(Boolean) } }, select: { id: true, assessment: true } })).catch(() => [])) ?? [];
  const readingOf = new Map<string, { suggests?: string[]; willDo?: string[] }>(assessed.map((d) => [d.id, (d.assessment ?? {}) as any]));
  const all: APieceOfEvidence[] = rows.map((r) => {
    const reading = readingOf.get(r.documentId) ?? {};
    const by = r.participantId ? firstOf(people.get(r.participantId)) : '';
    return {
      id: r.id,
      readAs: r.readAs,
      shows: r.shows ?? null,
      summary: (reading.suggests ?? []).slice(0, 2).map((x) => String(x).trim()).filter(Boolean).join(' ') || null,
      usedFor: r.countsAsProof && r.itemName ? `Proof for ${r.itemName}, on the board.` : null,
      belongsTo: r.itemName ? (here.collections ? theBillItBelongsTo(r.itemName, itemWord) : r.itemName) : `Not filed on ${/^[aeiou]/i.test(itemWord) ? 'an' : 'a'} ${itemWord} yet`,
      addedBy: view === 'member' ? 'You' : (by || 'Somebody'),
      addedById: r.participantId ?? null,
      addedOn: aDayIn(r.createdAt, timeZone),
      on: new Date(r.createdAt).toISOString().slice(0, 10),
      countsAsProof: r.countsAsProof === true,
      group: here.collections ? theCollectionsGroupOf(r.readAs) : theGroupOf(r.readAs),
    };
  });
  const q = (query.q ?? '').trim().toLowerCase();
  const filtered = all
    .filter((e) => !query.group || e.group === query.group)
    .filter((e) => !q || [e.readAs, e.shows, e.belongsTo, e.addedBy].some((x) => String(x ?? '').toLowerCase().includes(q)));
  const pages = Math.max(1, Math.ceil(filtered.length / EVIDENCE_PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(query.page ?? 1)), pages);
  const peopleToFilter = view === 'member' ? [] : [...new Set(rows.map((r) => r.participantId).filter(Boolean))]
    .map((id) => ({ id: id as string, name: firstOf(people.get(id as string)) || 'Somebody' }));
  return {
    total: filtered.length,
    page,
    pageSize: EVIDENCE_PAGE_SIZE,
    items: filtered.slice((page - 1) * EVIDENCE_PAGE_SIZE, page * EVIDENCE_PAGE_SIZE),
    people: peopleToFilter,
  };
}

export async function readReferencesAndResources(
  prisma: any,
  input: { groundId: string; userId: string; contextEnabled: boolean },
  now: Date = new Date(),
): Promise<ReferencesAndResources> {
  const ground = await prisma.ground.findFirst({ where: { id: input.groundId }, select: GROUND_SELECT });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

  const { view, mine, isLead } = await whoIsReading(prisma, ground, input.userId);
  const timeZone = ground.organization?.timeZone || (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) || 'Africa/Lagos';
  const leadName = fullName(ground.initiator) || null;
  const leadFirst = firstOf(leadName) || 'the person who runs it';
  const { template, collections } = await theTemplateHere(prisma, ground);
  const nameOf = new Map<string, string>((ground.participants ?? []).map((p: any) => [p.id, fullName(p.user, p.nameGiven)]));

  /* Every open line, then only what this reader may read: the lead every line, everybody else the shared lines about the work. */
  const lines: any[] = (await prisma.groundContextItem?.findMany?.({
    where: { groundId: ground.id, closedAt: null },
    select: { id: true, kind: true, text: true, audience: true, aboutParticipantId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  }).catch(() => [])) ?? [];
  const forAll = (l: any) => l.audience === 'EVERYONE' && !l.aboutParticipantId;
  const readable = (kinds: string[]) => lines
    .filter((l) => kinds.includes(String(l.kind)) && String(l.text ?? '').trim())
    .filter((l) => isLead || forAll(l))
    .map((l): ALine => ({ id: l.id, text: String(l.text).trim(), ...(isLead && l.audience !== 'EVERYONE' ? { onlyYou: true } : {}) }));

  /* ABOUT THIS WORK. The purpose is what everyone in the check-in reads, in the lead's words where it is hers. */
  const purpose = whatSomeoneWhoDoesNotRunItReads({ brief: ground.brief, toldToParticipants: ground.toldToParticipants, scenario: ground.scenario });
  const herOwnWords = !!purpose && purpose === String(ground.brief ?? '').trim();
  const whose = !purpose ? null : herOwnWords ? `${leadFirst}, at setup` : null;
  /* Her own brief, to her alone, where what everyone reads is Groundwork's short version of it (decision 75, item 13: the brief
     itself is never served to anybody else). */
  const yourOwnWords = isLead && !herOwnWords && String(ground.brief ?? '').trim() ? String(ground.brief).trim() : null;
  const keyFacts = readable(['KEY_FACT']).map((l) => aKeyFactFrom(l.id, l.text)).filter(Boolean).slice(0, 3) as AKeyFact[];
  const notes: any[] = (await prisma.leadContextNote?.findMany?.({
    where: { groundId: ground.id, participantId: null, ...(isLead ? {} : { audience: 'EVERYONE' }) },
    select: { id: true, text: true, audience: true },
    orderBy: { createdAt: 'asc' },
  }).catch(() => [])) ?? [];
  const alsoWorthKnowing: ALine[] = [
    ...notes.filter((n) => String(n.text ?? '').trim()).map((n): ALine => ({ id: n.id, text: String(n.text).trim(), ...(isLead && n.audience !== 'EVERYONE' ? { onlyYou: true } : {}) })),
    ...readable(['NOTE']),
  ];
  const emptySays = purpose ? null : isLead
    ? 'You have not said what this work is for yet. Add the purpose in your own words, and everyone reads it.'
    : `${leadFirst} has not said what this work is for yet.`;

  /* HOW WE WORK, with Groundwork's starting set for this kind of work beside the lead's own lines. */
  const starting = (texts: string[], prefix: string): ALine[] => texts.map((t, i) => ({ id: `template-${prefix}-${i}`, text: t, fromTheTemplate: true }));
  const howWeWork = {
    rules: [...readable(['WAY_OF_WORKING', 'STRATEGY']), ...starting(template.startingRules, 'rule')],
    stageNeeds: [...readable(['STAGE_NEEDS']), ...starting(template.startingStageNeeds, 'stage')],
    coaching: readable(['COACHING']),
    risks: [...readable(['RISK']), ...starting(template.startingRisks, 'risk')],
    startingSetSays: template.startingSetFor ? `Lines marked as Groundwork’s are the starting set for ${template.startingSetFor}.` : null,
  };

  /* DOCUMENTS: what this reader may open, by the same rule as the document list, and not what was filed as evidence. */
  const filed: any[] = (await prisma.itemEvidence?.findMany?.({ where: { groundId: ground.id }, select: { documentId: true } }).catch(() => [])) ?? [];
  const filedIds = new Set(filed.map((f) => f.documentId));
  let documents: { total: number; items: ADocument[]; notOpenToYou: boolean } | null = null;
  if (view === 'lead' || view === 'member') {
    const docs: any[] = (await prisma.groundDocument?.findMany?.({
      where: documentWhereFor(ground.id, { participantId: mine?.id ?? null, isLead } as any, input.contextEnabled) as any,
      select: { id: true, fileName: true, mimeType: true, createdAt: true, assessment: true, uploaderNote: true, visibility: true, participantId: true, isConversation: true },
      /* Newest first, as the evidence list: what was just added is at the top, not below every older file (26 October 2026). */
      orderBy: { createdAt: 'desc' },
    }).catch(() => [])) ?? [];
    const items = docs.filter((d) => !filedIds.has(d.id)).map((d): ADocument => {
      const by = firstOf(d.participantId ? nameOf.get(d.participantId) : '') || 'Somebody';
      const suggests = Array.isArray(d.assessment?.suggests) ? d.assessment.suggests.filter((x: any) => String(x ?? '').trim()) : [];
      const mineToo = !!mine && d.participantId === mine.id;
      return {
        id: d.id,
        name: d.fileName,
        added: `${mineToo ? 'You' : by}, ${aDayIn(d.createdAt, timeZone)}`,
        addedOn: new Date(d.createdAt).toISOString().slice(0, 10),
        summary: suggests[0] ? String(suggests[0]).trim() : (mineToo && d.uploaderNote ? String(d.uploaderNote).trim() : null),
        /* What the person who added it said it is for. Never the reader's own note to itself ("It looks like hold this as evidence…"), which read as broken English. */
        usedFor: d.uploaderNote && String(d.uploaderNote).trim() ? String(d.uploaderNote).trim() : null,
        whoCanSee: whoCanSeeIt(d, { participantId: mine?.id ?? null, isLead }, by, firstOf(leadName)),
        kind: theKindOfDocument(d.mimeType, d.fileName),
      };
    });
    documents = { total: items.length, items, notOpenToYou: false };
  } else if (view === 'admin') {
    documents = { total: 0, items: [], notOpenToYou: true };
  }

  const evidence = await theEvidencePage(prisma, ground, view, mine, {}, now);
  const evidenceSays = view === 'member'
    ? 'Proof you added in your check-ins. Each also shows on the board.'
    : 'Photos, slips and documents your team added as proof. Each also shows on the board.';

  const out: Extract<ReferencesAndResources, { on: true }> = {
    on: true,
    view,
    checkInName: ground.label || 'This check-in',
    leadName,
    topLine: isLead
      ? 'Your team’s reference for this work.'
      : `Your team’s reference for this work, kept by ${leadFirst}.`,
    mayAdd: isLead,
    itemWord: template.itemWord,
    about: { purpose: purpose ?? null, whose, keyFacts, alsoWorthKnowing, emptySays, ...(yourOwnWords ? { yourOwnWords } : {}) },
    howWeWork,
    documents,
    evidence: view === 'reader' ? null : evidence,
    evidenceSays,
    ...(collections ? { evidenceGroups: ['Court filings', 'Payments', 'Client letters', 'Other documents'] as APieceOfEvidence['group'][] } : {}),
    questions: {
      total: 0,
      items: [],
      emptySays: isLead
        ? 'Nobody has asked about this work yet. Questions asked with Ask about this work will show here, with their answers.'
        : 'Nobody has asked about this work yet. Ask about this work, and the question and its answer will show here.',
    },
  };

  if (isLead) {
    /* SUGGESTED, THE LEAD ONLY: a plan's proposals still waiting for her yes. */
    const waiting: any[] = (await prisma.planProposal?.findMany?.({
      where: { groundId: ground.id, status: 'PENDING' },
      select: { id: true, kind: true, says: true, fromThePlan: true, fromDocument: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => [])) ?? [];
    out.suggested = waiting.map((p) => ({
      id: p.id,
      what: SUGGESTION_WORD[String(p.kind).toUpperCase()] ?? 'a line',
      from: p.fromDocument ? `From ${p.fromDocument}, ${aDayIn(p.createdAt, timeZone)}` : `From the plan you pasted, ${aDayIn(p.createdAt, timeZone)}`,
      says: String(p.says ?? '').trim(),
      saidAs: String(p.fromThePlan ?? '').trim(),
    }));

    /* PEOPLE, THE LEAD ONLY: her note on each person and what to help them with, and her earlier notes about them. */
    const older: any[] = (await prisma.leadContextNote?.findMany?.({
      where: { groundId: ground.id, participantId: { not: null } },
      select: { participantId: true, text: true },
      orderBy: { createdAt: 'asc' },
    }).catch(() => [])) ?? [];
    const latest = (kind: string, pid: string): ALine | null => {
      const l = [...lines].reverse().find((x) => x.kind === kind && x.aboutParticipantId === pid && String(x.text ?? '').trim());
      return l ? { id: l.id, text: String(l.text).trim() } : null;
    };
    out.peopleAlsoSeenBy = await theAdminsWhoAlsoReadYourPeopleNotes(prisma, ground);
    out.people = (ground.participants ?? [])
      .filter((p: any) => !p.managingOnly && p.userId !== ground.initiatorId)
      .map((p: any): APersonInPeople => ({
        participantId: p.id,
        name: fullName(p.user, p.nameGiven) || p.email || 'Somebody invited by email',
        role: (p.user?.jobTitle ?? '').trim() || (p.roleAsDescribed ?? '').trim() || null,
        note: latest('PERSON_NOTE', p.id),
        helpWith: latest('HELP_WITH', p.id),
        earlier: [
          ...older.filter((n) => n.participantId === p.id).map((n) => String(n.text ?? '').trim()),
          ...lines.filter((l) => l.kind === 'ABOUT_A_PERSON' && l.aboutParticipantId === p.id).map((l) => String(l.text ?? '').trim()),
        ].filter(Boolean),
      }));
  }
  return out;
}

/* ------------------------------------------------------------------------------------------------ the lead's writes */

/** The kinds a lead adds on this page, by the word the page sends. "RULE" is today's How we work line. */
export const KINDS_THE_PAGE_ADDS: Record<string, string> = {
  RULE: 'WAY_OF_WORKING',
  STAGE_NEEDS: 'STAGE_NEEDS',
  COACHING: 'COACHING',
  RISK: 'RISK',
  KEY_FACT: 'KEY_FACT',
  PERSON_NOTE: 'PERSON_NOTE',
  HELP_WITH: 'HELP_WITH',
};
const ABOUT_ONE_PERSON = new Set(['PERSON_NOTE', 'HELP_WITH']);

/** What a line the lead added looks like when stored. Checked here, whoever calls. */
export function aLineToKeep(
  input: { kind?: string; text?: string; label?: string; aboutParticipantId?: string | null },
  participants: { id: string; userId: string | null }[],
  leadUserId: string,
): { kind: string; text: string; audience: 'EVERYONE' | 'LEAD_ONLY'; aboutParticipantId: string | null } {
  const kind = KINDS_THE_PAGE_ADDS[String(input.kind ?? '').toUpperCase()];
  if (!kind) throw new BadRequestException('That is not one of the things References and resources keeps.');
  const text = String(withoutBankDetails(input.text ?? '') ?? '').trim();
  if (!text) throw new BadRequestException('Type the line first.');
  if (text.length > 600) throw new BadRequestException('That is too long for one line. Say the one thing, and add another line for the next.');
  if (kind === 'KEY_FACT') {
    const label = String(input.label ?? '').trim();
    if (!label) throw new BadRequestException('Say what the fact is about first, for example Customers.');
    if (label.length > 60) throw new BadRequestException('Keep what the fact is about to a few words.');
    return { kind, text: `${label}\n${text}`, audience: 'EVERYONE', aboutParticipantId: null };
  }
  if (ABOUT_ONE_PERSON.has(kind)) {
    const who = participants.find((p) => p.id === input.aboutParticipantId && p.userId !== leadUserId);
    if (!who) throw new BadRequestException('Choose the person this note is about.');
    /* About one person: the lead's alone, whatever is sent. */
    return { kind, text, audience: 'LEAD_ONLY', aboutParticipantId: who.id };
  }
  return { kind, text, audience: 'EVERYONE', aboutParticipantId: null };
}

