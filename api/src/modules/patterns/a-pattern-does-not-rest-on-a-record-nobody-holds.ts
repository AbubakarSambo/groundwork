/**
 * "REPORTED THAT ALL LOAN REPAYMENTS WERE ON TIME, WHILE RECORDS SHOWED THE OPPOSITE."
 *
 * Read in the 1 October review, the loans scenario. Three borrowers had a pattern stored that says they
 * were not telling the truth (B1 and D1 on Chinedu, D1 on Grace). Chinedu had repaid every instalment.
 * The "records" were the product's own sentence in the check-in: the conversation had told him "the record
 * from our side shows that weekly repayments have not been made", when no record was ever given to it
 * (see conversation/a-record-claim-nobody-holds). The detector reads the whole transcript, Groundwork's
 * lines included, and took that sentence as evidence. So the first invention became a finding about a
 * person's honesty, which would have reached their lead after three periods.
 *
 * THE RULE. A pattern's observation may rest only on what the record holds, and what the record holds is
 * what the PERSON said, the lines extracted from it, and their own earlier lines. An observation that
 * leans on "the records", "the payment record", "the system of record" or "the data" showing something
 * is a claim about a record. It stands only where that person's own words or lines mention such a record
 * (they said it themselves, so something was there to read). Otherwise the detection is dropped.
 *
 * Nothing is removed from the detector: this runs on what it found, and drops only that.
 */

const A_RECORD_CLAIM = new RegExp(
  [
    /\b(?:while|but|yet|whereas|although|though|when)\s+(?:the\s+|our\s+|their\s+)?(?:\w+\s+)?(?:records?|data|system(?:\s+of\s+record)?|ledger)\s+(?:show(?:s|ed)?|indicat\w+|confirm\w*|say|said|contradict\w*)\b/.source,
    /\b(?:contrary to|contradicted by|against|conflicts? with|inconsistent with|at odds with|disproved by)\s+(?:the\s+|our\s+|their\s+)?(?:\w+\s+)?(?:records?|data|system(?:\s+of\s+record)?|ledger)\b/.source,
    /\b(?:the|our|their|this)\s+(?:\w+\s+)?(?:records?|data|system(?:\s+of\s+record)?|ledger)\s+(?:show(?:s|ed)?|indicat\w+|confirm\w*|contradict\w*|has no|have no)\b/.source,
    /\b(?:system of record|records)\s+(?:show(?:s|ed)?|indicat\w+|confirm\w*|contradict\w*)\b/.source,
    /\b(?:no|nothing in the)\s+(?:payments?|transactions?)\s+(?:have|has|were|was)\s+(?:been\s+)?(?:received|recorded|logged)\b/.source,
  ].join('|'),
  'i',
);

/** Something in their own words that says a record, a system or a document existed to be read. */
const THEY_MENTIONED_A_RECORD = /\b(?:records?|ledger|statements?|system|spreadsheet|dashboard|logs?|receipts?|invoices?|reports?|document|schedule|app|portal)\b/i;

export function restsOnARecordNobodyHolds(observation: string, whatThePersonSaid: string[]): boolean {
  if (!A_RECORD_CLAIM.test(observation ?? '')) return false;
  return !whatThePersonSaid.some((t) => THEY_MENTIONED_A_RECORD.test(t));
}

/**
 * WHAT THE RULE TOOK OUT OF A CHECK-IN, so a run's log shows it (2 October 2026). The rule above runs once
 * per read, so it cannot say on its own whether it changed what counts. This is said once per check-in,
 * for each code some read left out because of it and that does not count for the period: how many reads
 * left it out, of how many were taken. A code that counts anyway is not listed, because the rule changed
 * nothing about it. No observation is in the line, so no name can be.
 */
export function whatTheRecordRuleTookOut(
  leftOut: { code: string }[][],
  countsThisPeriod: Iterable<string>,
): { code: string; reads: number }[] {
  const counts = new Set(countsThisPeriod);
  const reads = new Map<string, number>();
  for (const read of leftOut) for (const code of new Set(read.map((d) => d.code))) reads.set(code, (reads.get(code) ?? 0) + 1);
  return [...reads].filter(([code]) => !counts.has(code)).map(([code, n]) => ({ code, reads: n }));
}

export function aLineForWhatTheRecordRuleTookOut(checkInId: string, period: number, took: { code: string; reads: number }, readsTaken: number): string {
  return `Check-in ${checkInId}: ${took.code} does not count for period ${period}. In ${took.reads} of ${readsTaken} reads it rested on a record this person never mentioned, so those reads left it out.`;
}
