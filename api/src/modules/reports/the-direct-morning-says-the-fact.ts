/**
 * THE DIRECT MORNING, IN THE SENTENCES THE CODE WRITES INTO REPORTS AND BOARDS (Hafsah, 20 October 2026; the review "Groundwork as
 * production runs it", the lists "Hedging", "Defensive wording", "described differently", "settled and still open" and "shared picture").
 *
 * The product's own sentences hedge and explain themselves: "It is not a verdict, and the next session can change any part of it.",
 * "It is worth confirming them before acting on them.", "Groundwork lays out the outcomes and the proof. It doesn't choose.", "It is not
 * a promise...", "Groundwork does not keep this yet...", "Nothing on record holds each contact with the customer.". For an organisation
 * with the direct morning on, each of these says the fact, or says nothing.
 *
 * WHERE IT HAPPENS. Here, once, as the team report, a session's report, the weekly report, the board and My work are served, after
 * every wall and after names are swapped in (the same place `withoutComparisonsAnywhere` already runs). The record and the stored reports
 * are never changed, so turning the switch off brings every sentence back exactly as it was, and nothing is rebuilt to serve it.
 *
 * WHAT IT NEVER TOUCHES. A person's own words (`said`, `quote`, `lines`, `view`, `answer` and the rest below) are never read. It only
 * shortens or replaces whole sentences of the product's own, so it can neither show a reader anything the walls held back nor put a
 * label or a score on anybody.
 *
 * OFF, NOTHING. `inTheDirectMorningsWords(served, false)` returns the very object it was given.
 */

type ARewrite = { find: RegExp; put: string | ((...m: string[]) => string) };

