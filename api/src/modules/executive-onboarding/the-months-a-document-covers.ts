/**
 * WHICH MONTHS A FORWARDED DOCUMENT COVERS (Fatima round 1, I-09). Coverage used to be read from when a record arrived, so ten monthly notes forwarded in
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
 * What the principal's kept material covers: one source for each month a document says it is about. Kept files only: a duplicate, an unreadable file
 * and a plain message add nothing. Read from the record each time, so a restart loses nothing.
 */
export async function whatHerMaterialCovers(prisma: any, a: { principalUserId: string; year: number }): Promise<{ at: Date; kind: string; workstream: string | null; owner: string; id: string; fileName: string; covers: string[] }[]> {
  const rows: any[] = (await prisma.principalMaterial?.findMany?.({ where: { principalUserId: a.principalUserId } }).catch(() => [])) ?? [];
  const out: { at: Date; kind: string; workstream: string | null; owner: string; id: string; fileName: string; covers: string[] }[] = [];
  for (const r of rows) {
    if (r.state !== 'kept' || r.kind === 'message' || r.kind === 'archive') continue;
    for (const m of theMonthsADocumentCovers({ fileName: r.fileName, subject: r.subject, text: r.text }, a.year)) {
      out.push({ at: new Date(Date.UTC(a.year, Number(m.slice(5)) - 1, 15)), kind: 'document', workstream: null, owner: 'unconfirmed', id: r.id, fileName: r.fileName, covers: [m] });
    }
  }
  return out;
}

/** The files she (or somebody for her, or her team) sent that are kept, whether or not they say which month they are about. */
export async function theFilesSheKept(prisma: any, a: { principalUserId: string }): Promise<{ id: string; fileName: string; receivedAt: Date; text: string | null; subject: string | null }[]> {
  const rows: any[] = (await prisma.principalMaterial?.findMany?.({ where: { principalUserId: a.principalUserId } }).catch(() => [])) ?? [];
  return rows.filter((r) => r.state === 'kept' && r.kind !== 'message' && r.kind !== 'archive').map((r) => ({ id: r.id, fileName: r.fileName, receivedAt: new Date(r.receivedAt), text: r.text ?? null, subject: r.subject ?? null }));
}

/** The kept files, each with the months it says it is about and its words: the shape the monthly notes are read from (year-end/the-year-end-content.ts theMonthsWithANote). */
export async function theFilesWithTheirMonths(prisma: any, a: { principalUserId: string; year: number }): Promise<{ origin: string; covers: string[]; text: string | null }[]> {
  const forwarded = await whatHerMaterialCovers(prisma, a);
  return (await theFilesSheKept(prisma, a)).filter((f) => f.receivedAt.getUTCFullYear() === a.year).map((f) => ({ origin: 'forwarded', text: f.text, covers: [...new Set(forwarded.filter((x) => x.id === f.id).flatMap((x) => x.covers))] }));
}
