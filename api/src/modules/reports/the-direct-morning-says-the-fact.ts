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
  /* A difference the report's writer named before the direct block, as stored: "The status of the deal is described differently by two people." */
  { find: /\bThe ([^.]*?) (is|are) described differently(?: by (?:two|three|four|five|six|different|several|more than one) people)?\./g, put: (_all: string, thing: string, verb: string) => `The ${thing} ${verb} not agreed.` },
  { find: /\bThe ([^.]*?) (?:is|are) described in (two|three|four|five|six) different ways\./g, put: (_all: string, thing: string, n: string) => `There are ${n} different accounts of the ${thing}.` },
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
  /* The wording sweep (Hafsah, 25 October): one short sentence, what is true or what to do, never how the product works. */
  /* board/each-kind-gets-its-own-board.ts */
  { find: /^Groundwork does not keep which level each person works at, so each person's own words are shown in the order they joined, after the aim that was set\.$/g, put: 'Nobody’s level is on record, so each person’s words are in the order they joined.' },
  { find: /^Groundwork does not keep which group each person belongs to, such as processors, distributors or researchers, so the answers cannot be shown by group yet\.$/g, put: 'Nobody’s group is on record, so the answers can’t be shown by group yet.' },
  /* board/the-anchor-end-of-month.ts */
  { find: /^Groundwork does not yet keep how each person saw things at the start, so it cannot say what changed in what they understand\.$/g, put: '' },
  { find: /^Groundwork does not yet keep what changed in how you lead, so it has nothing to say here\.$/g, put: '' },
  /* board/the-switchboards-own-sections.ts */
  { find: /The goal still counts, and Groundwork will not tell its number until it has been talked through\./g, put: 'The goal counts. Its number is told once it’s talked through.' },
  /* board/the-anchor-month-board.ts */
  { find: /^Groundwork is checking in with the (\w+) (?:person who has|people who have) not yet answered this round\.$/g, put: (_a: string, n: string) => `${n.charAt(0).toUpperCase()}${n.slice(1)} ${n === 'one' ? 'person has' : 'people have'} not answered this round yet. They’re being asked.` },
  { find: /^Groundwork will ask about the (\w+) (things?) people said they would do that (?:is|are) still open\.$/g, put: (_a: string, n: string, t: string) => `${n.charAt(0).toUpperCase()}${n.slice(1)} ${t} people said they’d do ${t === 'thing' ? 'is' : 'are'} still open.` },
  { find: /^Groundwork will ask about the (\w+) (handoffs?) still waiting on someone\.$/g, put: (_a: string, n: string, h: string) => `${n.charAt(0).toUpperCase()}${n.slice(1)} ${h} ${h === 'handoff' ? 'is' : 'are'} still waiting on someone.` },
  { find: /^Groundwork is waiting for the first check-ins to come in\.$/g, put: 'No check-ins yet.' },
  { find: /^Groundwork is not asking anyone for more\.$/g, put: 'Nobody is being asked for more.' },
  /* reports/what-i-dont-know-yet.ts */
  { find: / Next: Groundwork will ask (\S+(?: \S+)?) again in a later check-in\./g, put: ' They’ll be asked again in a later check-in.' },
  { find: / Next: Groundwork will not ask again, so that [^.]+ not pressed\. You could ask ([^.]+) yourself\./g, put: ' It won’t be asked again. You could ask $1 yourself.' },
  /* grounds/role-clarity-is-not-a-score.ts */
  { find: /^Both the lead and this person have said what this person is here to do\. If those two descriptions differ, that difference is the most useful thing on this page\.$/g, put: 'The lead and this person have both said what this person is here to do.' },
  /* conversation/where-a-sessions-report-stands.ts */
  { find: /^This session was finished, but no separate report was kept for it\. What you said, and what came from it, is shown on this page\.$/g, put: 'No report was kept for this session. What you said is below.' },
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
