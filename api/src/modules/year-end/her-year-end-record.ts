/**
 * A PRINCIPAL'S REPORT HAS ONE OWNER, AND ASK READS IT (Batch D, R1 and R2; the Halden stress test of 20 November 2026).
 *
 * Ebele's "Give me the structure of the report", "Send me the draft" and "Please contact my office ..." all fell into "a report on request" and read
 * "Here is the outline with your changes. It has 0 sections." Two things owned her report. Now one does: for somebody with a year-end job, a year-end
 * draft or a senior person's setup, and for the person who acts for her, the report is the year-end draft (`theirReportIsTheYearEndDraft`), and "a
 * report on request" never opens for them.
 *
 * And every challenge question ("Which claims are weak?", "Did the October approval actually happen?", the ultimate test) was answered "There are no
 * documents here that you can open yet", although all of it is on her record. Ask now reads the record her draft is built from, the latest version
 * as it was written: what the year holds with the standing of each line (proven by a record, said with nothing to show it, disputed, open, waiting for
 * a decision, her own recollection), the outstanding register with who owns each line and when it was due, the evidence each line rests on with the day
 * it arrived, and the presentation's slides. Code writes these pages and nothing else; the model that answers reads them as data (Ask's one reader,
 * a-question-is-answered-from-the-documents.ts), so a line said with nothing to show it stays said.
 *
 * WHO READS IT. The draft is built for a delegate's reading (`forADelegate: true` in loadTheRecord), so her own private notes are never in it. She reads
 * her own; the person she lets act for her reads it through the grant (whoThisPersonActsFor), and nobody else reads anything here. Nothing here runs a
 * model, sends, or writes.
 */
import { whoThisPersonActsFor } from '../outstanding/a-delegate-acts-for-a-principal';
import { latestDraft, type TheDraftRow } from './the-year-end-versions';
import { dayWords, MONTHS, STATUS_PLAIN, type Claim, type EvidenceItem, type YearEndContent } from './the-year-end-content';
import { reportBlocks, slidesOf, whatMattersMost, theYearInWords } from './the-year-end-files';
import { thePaymentCounts, thePaymentsNow } from '../principal-work/the-payments-work';
import { hasProof, isPaidWithProof } from '../principal-work/the-payments-reconcile';
import { sayMoney } from '../principal-work/the-money';

/** Whose year-end work this person reads: their own, and that of each senior person they act for. */
async function theYearEndsTheyRead(prisma: any, organizationId: string, userId: string): Promise<string[]> {
  const grants = await whoThisPersonActsFor(prisma, organizationId, userId).catch(() => []);
  return [...new Set([userId, ...grants.map((g) => g.principalUserId)])];
}

/** Whether the principal has year-end work: a senior person's setup, the year-end job, or a draft. */
async function hasYearEndWork(prisma: any, organizationId: string, principalUserId: string): Promise<boolean> {
  const setup = await Promise.resolve(prisma.principalSetup?.findFirst?.({ where: { organizationId, principalUserId }, select: { id: true } })).catch(() => null);
  if (setup) return true;
  const job = await Promise.resolve(prisma.persistentJob?.findFirst?.({ where: { organizationId, principalUserId, kind: 'annual_report' }, select: { id: true } })).catch(() => null);
  if (job) return true;
  const draft = await Promise.resolve(prisma.yearEndDraft?.findFirst?.({ where: { organizationId, principalUserId }, select: { id: true } })).catch(() => null);
  return !!draft;
}

/**
 * THE ONE TEST OF WHO OWNS A PERSON'S REPORT. True for a senior person with year-end work, and for whoever acts for one: their report is the year-end
 * draft, and its own steps answer their words about it. False for everybody else, who keeps "a report on request" exactly as before.
 */
export async function theirReportIsTheYearEndDraft(prisma: any, organizationId: string, userId: string | null | undefined): Promise<boolean> {
  const theirs = await theYearEndWorkTheyRead(prisma, organizationId, userId);
  return theirs.own || theirs.forSomebody;
}

/** Whose year-end work they read, from the same test: their own, and that of somebody they act for. Ask gives it to the model as who they are. */
export async function theYearEndWorkTheyRead(prisma: any, organizationId: string, userId: string | null | undefined): Promise<{ own: boolean; forSomebody: boolean }> {
  if (!userId) return { own: false, forSomebody: false };
  const own = await hasYearEndWork(prisma, organizationId, userId);
  let forSomebody = false;
  for (const id of await theYearEndsTheyRead(prisma, organizationId, userId)) if (id !== userId && (await hasYearEndWork(prisma, organizationId, id))) { forSomebody = true; break; }
  return { own, forSomebody };
}

