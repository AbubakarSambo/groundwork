/**
 * WHICH MONTHS A FORWARDED DOCUMENT COVERS (Ebele round 1, I-09). Coverage used to be read from when a record arrived, so ten monthly notes forwarded in
 * one afternoon in November covered November and nothing else, and the year-end draft waited for months that were already in the record.
 * A note covers the month it says it is about: the date in its words, a month and a year written out, or a file name that carries one. The words are
 * read by plain date reading and never by a model, because what she forwards is read by nothing outside the code that keeps it
 * (executive-onboarding/nothing-forwarded-reaches-a-model-or-a-provider.spec.ts). A document that gives no month covers none, and is still kept.
 */
const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
const monthNumber = (word: string): number | null => {
  const w = word.toLowerCase();
  const i = MONTH_NAMES.indexOf(w);
  if (i >= 0) return i + 1;
  const s = SHORT.indexOf(w.slice(0, 3));
  return s >= 0 && (w.length === 3 || w === 'sept') ? s + 1 : null;
};
const key = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

/** The months, as "2026-05", a document says it is about. Only the year asked for. Most specific reading first: its own date, then a written month. */
export function theMonthsADocumentCovers(a: { fileName?: string | null; subject?: string | null; text?: string | null }, year: number): string[] {
  const head = String(a.text ?? '').slice(0, 1500);
  const found = new Set<string>();
  const add = (y: number, m: number) => { if (y === year && m >= 1 && m <= 12) found.add(key(y, m)); };
  /* Dates written as numbers: 2026-05-18, 18-05-2026, 18/05/2026. */
  for (const m of head.matchAll(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])(?:[-/.](?:0?[1-9]|[12]\d|3[01]))?\b/g)) add(Number(m[1]), Number(m[2]));
  for (const m of head.matchAll(/\b(?:0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2})\b/g)) add(Number(m[2]), Number(m[1]));
  /* A month and a year written out: "May 2026", "18 May 2026", "May, 2026". */
  for (const m of head.matchAll(/\b(?:\d{1,2}(?:st|nd|rd|th)?\s+)?([A-Za-z]{3,9})\.?,?\s+(20\d{2})\b/g)) { const n = monthNumber(m[1]); if (n) add(Number(m[2]), n); }
  if (found.size) return [...found].sort();
  /* No date in the words: the name it was given ("activity-2026-05-May.txt", "Quarter notes, March 2026"). */
  const named = `${a.fileName ?? ''} ${a.subject ?? ''}`;
  for (const m of named.matchAll(/(20\d{2})[-_.\s](0?[1-9]|1[0-2])(?!\d)/g)) add(Number(m[1]), Number(m[2]));
  for (const m of named.matchAll(/([A-Za-z]{3,9})[-_.,\s]+(20\d{2})/g)) { const n = monthNumber(m[1]); if (n) add(Number(m[2]), n); }
  return [...found].sort();
}

/**
 * What the principal's kept material covers: one source for each month a document says it is about. A plain email or WhatsApp message counts too (Halden stress
 * test, D9: 9,400 of the 10,452 items on her record were messages, and none shaped the report): it covers the month it says it is about, or else the month it
 * was written in. A duplicate and an unreadable file add nothing. Read from the record each time, so a restart loses nothing.
 */
export async function whatHerMaterialCovers(prisma: any, a: { principalUserId: string; year: number }): Promise<{ at: Date; kind: string; workstream: string | null; owner: string; id: string; fileName: string; covers: string[] }[]> {
  const rows: any[] = (await prisma.principalMaterial?.findMany?.({ where: { principalUserId: a.principalUserId } }).catch(() => [])) ?? [];
  const out: { at: Date; kind: string; workstream: string | null; owner: string; id: string; fileName: string; covers: string[] }[] = [];
  for (const r of rows) {
    if (r.state !== 'kept' || r.kind === 'archive') continue;
    if (r.kind === 'message' && !String(r.text ?? '').trim()) continue;
    const stated = theMonthsADocumentCovers({ fileName: r.kind === 'message' ? null : r.fileName, subject: r.subject, text: r.text }, a.year);
    const at = r.receivedAt ? new Date(r.receivedAt) : null;
    const covers = stated.length || r.kind !== 'message' ? stated : at && at.getUTCFullYear() === a.year ? [key(a.year, at.getUTCMonth() + 1)] : [];
    for (const m of covers) out.push({ at: new Date(Date.UTC(a.year, Number(m.slice(5)) - 1, 15)), kind: r.kind === 'message' ? 'message' : 'document', workstream: null, owner: 'unconfirmed', id: r.id, fileName: r.fileName, covers: [m] });
  }
  return out;
}

