/**
 * WHAT EACH PERSON UNDERSTANDS THE ARRANGEMENT TO BE, BESIDE WHAT THE DOCUMENT SAYS.
 *
 * THIS IS NOT A NEGOTIATION AND MUST NEVER READ LIKE ONE. Nobody is being armed for a conversation
 * with the other side. The job is to establish the basis everybody is working from, early, and then
 * to keep people on it - so that the thing that goes wrong later is not somebody quietly working to
 * a different understanding of the same sentence.
 *
 * The whole risk being removed is INTERPRETATION. A document does not misalign people; a document
 * read two ways does, and nothing in an ordinary process ever asks. It produces two findings, and
 * they are the same one seen from two directions:
 *
 *   A clause is written down and two people understand it differently. "Twenty per cent" is shared
 *   understanding; "of gross" and "of net after landed cost" is two people working to different
 *   numbers from the same page, discoverable now for the price of one question.
 *
 *   Somebody describes part of the arrangement and no clause says it. Everybody remembers agreeing
 *   it and nothing in the file carries it, so whether it happens depends on who remembers.
 *
 * A READING IS A PROPOSAL, ALWAYS. Nothing here is ever written as what the document means. A
 * difference is recorded as both understandings side by side with a name on each; an unwritten one
 * is recorded as somebody's description with no clause reference, because there is nothing to go
 * and look at. Neither may be used to say something did or did not happen - that is arithmetic in
 * `whatItMayBeUsedFor` rather than a note in a prompt.
 *
 * AND IT NEVER DECIDES WHO IS RIGHT, because deciding is not the point. Two people reading one
 * sentence differently is a normal thing that has been found in time, and the only useful next step
 * is that they say which one they both mean.
 */

export interface WhatTheySaid {
  /** The term this is about, in their words: "the revenue share", "the reporting deadline". */
  about: string;
  /** What they say it is, in their words. Never tidied into a formula. */
  reads: string;
  /** The id of the document term this answers, when the model matched one. */
  termId: string | null;
}

export interface TermOnFile {
  id: string;
  says: string;
  reads: string;
  clause: string | null;
}

/**
 * Keep only what can actually be used.
 *
 * A reading that names no term is a remark about the arrangement in general, and attaching it to a
 * clause would be this product choosing which one they meant. A reading that matches what is
 * already on file is people agreeing, and recording that as a difference would manufacture a
 * problem where there is none - which on a surface whose whole job is alignment is the worst thing
 * it could do.
 */
export function whatTheySaidItIs(
  raw: { readings?: unknown } | null,
  onFile: TermOnFile[],
): { differences: (WhatTheySaid & { termId: string })[]; notInTheDocument: WhatTheySaid[] } {
  const rows = Array.isArray(raw?.readings) ? (raw!.readings as any[]) : [];
  const byId = new Map(onFile.map((t) => [t.id, t]));
  const differences: (WhatTheySaid & { termId: string })[] = [];
  const notInTheDocument: WhatTheySaid[] = [];

  for (const r of rows) {
    const about = String(r?.about ?? '').trim();
    const reads = String(r?.reads ?? '').trim();
    if (!about || reads.length < 8) continue;

    const termId = typeof r?.termId === 'string' && byId.has(r.termId) ? r.termId : null;
    if (!termId) {
      /* Only when the model says plainly that nothing covers it. An unmatched id is a model that
         lost track of the list, not a discovery that the document is silent. */
      if (r?.inTheDocument === false) notInTheDocument.push({ about, reads, termId: null });
      continue;
    }
    const already = byId.get(termId)!;
    if (sameReading(already.reads, reads)) continue;
    differences.push({ about, reads, termId });
  }

  return { differences: differences.slice(0, 10), notInTheDocument: notInTheDocument.slice(0, 10) };
}

/** Two readings that differ only in wording are one reading. Punctuation and case are not meaning. */
function sameReading(a: string, b: string): boolean {
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  return flat(a) === flat(b);
}

export const WHAT_THEY_SAY_IT_IS_PROMPT = `You are reading ONE side's check-in about an agreement. A list of the terms already read out of the document is given below, each with an id.

Find every place this person said what something in the arrangement IS - what they are committing to, what they expect to receive, what a number is a share of, when something is due.

For each:
- about: the thing it is about, in their words. "the revenue share", "the reporting deadline".
- reads: what they say it is, in their own words. Do not tidy it into a formula and do not complete it for them - if they said twenty per cent without saying of what, your sentence does not say either.
- termId: the id of the document term they are talking about, when it is clearly one of them.
- inTheDocument: false ONLY when you have read the list and nothing in it covers what they described.

THE TWO THINGS THIS IS FOR, and they are the same thing seen from two directions:

A term IS in the list and they understand it differently from how it is written. That is the most useful thing in the session: two people working to different numbers from the same sentence, found while saying so is still easy.

A term is NOT in the list and they are describing it as part of the arrangement. Set inTheDocument false. Everybody remembers agreeing it and nothing in the file carries it, so whether it happens depends on who remembers.

THIS IS NOT A NEGOTIATION. Nobody is being prepared for a conversation with anybody. You are helping a group establish what they are all working from, so that nothing later turns on two people having read one sentence two ways.

WHAT TO LEAVE OUT:
- Anything they said about how the relationship is going, how they feel, or what they hope.
- Anything you would have to assume to connect to a term. If you are not sure which term they meant, leave termId out and do not set inTheDocument false either - being unsure is not the same as the document being silent.
- Anything that matches what the document already says. Agreement is not a finding.

NEVER say who is right, never say an understanding is wrong, mistaken or unreasonable, and never say a term is missing, withheld or breached. Never use the words party, counterparty, position or dispute - these are people working together who have not yet noticed they are reading one sentence two ways. You are recording what this person understands, not checking it.`;

export const WHAT_THEY_SAY_IT_IS_SCHEMA = {
  name: 'what_they_say_it_is',
  description: 'What this side says the terms of the arrangement are, in their own words.',
  input_schema: {
    type: 'object',
    properties: {
      readings: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            about: { type: 'string' },
            reads: { type: 'string' },
            termId: { type: 'string', description: 'The document term they mean, when it is clearly one of them.' },
            inTheDocument: { type: 'boolean', description: 'False only when nothing in the list covers it.' },
          },
          required: ['about', 'reads'],
        },
      },
    },
    required: ['readings'],
  },
} as const;
