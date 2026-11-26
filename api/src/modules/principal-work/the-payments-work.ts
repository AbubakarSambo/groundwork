/**
 * THE PAYMENTS TRACKER, FROM THE FORWARD TO THE QUESTIONS (Ebele, increment 6b; plan section 12).
 *
 * She, or the person who keeps the payments for her, forwards the tracker (an Excel or CSV sheet, with the approval email beside it). This reads it, keeps what
 * it said, holds it against the record, and:
 *   - says nothing is "paid" unless the record has proof, and says how many are said to be paid with none;
 *   - asks each discrepancy ONCE of the person who can answer it, with the context in the message (the payee, the amount, the file, what the record shows);
 *   - tells whoever sent it, once, what was read and what was asked.
 * It never approves a payment, never pays one, and never writes "paid" into the record: the sheet's word is kept as the sheet's word.
 *
 * Reuses what is already there: the sheet is read to text by the one reader uploads use; the approval is the spend request (`spend_requests`) and the
 * correspondence she forwarded; the obligations on her check-ins (`obligations`) are linked by the payee; a question is recorded as a gap so a reply closes it.
 */
import { readTheCells } from '../documents/a-file-as-cells';
import { sayMoney, sayTotals, totalsByCurrency, toDecimalText, fromDecimal } from './the-money';
import { lineKeyOf, payeeKey, readTheTrackerReadingItsHeadings, referenceKey, type AHeadingReader, type ATrackerLine } from './the-payments-tracker';
import { hasProof, isPaidWithProof, SOUNDS_LIKE_AN_APPROVAL, SOUNDS_LIKE_PROOF, theDiscrepancies, type ADiscrepancy, type ALineOnRecord, type ALinks, type ARef } from './the-payments-reconcile';
import { anAskKey, giveTheAskBack, queueTheAsk, theAskWent, theQuestionsOnRecordFor } from '../executive-onboarding/information-gaps';
import { herMaterialToSearch, theTeamSheNamed, type ABatchForWork, type AMaterialItem } from '../executive-onboarding/the-material-for-work';
import { dayWords } from '../year-end/the-year-end-content';
import { theOrganisationsSpendRequests } from '../suites/the-spend-requests-read-elsewhere';

/* ------------------------------------------------------------------ what a person reads */

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const onTheLine = (d: ADiscrepancy) => `${d.latest.payee}${d.latest.reference ? `, reference ${d.latest.reference}` : ''}`;
const inTheMiddle = (d: ADiscrepancy) => `${d.latest.payee}${d.latest.reference ? `, reference ${d.latest.reference},` : ''}`;
const amountOf = (d: ADiscrepancy) => (d.latest.amount ? sayMoney(d.latest.amount) : 'an amount I could not read');
const dueOf = (d: ADiscrepancy) => (d.latest.dueOn ? `, due on ${dayWords(d.latest.dueOn)}` : '');

export const THE_QUESTIONS = {
  'no proof': (d: ADiscrepancy) =>
    `The tracker says the payment of ${amountOf(d)} to ${onTheLine(d)}${dueOf(d)} was paid${d.latest.evidence ? `, and it names "${d.latest.evidence}" as the proof` : ''}. I have not been sent ${d.latest.evidence ? 'that document' : 'a receipt or a bank confirmation'}, so I have not recorded it as paid. Can you send the proof, or tell me if it has not been paid?`,
  'approval missing': (d: ADiscrepancy, toHer: boolean) =>
    `The tracker says the payment of ${amountOf(d)} to ${onTheLine(d)}${dueOf(d)} is approved, and I have not seen an approval for it. ${toHer ? 'Did you approve it? If you did, please forward the email or message where you said so.' : 'Who approved it? Please forward the email or message where they said so.'}`,
  'two amounts': (d: ADiscrepancy) => `The payment to ${inTheMiddle(d)} appears with two different amounts: ${list(d.versions)}. Which amount is right?`,
  'two statuses': (d: ADiscrepancy) => `The payment of ${amountOf(d)} to ${inTheMiddle(d)} is shown in two different ways: ${list(d.versions)}. Which one is right?`,
} as const;

