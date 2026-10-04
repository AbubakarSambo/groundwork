/**
 * A STORED FINDING READS RIGHT WHEN IT IS SERVED (requests 127, 129, 135, 136).
 *
 * The check-in list shows the latest finding of each report. Reports written before today's rules hold two faults in
 * it, and a stored report is not rewritten when a list is opened:
 *  - "The objective is 100 All 100 tasks for the release are deployed to production., and nobody in this check-in..."
 *    The number was put in front of a name that already held it. It now reads
 *    "The objective, in the lead's own words, is "All 100 tasks for the release are deployed to production", and nobody...".
 *  - A last sentence with no full stop ("The objective is 40 All 40 traders are fully up to date"). It gets one.
 * Nothing else about the sentence is touched, and nobody's own words are changed.
 */
import { aStoredSentenceReadsRight } from '../reports/a-stored-sentence-reads-right';

export function aFindingThatReadsRight(finding: string | null | undefined): string | null | undefined {
  if (typeof finding !== 'string' || !finding.trim()) return finding;
  let out = aStoredSentenceReadsRight(finding.trim());
  out = out.replace(/\bThe objective is (\d[\d,]*) (.+?)\.?(,? and nobody in this check-in|$)/, (whole, n: string, name: string, rest: string) => {
    const plain = n.replace(/,/g, '');
    const holdsIt = new RegExp(`(?<![\\d.,])(?:${n.replace(/[,.]/g, '\\$&')}|${plain})(?![\\d])`).test(name);
    return holdsIt ? `The objective, in the lead's own words, is "${name.replace(/[.!?]+$/, '')}"${rest}` : whole;
  });
  return /[.!?]$/.test(out) ? out : `${out}.`;
}
