/**
 * The thirteen questions, in the order somebody actually asks them.
 *
 * The brief's own test: within about thirty seconds, can you understand how
 * much we are selling, who is originating it, how valuable those clients are,
 * whether they stay, who is creating market access, and where Sahar stands
 * against her own targets separately from the function she runs.
 *
 * Written as a LIST rather than a layout, so the page renders the order and the
 * order lives somewhere it can be read and argued with. The questions came from
 * the brief; if one of them stops being the right question, this is where that
 * gets decided rather than in a template.
 */

export interface OverviewQuestion {
  n: number;
  question: string;
  /** Where its answer comes from. Composed, never computed here. */
  from: 'performance' | 'contribution' | 'positioning' | 'function' | 'attribution';
}

export const THE_THIRTEEN: OverviewQuestion[] = [
  { n: 1, question: 'How much are we selling?', from: 'performance' },
  { n: 2, question: 'How healthy is the pipeline?', from: 'function' },
  { n: 3, question: 'Who is actually originating clients?', from: 'contribution' },
  { n: 4, question: 'What share of new revenue did each person originate?', from: 'contribution' },
  { n: 5, question: 'How valuable are those clients?', from: 'performance' },
  { n: 6, question: 'Do those clients stay?', from: 'performance' },
  { n: 7, question: 'Who is creating useful market access?', from: 'positioning' },
  { n: 8, question: 'Which introductions actually produce opportunities?', from: 'positioning' },
  { n: 9, question: 'Which positioning eventually produces revenue?', from: 'positioning' },
  { n: 10, question: "Where does Sahar stand against her own commercial targets?", from: 'contribution' },
  { n: 11, question: 'How healthy is the function Sahar owns?', from: 'function' },
  {
    n: 12,
    question: 'What have contributors without sales responsibilities created?',
    from: 'contribution',
  },
  {
    n: 13,
    question: 'What evidence exists when somebody asks for more?',
    from: 'attribution',
  },
];

/**
 * The sentence that has to sit at the top of the page.
 *
 * Not decoration. Every number below it is either about the company or about
 * one person, and a reader who has lost track of which is reading the wrong
 * thing - which is the failure this entire system was built to prevent.
 */
export const WHAT_THIS_PAGE_SEPARATES =
  'Company performance is not personal contribution. Function ownership is not personal attribution. Operational involvement is not origination.';
