import { RECORDS_FOR_EACH_KIND, oneOfTheKinds, isASalesKind, KINDS_THAT_ARE_NOT_WORK } from '../board/the-kind-of-work';

/**
 * ONE REFERENCES AND RESOURCES TEMPLATE FOR EVERY SCENARIO (Release 1B, pull request 2 of 3; docs/references-and-my-work.md,
 * "The rule for both tabs: one template"; references-template-rules.txt: "Nothing is built per scenario. The scenario and its
 * type only supply the words and the data that fill each section").
 *
 * WHAT CHANGES: only the words, and they come from the kind of work's own records, the same ones that set the board's rows and
 * stages (RECORDS_FOR_EACH_KIND): what each item is called ("deal", "release", "ticket", "deadline"), the stages, and the
 * starting lines for How we work. WHAT NEVER CHANGES: the sections and their order, which are the reader's (references-and-
 * resources.ts), not this file's.
 *
 * NOTHING INVENTED. A starting line is here only where it is already true of the product for that kind of work: for a sales
 * team, what Qualified, Quoted and Won need are the rules the board already applies (a-deals-four-criteria.ts; Hafsah's answer
 * 2 of 18 October for Won), and the one risk is the board's own rule that won counts only with proof. Every other kind starts
 * with no lines, and the page says so. A starting line is shown as Groundwork's, never as the lead's, and is not read into a
 * check-in as one of her confirmed rules: the sales check-in already gathers against the same rules.
 */

/** The singular word for each item kind the board keeps. */
const ITEM_WORD: Record<string, string> = {
  deal: 'deal',
  release: 'release',
  task: 'task',
  ticket: 'ticket',
  incident: 'incident',
  group: 'trader group',
  commitment: 'commitment',
  decision: 'decision',
  loan: 'loan',
  priority: 'priority',
  subscription: 'subscription',
  deadline: 'deadline',
  party: 'party',
  county: 'county',
  project: 'project',
};

export interface TheReferencesTemplate {
  /** What one item is called on this kind of work's board: "deal", "release", "deadline". "piece of work" where the kind is not known. */
  itemWord: string;
  /** The stages in order, where the kind has them. */
  stages: string[];
  /** Groundwork's starting lines, shown beside the lead's own. Empty where nothing is true of the product for this kind. */
  startingStageNeeds: string[];
  startingRules: string[];
  startingRisks: string[];
  /** The plain words for whose starting set it is: "a sales team". */
  startingSetFor: string | null;
}

export function theReferencesTemplateFor(kindOfWork: string | null | undefined): TheReferencesTemplate {
  const kind = oneOfTheKinds(kindOfWork);
  const sections = kind ? RECORDS_FOR_EACH_KIND[kind] : [];
  const firstKind = sections.flatMap((s) => s.itemKinds).find((k) => !KINDS_THAT_ARE_NOT_WORK.includes(k)) ?? null;
  const stages = sections.find((s) => s.stages?.length)?.stages ?? [];
  if (kind && isASalesKind(kind)) {
    return {
      itemWord: 'deal',
      stages,
      startingStageNeeds: [
        'Qualified: need, budget, decision maker and buying date.',
        'Quoted: the customer has the quote, with a photo or the email.',
        'Won: a signed order or a payment, with proof.',
      ],
      startingRules: [],
      startingRisks: ['A deal marked won without a signed order or payment.'],
      startingSetFor: 'a sales team',
    };
  }
  return {
    itemWord: firstKind ? ITEM_WORD[firstKind] ?? firstKind : 'piece of work',
    stages,
    startingStageNeeds: [],
    startingRules: [],
    startingRisks: [],
    startingSetFor: null,
  };
}

/**
 * THE STARTING SET FOR "COLLECT WHAT'S OWED" (Release 2, pull request 3 of 3; the B6 fee-notes pictures,
 * references-fee-notes-lead.txt and -member.txt; Hafsah: "collections' definitions, documents and evidence go into the new References
 * and resources tab"). Used only where both Release 1B's tabs and Release 2 are on, for a "Collect what's owed" check-in. Every line is
 * already true of the product there: what Due, Promised and Paid mean is how the collections record files a bill (the-collections-
 * record: due on a date or an event; a client's promise kept as the client's; paid counts only with proof), and the two risks are
 * what the collections board already watches for (a bill due on an event and not raised, a promised date missed). In the
 * organisation's own word for the bill; the fee notes words are the picture's.
 */
export function theCollectionsReferencesTemplate(type: 'invoices or fee notes' | 'loans', billWord: string): TheReferencesTemplate {
  if (type === 'loans') {
    return {
      itemWord: 'loan',
      stages: ['Disbursed', 'Due', 'Reminded', 'Chased', 'Promised', 'Paid'],
      startingStageNeeds: [
        'Due: the repayment day has passed.',
        'Promised: the borrower gave a date.',
        'Paid: with an M-Pesa message, a bank slip or the repayment record.',
      ],
      startingRules: [],
      startingRisks: ['A promised date that passes without payment.'],
      startingSetFor: 'loan repayments',
    };
  }
  const bill = billWord;
  const bills = /s$/.test(bill) ? bill : `${bill}s`;
  const feeNotes = bill === 'fee note';
  return {
    itemWord: bill,
    stages: ['Not yet raised', 'Invoiced', 'Due', 'Reminded', 'Chased', 'Promised', 'Paid'],
    startingStageNeeds: [
      feeNotes ? 'Due: the date or event in the engagement letter has passed.' : `Due: the date or event the ${bill} falls due on has passed.`,
      'Promised: the client gave a date.',
      'Paid: with a slip, M-Pesa message or receipt.',
    ],
    startingRules: [],
    startingRisks: [
      feeNotes ? 'A court event that makes a fee note due, with no fee note raised.' : `An event that makes ${/^[aeiou]/i.test(bill) ? 'an' : 'a'} ${bill} due, with no ${bill} raised.`,
      'A promised date that passes without payment.',
    ],
    startingSetFor: bills,
  };
}
