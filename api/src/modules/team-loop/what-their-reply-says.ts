/**
 * A TEAM MEMBER'S REPLY, FORWARD OR VOICE NOTE IS THEIR CHECK-IN (Fatima, increment 6a; plan 6.3, 26.1 and 31).
 *
 * What they send is read once, and what it says goes on the records that already exist, never a second store:
 *   - what they say they will do        a commitment (the one writer, assistant/a-commitment-has-one-writer.ts), the same promise said more fully
 *                                       is one row (conversation/the-same-promise-said-more-fully.ts);
 *   - what they say is done             only a document they sent settles it (the register's own rule: said done without proof is "unverified");
 *   - what is stuck, and on whom        the commitment's `waitingOn`, which the nudges and the register read;
 *   - which questions it already answers  `information_gaps`, one row per person and question, written from the document read, and read by the next
 *                                       turn so the same thing is never asked twice.
 * A thin answer ("ongoing", "done", "soon") earns ONE focused question, and a question already asked is never asked again. When what they sent
 * covers the questions, they are asked nothing.
 *
 * The model only reads (the-team-mind.ts); this file decides what is written, from words the person wrote.
 */
import { addACommitment, markACommitmentDone } from '../assistant/a-commitment-has-one-writer';
import { aThingOnHerRecord } from '../executive-onboarding/the-material-for-work';
import { aCommitmentKey } from '../conversation/what-happened-to-what-they-said';
import { theFullerPromise } from '../conversation/the-same-promise-said-more-fully';
import { THE_ONE_QUESTION, THE_QUESTIONS, THANKS_AND_COVERED, THANKS_FOR_THE_UPDATE } from './the-team-words';
import { whatTheySaid } from './the-plain-reading';
import type { TheirWork, TheTeamMind, WhatTheySaid } from './the-team-mind';

export const SOURCE = 'team_reply';

export interface AnItemTheySent { materialId: string | null; text: string; isDocument: boolean; /** When it reached Groundwork, which is when it was said. */ at?: Date }

/** The roster person behind an introduced contact. Null when they were never put on the roster. */
export async function thePersonBehind(prisma: any, contact: any): Promise<{ id: string; externalId: string } | null> {
  if (!contact?.personId) return null;
  return (await prisma.person.findFirst({ where: { id: contact.personId }, select: { id: true, externalId: true } }).catch(() => null)) ?? null;
}

/** Which of the standard questions are still unanswered for this person: the next turn reads this, so nothing is asked twice. */
export async function theQuestionsStillOpen(prisma: any, contact: any): Promise<{ slug: string; what: string }[]> {
  const rows: any[] = (await prisma.informationGap?.findMany?.({ where: { principalUserId: contact.principalUserId, askedOfEmail: contact.contactKey, state: 'answered' } }).catch(() => [])) ?? [];
  const answered = new Set(rows.map((r) => r.gapKey));
  return THE_QUESTIONS.filter((q) => !answered.has(q.slug));
}

const onTheDay = (d: Date | string | null | undefined) => { if (!d) return ''; const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : ` on ${x.getUTCDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][x.getUTCMonth()]}`; };

/**
 * WHAT THE RECORD ALREADY HOLDS FROM THEM (Batch D, R5, D13). Folasade was asked for "the signed copy of the agreement" she had sent on 11 September, and
 * Toyin for a bank advice already on record. What they sent themselves, and the promises a document they sent already proves, are given to whatever
 * writes to them, so it never asks for one again. Only their own material is read (the team loop's limit), never what the senior person sent.
 */
export async function whatTheRecordAlreadyHoldsFrom(prisma: any, contact: any, person: { externalId: string } | null): Promise<string[]> {
  const sent: any[] = (await (async () => prisma.principalMaterial.findMany({ where: { fromUserId: `contact:${contact.id}`, principalUserId: contact.principalUserId }, select: { fileName: true, receivedAt: true, kind: true, channel: true, subject: true }, orderBy: { receivedAt: 'desc' }, take: 12 }))().catch(() => [])) ?? [];
  const proven: any[] = person ? (await (async () => prisma.commitment.findMany({ where: { organizationId: contact.organizationId, personExternalId: person.externalId, source: SOURCE, state: 'KEPT', provenBy: { startsWith: 'material:' } }, select: { text: true, resolvedAt: true }, take: 12 }))().catch(() => [])) ?? [] : [];
  return [
    ...sent.filter((m) => m.fileName).map((m) => aThingOnHerRecord(m)),
    ...proven.map((c) => `the proof that “${String(c.text).replace(/\s+/g, ' ').trim().slice(0, 140)}” is done${c.resolvedAt ? `, from${onTheDay(c.resolvedAt).replace(/^ on/, '')}` : ''}`),
  ];
}

