/**
 * "THAT'S NOT RIGHT, I SENT IT ON MONDAY" (Fatima, increment 6a; the first principle, 22 October: errors get fixed in the conversation).
 *
 * Fatima or a team member says something the record holds is wrong. It goes through the one claim probe that already exists
 * (assistant/a-correction-is-checked-like-a-claim.ts), with a record of what that person may read: a team member their own promises and the documents
 * they sent; Fatima the promises her team told Groundwork and the documents they sent. The probe checks, never accuses, asks for the proof naturally
 * when there is none, and only on "backed" is anything changed. What changes is the record itself, the commitment, so the register, the weekly
 * email and the report all read the new state, and the nudges never raise it again: a promise marked done is not chased, and one still waiting for
 * proof is left alone until the person has had time to send it. Nothing they typed is written as their words.
 */
import { checkTheCorrection, type WhatTheRecordHolds } from '../assistant/a-correction-is-checked-like-a-claim';
import { markACommitmentDone } from '../assistant/a-commitment-has-one-writer';
import { MONTHS } from '../year-end/the-year-end-content';
import { SOURCE, thePersonBehind } from './what-their-reply-says';
import type { ADocumentToRead } from './which-document-shows-it';
import { NOT_CHANGED_YET } from './the-team-words';

const day = (d: any) => { const x = new Date(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`; };

/** What the record holds that this person may read, as the claim probe is handed it. */
export async function theRecordFor(prisma: any, a: { organizationId: string; principalUserId: string; contacts: any[]; first: string }): Promise<{ record: WhatTheRecordHolds; documentsOf: Map<string, ADocumentToRead[]> }> {
  const promises: WhatTheRecordHolds['promises'] = [];
  const documents: WhatTheRecordHolds['documents'] = [];
  const documentsOf = new Map<string, ADocumentToRead[]>();
  for (const c of a.contacts) {
    const person = await thePersonBehind(prisma, c);
    if (!person) continue;
    const rows: any[] = (await prisma.commitment.findMany({ where: { organizationId: a.organizationId, personExternalId: person.externalId, source: SOURCE } })) ?? [];
    const mine: any[] = ((await prisma.principalMaterial.findMany({ where: { principalUserId: a.principalUserId, fromUserId: `contact:${c.id}` } })) ?? []).filter((m: any) => m.kind !== 'message' && m.state === 'kept').sort((x: any, y: any) => new Date(y.receivedAt).getTime() - new Date(x.receivedAt).getTime());
    for (const m of rows) {
      promises.push({ id: `commitment:${m.id}`, table: 'commitment', text: `${a.contacts.length > 1 ? `${String(c.name).split(' ')[0]}: ` : ''}${m.text}`, status: m.state === 'KEPT' ? 'DONE' : 'UNKNOWN', checkIn: 'a message to Groundwork', madeOn: day(m.statedAt ?? m.createdAt) });
      /* The documents the person who made the promise sent: the ones that could show it, to be read when a correction rests on them. */
      documentsOf.set(`commitment:${m.id}`, mine.slice(0, 10).map((d: any) => ({ id: d.id, name: d.fileName, text: String(d.text ?? '') })));
    }
    for (const d of mine.slice(0, 10)) documents.push({ name: d.fileName, on: day(d.receivedAt) });
  }
  return { record: { promises, lines: [], numbers: [], documents, firstName: a.first }, documentsOf };
}

export async function checkACorrectionOnTheTeamsWork(
  prisma: any,
  engine: { extract: (p: string, h: { role: 'user' | 'assistant'; content: string }[], t: any, o?: any) => Promise<any> },
  prompts: { getActive: (key: string) => Promise<{ content: string } | null> } | null | undefined,
  a: { organizationId: string; principalUserId: string; contacts: any[]; first: string; message: string; now: Date; /** The model's word on which document shows a thing (the team mind's whichShowsIt); none given means none shows it. */ whichShowsIt?: (a: { thing: string; documents: ADocumentToRead[] }) => Promise<string | null>; /** Fatima's own words go on to Ask when the probe cannot tell which line she means; a team member has no other door, so they are asked which. */ passOnWhenUnclear: boolean },
): Promise<string | null> {
  const { record, documentsOf } = await theRecordFor(prisma, a);
  if (!record.promises.length) return null;
  const checked = await checkTheCorrection(engine, prompts, a.message, record).catch(() => null);
  if (!checked) return null;
  if (checked.verdict === 'unclear' && a.passOnWhenUnclear) return null;
  if (checked.verdict === 'backed' && checked.promise) {
    const id = checked.promise.id.replace(/^commitment:/, '');
    if (checked.promise.nowIs === 'DONE') {
      /* A promise is marked done only on a document that shows THIS promise kept. A document about the same matter, or somebody else's earlier email, is not that: nothing changes, and the one thing that would show it is asked for once. */
      const promised = record.promises.find((p) => p.id === checked.promise!.id);
      const shownBy = await a.whichShowsIt?.({ thing: promised?.text ?? '', documents: documentsOf.get(checked.promise.id) ?? [] }).catch(() => null) ?? null;
      if (!shownBy) return NOT_CHANGED_YET(a.first);
      await markACommitmentDone(prisma, id);
      await prisma.commitment.update({ where: { id }, data: { provenBy: `material:${shownBy}`, waitingOn: null } });
    } else await prisma.commitment.update({ where: { id }, data: { state: 'SLIPPED' } });
  } else if (checked.verdict === 'needs_proof' || checked.verdict === 'contradicted') {
    /* Left as it is, and not chased while they find the proof. Only for a person speaking about their own: Fatima correcting one line does not quieten a whole team. */
    if (a.contacts.length === 1) for (const p of record.promises) await prisma.commitment.update({ where: { id: p.id.replace(/^commitment:/, '') }, data: { lastFollowedUpAt: a.now } }).catch(() => undefined);
  }
  return checked.reply;
}
