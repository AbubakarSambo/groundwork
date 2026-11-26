/**
 * WHERE THE TRACKER'S CLAIMS ARE HELD UP AGAINST THE RECORD (Ebele, increment 6b; plan section 12), in code, with no model.
 *
 * The tracker says things. The record holds the spend request (the approval workflow's own row), the correspondence she forwarded, and the proof. A
 * payment is "paid" here only when the record holds proof: a spend request finance marked paid with evidence, a document she was sent that is a receipt
 * or a bank confirmation for it, or the bank's own confirmation of the transfer written in the sheet. The tracker saying "paid" is a statement, and it is never proof. Four things are discrepancies, and each is asked about once:
 *
 *   two amounts       the same payment with two amounts (two rows, two versions of the sheet, or the sheet against the spend request)
 *   two statuses      the same payment said to be in two states, or the sheet against the spend request's decision
 *   no proof          the sheet says paid, and nothing in the record shows it
 *   approval missing  the sheet says paid or scheduled, and no approval is in the sheet or the record
 */
import { sameAmount, sayMoney, type AMoney } from './the-money';

export interface ARef { id: string; fileName: string }
export interface ALineOnRecord {
  id: string; paymentKey: string; payee: string; reference: string | null; amount: AMoney | null; owner: string | null; dueOn: Date | null;
  statedStatus: string | null; statedApproval: string | null; evidence: string | null; confirmation?: string | null; fileName: string; sheet?: string | null; rowNumber: number; receivedAt: Date; sentByUserId: string | null;
}
export interface ASpendOnRecord { id: string; amount: AMoney; status: string; paidOn: Date | null; evidenceGiven: string[] }
/** What the record holds against one payment. `confirmation` is the bank's own confirmation the sheet gives for its latest line. */
export interface ALinks { spend: ASpendOnRecord | null; approvalMail: ARef[]; proofDocs: ARef[]; obligation: { id: string; says: string } | null; confirmation?: string | null }

export type TheKind = 'two amounts' | 'two statuses' | 'no proof' | 'approval missing';
export interface ADiscrepancy {
  /** Stable for the same thing, and different when the thing changes (a third amount is a new question). */
  id: string;
  kind: TheKind;
  paymentKey: string;
  latest: ALineOnRecord;
  lines: ALineOnRecord[];
  links: ALinks;
  /** What the record disagrees about, as plain phrases ("NGN 1,250,000 in tracker.xlsx"). */
  versions: string[];
}

/* Proof is a spend request finance marked paid with evidence, a receipt or bank advice she was sent, or the bank's confirmation of the transfer in the sheet (D11). */
export const hasProof = (l: ALinks): boolean => (!!l.spend?.paidOn && l.spend.evidenceGiven.length > 0) || l.proofDocs.length > 0 || !!l.confirmation;
export const hasApproval = (l: ALinks): boolean => l.spend?.status === 'approved' || l.approvalMail.length > 0;

/** Paid, and the record shows it. The only way a payment is called paid. */
export const isPaidWithProof = (latest: ALineOnRecord, l: ALinks): boolean => latest.statedStatus === 'paid' && hasProof(l);

const amountKey = (m: AMoney | null) => (m ? `${m.minor}${m.currency ? m.currency : ''}` : 'none');
const inFile = (l: ALineOnRecord) => `${l.fileName}, ${l.sheet ? `sheet ${l.sheet}, ` : ''}row ${l.rowNumber}`;
const whereIt = (l: ALineOnRecord) => `(${inFile(l)})`;

export function groupByPayment(lines: ALineOnRecord[]): Map<string, ALineOnRecord[]> {
  const by = new Map<string, ALineOnRecord[]>();
  for (const l of [...lines].sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime() || a.rowNumber - b.rowNumber)) by.set(l.paymentKey, [...(by.get(l.paymentKey) ?? []), l]);
  return by;
}