export async function theirWorkNow(prisma: any, contact: any): Promise<{ work: TheirWork; externalId: string | null }> {
  const person = await thePersonBehind(prisma, contact);
  const all: any[] = person ? (await prisma.commitment.findMany({ where: { organizationId: contact.organizationId, personExternalId: person.externalId, source: SOURCE } })) ?? [] : [];
  const open = all.filter((c) => c.state === 'OPEN');
  return {
    externalId: person?.externalId ?? null,
    work: { first: String(contact.name ?? '').split(' ')[0] || 'there', commitments: open.map((c) => ({ id: c.id, text: c.text, dueSaid: c.dueSaid ?? null, waitingOn: c.waitingOn ?? null })), settled: all.filter((c) => c.state === 'KEPT').slice(-40).map((c) => ({ id: c.id, text: c.text, proven: String(c.provenBy ?? '').startsWith('material:') })), openQuestions: await theQuestionsStillOpen(prisma, contact), alreadyHeld: await whatTheRecordAlreadyHoldsFrom(prisma, contact, person) },
  };
}

async function markAnswered(prisma: any, contact: any, slug: string, from: string | null, now: Date): Promise<void> {
  const where = { principalUserId: contact.principalUserId, gapKey: slug, askedOfEmail: contact.contactKey };
  const there: any = await prisma.informationGap.findFirst({ where });
  const what = THE_QUESTIONS.find((q) => q.slug === slug)?.what ?? slug;
  if (there) {
    if (there.state !== 'answered') await prisma.informationGap.update({ where: { id: there.id }, data: { state: 'answered', answeredAt: now, answeredFrom: from } });
    return;
  }
  await prisma.informationGap.create({ data: { organizationId: contact.organizationId, principalUserId: contact.principalUserId, gapKey: slug, what, askedOfEmail: contact.contactKey, askedOfName: contact.name, state: 'answered', answeredAt: now, answeredFrom: from } });
}

/** Asks one thing once. Returns whether it may be asked: a question already asked, or answered, is never put again. */
async function mayAskOnce(prisma: any, contact: any, slug: string, now: Date, since: Date | null): Promise<boolean> {
  const where = { principalUserId: contact.principalUserId, gapKey: slug, askedOfEmail: contact.contactKey };
  const there: any = await prisma.informationGap.findFirst({ where });
  /* Asked for this very reply and the message did not go: the same question is put again, which is still the one time. */
  if (there) return there.state === 'asked' && !!since && !!there.askedAt && new Date(there.askedAt).getTime() >= since.getTime();
  await prisma.informationGap.create({ data: { organizationId: contact.organizationId, principalUserId: contact.principalUserId, gapKey: slug, what: THE_QUESTIONS.find((q) => q.slug === slug)?.what ?? 'One thing they were asked to say more about.', askedOfEmail: contact.contactKey, askedOfName: contact.name, state: 'asked', askedAt: now } });
  return true;
}

/** Their own words about what it is, in quotation marks, or "your work" when there is nothing to quote. */
const theWords = (about: string): string => {
  const said = about.trim();
  if (!said) return 'your work';
  /* Cut at a whole word, never in the middle of one (round 1, I-21: "by emai"). */
  const cut = said.length <= 140 ? said : `${said.slice(0, 140).replace(/\s+\S*$/, '')}…`;
  return `“${cut}”`;
};

export interface TheirCheckIn { /** What was read from each thing they sent, for the reply to be written from. */ readings?: WhatTheySaid[]; reply: string | null; wrote: { commitments: number; kept: number; blockers: number; answered: string[] }; asked: string | null }

