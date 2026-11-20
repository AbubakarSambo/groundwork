/**
 * WHAT NEEDS YOU, AND WHAT YOU CAN DO ABOUT EACH ONE (screens request 112 b; the prototype's B5,
 * board-as-lead.txt: "Decide whether a price range counts as a budget", with "Yes, it counts" and "No";
 * "Samuel has chased the same 5 leads for 3 check-ins", with "Ask him").
 *
 * Each item under "What needs you in this check-in" (`leadActions` and `decisions`) gets `action`, to the
 * lead alone, who is the only person who can act on it. An action is one of two things:
 *   - choices, where the record holds the question and somewhere for the answer to go, each with the route
 *     that keeps it (or none, where the answer changes nothing, such as "Not yet");
 *   - a place to go, "check-in" or "context", with one sentence saying what to do there, where the product
 *     has no route for the answer itself.
 * Nothing is offered that the product cannot do. A choice is never made up: "Yes" and "No" only for a
 * question the lead wrote that is answered yes or no.
 */
import { REFERENCES_AND_RESOURCES } from '../../common/the-tab-names';

export type APlace = 'check-in' | 'context';

export interface AChoice {
  label: string;
  /** The route that keeps this answer, or null where it changes nothing. */
  route: { method: 'PATCH' | 'POST'; path: string; body: Record<string, unknown> } | null;
}

export interface AnAction {
  /** What the button says. */
  label: string;
  /** What to do, in one full sentence, to the lead. */
  says: string;
  /** Where the button goes, or null where the choices carry it. */
  goesTo: APlace | null;
  choices?: AChoice[];
}

const firstNameOf = (name: string | null | undefined): string | null => {
  const t = (name ?? '').trim();
  return t ? t.split(/\s+/)[0] : null;
};

/** What the lead can do about one of their own actions, by the kind its id says it is. */
export function whatToDoAboutALeadAction(row: { id: string }, groundId: string, nameOfTheOneWaiting?: string | null): AnAction {
  if (row.id.startsWith('own-')) {
    const commitmentId = row.id.slice('own-'.length);
    return {
      label: 'Has it happened?',
      says: 'Say whether it has happened. Until you do, it stays open on your work plan.',
      goesTo: null,
      choices: [
        { label: 'Yes, it’s done', route: { method: 'PATCH', path: `/grounds/${groundId}/commitments/${commitmentId}`, body: { status: 'DONE' } } },
        { label: 'Not yet', route: null },
      ],
    };
  }
  if (row.id.startsWith('waiting-on-the-lead-')) {
    return {
      label: 'Reply in your check-in',
      says: nameOfTheOneWaiting
        ? `Tell Groundwork in your check-in what you will do for ${nameOfTheOneWaiting}, and by when.`
        : 'Tell Groundwork in your check-in what you will do about it, and by when.',
      goesTo: 'check-in',
    };
  }
  if (row.id.startsWith('nobody-named-')) {
    return { label: 'Name who provides it', says: 'Say in your check-in who can provide it, so they can be asked.', goesTo: 'check-in' };
  }
  if (row.id.startsWith('tell-')) {
    return { label: 'Open your check-in', says: 'Talk it through with them first. Then tell Groundwork in your check-in that you have.', goesTo: 'check-in' };
  }
  return { label: 'Open your check-in', says: 'You can settle this in your check-in.', goesTo: 'check-in' };
}

/** A question the lead wrote that is answered yes or no: "Whether to ..." with no "or", or "Should we ...?" and the like. */
/* "Decide whether a price range counts as a budget" (board-as-lead.txt) is the same question as "Whether ...". */
const withoutDecide = (text: string) => (text ?? '').trim().replace(/^decide\s+(?=whether\b)/i, '');

/**
 * THE YES, IN THE QUESTION'S OWN VERB (board-as-lead.txt: "Decide whether a price range counts as a
 * budget", then "Yes, it counts" and "No"). A "whether" question whose verb is plain to find answers
 * "Yes, it counts"; anything else answers a plain "Yes".
 */