/** The questions, one for each payment, numbered when there is more than one. A payment the sheets disagree about twice is asked about once, in one sentence that holds both. */
export function theQuestionsForThePayments(ds: ADiscrepancy[], toHer: boolean): string[] {
  const byPayment = new Map<string, ADiscrepancy[]>();
  for (const d of ds) byPayment.set(d.paymentKey, [...(byPayment.get(d.paymentKey) ?? []), d]);
  const lines = [...byPayment.values()].map((group) => {
    const has = (k: ADiscrepancy['kind']) => group.find((d) => d.kind === k);
    const amounts = has('two amounts'); const statuses = has('two statuses'); const proof = has('no proof'); const approval = has('approval missing');
    const lead = group[0];
    if (amounts && statuses) {
      /* One sentence for each row of each sheet, so what disagrees is laid side by side and not run together in one list. */
      const rows = [...new Map([...amounts.lines, ...statuses.lines].map((l) => [`${l.fileName}:${l.rowNumber}`, l])).values()];
      const says = rows.map((l) => `${l.fileName}, row ${l.rowNumber}, says ${[l.amount ? sayMoney(l.amount) : null, l.statedStatus].filter(Boolean).join(' and ')}.`);
      return `The payment to ${inTheMiddle(lead)} is not the same in every place. ${says.join(' ')} Which is right?`;
    }
    if (proof && approval) return `The tracker says the payment of ${amountOf(proof)} to ${onTheLine(proof)}${dueOf(proof)} was paid and approved. I have not been sent ${proof.latest.evidence ? 'that document' : 'a receipt or a bank confirmation'}, and I have not seen an approval, so I have not recorded it as paid. ${toHer ? 'Can you send the proof, and did you approve it?' : 'Can you send the proof, and tell me who approved it?'}`;
    if (statuses && proof) return `The payment of ${amountOf(statuses)} to ${inTheMiddle(lead)} is shown in two different ways: ${list(statuses.versions)}. I have not been sent ${proof.latest.evidence ? 'that document' : 'a receipt or a bank confirmation'}, so I have not recorded it as paid. Which one is right, and if it was paid, can you send the proof?`;
    return group.map((d) => (d.kind === 'approval missing' ? THE_QUESTIONS[d.kind](d, toHer) : THE_QUESTIONS[d.kind](d))).join(' ');
  });
  return lines.map((t, i) => `${lines.length > 1 ? `${i + 1}. ` : ''}${t}`);
}

export const THE_ASK_HEADING = 'A question about a payment';
export const theAskIntro = (first: string, file: string, _sentOn: string, who: string | null, n: number) =>
  `${first}, I read ${file}${who ? `, which ${who} sent` : ''}. I need your help with ${n === 1 ? 'one payment' : `${n} payments`}.`;
export const theAskInTheReply = (n: number) => `${n === 1 ? 'One needs' : `${n} need`} your answer.`;
export const theAskClose = 'Please reply to this message. I have not approved or paid anything.';
export const AND_MORE = (n: number) => `${plural(n, 'more question', 'more questions')} will follow once these are answered.`;

export interface TheSummary { file: string; read: number; total: ReturnType<typeof totalsByCurrency>; /** Every payment the record holds, from every sheet: the one count (thePaymentCounts) that every message that gives a number uses. */ all: number; /** How many different payments this sheet is about (its rows can say one payment twice). */ inFile: number; paidWithProof: number; saidPaidNoProof: number; unreadable: { rowNumber: number; because: string }[]; askedOf: string[]; forYou: number; discrepancies: number; alreadyAsked: number }

export function theTrackerSummary(s: TheSummary): string {
  const parts: string[] = [];
  parts.push(`I have read ${s.file}. It lists ${plural(s.read, 'payment', 'payments')}${s.read ? `, ${sayTotals(s.total)} in all` : ''}.`);
  if (s.all !== s.inFile) parts.push(`With what you sent before, I now hold ${plural(s.all, 'payment', 'payments')} in all.`);
  if (s.paidWithProof) parts.push(`${s.paidWithProof === 1 ? 'One is' : `${s.paidWithProof} are`} paid, with proof.`);
  if (s.saidPaidNoProof) parts.push(`${plural(s.saidPaidNoProof, 'payment is', 'payments are')} said to be paid, with no proof yet.`);
  if (s.unreadable.length) parts.push(`${plural(s.unreadable.length, 'row', 'rows')} could not be read. ${s.unreadable[0].because[0].toUpperCase()}${s.unreadable[0].because.slice(1)} in row ${s.unreadable[0].rowNumber}${s.unreadable.length > 1 ? `, and ${s.unreadable.length - 1} more` : ''}.`);
  if (s.discrepancies) {
    const them = s.discrepancies === 1 ? 'it' : 'them';
    if (s.askedOf.length) parts.push(`I have asked ${list(s.askedOf)} about their own lines, once each.`);
    if (s.forYou) parts.push(`${s.forYou === 1 ? 'One question is' : `${s.forYou} questions are`} for you, below.`);
    if (!s.askedOf.length && !s.forYou) parts.push(`I have asked about ${them} before.`);
  }
  else parts.push('Nothing in it disagrees with the record.');
  return parts.join(' ');
}

