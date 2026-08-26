import type { ResolutionState } from '@/api/resolution'

/**
 * HOW THE RESOLUTION STATUS IS WORDED, IN ONE PLACE. W-UX-R.
 *
 * Her correction, which sent me looking: "There's no propose and accept anything, the lead sees the
 * report and resolution options and decide for themselves."
 *
 * That is true of six scenarios and not the rest, and the distinction is a decision already taken
 * and carefully written down in `end-states.ts`: on a new hire, a PIP, a new manager, a new advisor,
 * a contract renewal or a recognition ask, the LEAD decides - because a hire shown "Let them go" and
 * asked to pick it is handed both a cruel choice and a veto that was never his. Everywhere else,
 * nobody closes alone, because a partnership dispute one person can close is a worse product.
 *
 * The server enforces it. Two client surfaces render it, and only one of them knew: `ResolutionPanel`
 * has careful copy for all three cases, while the report block said "N of M parties have confirmed an
 * end state" on every ground. So the wording now lives HERE, once, and both read it - because the
 * fault was never the sentence, it was the sentence existing twice.
 */
export function openStatusLine(data: Pick<ResolutionState, 'leadDecides' | 'confirmedCount' | 'totalActive'>): string {
  if (data.leadDecides) {
    /**
     * No tally, because there is nothing to tally: one person's answer closes this. Saying "0 of 3"
     * here invents a quorum, and the people in the other two rows never had a say to withhold.
     */
    return 'The lead decides this one. Everyone can see the outcomes it can reach.'
  }
  return `${data.confirmedCount} of ${data.totalActive} parties have confirmed an end state.`
}

export function closedByLine(data: Pick<ResolutionState, 'leadDecides' | 'totalActive'>): string {
  /** "All 3 parties confirmed the same end state" was false on a lead-decides ground too. */
  return data.leadDecides
    ? 'Decided by the lead. Every account stays on the record.'
    : `All ${data.totalActive} parties confirmed the same end state.`
}