export function theYesFor(question: string): string {
  const m = withoutDecide(question).match(/^whether\s+(?:a|an|the|this|that|our|their|each)?\s*(?:[\p{L}\p{N}-]+\s+){0,3}?(counts|needs|works|stays|goes|applies|matters|holds|fits)\b/iu);
  return m ? `Yes, it ${m[1].toLowerCase()}` : 'Yes';
}

export function isAYesOrNoQuestion(text: string): boolean {
  const t = withoutDecide(text);
  if (/^whether\b/i.test(t)) return !/\bor\b/i.test(t);
  return /^(should|shall|do|does|did|is|are|can|will|may|must)\b[^?]*\?$/i.test(t);
}

/** The line that goes in how we work once the lead answers, in the lead's own words. */
export function theAnswerAsALine(question: string, yes: boolean): string {
  const q = withoutDecide(question).replace(/[.!?]+$/, '');
  const answer = yes ? 'yes' : 'no';
  if (/^whether\b/i.test(q)) return `On ${q.charAt(0).toLowerCase()}${q.slice(1)}, the answer is ${answer}.`;
  return `The answer to "${q}?" is ${answer}.`;
}

/** What the lead can do about one decision on the board. */
export function whatToDoAboutADecision(
  d: { source?: string; question: string; contextItemId?: string | null; waitsOn?: { participantId: string | null; outside: string | null; what: string } },
  groundId: string,
  leadId: string | null,
  nameOf: (participantId: string) => string | null,
): AnAction {
  if (d.source === 'lead') {
    if (d.contextItemId && isAYesOrNoQuestion(d.question)) {
      const route = (yes: boolean) => ({ method: 'POST' as const, path: `/grounds/${groundId}/board/decisions/${d.contextItemId}/answer`, body: { yes } });
      return {
        label: 'Decide it',
        says: 'Your answer goes in how we work, and this comes off the list of things still to decide.',
        goesTo: null,
        choices: [{ label: theYesFor(d.question), route: route(true) }, { label: 'No', route: route(false) }],
      };
    }
    return { label: `Open ${REFERENCES_AND_RESOURCES}`, says: `Write down what you decided under ${REFERENCES_AND_RESOURCES}, and close this line there.`, goesTo: 'context' };
  }
  if (d.source === 'blocker' && d.waitsOn) {
    const on = d.waitsOn.participantId;
    if (on && on === leadId) {
      return { label: 'Reply in your check-in', says: 'This is waiting on you. Tell Groundwork in your check-in what you will do about it, and by when.', goesTo: 'check-in' };
    }
    if (on) {
      const name = nameOf(on);
      const first = firstNameOf(name);
      return {
        label: first ? `Ask ${first}` : 'Ask them',
        says: name
          ? `Tell Groundwork under ${REFERENCES_AND_RESOURCES} what to ask ${name}, and it will ask in ${name}'s next check-in.`
          : `Tell Groundwork under ${REFERENCES_AND_RESOURCES} what to ask, and it will ask in their next check-in.`,
        goesTo: 'context',
      };
    }
    if (d.waitsOn.outside) {
      return { label: 'Open your check-in', says: `Nobody in this check-in can provide it. Say in your check-in who will ask ${d.waitsOn.outside}, and by when.`, goesTo: 'check-in' };
    }
    return { label: 'Name who provides it', says: 'Nobody has been named to provide it. Say in your check-in who can, so they can be asked.', goesTo: 'check-in' };
  }
  return { label: 'Open your check-in', says: 'People said different things about this. Talk it through with them, and say in your check-in what you settled.', goesTo: 'check-in' };
}

/**
 * AN ACTION ALWAYS SAYS WHAT ITS BUTTON IS (request 152, 1). Two items on a real board arrived with an empty
 * `label` and a `goesTo`, so the button held no words. Whatever a later pass does to the sentences of a board,
 * this runs last: an action whose label is empty or only spaces is given the plain one for where it goes.
 */