/* ------------------------------------------------------------------ the record */

export interface ThePaymentsPorts {
  /** Writes to the person who sent the batch, by the channel they used. */
  toTheSender(a: { organizationId: string; batch: ABatchForWork; subject: string; text: string }): Promise<string>;
  /** Writes to somebody else about one thing, by email. `askKey` is the questions it carries: the door marks them asked only when the mail really goes. */
  askByEmail(a: { organizationId: string; to: string; name: string; subject: string; text: string; askKey?: string }): Promise<'sent' | 'held' | 'suppressed'>;
}

const lineOnRecord = (r: any): ALineOnRecord => ({
  id: r.id, paymentKey: r.paymentKey, payee: r.payee, reference: r.reference ?? null, amount: fromDecimal(r.amount, r.currency ?? null), owner: r.owner ?? null,
  dueOn: r.dueOn ? new Date(r.dueOn) : null, statedStatus: r.statedStatus ?? null, statedApproval: r.statedApproval ?? null, evidence: r.evidence ?? null, confirmation: r.confirmation ?? null,
  fileName: r.fileName, sheet: r.sheet ?? null, rowNumber: r.rowNumber, receivedAt: new Date(r.receivedAt), sentByUserId: r.sentByUserId ?? null,
});

/** Keeps the lines of one sheet. A line already kept (the same sheet read again) is not kept twice. Returns the keys of the payments it touched. */
export async function keepTheLines(prisma: any, a: { organizationId: string; principalUserId: string; item: AMaterialItem; sentByUserId: string | null; now: Date; readHeadings?: AHeadingReader | null }): Promise<{ read: ATrackerLine[]; unreadable: { rowNumber: number; because: string }[]; fresh: number }> {
  /* The workbook's own cells where its bytes are kept, so a row is cited by its sheet and its Excel row (documents/a-file-as-cells.ts). */
  const cells = a.item.bytes ? await readTheCells(a.item.bytes, a.item.fileName, a.item.mimeType) : null;
  const { lines, unreadable } = await readTheTrackerReadingItsHeadings(a.item.text, a.readHeadings, cells);
  let fresh = 0;
  for (const l of lines) {
    try {
      await prisma.paymentTrackerLine.create({
        data: {
          organizationId: a.organizationId, principalUserId: a.principalUserId, lineKey: lineKeyOf(a.item.hash, a.item.fileName, l.rowNumber, l.sheet), fileName: a.item.fileName, sheet: l.sheet ?? null, rowNumber: l.rowNumber,
          paymentKey: l.paymentKey, payee: l.payee, reference: l.reference, description: l.description, amount: l.amount ? toDecimalText(l.amount.minor) : null, currency: l.amount?.currency ?? null,
          owner: l.owner, dueOn: l.dueOn, statedStatus: l.statedStatus, statedApproval: l.statedApproval, evidence: l.evidence, confirmation: l.confirmation, rawRow: l.raw as any, sentByUserId: a.sentByUserId, receivedAt: a.item.receivedAt,
        },
      });
      fresh++;
    } catch (err: any) {
      if (err?.code !== 'P2002') throw err;
    }
  }
  return { read: lines, unreadable, fresh };
}