/* ------------------------------------------------------------------ the pages Ask reads */

export interface APageOfHerRecord { fileName: string; content: string }

/** How sure a line is, in the words the answer must keep. One wording for every status a line can have. */
export const STANDING_OF_A_LINE: Record<string, string> = {
  achieved: 'PROVEN by a record',
  unverified: 'SAID to be done, and nothing on the record shows it yet',
  open: 'still OPEN',
  decision: 'WAITING for a decision',
  kept: 'kept on the record',
  noted: 'what a forwarded note SAYS, not proven',
  recollection: 'her own RECOLLECTION, not proven',
  gap: 'NOTHING on the record',
  disputed: 'DISPUTED, somebody said it is not backed up',
};

const clip = (s: string, n: number) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, '')}…`; };
const AT_MOST_ON_A_PAGE = 12_000;

/** Where a line comes from, in a few words: the first record it rests on, by its title, kind and day. Never what a forwarded record says word for word: only the
 * year-end narrator may show a forwarded note to a model (nothing-forwarded-reaches-a-model-or-a-provider.spec.ts), so Ask reads the draft's checked lines, not
 * her notes (O-16, waiting on Hafsah). */
function whereItComesFrom(c: YearEndContent, refs: string[]): string {
  const e = refs.map((r) => c.evidence.find((x) => x.ref === r)).find((x): x is EvidenceItem => !!x);
  if (!e) return 'no record backs it';
  const more = refs.length > 1 ? `, and ${refs.length - 1} more ${refs.length === 2 ? 'record' : 'records'}` : '';
  return `from ${e.title ? `“${clip(e.title, 80)}”, ` : ''}${e.label}, ${dayWords(e.at)}${more}`;
}

const aLine = (c: YearEndContent, cl: Claim): string =>
  `- ${clip(cl.text, 300)} [${STANDING_OF_A_LINE[cl.status] ?? cl.status}; ${whereItComesFrom(c, cl.refs)}]${cl.note ? ` ${c.principalFirstName} said beside it “${clip(cl.note, 160)}”.` : ''}`;

/** The pages, each kept short enough to read, most decisive first. Nothing is added that the draft does not hold. */
export function thePagesOfHerRecord(row: TheDraftRow, reader: 'own' | 'delegate', question = ''): APageOfHerRecord[] {
  const c = row.content;
  const whose = reader === 'own' ? 'your' : `${c.principalFirstName}'s`;
  const status = row.status === 'final' || row.status === 'approved' ? row.status : 'a draft waiting for approval';
  const page = (fileName: string, lines: string[]) => ({ fileName, content: lines.join('\n').slice(0, AT_MOST_ON_A_PAGE) });
  const pages: APageOfHerRecord[] = [];

  /* The briefing: what matters most, and the year in a few sentences, as the report opens. */
  pages.push(page(`${whose} year-end report for ${c.year}, version ${row.version}`, [
    `This is version ${row.version} of ${whose} year-end report and presentation for ${c.year}. It is ${status}. It was built from the record on ${dayWords(c.builtAt)}.`,
    `Each line below says how sure it is in square brackets. Only a line marked PROVEN is achieved. A line marked SAID, DISPUTED, a forwarded note or a RECOLLECTION is not proven, whoever said it.`,
    whatMattersMost(c),
    ...theYearInWords(c),
    ...(c.narrative?.opening ?? []).map((o) => `- ${clip(o.text, 300)}${o.ref ? ` [${whereItComesFrom(c, [o.ref])}]` : ''}`),
  ]));

  /* The lines of the year by how far they are proven: what is achieved, what is only said, what is disputed, what waits for a decision, what is open. */
  const order = ['decision', 'disputed', 'unverified', 'achieved', 'open', 'corrections', 'record', 'gaps'];
  const sections = [...c.sections].sort((a, b) => (order.indexOf(a.id) < 0 ? 99 : order.indexOf(a.id)) - (order.indexOf(b.id) < 0 ? 99 : order.indexOf(b.id)));
  const lines: string[] = [];
  for (const s of sections) {
    if (!s.claims.length) continue;
    const month = s.id.startsWith('month:') ? `${MONTHS[Number(s.id.slice(11)) - 1] ?? ''} ` : '';
    lines.push(`${(s.title || month).toUpperCase()}:`);
    for (const cl of s.claims) lines.push(aLine(c, cl));
  }
  /* Each page is named for what she has, the way she knows it, so an answer that names where it comes from names something real (Batch F, F3; N3: "in your year, line by line"). */
  pages.push(page(`${whose} year-end report for ${c.year}, in full`, lines.length ? lines : ['Nothing is on the record for the year yet.']));

  /* The outstanding register: what is still to be delivered, who owns it, by when, and what it waits on. Owners are named; nothing judges them. */
  /* What the question names comes first, so a long list is never cut before it (Batch F, F-7: "What has Ahmed failed to deliver?" read that nothing was found, and
     Ahmed's lines were past the end of the page). The order changes; what is on the page does not. */
  const asked = new Set(String(question).toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []);
  const bears = (r: { owner: string; item: string }) => `${r.owner} ${r.item}`.toLowerCase().split(/[^a-z-]+/).filter((w) => w.length > 2 && asked.has(w)).length;
  const open = c.register.filter((r) => r.status !== 'completed' && r.status !== 'cancelled').map((r, i) => ({ r, i, n: bears(r) })).sort((x, y) => y.n - x.n || x.i - y.i).map((x) => x.r);
  pages.push(page(`${whose} outstanding list`, [
    `${open.length} ${open.length === 1 ? 'matter is' : 'matters are'} still outstanding. Each line says who owns it, when it was due, and what it rests on. It says what is outstanding, never how well anybody works.`,
    ...open.map((r) => `- ${clip(r.item, 220)}. Owner ${r.owner === 'unconfirmed' ? 'not confirmed' : r.owner === 'you' ? c.principalFirstName : r.owner}. ${STATUS_PLAIN[r.status] ?? r.status}.${r.dueOn ? ` It was due on ${dayWords(r.dueOn)}${r.dueInferred ? ', a date worked out from what was said' : ''}.` : ' No date was given.'}${r.decision ? ` The decision needed is ${clip(r.decision, 160)}.` : ''}${r.dependency ? ` It waits on ${clip(r.dependency, 120)}.` : ''}${r.disputed ? ' Somebody said it is not backed up.' : ''} [${whereItComesFrom(c, r.refs)}]`),
  ]));

  /* The presentation, slide by slide, so "Is my presentation ready? How many slides?" is answered from the file itself. */
  const slides = slidesOf(c, { version: row.version, status: row.status });
  pages.push(page(`${whose} leadership presentation, version ${row.version}`, [
    `The leadership presentation of version ${row.version} has ${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}. It is ${status}.`,
    ...slides.map((s, i) => `Slide ${i + 1}, “${s.title}”. ${s.lines.map((l) => clip(l, 200)).join(' ')}`),
  ]));

  /* The records the lines rest on, newest first, with the day each arrived. */
  const evidence = [...c.evidence].sort((a, b) => String(b.at).localeCompare(String(a.at)));
  pages.push(page(`the evidence index of ${whose} year-end report`, evidence.map((e) => `- ${e.title ? `“${clip(e.title, 80)}”, ` : ''}${e.label}, ${dayWords(e.at)}.`)));
  return pages;
}