export function anActionWithItsLabel<A extends { label?: string; goesTo?: APlace | null; choices?: AChoice[] } | null | undefined>(action: A): A {
  if (!action || typeof action !== 'object') return action;
  if (typeof action.label === 'string' && action.label.trim()) return action;
  const label = action.choices?.length ? 'Decide it' : action.goesTo === 'context' ? `Open ${REFERENCES_AND_RESOURCES}` : 'Open your check-in';
  return { ...action, label };
}

/** A sentence for comparing: no case, no punctuation, one space between words. */
export const sameSentenceKey = (t: unknown): string => String(t ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/**
 * THE BOARD'S TWO LISTS OF WHAT NEEDS THE LEAD, EACH THING ONCE, EACH WITH ITS LABEL (requests 151 E6, 152 1).
 * Two lines that say the same thing (the discount decision, the tax view) were listed twice. A line is kept once,
 * by its text with case and punctuation ignored, and a decision that a lead action already says is left to the action.
 */
export function everyActionHasALabel<B extends { leadActions?: any; decisions?: any }>(board: B): B {
  const fix = (rows: any) => (Array.isArray(rows) ? rows.map((r) => (r && r.action ? { ...r, action: anActionWithItsLabel(r.action) } : r)) : rows);
  const once = (rows: any, textOf: (r: any) => unknown, seen: Set<string>) => (Array.isArray(rows)
    ? rows.filter((r) => {
      const k = sameSentenceKey(textOf(r));
      if (!k) return true;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    : rows);
  const out: any = { ...board };
  const seen = new Set<string>();
  if (board.leadActions !== undefined) out.leadActions = fix(once(board.leadActions, (r) => r?.says, seen));
  if (board.decisions !== undefined) out.decisions = fix(once(board.decisions, (r) => r?.question, seen));
  return out;
}

/**
 * A WAIT ON THE LEAD THAT A YES OR A NO ANSWERS (Hafsah, 17 October; board-as-lead.txt: "Decide whether a price range
 * counts as a budget", with its reason and "Yes, it counts" and "No"; team-report.txt, "One question to answer").
 *
 * Joseph Kariuki said "Grace hasn't answered me about the KES 4,500 price for Juja Hardware yet.", and the record keeps
 * it as a wait on Grace for "an answer about the KES 4,500 price for Juja Hardware". What he waits for is the lead's
 * answer on a price, which is a yes or a no: whether to agree to it. Only a wait for an answer (a decision, a reply,
 * approval) about a price, a discount, a quote, an offer or terms is read this way; anything else stays "Reply in your
 * check-in", because nothing on record says what a yes would mean.
 *
 * The reason says who asked and when, and, only where one of that person's deals is named in what they wait for, which
 * deal it decides. Nothing else is said about what the answer changes, because the record cannot work it out.
 */
export interface AWaitTheLeadCanAnswer {
  /** As the board puts it: "Decide whether to agree to the KES 4,500 price for Juja Hardware". */
  question: string;
  /** As the team report asks it: "Do you agree to the KES 4,500 price for Juja Hardware?" */
  asked: string;
  why: string;
  /** What the answer does, as far as the record can say: "Your answer updates the board, and Joseph is no longer waiting on you." */
  afterwards: string;
  yes: string;
}

const ANSWER_ABOUT = /^(?:an?\s+|the\s+|your\s+)?(?:answer|decision|reply|response|go-ahead|approval|ok|okay|word)\s+(?:about|on|for|to|regarding)\s+(.+?)[.\s]*$/i;
const A_MONEY_THING = /\b(price|discount|quote|offer|terms)\b/i;
const aLagosDay = (at: Date | string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'Africa/Lagos' }).format(new Date(at));

export function aWaitTheLeadCanAnswer(
  wait: { what?: string | null; then?: string | null; createdAt?: Date | string | null },
  whoWaits: string | null,
  theirDeals: { name: string; fields?: Record<string, string> | null }[] = [],
  /* Every deal on the board, for the price on every other quote (quality pass, 18 October, B-7). */
  everyDeal: { name: string; fields?: Record<string, string> | null }[] = [],
): AWaitTheLeadCanAnswer | null {
  const m = ANSWER_ABOUT.exec(String(wait.what ?? '').trim());
  if (!m || !whoWaits) return null;
  const topic = m[1].trim();
  const noun = A_MONEY_THING.exec(topic);
  if (!noun) return null;
  const first = firstNameOf(whoWaits) ?? whoWaits;
  const lower = topic.toLowerCase();
  const deal = theirDeals.find((d) => d.name && lower.includes(d.name.toLowerCase().trim()));
  const asked = wait.createdAt ? `${whoWaits} asked you on ${aLagosDay(wait.createdAt)} and is still waiting for your answer.` : `${whoWaits} is still waiting for your answer.`;
  /*
   * A PRICE FOR ONE UNIT, SAID WITH THE DEAL IT DECIDES (Hafsah's quality pass, 18 October, B-7): "Decide whether Juja Hardware can
   * have 5 units at KES 4,500 each", and why, from the deals: "That is KES 500 a unit under the KES 5,000 on every other quote, KES
   * 22,500 in all. Joseph asked you on 14 October, and Mr Kariuki is waiting for Joseph to call back." Only where one of the waiting
   * person's deals keeps that amount as its price for one unit.
   */
  const amount = (topic.match(/\d[\d,]*/) ?? [])[0]?.replace(/,/g, '') ?? null;
  const priced = amount ? theirDeals.find((d) => String(d.fields?.['Price each'] ?? '').replace(/,/g, '').includes(amount)) : undefined;
  const units = priced ? theUnitsIn(priced.fields) : null;
  if (priced && units && amount) {
    const each = Number(amount);
    const listed = theOtherQuotesPrice(everyDeal.filter((d) => d.name !== priced.name));
    const under = listed && listed > each ? `That is ${money(listed - each)} a unit under the ${money(listed)} on every other quote, ${money(each * units)} in all.` : `That is ${money(each * units)} in all.`;
    const contact = String(priced.fields?.Contact ?? '').trim();
    const callsBack = contact && /\bcall\s+(?:him|her|them)\s+back\b/i.test(String(wait.then ?? '')) ? `, and ${contact} is waiting for ${first} to call back` : '';
    const when = wait.createdAt ? `${first} asked you on ${aLagosDay(wait.createdAt)}${callsBack}.` : `${first} is still waiting for your answer${callsBack}.`;
    return {
      question: `Decide whether ${priced.name} can have ${units} ${units === 1 ? 'unit' : 'units'} at ${money(each)} each`,
      asked: `Can ${priced.name} have ${units} ${units === 1 ? 'unit' : 'units'} at ${money(each)} each?`,
      why: `${under} ${when}`,
      afterwards: `Your answer updates the board, and ${first} is no longer waiting on you.`,
      yes: 'Yes, agree to it',
    };
  }
  return {
    question: `Decide whether to agree to ${topic}`,
    asked: `Do you agree to ${topic}?`,
    why: deal ? `${asked} It decides the ${noun[1].toLowerCase()} on ${first}’s ${deal.name} deal.` : asked,
    afterwards: `Your answer updates the board, and ${first} is no longer waiting on you.`,
    yes: 'Yes, agree to it',
  };
}

const UNIT_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, twenty: 20, thirty: 30, forty: 40, fifty: 50 };
function theUnitsIn(fields: Record<string, string> | null | undefined): number | null {
  const u = String(fields?.Units ?? '').trim().toLowerCase();
  if (!u) return null;
  const d = u.replace(/,/g, '').match(/\d+/);
  return d ? Number(d[0]) : UNIT_WORDS[u.split(/\s+/)[0]] ?? null;
}
const money = (n: number) => `KES ${n.toLocaleString('en-GB')}`;
const amountOf = (v: unknown): number | null => {
  const m = String(v ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};

/**
 * THE PRICE OF ONE UNIT ON EVERY OTHER QUOTE: each deal's quote (or value) over its units, where every deal that has both says the
 * same price. Null where none has both, or they differ, so nothing is said that the quotes do not all say.
 */
export function theOtherQuotesPrice(deals: { fields?: Record<string, string> | null }[]): number | null {
  const each = deals
    .map((d) => {
      const u = theUnitsIn(d.fields);
      const q = amountOf(d.fields?.Quoted ?? d.fields?.Value);
      return u && q && !d.fields?.['Price each'] ? Math.round(q / u) : null;
    })
    .filter((x): x is number => !!x);
  if (!each.length || each.some((x) => x !== each[0])) return null;
  return each[0];
}

/** The lead's answer to a wait a yes or a no answers: both choices keep it, and the wait is cleared. */
export function whatToDoAboutAWaitTheLeadCanAnswer(waitId: string, groundId: string, d: AWaitTheLeadCanAnswer): AnAction {
  const route = (yes: boolean) => ({ method: 'POST' as const, path: `/grounds/${groundId}/board/waits/${waitId}/answer`, body: { yes } });
  return {
    label: 'Decide it',
    says: 'Your answer goes in how we work, and the person waiting on you is no longer waiting.',
    goesTo: null,
    choices: [{ label: d.yes, route: route(true) }, { label: 'No', route: route(false) }],
  };
}

/**
 * A DEAL AT THE STALL RULE, WITH WHOSE IT IS (board-as-lead.txt: "Samuel has chased the same 5 leads for 3 check-ins",
 * "The stall rule you set says drop them. He hasn't said why he's holding on.", "Ask him"). From the deals the lead is
 * served, after every wall: each stalled deal, grouped by its owner. Where the owner spoke about them on two or more
 * days after the customer went quiet, it says so; otherwise it says only how long the customer has been quiet. The
 * person is named, never "he" or "she". To the lead alone.
 */
export interface AtTheStallRule {
  participantId: string;
  name: string;
  deals: string[];
  title: string;
  detail: string;
  ask: string;
}

const CALL_WORDS: Record<string, number> = { a: 1, one: 1, my: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
export const NUMBER_SAID = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/**
 * HOW MANY CALLS WENT UNANSWERED, AND ON WHICH DAYS, from the owner's own lines about the deal on or after the day it went quiet
 * ("Paul from Upper Hill Offices has not answered my call yet." on 13 October, "Still no reply from Paul, even after two more calls
 * today." on 14 October): the most a day's lines say, added up over the days. Null where no line counts a call.
 */
export function theCallsNotAnswered(
  r: { name: string; fields?: Record<string, string> | null; ownerParticipantId?: string | null; notAnsweringSince?: string | null },
  lines: readonly { text: string; participantId: string | null; createdAt: Date | string }[],
): { calls: number; days: string[] } | null {
  if (!r.notAnsweringSince) return null;
  const contact = String(r.fields?.Contact ?? '').trim();
  const byDay = new Map<string, number>();
  for (const l of lines) {
    if (l.participantId !== r.ownerParticipantId) continue;
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(l.createdAt));
    if (day < r.notAnsweringSince) continue;
    const t = l.text;
    if (!(t.toLowerCase().includes(r.name.toLowerCase()) || (contact && new RegExp(`\\b${contact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(t)))) continue;
    /* "my call" and "a call" are one; "my calls" says no number, so it is not counted. */
    const m = t.match(/\b(?:(a|one|my)\s+call\b|(two|three|four|five|six|\d+)\s+(?:more\s+)?calls\b)/i);
    if (!m || !/\b(?:no reply|not answered|hasn['’]t answered|no answer|didn['’]t answer)\b/i.test(t)) continue;
    const said = (m[1] ?? m[2]).toLowerCase();
    const n = /^\d+$/.test(said) ? Number(said) : CALL_WORDS[said] ?? 1;
    byDay.set(day, Math.max(byDay.get(day) ?? 0, n));
  }
  if (!byDay.size) return null;
  const days = [...byDay.keys()].sort();
  return { calls: [...byDay.values()].reduce((a, b) => a + b, 0), days };
}

export const theDaysInWords = (keys: string[]): string => {
  const parts = keys.map((k) => { const [, m, d] = k.split('-').map(Number); return { d, m }; });
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (parts.every((p) => p.m === parts[0].m)) {
    const ds = parts.map((p) => String(p.d));
    return `${ds.length > 1 ? `${ds.slice(0, -1).join(', ')} and ${ds[ds.length - 1]}` : ds[0]} ${months[parts[0].m - 1]}`;
  }
  const each = parts.map((p) => `${p.d} ${months[p.m - 1]}`);
  return each.length > 1 ? `${each.slice(0, -1).join(', ')} and ${each[each.length - 1]}` : each[0];
};

export function theDealsAtTheStallRule(
  rows: any[],
  /*
   * Release 1's wording (Hafsah's quality pass, 18 October, B-9; standing decision 4 as changed that evening): only by a stall rule
   * the lead set, one deal is said with the person at the customer and the calls that went unanswered, from the owner's own lines:
   * "Paul at Upper Hill Offices has not answered three calls from Kevin, on 13 and 14 October." with "Your stall rule is to drop a
   * deal after 3 working days with no answer." With no rule set, no deal is here at all.
   */
  opts: { lines?: readonly { text: string; participantId: string | null; createdAt: Date | string }[]; theLeadsRule?: { days: number } | null } = {},
): AtTheStallRule[] {
  if (opts.theLeadsRule) {
    const out: AtTheStallRule[] = [];
    for (const r of rows ?? []) {
      if (r?.kind !== 'deal' || r.group !== 'cold' || !r.ownerParticipantId || !r.owner) continue;
      const first = firstNameOf(String(r.owner)) ?? String(r.owner);
      const contact = String(r.fields?.Contact ?? '').trim();
      const who = contact ? `${contact} at ${r.name}` : String(r.name);
      const calls = theCallsNotAnswered(r, opts.lines ?? []);
      const since = r.notAnsweringSince ? aLagosDay(`${r.notAnsweringSince}T12:00:00Z`) : null;
      const title = calls
        ? `${who} has not answered ${calls.calls === 1 ? 'a call' : `${NUMBER_SAID[calls.calls] ?? calls.calls} calls`} from ${first}, on ${theDaysInWords(calls.days)}`
        : `${who} has not answered ${first}${since ? ` since ${since}` : ''}`;
      const need = String(r.fields?.Need ?? '').trim() ? '' : `Nothing on record says yet what ${r.name} needs. `;
      out.push({
        participantId: r.ownerParticipantId,
        name: String(r.owner),
        deals: [String(r.name)],
        title,
        detail: `${need}Your stall rule is to drop a deal after ${opts.theLeadsRule.days} working days with no answer.`,
        ask: `Ask ${first}`,
      });
    }
    return out;
  }
  const by = new Map<string, { name: string; deals: string[]; since: string; days: number }>();
  for (const r of rows ?? []) {
    if (r?.kind !== 'deal' || r.group !== 'cold' || !r.ownerParticipantId || !r.owner) continue;
    const since = String(r.notAnsweringSince ?? '');
    const days = ((r.contactHistory ?? []) as any[]).filter((c) => since && String(c.on) > since).length;
    const had = by.get(r.ownerParticipantId) ?? { name: String(r.owner), deals: [], since, days: 0 };
    had.deals.push(String(r.name));
    if (since && (!had.since || since < had.since)) had.since = since;
    had.days = Math.max(had.days, days);
    by.set(r.ownerParticipantId, had);
  }
  const listed = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}` : xs[0]);
  return [...by.entries()].map(([participantId, v]) => {
    const first = firstNameOf(v.name) ?? v.name;
    const one = v.deals.length === 1;
    const since = v.since ? aLagosDay(`${v.since}T12:00:00Z`) : null;
    const title = v.days >= 2
      ? `${first} has followed up ${one ? v.deals[0] : `the same ${v.deals.length} leads`} with no reply for ${v.days} check-ins`
      : one
        ? `${v.deals[0]} has not answered ${first}${since ? ` since ${since}` : ''}`
        : `${listed(v.deals)} have not answered ${first}${since ? ` since ${since}` : ''}`;
    return {
      participantId,
      name: v.name,
      deals: v.deals,
      title,
      detail: `The stall rule says drop ${one ? 'it' : 'them'}. Nothing on record says why ${first} is holding on to ${one ? 'it' : 'them'}.`,
      ask: `Ask ${first}`,
    };
  });
}