/** What the record holds against one payment: the spend request, the approval and proof she was sent, and the obligation on her check-ins. */
function theLinksOf(a: { line: ALineOnRecord; mentioning: (terms: string[]) => AMaterialItem[]; spends: any[]; obligations: any[] }): ALinks {
  const { line } = a;
  const names = [payeeKey(line.payee), referenceKey(line.reference)].filter((x) => x.length >= 3);
  const squash = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const about = a.spends.filter((s) => names.some((n) => squash(String(s.what ?? '')).includes(squash(n))));
  /* A request about the same payee for another amount is still the one the line is held against, so that a different amount is seen. One for another payee is not. */
  const spend = about.find((s) => { const m = fromDecimal(s.amount, line.amount?.currency ?? null); return !!m && !!line.amount && m.minor === line.amount.minor; }) ?? about[0];
  const spendOnRecord = spend ? { id: spend.id, amount: fromDecimal(spend.amount, line.amount?.currency ?? null) ?? { minor: 0, currency: null }, status: String(spend.status), paidOn: spend.paidOn ? new Date(spend.paidOn) : null, evidenceGiven: Array.isArray(spend.evidenceGiven) ? spend.evidenceGiven : [] } : null;
  const terms = [payeeKey(line.payee), line.reference ?? '', line.evidence ?? ''].filter((x) => x.length >= 3);
  const mentions = a.mentioning(terms);
  const refs = (xs: AMaterialItem[]): ARef[] => xs.map((m) => ({ id: m.id, fileName: m.fileName }));
  const approvalMail = refs(mentions.filter((m) => SOUNDS_LIKE_AN_APPROVAL.test(`${m.fileName}\n${m.text ?? ''}`)));
  const proofDocs = refs(mentions.filter((m) => SOUNDS_LIKE_PROOF.test(`${m.fileName}\n${m.text ?? ''}`) && m.kind !== 'message'));
  const obligation = a.obligations.find((o) => names.some((n) => squash(String(o.says)).includes(squash(n)))) ?? null;
  return { spend: spendOnRecord, approvalMail, proofDocs, obligation: obligation ? { id: obligation.id, says: obligation.says } : null, confirmation: line.confirmation ?? null };
}

/** The whole picture of her payments now, from every line kept, held against the record as it is now. */
export async function thePaymentsNow(prisma: any, a: { organizationId: string; principalUserId: string }): Promise<{ lines: ALineOnRecord[]; linksOf: (key: string) => ALinks; discrepancies: ADiscrepancy[] }> {
  const rows: any[] = (await prisma.paymentTrackerLine?.findMany?.({ where: { principalUserId: a.principalUserId } }).catch(() => [])) ?? [];
  const lines = rows.map(lineOnRecord);
  const grounds: any[] = (await prisma.ground?.findMany?.({ where: { organizationId: a.organizationId, initiatorId: a.principalUserId }, select: { id: true } }).catch(() => [])) ?? [];
  const obligations: any[] = grounds.length ? (await prisma.obligation?.findMany?.({ where: { groundId: { in: grounds.map((g) => g.id) } } }).catch(() => [])) ?? [] : [];
  const spends: any[] = lines.length ? await theOrganisationsSpendRequests(prisma, a.organizationId) : [];
  const trackerFiles = [...new Set(lines.map((l) => l.fileName))];
  const mentioning = lines.length ? await herMaterialToSearch(prisma, { principalUserId: a.principalUserId, exceptFiles: trackerFiles }) : () => [];
  const linkMap = new Map<string, ALinks>();
  for (const l of lines) if (!linkMap.has(l.paymentKey)) {
    const latest = [...lines].filter((x) => x.paymentKey === l.paymentKey).sort((x, y) => x.receivedAt.getTime() - y.receivedAt.getTime() || x.rowNumber - y.rowNumber).pop()!;
    linkMap.set(l.paymentKey, theLinksOf({ line: latest, mentioning, spends, obligations }));
  }
  const linksOf = (k: string) => linkMap.get(k) ?? { spend: null, approvalMail: [], proofDocs: [], obligation: null, confirmation: null };
  return { lines, linksOf, discrepancies: theDiscrepancies(lines, linksOf) };
}

/**
 * THE ONE COUNT OF HER PAYMENTS (Ebele round 2, C2: "5 payments ... 9 things do not agree" in one message, "2 payments ... 5 things" in another, "6 and 6" in a
 * third, each counting its own sheet). Every message that gives a number about her payments reads it from here: the latest line for each payment, from every sheet
 * kept, held against the record as it is now.
 */