/**
 * THE RECORD ASK READS FOR HER (R2). The latest version of each year-end draft this person may read: her own, or the one of each senior person she acts
 * for. Empty for everybody else, so their Ask reads exactly what it read before.
 */
export async function herYearEndRecordForAsk(prisma: any, a: { organizationId: string; userId: string; now?: Date; /** The question, so what it names is read first. */ question?: string }): Promise<APageOfHerRecord[]> {
  const year = (a.now ?? new Date()).getUTCFullYear();
  const out: APageOfHerRecord[] = [];
  for (const principalUserId of await theYearEndsTheyRead(prisma, a.organizationId, a.userId)) {
    /* Anybody but herself is here only through a live grant (whoThisPersonActsFor): a revoked one reads nothing. */
    const own = principalUserId === a.userId;
    const row = (await latestDraft(prisma, { organizationId: a.organizationId, principalUserId, year }).catch(() => null))
      ?? (await latestDraft(prisma, { organizationId: a.organizationId, principalUserId, year: year - 1 }).catch(() => null));
    const pages = row?.content ? thePagesOfHerRecord(row, own ? 'own' : 'delegate', a.question ?? '') : [];
    const pay = await thePaymentsPage(prisma, { organizationId: a.organizationId, principalUserId, whose: own ? 'your' : `${row?.content?.principalFirstName ?? 'her'}'s` }).catch(() => null);
    /* Right after the briefing, so it is read whenever a question is about money: Ask reads the pages in order until its room is used (Batch E run: last, it was cut). */
    out.push(...pages.slice(0, 1), ...(pay ? [pay] : []), ...pages.slice(1));
  }
  return out;
}