export function theDiscrepancies(lines: ALineOnRecord[], linksOf: (paymentKey: string) => ALinks): ADiscrepancy[] {
  const out: ADiscrepancy[] = [];
  for (const [paymentKey, group] of groupByPayment(lines)) {
    const latest = group[group.length - 1];
    const links = linksOf(paymentKey);
    const base = { paymentKey, latest, lines: group, links };

    /* Two amounts. */
    const amounts = [...new Map(group.filter((l) => l.amount).map((l) => [amountKey(l.amount), l])).values()];
    const spendDiffers = !!links.spend && !!latest.amount && !sameAmount(latest.amount, links.spend.amount);
    if (amounts.length > 1 || spendDiffers) {
      const versions = amounts.map((l) => `${sayMoney(l.amount!)} ${whereIt(l)}`);
      if (spendDiffers && !amounts.some((l) => sameAmount(l.amount, links.spend!.amount))) versions.push(`${sayMoney(links.spend!.amount)} (in the spend request)`);
      out.push({ ...base, id: `amounts:${paymentKey}:${[...amounts.map((l) => amountKey(l.amount)), ...(spendDiffers ? [`spend${amountKey(links.spend!.amount)}`] : [])].sort().join(',')}`, kind: 'two amounts', versions });
    }

    /* Two statuses. */
    const statuses = [...new Map(group.filter((l) => l.statedStatus).map((l) => [l.statedStatus!, l])).values()];
    const approvals = [...new Map(group.filter((l) => l.statedApproval).map((l) => [l.statedApproval!, l])).values()];
    const against: string[] = [];
    if (links.spend && latest.statedApproval === 'approved' && links.spend.status === 'declined') against.push('declined in the spend request');
    if (links.spend && latest.statedStatus === 'paid' && links.spend.status === 'declined') against.push('declined in the spend request');
    if (latest.statedApproval === 'rejected' && ['paid', 'scheduled'].includes(latest.statedStatus ?? '')) against.push(`${latest.statedStatus} in the same row, though its approval is rejected`);
    if (statuses.length > 1 || approvals.length > 1 || against.length) {
      const versions = [...statuses.map((l) => `${l.statedStatus} ${whereIt(l)}`), ...(approvals.length > 1 ? approvals.map((l) => `approval ${l.statedApproval} ${whereIt(l)}`) : []), ...against.map((x) => `${x}`)];
      out.push({ ...base, id: `statuses:${paymentKey}:${[...statuses.map((l) => l.statedStatus), ...approvals.map((l) => `a-${l.statedApproval}`), ...against].sort().join(',')}`, kind: 'two statuses', versions });
    }

    /* Said paid, nothing shows it. */
    if (latest.statedStatus === 'paid' && !hasProof(links)) out.push({ ...base, id: `proof:${paymentKey}`, kind: 'no proof', versions: [] });

    /* Paid or scheduled with no approval anywhere: not in the office's own sheet, and not on the record. A line the sheet marks Approved has its approval written
       down where the office keeps them, and is not a question for anybody (Halden stress test, D5). */
    if (['paid', 'scheduled'].includes(latest.statedStatus ?? '') && latest.statedApproval !== 'approved' && !hasApproval(links)) out.push({ ...base, id: `approval:${paymentKey}`, kind: 'approval missing', versions: [] });
  }
  return out;
}

/** The words that make a kept document read as an approval, or as proof of payment. Used to find the record, never to decide it alone. */
export const SOUNDS_LIKE_AN_APPROVAL = /\b(?:approv(?:e|ed|al)|authori[sz](?:e|ed|ation)|sign(?:ed)?[- ]off|go[- ]ahead|cleared for payment)\b/i;
export const SOUNDS_LIKE_PROOF = /\b(?:receipt|proof of payment|remittance|transfer (?:confirmation|advice|slip)|bank (?:advice|confirmation|statement)|payment confirmation|swift|credit advice|debit advice)\b/i;