export function thePaymentCounts(now: Awaited<ReturnType<typeof thePaymentsNow>>): { payments: number; paidWithProof: number; saidPaidNoProof: number; discrepancies: number; latest: ALineOnRecord[] } {
  const latest = new Map<string, ALineOnRecord>();
  for (const l of [...now.lines].sort((x, y) => x.receivedAt.getTime() - y.receivedAt.getTime() || x.rowNumber - y.rowNumber)) latest.set(l.paymentKey, l);
  const each = [...latest.values()];
  return {
    payments: each.length,
    paidWithProof: each.filter((l) => isPaidWithProof(l, now.linksOf(l.paymentKey))).length,
    saidPaidNoProof: each.filter((l) => l.statedStatus === 'paid' && !hasProof(now.linksOf(l.paymentKey))).length,
    discrepancies: now.discrepancies.length,
    latest: each,
  };
}

/* ------------------------------------------------------------------ whom to ask */

export interface ThePerson { name: string; email: string; isPrincipal: boolean }

const sameName = (a: string, b: string) => { const x = a.trim().toLowerCase(); const y = b.trim().toLowerCase(); return !!x && !!y && (x === y || x.split(/\s+/)[0] === y.split(/\s+/)[0] && Math.min(x.split(/\s+/).length, y.split(/\s+/).length) === 1 || x.includes(y) || y.includes(x)); };

/**
 * THE PERSON WHO CAN ANSWER. An approval is the approver's, and she is the approver; it is asked only of a line paid with no approval anywhere, since a line the
 * office's own sheet marks Approved has its approval written down (the-payments-reconcile.ts; Halden stress test, D5). A missing proof or a disagreement
 * between two figures is for whoever owns the line (named in the sheet) if she has named and introduced them, else the person who acts for her, else her. Never somebody who only forwarded the sheet. A payee or any outsider is never asked.
 */
export function whoCanAnswer(d: ADiscrepancy, c: { principal: ThePerson; sender: ThePerson | null; team: ThePerson[]; delegates: ThePerson[] }): ThePerson {
  if (d.kind === 'approval missing') return c.principal;
  const owner = d.latest.owner ? [...c.team, ...c.delegates].find((p) => sameName(p.name, d.latest.owner!)) : null;
  if (owner) return owner;
  /* A payment line is shown only to the person who owns that payment (Hafsah's H4, taken conservatively on 13 November): somebody who only forwarded the sheet is not asked about lines that are not theirs. */
  return c.delegates[0] ?? c.principal;
}

const MOST_IN_ONE_MESSAGE = 5;
const gapWhat = (d: ADiscrepancy) => `${d.kind === 'approval missing' ? 'An approval' : d.kind === 'no proof' ? 'Proof of payment' : 'Which figure is right'} for the payment to ${d.latest.payee}.`;

/**
 * Asks each discrepancy once, of the right person, in one message per person. A discrepancy asked before (the same id, to the same person) is not asked
 * again, and one that could not be sent is let go of so it is tried at the next look.
 */
export async function askAboutThePayments(prisma: any, ports: ThePaymentsPorts, a: { organizationId: string; principalUserId: string; file: string; sentOn: Date; senderName: string | null; discrepancies: ADiscrepancy[]; who: Parameters<typeof whoCanAnswer>[1]; now: Date; theSender: ThePerson | null; batch: ABatchForWork }): Promise<{ askedOf: string[]; forTheSender: string[]; countForTheSender: number; discrepancies: number; alreadyAsked: number }> {
  const byPerson = new Map<string, { person: ThePerson; items: ADiscrepancy[] }>();
  for (const d of a.discrepancies) { const p = whoCanAnswer(d, a.who); byPerson.set(p.email, { person: p, items: [...(byPerson.get(p.email)?.items ?? []), d] }); }
  const askedOf: string[] = [];
  const forTheSender: string[] = [];
  let countForTheSender = 0;
  let alreadyAsked = 0;
  for (const { person, items } of byPerson.values()) {
    /* What this person was already asked, or is waiting to be asked, is not asked again. */
    const onRecord = await theQuestionsOnRecordFor(prisma, { principalUserId: a.principalUserId, askedOfEmail: person.email });
    const fresh = items.filter((d) => !onRecord.has(`payments:${d.id}`));
    alreadyAsked += items.length - fresh.length;
    if (!fresh.length) continue;
    const give: ADiscrepancy[] = [];
    for (const d of fresh.slice(0, MOST_IN_ONE_MESSAGE)) if (await queueTheAsk(prisma, { organizationId: a.organizationId, principalUserId: a.principalUserId, gapKey: `payments:${d.id}`, what: gapWhat(d), askedOfEmail: person.email, askedOfName: person.name })) give.push(d);
    if (!give.length) continue;
    const held = fresh.slice(MOST_IN_ONE_MESSAGE);
    const first = person.name.split(' ')[0];
    /* One question for one payment, however many ways the sheets disagree about it (Ebele round 3: the same two rows were asked about as two amounts and again as two statuses). */
    const told = theQuestionsForThePayments(give, person.isPrincipal);
    /* Whoever sent the sheet is answered in the same message, so what they are asked is in front of them with what was read. They are asked when that reply goes (readTheTrackersInABatch). */
    if (a.theSender?.email === person.email) {
      countForTheSender += told.length;
      forTheSender.push(...told, ...(held.length ? [AND_MORE(held.length)] : []));
      continue;
    }
    const text = [theAskIntro(first, a.file, dayWords(a.sentOn), a.senderName && !person.isPrincipal && a.theSender?.email === person.email ? null : a.senderName, told.length), ...told, ...(held.length ? [AND_MORE(held.length)] : []), theAskClose].join('\n\n');
    const askKey = anAskKey(a.principalUserId, 'payments', person.email);
    const outcome = await ports.askByEmail({ organizationId: a.organizationId, to: person.email, name: person.name, subject: THE_ASK_HEADING, text, askKey }).catch(() => 'suppressed' as const);
    if (outcome === 'suppressed') { await giveTheAskBack(prisma, askKey); continue; }
    askedOf.push(person.name);
  }
  return { askedOf, forTheSender, countForTheSender, discrepancies: a.discrepancies.length, alreadyAsked };
}

