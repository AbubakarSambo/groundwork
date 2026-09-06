/**
 * THE MOST DANGEROUS OBJECT IN THIS PROGRAMME.
 *
 * A model reads a contract, produces "revenue share: 20%", and from that moment a
 * company is being held to a sentence nobody signed. Every other risk in this area
 * is recoverable by talking; this one is a product asserting a contractual fact it
 * invented, to two parties who are already in disagreement.
 *
 * So: A READING IS A PROPOSAL. It is stored as one, it is shown as one, and
 * nothing may be judged against it until a person who would know has said it is
 * right. `whatItMayBeUsedFor` is the enforcement, and it is arithmetic rather than
 * a note in a prompt — a rule that lives only in wording is a rule that holds
 * until the model is tired.
 *
 * WHAT CONFIRMATION IS, AND IS NOT. Confirming means a person read the clause and
 * says this is what it says. It does not mean the term is fair, that the other
 * side agrees with the reading, or that it is in force — that is the version's
 * job. One side confirming is enough to USE a term in questions; both sides
 * confirming is what it takes to hold anybody to it.
 *
 * AND A DISPUTED TERM IS NOT A BROKEN ONE. Where the two sides read the same
 * clause differently, that is the single most useful thing this product can find
 * before it becomes an argument about money. It is a state, not a failure.
 */

export type TermState =
  /** A model read it out of the document. Nothing may be judged against it. */
  | 'read from the document'
  /** One side has said the reading is right. */
  | 'checked by one side'
  /** Both sides have. */
  | 'agreed by both'
  /** They read the same clause differently. The most useful thing here.  */
  | 'read differently by each side';

export interface Term {
  /** What it is about, in the words people use: "revenue share", "payment terms". */
  says: string;
  /** The reading itself, as plain words. Never a formula this product then executes. */
  reads: string;
  state: TermState;
  /** Which clause, so anybody can go and look. */
  clause: string | null;
  /** Who has said the reading is right, by name. Never a count. */
  checkedBy: string[];
  /** Where the two readings differ, said as both of them. Null unless disputed. */
  readDifferently: { by: string; reads: string }[] | null;
}

export type WhatFor =
  /** Shown beside a question, as somebody's reading, clearly attributed. */
  | 'shown as a reading'
  /** Used to shape what gets asked — "the agreement covers X; is this one of those?" */
  | 'used to ask a question'
  /** Used to say something did or did not happen as agreed. */
  | 'used to judge what happened';

/**
 * WHAT A TERM IN THIS STATE MAY BE USED FOR.
 *
 * The whole safety argument, in one function. Note that NOTHING may be used to
 * judge what happened unless both sides agreed the reading — including a term one
 * side checked, because one side's reading of a contract is that side's case.
 */
export function whatItMayBeUsedFor(state: TermState): WhatFor[] {
  switch (state) {
    case 'read from the document':
      /* Not even a question: an unchecked reading shaping the interview means the
         model's error becomes what both sides get asked about all quarter. */
      return [];
    case 'checked by one side':
      return ['shown as a reading', 'used to ask a question'];
    case 'agreed by both':
      return ['shown as a reading', 'used to ask a question', 'used to judge what happened'];
    case 'read differently by each side':
      /* Both readings shown, and the disagreement is the thing to ask about. It is
         emphatically not a basis for judging anybody. */
      return ['shown as a reading', 'used to ask a question'];
  }
}

export function mayBe(term: Term, what: WhatFor): boolean {
  return whatItMayBeUsedFor(term.state).includes(what);
}

/** How a term reads, with its standing attached, because it never travels without it. */
export function howItReads(t: Term): string {
  const where = t.clause ? ` (${t.clause})` : '';
  switch (t.state) {
    case 'read from the document':
      return `${t.says}${where}: “${t.reads}” — read out of the document and not checked by anybody yet.`;
    case 'checked by one side':
      return `${t.says}${where}: “${t.reads}” — as ${t.checkedBy.join(' and ')} reads it. The other side has not said.`;
    case 'agreed by both':
      return `${t.says}${where}: “${t.reads}” — both sides say that is what it says.`;
    case 'read differently by each side':
      return (
        `${t.says}${where} is read differently by each side. `
        + (t.readDifferently ?? []).map((r) => `${r.by}: “${r.reads}”`).join(' ')
        + ' That difference is worth settling before anything turns on it.'
      );
  }
}

/**
 * What to say when something is about to be judged against a term that cannot bear it.
 *
 * Said to the person, not swallowed. A refusal nobody sees is a feature that looks
 * broken, and this one has a specific fix somebody can carry out in a minute.
 */
export function whyItCannotBeUsedYet(t: Term, what: WhatFor): string | null {
  if (mayBe(t, what)) return null;

  if (t.state === 'read from the document') {
    return `“${t.says}” was read out of the document by a model and nobody has checked it. Somebody who would know reads the clause and says whether that is what it says, and then it can be used.`;
  }
  if (what === 'used to judge what happened') {
    return t.state === 'read differently by each side'
      ? `The two sides read “${t.says}” differently, so nothing can be settled against it until they agree what it says.`
      : `Only ${t.checkedBy.join(' and ')} has checked “${t.says}”. One side's reading of a clause is that side's case, not the agreement.`;
  }
  return `“${t.says}” cannot be used for that yet.`;
}