/** The plain emails and WhatsApp messages she, somebody for her, or her team sent, that are kept and have words. Evidence like a file, never a monthly note. */
export async function theMessagesSheKept(prisma: any, a: { principalUserId: string }): Promise<{ id: string; receivedAt: Date; text: string; subject: string | null; channel: string | null }[]> {
  const rows: any[] = (await prisma.principalMaterial?.findMany?.({ where: { principalUserId: a.principalUserId } }).catch(() => [])) ?? [];
  return rows.filter((r) => r.state === 'kept' && r.kind === 'message' && String(r.text ?? '').trim()).map((r) => ({ id: r.id, receivedAt: new Date(r.receivedAt), text: String(r.text), subject: r.subject ?? null, channel: r.channel ?? null }));
}

/**
 * THE WORDS OF THE LAST FEW WEEKS, FOR THE YEAR-END WRITER (Batch F, F1). What her team sent in messages and voice notes, with who sent it, and her own words to
 * her assistant, never what she forwarded. The year-end writer reads them under its one allowance (nothing-forwarded-reaches-a-model-or-a-provider.spec.ts) to
 * find what only she can decide; nothing here goes to a model by itself.
 */
export async function theRecentWordsOnHerRecord(prisma: any, a: { principalUserId: string; since: Date; until: Date }): Promise<{ team: { id: string; receivedAt: Date; text: string; contact: { name: string; personId: string | null } }[]; hers: { receivedAt: Date; text: string }[] }> {
  const rows: any[] = (await prisma.principalMaterial?.findMany?.({ where: { principalUserId: a.principalUserId, state: 'kept', kind: { in: ['message', 'voice'] }, receivedAt: { gte: a.since, lte: a.until } }, orderBy: { receivedAt: 'desc' }, take: 400 }).catch(() => [])) ?? [];
  const recent = rows.filter((r) => r.state === 'kept' && (r.kind === 'message' || r.kind === 'voice') && String(r.text ?? '').trim() && new Date(r.receivedAt) >= a.since && new Date(r.receivedAt) <= a.until)
    .sort((x, y) => new Date(y.receivedAt).getTime() - new Date(x.receivedAt).getTime());
  const contacts: any[] = (await prisma.outreachContact?.findMany?.({ where: { principalUserId: a.principalUserId } }).catch(() => [])) ?? [];
  const contactOf = (from: string) => contacts.find((c) => `contact:${c.id}` === from) ?? null;
  return {
    team: recent.filter((r) => contactOf(String(r.fromUserId ?? ''))).map((r) => { const c = contactOf(r.fromUserId); return { id: r.id, receivedAt: new Date(r.receivedAt), text: String(r.text), contact: { name: String(c.name ?? 'a member of the team'), personId: c.personId ?? null } }; }),
    hers: recent.filter((r) => r.fromUserId === a.principalUserId && !/^-{3,}\s*forwarded/i.test(String(r.text).trim())).map((r) => ({ receivedAt: new Date(r.receivedAt), text: String(r.text) })),
  };
}

/** The files she (or somebody for her, or her team) sent that are kept, whether or not they say which month they are about. */
export async function theFilesSheKept(prisma: any, a: { principalUserId: string }): Promise<{ id: string; fileName: string; receivedAt: Date; text: string | null; subject: string | null }[]> {
  const rows: any[] = (await prisma.principalMaterial?.findMany?.({ where: { principalUserId: a.principalUserId } }).catch(() => [])) ?? [];
  return rows.filter((r) => r.state === 'kept' && r.kind !== 'message' && r.kind !== 'archive').map((r) => ({ id: r.id, fileName: r.fileName, receivedAt: new Date(r.receivedAt), text: r.text ?? null, subject: r.subject ?? null }));
}

/** The kept files, each with the months it says it is about and its words: the shape the monthly notes are read from (year-end/the-year-end-content.ts theMonthsWithANote). */
export async function theFilesWithTheirMonths(prisma: any, a: { principalUserId: string; year: number }): Promise<{ origin: string; covers: string[]; text: string | null }[]> {
  const forwarded = await whatHerMaterialCovers(prisma, a);
  return (await theFilesSheKept(prisma, a)).filter((f) => f.receivedAt.getUTCFullYear() === a.year).map((f) => ({ origin: 'forwarded', text: f.text, covers: [...new Set(forwarded.filter((x) => x.id === f.id && x.kind === 'document').flatMap((x) => x.covers))] }));
}