/**
 * One batch with a tracker in it. Idempotent end to end: the lines are kept once, each question is asked once, and the sender is told once for the batch
 * (the batch is claimed by the caller before this is called).
 */
export async function readTheTrackersInABatch(prisma: any, ports: ThePaymentsPorts, a: { batch: ABatchForWork; trackers: AMaterialItem[]; who: Parameters<typeof whoCanAnswer>[1]; senderName: string | null; theSender: ThePerson | null; now: Date; readHeadings?: AHeadingReader | null }): Promise<string[]> {
  const told: string[] = [];
  for (const item of a.trackers) {
    const kept = await keepTheLines(prisma, { organizationId: a.batch.organizationId, principalUserId: a.batch.principalUserId, item, sentByUserId: a.batch.sender.kind === 'contact' ? null : a.batch.fromUserId, now: a.now, readHeadings: a.readHeadings });
    if (!kept.read.length && !kept.unreadable.length) continue;
    const now = await thePaymentsNow(prisma, { organizationId: a.batch.organizationId, principalUserId: a.batch.principalUserId });
    const keys = new Set(kept.read.map((l) => l.paymentKey));
    const mine = now.discrepancies.filter((d) => keys.has(d.paymentKey));
    const asked = await askAboutThePayments(prisma, ports, { organizationId: a.batch.organizationId, principalUserId: a.batch.principalUserId, file: item.fileName, sentOn: item.receivedAt, senderName: a.senderName, discrepancies: mine, who: a.who, now: a.now, theSender: a.theSender, batch: a.batch });
    const counts = thePaymentCounts(now);
    const summary = theTrackerSummary({
      file: item.fileName, read: kept.read.length, total: totalsByCurrency(kept.read.map((l) => l.amount)), all: counts.payments, inFile: keys.size,
      paidWithProof: counts.paidWithProof, saidPaidNoProof: counts.saidPaidNoProof,
      unreadable: kept.unreadable, askedOf: asked.askedOf, forYou: asked.countForTheSender, discrepancies: counts.discrepancies, alreadyAsked: asked.alreadyAsked,
    });
    told.push(asked.forTheSender.length ? `${summary}\n\n${asked.forTheSender.join('\n\n')}\n\nPlease reply to this message. I have not approved or paid anything.` : `${summary} I have not approved or paid anything.`);
  }
  if (told.length) {
    const outcome = await ports.toTheSender({ organizationId: a.batch.organizationId, batch: a.batch, subject: 'The payments tracker', text: told.join('\n\n') }).catch(() => 'not_sent');
    /* The questions in the reply are asked when the reply goes, and given back when it does not. */
    if (a.theSender) {
      const askKey = anAskKey(a.batch.principalUserId, 'payments', a.theSender.email);
      if (outcome === 'sent') await theAskWent(prisma, askKey, a.now); else if (outcome !== 'held') await giveTheAskBack(prisma, askKey);
    }
  }
  return told;
}

