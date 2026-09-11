/**
 * THE AGREEMENT ARRIVES AS A FILE, BECAUSE THAT IS HOW AGREEMENTS ARRIVE.
 *
 * I said the missing piece was a screen for starting an agreement. It is not. Nobody types their
 * contract into a form: they upload it, or they paste it into the context, or they describe the
 * offer in the conversation. The model already knew - `AgreementTerm.state` defaults to the string
 * `'read from the document'`, which is a state that nothing in the product could ever produce.
 *
 * WHAT COMES OUT OF A DOCUMENT IS `says`, AND ONLY `says`.
 *
 * A term has two halves. `says` is the clause, in the contract's own words. `reads` is what
 * somebody understands it to mean, and that half belongs to a person: the review pack's hardest
 * rule is that a reading never becomes the agreement, and the whole finding this product exists to
 * produce is two sides reading one clause differently. A document cannot read itself.
 *
 * So the restatement written here is marked for what it is by the state the row is born in - read
 * from the document, checked by nobody - and the first real reading arrives when somebody says what
 * they think it means.
 *
 * VERBATIM, AND CHECKED. `says` has to appear in the document. Not paraphrased, not tidied, not
 * "substantially". A clause nobody can find by searching the file they uploaded is a clause this
 * product invented, and it would sit on screen next to real ones with a clause number beside it.
 * The check is a substring match on normalised whitespace, and a term that fails it is dropped.
 *
 * WHAT IS NOT A TERM. Recitals, definitions, headings, notice addresses, governing law, the
 * signature block. They are all in the file and none of them is a thing anybody reports against or
 * owes. A contract read as forty terms is a contract nobody reads.
 */

export interface TermInIt {
  says: string;
  reads: string;
  clause: string | null;
}

/** Collapse whitespace so a line break in a PDF does not fail an honest match. */
function flat(s: string): string {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * A clause reference is a reference, not a sentence. "4.1", "Schedule 2", "clause 9(a)" - anything
 * longer is the model putting prose where a pointer goes, and it is dropped rather than shown.
 */
function aClauseReference(raw: unknown): string | null {
  const c = String(raw ?? '').trim();
  if (!c || c.length > 24) return null;
  return /[0-9]/.test(c) ? c : null;
}

export function theTermsInIt(raw: { terms?: unknown } | null, documentText: string): TermInIt[] {
  const rows = Array.isArray(raw?.terms) ? (raw!.terms as any[]) : [];
  const haystack = flat(documentText);
  const out: TermInIt[] = [];
  const seen = new Set<string>();

  for (const r of rows) {
    const says = String(r?.says ?? '').trim();
    const reads = String(r?.reads ?? '').trim();
    if (says.length < 12 || !reads) continue;

    // The whole guard: it has to be findable in the file somebody uploaded.
    const needle = flat(says);
    if (!haystack.includes(needle)) continue;
    if (seen.has(needle)) continue;
    seen.add(needle);

    out.push({ says, reads, clause: aClauseReference(r?.clause) });
  }
  /* Twenty is already more than anybody reads in one sitting, and a longer list is the model
     returning the document back rather than the terms in it. */
  return out.slice(0, 20);
}

export const TERMS_IN_A_DOCUMENT_PROMPT = `You are reading a document somebody uploaded to a check-in about an agreement between two sides. Find the TERMS in it.

A term is something one side must do, may do, or is owed - a number, a share, a date, a deadline, a quantity, a right, a restriction, or a thing that must be delivered or reported.

For each one:
- says: the clause EXACTLY as the document words it. Copy it. Do not tidy it, shorten it, fix its grammar or join two sentences. If you cannot copy it exactly, leave it out.
- reads: what the clause is saying, in one plain sentence, adding nothing. Not what it implies, not what it probably means in practice, not what a reasonable party would expect. If the clause does not say what a figure is a percentage OF, your sentence does not say either - that silence is the most valuable thing in the document.
- clause: the clause number or reference, exactly as the document labels it. Leave it out when the document does not label it. Never invent one.

WHAT IS NOT A TERM, and most of a contract is not:
- Recitals and background. Definitions. Headings. Notice addresses. Governing law and jurisdiction. Counterparts. The signature block.
- Anything nobody reports against, owes, or can miss.

A contract read as forty terms is a contract nobody reads. Ten good ones beat forty.

YOU ARE NOT READING WHAT IT MEANS. Somebody will say what they understand each of these to mean, and the two sides disagreeing about one of them is the point of this whole exercise. Anything you decide it means now is a reading nobody made, standing where theirs should be.

Do not advise, do not flag risk, do not say a term is unusual, unfair or one-sided.`;

export const TERMS_IN_A_DOCUMENT_SCHEMA = {
  name: 'terms_in_the_document',
  description: 'The terms in an uploaded agreement, each quoted exactly as the document words it.',
  input_schema: {
    type: 'object',
    properties: {
      terms: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            says: { type: 'string', description: 'The clause, copied exactly from the document.' },
            reads: { type: 'string', description: 'One plain sentence saying what it says. Adds nothing.' },
            clause: { type: 'string', description: 'The clause reference as labelled. Omit when unlabelled.' },
          },
          required: ['says', 'reads'],
        },
      },
    },
    required: ['terms'],
  },
} as const;