const WORD_NUMBERS = new Set(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']);
const things = (n: string) => (n.toLowerCase() === 'one' || n === '1' ? 'one thing' : `${n.toLowerCase()} things`);
const isACount = (n: string) => WORD_NUMBERS.has(n.toLowerCase()) || /^\d+$/.test(n);

/** Each sentence of the product's own that hedges or defends, and what it says instead. Matched as whole sentences. */
export const THE_DIRECT_MORNINGS_WORDS: ARewrite[] = [
  /* reports/confidence-in-the-picture.ts */
  { find: /This is the picture as it stands, from what has been said so far\. It is not a verdict, and the next session can change any part of it\./g, put: '' },
  { find: /Described differently by more than one person( \(session \d+\))?\. People said different things about it, so it is not settled\./g, put: 'People said different things about this$1.' },
  /* reports/the-weekly-sentence-about-each-person.ts */
  { find: /, but gave no next step or date, so it is not yet clear what happens next\./g, put: ', and gave no next step or date.' },
  { find: /, but named no ([^.,]+), so it is not yet clear who it is for\./g, put: ', and named no $1.' },
  /* reports/a-read-needs-a-run.ts */
  { find: /It is too early to read ([^.]+)\. That needs more than one round to mean anything, and this is the first\./g, put: 'This is the first round, and $1 is read from the second round on.' },
  /* reports/the-weekly-report.ts */
  { find: / ?It is worth confirming (?:it|them) before acting on (?:it|them)\./g, put: '' },
  /* reports/how-much-there-is-to-go-on.ts */
  { find: /There is enough here to talk about, and not enough to settle anything(\.?)/g, put: 'There is enough here to talk about$1' },
  { find: /There is not much here yet\. Treat it as a starting point rather than a finding\./g, put: 'There is not much here yet.' },
  { find: /Well evidenced, and still only something to talk about: nothing here has an owner and a date yet\./g, put: 'Nothing here has an owner and a date yet.' },
  /* reports/the-session-report.ts: "Three things are settled, and one is still open." */
  {
    find: /\b(\w+) (?:things? )?(?:is|are) settled, and (\w+) (?:things? )?(?:is|are) still open\./g,
    put: (all: string, s: string, o: string) => (isACount(s) && isACount(o) ? `People agree on ${things(s)}, and differ on ${o.toLowerCase()}.` : all),
  },
  { find: /\bNothing is settled yet, and (\w+) (?:things? )?(?:is|are) still open\./g, put: (all: string, o: string) => (isACount(o) ? `People differ on ${things(o)}.` : all) },
  { find: /\b(\w+) (?:things? )?(?:is|are) settled, and nothing is still open\./g, put: (all: string, s: string) => (isACount(s) ? `People agree on ${things(s)}, and differ on nothing.` : all) },
  /* reports/what-the-report-said-at-the-time.ts */
  { find: /(The parts? that changed (?:were|was) [^.]*?)\bthe shared picture\b/g, put: '$1the summary' },
  /* reports/what-today-reads-from-the-record.ts, board/board.service.ts, board/each-kind-gets-its-own-board.ts */
  { find: /, so nobody can assume it is agreed\./g, put: '.' },
  /* board/who-sees-this-differently.ts */
  { find: /^(?:People see this differently|This is seen differently)\.$/g, put: 'People said different things about this.' },
  { find: /^(.+?) see this differently\.$/g, put: '$1 said different things about this.' },
  /* board/where-this-is-heading.ts */
  { find: / ?Groundwork lays out the outcomes and the proof\. It doesn[’']t choose\./g, put: '' },
  /* board/the-switchboards-own-sections.ts */
  { find: / It is not a promise, and anything that changes the pace changes where it ends\./g, put: '' },
  /* board/a-deal-row-from-its-record.ts */
  { find: /^Each date is a day somebody spoke about this deal in a check-in\. Nothing on record holds each contact with the customer\.$/g, put: 'Each date is a day this deal came up in a check-in.' },
  { find: /^On ([^,]+), somebody spoke about it, in their own words\.$/g, put: 'On $1, it came up in a check-in.' },
  { find: /^On ([^,]+), somebody spoke about it, and proof backs what they said\.$/g, put: 'On $1, it came up in a check-in, with proof.' },
  /* board/each-deal-in-its-group.ts */
  { find: /^It rests on what somebody said, with no proof yet\.$/g, put: 'There is no proof yet.' },
  { find: /^Nothing on record says what a deal must show at each stage, so no group here says whether a criterion is met\.$/g, put: '' },
  /* board/the-kind-of-work.ts */
  { find: /^Groundwork does not keep this yet\. It needs (?:numbers from another system(?:, such as payment records)?|the ticket counts from the helpdesk itself)\.$/g, put: '' },
  { find: /^Groundwork does not know what kind of work this check-in is about yet, so it keeps no records of this kind\.$/g, put: '' },
  /* board/board.service.ts */
  { find: /^Groundwork does not follow an issue from the day it is raised to the day it is decided and done, so there is no list of open issues here\.[^]*$/g, put: '' },
];

/** One of the product's own sentences, as the direct morning says it. Text with nothing to change comes back as it was. */
export function saidTheDirectWay(text: string): string {
  if (typeof text !== 'string' || !text) return text;
  let out = text;
  for (const r of THE_DIRECT_MORNINGS_WORDS) {
    r.find.lastIndex = 0;
    out = out.replace(r.find, r.put as any);
  }
  return out === text ? text : out.replace(/[ \t]{2,}/g, ' ').replace(/^\s+|\s+$/g, '');
}

/** Words that are somebody's own, wherever they sit in what is served: never read. */
const WORDS_THAT_ARE_THEIRS = new Set([
  'said', 'quote', 'quotes', 'saidWordForWord', 'lines', 'whatTheySaid', 'view', 'positions', 'words', 'wordForWord', 'verbatim',
  'turns', 'answer', 'answers', 'content', 'text', 'inTheirWords', 'theirWords', 'evidence',
]);

function walk(value: any): any {
  if (typeof value === 'string') return saidTheDirectWay(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = WORDS_THAT_ARE_THEIRS.has(k) ? v : walk(v);
    return out;
  }
  return value;
}

/** Anything served to a reader, as the direct morning says it where `on`; off, the very object it was given. */
export function inTheDirectMorningsWords<T>(served: T, on: boolean): T {
  return on ? (walk(served) as T) : served;
}