export async function turnTheirReplyIntoTheirCheckIn(prisma: any, mind: TheTeamMind | null | undefined, a: { contact: any; items: AnItemTheySent[]; now: Date; since?: Date | null; /** The conversation so far (the-conversation-so-far.ts). */ recent?: string }): Promise<TheirCheckIn> {
  const { contact, now } = a;
  const since = a.since ?? null;
  const { work, externalId } = await theirWorkNow(prisma, contact);
  const first = work.first;
  const wrote = { commitments: 0, kept: 0, blockers: 0, answered: [] as string[] };
  let keptEarlier = 0;
  let asked: string | null = null;
  /* The documents they sent. None of them proves anything by arriving with a claim: each outcome is matched to the document that shows it (which-document-shows-it.ts). */
  const documents = a.items.filter((i) => i.isDocument && i.materialId);
  const readings: { item: AnItemTheySent; said: WhatTheySaid }[] = [];
  for (const item of a.items) {
    if (!item.text.trim()) continue;
    readings.push({ item, said: await whatTheySaid(mind, { text: item.text, hasDocuments: item.isDocument, work, recent: a.recent }) });
  }

  const have = async () => (externalId ? ((await prisma.commitment.findMany({ where: { organizationId: contact.organizationId, personExternalId: externalId, source: SOURCE } })) ?? []) as any[] : []);
  /* One row for one promise, whichever way it was said or however fully. */
  const put = async (text: string, whenSaid: string | null, said: Date, extra: { waitingOn?: string | null } = {}): Promise<any | null> => {
    if (!externalId) return null;
    for (const ex of await have()) {
      const fuller = theFullerPromise({ text: ex.text, when: ex.dueSaid }, { text, when: whenSaid });
      if (fuller === 'incoming') { await prisma.commitment.update({ where: { id: ex.id }, data: { text, dueSaid: whenSaid ?? ex.dueSaid, ...(extra.waitingOn ? { waitingOn: extra.waitingOn } : {}) } }); return ex; }
      if (fuller === 'existing' || aCommitmentKey(ex.text, ex.dueSaid) === aCommitmentKey(text, whenSaid)) {
        if (extra.waitingOn && !ex.waitingOn) await prisma.commitment.update({ where: { id: ex.id }, data: { waitingOn: extra.waitingOn } });
        return ex;
      }
    }
    const made: any = await addACommitment(prisma, { organizationId: contact.organizationId, personExternalId: externalId, text, dueSaid: whenSaid, dueAt: null, source: SOURCE, statedAt: said });
    if (extra.waitingOn) await prisma.commitment.update({ where: { id: made.id }, data: { waitingOn: extra.waitingOn } });
    wrote.commitments += 1;
    return made;
  };

  /*
   * WHAT A PERSON OR A DOCUMENT SAYS HAPPENED IS A CLAIM UNTIL SOMETHING INDEPENDENT SHOWS IT (Fatima round 2, C1). A document that carries a claim is never its own
   * proof: each outcome is matched to the documents that did NOT carry it. A claim somebody disputes (the sender, or a reviewer in the document) stays disputed.
   * When the sender, in their own message, says the figures in what they forwarded are unsupported, every claim read out of those documents is disputed with it.
   */
  const generalDispute = readings.some(({ item, said }) => !item.isDocument && said.disputesWhatWasForwarded === true);
  const carriers = new Set(documents.map((d) => d.materialId));
  const isDisputedMark = (r: any) => String(r?.provenBy ?? '').startsWith('disputed:');
  /** Keeps a disputed claim open and says so on the row. A row that is already settled by a document that did not carry the claim stands. */
  const keepDisputed = async (text: string, item: AnItemTheySent): Promise<void> => {
    const row: any = await put(text, null, item.at ?? now);
    if (!row) return;
    /* A settled row stands only if what settled it is another document: one that is here in this batch as a carrier, or whose own words hold the claim, was only the claim again. */
    const proofId = String(row.provenBy ?? '').startsWith('material:') ? String(row.provenBy).slice(9) : null;
    const proof: any = proofId && !carriers.has(proofId) ? await prisma.principalMaterial.findFirst({ where: { id: proofId, fromUserId: `contact:${contact.id}` } }).catch(() => null) : null;
    const independent = !!proof && !String(proof.text ?? '').toLowerCase().replace(/\s+/g, ' ').includes(aCommitmentKey(text, null));
    if (row.state === 'KEPT' && independent) return;
    await prisma.commitment.update({ where: { id: row.id }, data: { state: 'OPEN', resolvedAt: null, provenBy: `disputed:${item.materialId ?? 'said'}` } });
  };

  for (const { item, said } of readings) {
    for (const d of said.disputed ?? []) await keepDisputed(d.text, item);
    for (const c of said.commitments) await put(c.text, c.whenSaid, item.at ?? now, { waitingOn: c.waitingOn });
    /* A blocker is kept as an open matter when it says who or what it waits on. A fact about the day ("the road was bad") is not a matter on anybody's list (Fatima round 1, I-10). */
    for (const b of said.blockers) { if (!b.waitingOn) continue; await put(b.text, null, item.at ?? now, { waitingOn: b.waitingOn }); wrote.blockers += 1; }
    /* Something that happened on the day is never a line on anybody's list, and nothing is asked about it (Dangote rerun, N10). */
    /* What they now say about a promise reaches it: a new day, what it waits on, and "not finished after all" (D10: "approved in principle" was never recorded). A claim only ever goes down on their word: a promise counted as done with no proof is open again, and one a document proves stands. */
    for (const u of said.updates ?? []) {
      const row = (await have()).find((c) => c.id === u.commitmentId);
      if (!row) continue;
      const reopen = u.notFinished && row.state === 'KEPT' && !String(row.provenBy ?? '').startsWith('material:');
      await prisma.commitment.update({ where: { id: row.id }, data: { ...(u.whenSaid ? { dueSaid: u.whenSaid } : {}), ...(u.waitingOn ? { waitingOn: u.waitingOn } : {}), ...(reopen ? { state: 'OPEN', resolvedAt: null } : {}) } });
    }
    /* A matter that now needs her decision is written where the register reads a decision (Dangote rerun, N7). It is theirs to raise and hers to decide: nothing is decided here. */
    for (const d of said.decisions ?? []) {
      const row: any = d.commitmentId ? (await have()).find((c) => c.id === d.commitmentId) : await put(d.about, null, item.at ?? now);
      if (!row || !prisma.registerNote?.upsert) continue;
      const where = { principalUserId_sourceKind_sourceId: { principalUserId: contact.principalUserId, sourceKind: 'commitment', sourceId: row.id } };
      await prisma.registerNote.upsert({ where, create: { organizationId: contact.organizationId, principalUserId: contact.principalUserId, sourceKind: 'commitment', sourceId: row.id, awaiting: 'decision', decisionQuestion: d.question }, update: { awaiting: 'decision', decisionQuestion: d.question } }).catch(() => undefined);
    }
    for (const o of said.outcomes) {
      /* A result read out of a document is that document's claim: nothing shows it unless another document does, and the person who forwarded it is not asked to prove it. */
      const fromADocument = item.isDocument;
      if (fromADocument && generalDispute) { await keepDisputed(o.text, item); continue; }
      const target: any = o.commitmentId ? (await have()).find((c) => c.id === o.commitmentId) : await put(o.text, null, item.at ?? now);
      if (!target) continue;
      /* A document that shows THIS, and did not carry it, is what shows it. Their word alone, a document about something else, or the document that made the claim is kept as their word: the register calls that "unverified". */
      const others = documents.filter((d) => d.materialId !== item.materialId);
      const shownBy = others.length && mind?.whichShowsIt ? await mind.whichShowsIt({ thing: target.text, by: first, documents: others.map((d) => ({ id: d.materialId!, name: 'a document they sent', text: d.text })) }).catch(() => null) : null;
      const proof = shownBy ? others.find((d) => d.materialId === shownBy) ?? null : null;
      /* A promise already counted as done is counted again only when this brings its first proof; a proof it has stands (D14: an outcome can now be tied to a promise already counted). */
      if (target.state === 'KEPT' && (!proof || String(target.provenBy ?? '').startsWith('material:'))) continue;
      /* A claim somebody disputed stays open until something independent shows it. */
      if (isDisputedMark(target) && !proof) continue;
      await markACommitmentDone(prisma, target.id);
      await prisma.commitment.update({ where: { id: target.id }, data: { provenBy: proof ? `material:${proof.materialId}` : null } });
      wrote.kept += 1;
      if (o.commitmentId) keptEarlier += 1;
      if (!proof && !fromADocument && !asked && (await mayAskOnce(prisma, contact, 'q:result', now, since))) asked = THE_ONE_QUESTION.done(first, theWords(target.text));
    }
    for (const ans of said.answers) {
      await markAnswered(prisma, contact, ans.slug, item.materialId ? `material:${item.materialId}` : null, now);
      wrote.answered.push(ans.slug);
    }
  }

  /* Anything they send after an ask Fatima gave as a standing instruction is their answer to it. */
  if (a.items.some((i) => i.text.trim())) {
    const asks: any[] = (await prisma.informationGap.findMany({ where: { principalUserId: contact.principalUserId, askedOfEmail: contact.contactKey, state: 'asked', gapKey: { startsWith: 'instr:' } } })) ?? [];
    for (const g of asks) if (g.askedAt && new Date(g.askedAt).getTime() <= now.getTime()) await prisma.informationGap.update({ where: { id: g.id }, data: { state: 'answered', answeredAt: now, answeredFrom: a.items[0].materialId ? `material:${a.items[0].materialId}` : null } });
  }

  /* A thin answer earns one focused question, and only when nothing else they sent already covers it. */
  const covered = wrote.commitments || wrote.kept || wrote.answered.length || wrote.blockers;
  const thin = readings.map((r) => r.said.vague).find((v) => !!v);
  if (thin && !covered && !asked) {
    const slug = thin.how === 'ongoing' ? 'q:what_changed' : thin.how === 'done' ? 'q:result' : 'q:when';
    if (await mayAskOnce(prisma, contact, slug, now, since)) asked = THE_ONE_QUESTION[thin.how](first, theWords(thin.about));
  }

  const reply = asked ?? (wrote.commitments + keptEarlier ? THANKS_FOR_THE_UPDATE(first, wrote.commitments + keptEarlier) : covered ? THANKS_AND_COVERED(first) : null);
  return { reply, wrote, asked, readings: readings.map((r) => r.said) };
}