/**
 * HER PAYMENTS, AS TODAY AND THE REPORT COUNT THEM (Halden rerun, N9: Ask said nothing on record showed whether the August payments were paid, while the sheets
 * and their bank confirmations were on the record). One line for each payment, from the one count (principal-work/the-payments-work.ts): the payee, the
 * reference, the amount, the day it was due, what the sheet says, and whether a bank confirmation or a document shows it.
 */
async function thePaymentsPage(prisma: any, a: { organizationId: string; principalUserId: string; whose: string }): Promise<APageOfHerRecord | null> {
  const now = await thePaymentsNow(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId });
  const counts = thePaymentCounts(now);
  if (!counts.payments) return null;
  /* What is said to be paid with no proof leads, then the newest first: the page is cut to what Ask can read, and those are what she is asked about (Batch E run: oldest first, August was cut). */
  const saidOnly = (l: (typeof counts.latest)[number]) => (l.statedStatus === 'paid' && !hasProof(now.linksOf(l.paymentKey)) ? 0 : 1);
  const lines = [...counts.latest].sort((x, y) => saidOnly(x) - saidOnly(y) || (y.dueOn?.getTime() ?? 0) - (x.dueOn?.getTime() ?? 0)).map((l) => {
    const links = now.linksOf(l.paymentKey);
    const standing = isPaidWithProof(l, links) ? `PROVEN paid${links.confirmation ? `, bank confirmation ${links.confirmation}` : ''}` : l.statedStatus === 'paid' && !hasProof(links) ? 'SAID to be paid, with no proof yet' : `the sheet says ${l.statedStatus ?? 'nothing about whether it was paid'}`;
    return `- ${l.payee}${l.reference ? `, reference ${l.reference}` : ''}, ${l.amount ? sayMoney(l.amount) : 'amount not readable'}${l.dueOn ? `, due on ${dayWords(l.dueOn)}` : ''}. [${standing}; from the payments sheet ${l.fileName}, row ${l.rowNumber}]`;
  });
  return { fileName: `${a.whose} payments`, content: [`${counts.payments} ${counts.payments === 1 ? 'payment is' : 'payments are'} on the record. ${counts.paidWithProof} ${counts.paidWithProof === 1 ? 'is' : 'are'} paid, with proof. ${counts.saidPaidNoProof} ${counts.saidPaidNoProof === 1 ? 'payment is' : 'payments are'} said to be paid, with no proof yet.`, ...lines].join('\n').slice(0, AT_MOST_ON_A_PAGE) };
}

/* ------------------------------------------------------------------ the structure, asked for */

const andList = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * "GIVE ME THE STRUCTURE OF THE REPORT" (R1, D1). Answered from the draft itself, never from a new outline: what matters most, the parts of the report as
 * its own headings name them, and the slides of the presentation. Read from the same writers the files are made with, so it cannot disagree with them.
 */
export function theStructureSaid(row: TheDraftRow, toName: 'you' | string): string {
  const c = row.content;
  const v = { version: row.version, status: row.status };
  const parts = reportBlocks(c, v).filter((b) => b.t === 'h2').map((b) => `“${b.text}”`);
  const slides = slidesOf(c, v);
  const status = row.status === 'final' ? 'final' : row.status === 'approved' ? 'approved' : `a draft waiting for ${toName === 'you' ? 'your' : `${c.principalFirstName}'s`} approval`;
  return [
    `Version ${row.version} of the year-end report is ${status}. ${whatMattersMost(c)}`,
    parts.length ? `The report has ${parts.length} ${parts.length === 1 ? 'part' : 'parts'}, ${andList(parts)}.` : '',
    `The presentation has ${slides.length} ${slides.length === 1 ? 'slide' : 'slides'}, ${andList(slides.map((x) => `“${x.title}”`))}.`,
    `Ask me about any part of it, or say “send me the draft” and I will email the files.`,
  ].filter(Boolean).join(' ');
}
