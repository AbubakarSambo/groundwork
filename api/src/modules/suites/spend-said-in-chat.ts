/**
 * A REQUEST TO SPEND, SAID IN CHAT, GOES TO THE SPENDING SUITE (week 22, request 26).
 *
 * "I spent 12,000 on fuel for the Kisumu trip" is read by rules, never by a model: an amount nobody
 * wrote is the worst way to be wrong here. It is checked against the team's budget and the spending
 * rule the suite already has, said back with anything over either (before the yes), and written and
 * sent to the approver only after a yes. It tells the person nothing about anybody else's spending,
 * only what their own team has left, and nothing about it reaches a check-in, a report or a pattern.
 * An amount or a currency that is not certain is asked again, never guessed.
 */

export const SPEND_SUITE_OFF = 'Spending requests are not switched on in your organisation, so I have not sent or kept this. An admin can switch them on under Suites.';
export const SPEND_NOT_SENT = 'I have not sent it. Nothing was kept.';
/** The parked proposal in Ask Groundwork while Groundwork asks for the one thing the rules need and the words did not say (build step 9). */
export const SPEND_MISSING_KIND = 'spend_missing';
/** The parked proposal while Groundwork asks what an amount is for, so that the next thing the person types is read as the answer. */
export const SPEND_PURPOSE_KIND = 'spend_purpose';
export const SPEND_NOTHING_WAITING = 'There is no spending request waiting to be sent. Tell me what you want to spend and I will ask.';

export interface SpendSaid { amount: number; what: string; currency: string | null }

export type SpendRead =
  | { kind: 'none' }
  /** `purpose` is set when only the reason is missing: the amount is kept, and the next reply is taken as the reason. */
  | { kind: 'ask'; say: string; purpose?: { amount: number; currency: string | null } }
  | { kind: 'ok'; said: SpendSaid };

/*
 * HOW A REQUEST TO SPEND IS SAID (found in the 4 October review: "Can I buy a new laptop for 95,000?" and
 * "I need 5000 for airtime" were not read as spending). The old shapes stay: "I spent", "I want to spend",
 * "can I spend". Added: asking to buy, get, order, pay for, book or claim something ("Could I claim 3,500
 * for taxi fares?", "Please can I get 15,000 for the team lunch?"), saying what is wanted to buy ("I'd like
 * to buy a projector for KES 60,000"), and "I need 5000 for airtime", where a bare number counts only when
 * "for" or "on" follows it, so "I need 10 chairs for the office" is not money.
 */
const BUYING = '(?:buy|get|order|pay(?:\\s+for)?|purchase|book|claim|expense|put\\s+through)';
const SAYS_SPEND_BEFORE = /\b(?:i|we|i've|i have)\s+(?:spent|paid|need to spend|want to spend|would like to spend|am going to spend|have to spend)\b|\b(?:i|we)(?:'d| would)\s+like to spend\b|\b(?:can|may|could|should)\s+(?:i|we)\s+spend\b/i;
const SAYS_SPEND_ALSO = new RegExp(
  [
    "\\b(?:can|may|could|should|would)\\s+(?:i|we)\\s+(?:please\\s+)?spend\\b",
    `\\b(?:can|may|could|should|would)\\s+(?:i|we)\\s+(?:please\\s+)?${BUYING}\\b`,
    `\\b(?:i|we)(?:['’]d| would|['’]ll| will)?\\s*(?:need|want|like|would like|am going|have got|have)\\s+to\\s+${BUYING}\\b`,
    `\\b(?:i|we)\\s+(?:bought|ordered|purchased|booked)\\b`,
    "\\b(?:i|we)(?:['’]d| would)?\\s*(?:need|want|require)\\s+(?:(?:kes|ksh|ngn|usd|gbp|eur|zar|ugx|tzs|ghs|rwf|₦|\\$|£|€)\\.?\\s*)?\\d[\\d,.]*\\s*(?:k|m|thousand|million)?\\s+(?:for|on)\\b",
  ].join('|'),
  'i',
);

const CURRENCY = '(kes|ksh|ngn|usd|gbp|eur|zar|ugx|tzs|ghs|rwf|₦|\\$|£|€)';
/* "15,000 shillings", "20,000 naira", "300 dollars": the currency said as a word after the amount. */
const CURRENCY_WORD = 'shillings?|naira|dollars?|cedis?|rand|pounds?|euros?';
const MONEY = new RegExp(`(?:${CURRENCY}\\.?\\s*)?(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d+)?\\s*(k|m|thousand|million)?\\b(?:\\s*${CURRENCY}\\b|\\s*(${CURRENCY_WORD})\\b)?`, 'gi');
const WORD_CODE: Record<string, string | null> = { shilling: null, shillings: null, naira: 'NGN', dollar: 'USD', dollars: 'USD', cedi: 'GHS', cedis: 'GHS', rand: 'ZAR', pound: 'GBP', pounds: 'GBP', euro: 'EUR', euros: 'EUR' };
const SYMBOL: Record<string, string> = { '₦': 'NGN', $: 'USD', '£': 'GBP', '€': 'EUR', ksh: 'KES' };
const codeOf = (c: string) => SYMBOL[c.toLowerCase()] ?? c.toUpperCase();

/** An amount that is plainly money: with a currency, a k or a million, thousands grouped, or three digits or more. */
const MONEYISH = /(?:\b(?:kes|ksh|ngn|usd|gbp|eur|zar|ugx|tzs|ghs|rwf)\b\.?\s*|[₦$£€]\s*)\d|\d\s*(?:k|m|thousand|million)\b|\d{1,3}(?:,\d{3})+|\b\d{3,}\b/i;

export function soundsLikeSpending(message: string): boolean {
  const t = message ?? '';
  if (SAYS_SPEND_BEFORE.test(t) && /\d/.test(t)) return true;
  return SAYS_SPEND_ALSO.test(t) && MONEYISH.test(t);
}

const startOfSpending = (t: string) => {
  const at = [SAYS_SPEND_BEFORE.exec(t)?.index, SAYS_SPEND_ALSO.exec(t)?.index].filter((i): i is number => i != null);
  return at.length ? Math.min(...at) : 0;
};

/** "Can I buy a new laptop for 95,000": what comes between the buying word and the amount is what it is for. */
function whatWasBought(before: string): string {
  const m = new RegExp(`\\b(?:${BUYING}|bought|ordered|purchased|booked)\\s+(.+)$`, 'i').exec(before);
  if (!m) return '';
  return m[1].replace(/\s*(?:for|at|costing|which costs|that costs|it costs|costs|worth|@|:|-|,)\s*$/i, '').replace(/\s+/g, ' ').trim().slice(0, 300);
}

/** What the money is for, in the person's own words, cut at the end of the sentence. */
function whatFor(after: string): string {
  const m = /^\s*(?:on|for|to buy|to pay for|towards)\s+(.+?)\s*[.?!]*\s*$/i.exec(after);
  return (m?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
}

export function readSpending(message: string, suiteCurrency: string | null): SpendRead {
  const t = (message ?? '').trim();
  if (!soundsLikeSpending(t)) return { kind: 'none' };
  const afterVerb = t.slice(startOfSpending(t));
  const found = [...afterVerb.matchAll(MONEY)].filter((m) => {
    /* A number followed by an hour or a day is not money, and a bare number inside a date is not either. */
    const rest = afterVerb.slice((m.index ?? 0) + m[0].length);
    return !/^\s*(?:hours?|hrs?|h\b|minutes?|mins?|days?|weeks?|months?|people|persons)/i.test(rest)
      && !/^\s*(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)/i.test(rest);
  });
  if (found.length === 0) return { kind: 'none' };
  const asAmount = (m: RegExpMatchArray) => {
    const base = +`${m[2].replace(/,/g, '')}${m[3] ?? ''}`;
    const unit = (m[4] ?? '').toLowerCase();
    return base * (unit === 'k' || unit === 'thousand' ? 1_000 : unit === 'm' || unit === 'million' ? 1_000_000 : 1);
  };
  /*
   * "Can we order 12 chairs for 30,000?" holds two numbers. The one that follows "for", "costing",
   * "worth" or "at", or that carries a currency or a k, is the money; the other is a quantity.
   */
  const pricedBy = (m: RegExpMatchArray) => /(?:\bfor|\bat|\bcosts?|\bcosting|\bworth|@)\s*$/i.test(afterVerb.slice(0, m.index ?? 0)) || !!m[1] || !!m[5] || !!m[6] || !!m[4];
  const priced = found.length > 1 && !SAYS_SPEND_BEFORE.test(t) ? found.filter(pricedBy) : found;
  const used = priced.length === 1 ? priced : found;
  const amounts = [...new Set(used.map(asAmount))];
  if (amounts.length > 1) {
    return { kind: 'ask', say: 'I found more than one amount in that. Tell me the one amount you want to spend and what it is for, and I will ask again.' };
  }
  const first = used[0];
  const amount = amounts[0];
  if (!(amount > 0) || !Number.isFinite(amount) || amount > 1e12) {
    return { kind: 'ask', say: 'I could not read how much that is. Tell me the amount as a number and what it is for, and I will ask again.' };
  }
  const said = first[1] ?? first[5];
  /* "shillings" alone does not say which country's, so it is taken as the organisation's own currency. */
  const word = first[6]?.toLowerCase() ?? null;
  const currency = said ? codeOf(said) : word ? (WORD_CODE[word] ?? null) : null;
  /* Shillings are Kenya's, Uganda's and Tanzania's: they are the organisation's own only when it counts in one of those. */
  if (word && /^shillings?$/.test(word) && suiteCurrency && !['KES', 'UGX', 'TZS'].includes(suiteCurrency.toUpperCase())) {
    return { kind: 'ask', say: `Your organisation counts spending in ${suiteCurrency}, and you wrote shillings. Tell me the amount in ${suiteCurrency} and I will ask again.` };
  }
  if (currency && suiteCurrency && currency !== suiteCurrency.toUpperCase()) {
    return { kind: 'ask', say: `Your organisation counts spending in ${suiteCurrency}, and you wrote ${currency}. Tell me the amount in ${suiteCurrency} and I will ask again.` };
  }
  const what = whatFor(afterVerb.slice((first.index ?? 0) + first[0].length)) || whatWasBought(afterVerb.slice(0, first.index ?? 0));
  if (!what) return { kind: 'ask', say: `What is the ${money(currency ?? suiteCurrency, amount)} for? Tell me in a few words and I will ask again.`, purpose: { amount, currency: currency ?? suiteCurrency } };
  return { kind: 'ok', said: { amount, what, currency: currency ?? suiteCurrency } };
}

const group = (n: number) => (Number.isInteger(n) ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));
export const money = (currency: string | null, n: number) => `${currency ? `${currency} ` : ''}${group(n)}`;

export interface SpendFacts {
  currency: string | null;
  team: string | null;
  left: number | null;
  /** What the same team has already asked for this month and is still waiting on a decision. */
  waiting?: number | null;
  limit: number | null;
  approver: 'manager' | 'person' | 'admin';
  approverFirstName: string | null;
  /** The highest threshold of the spending rules this is over (build step 9). Said in place of the limit. */
  bar?: number | null;
  /** Whoever decides each later step of that threshold, in words: "Grace, the chief executive". */
  thenTo?: string[];
  /** The evidence the rules ask for, in full sentences for the person. */
  evidence?: string[];
  /** The category it is for, and what a category is called, when the rules have categories. */
  category?: { name: string; called: string } | null;
}

/**
 * The say-back, with anything over the budget or against the rule said before the yes. It names the
 * month and the person's own team, and nothing about anybody else's spending.
 */
export function spendingSaidBack(said: SpendSaid, facts: SpendFacts, month: string): string {
  const cur = facts.currency ?? said.currency;
  const who = facts.approverFirstName ?? 'an admin';
  const parts = [`You asked to spend ${money(cur, said.amount)} on ${said.what}.`];
  if (facts.category) parts.push(`It is for the ${facts.category.called} ${facts.category.name}.`);
  let trouble = false;
  const waiting = facts.waiting && facts.waiting > 0 ? facts.waiting : 0;
  if (facts.team && facts.left != null && facts.left > 0 && waiting > 0) {
    /*
     * WHAT IS ALREADY ASKED FOR COUNTS TOO (found live, 1 October 2026, item 6). Chidi asked to spend
     * KES 30,000 while KES 12,000 of the Sales budget was already asked for and waiting, and read
     * "Sales has KES 38,000 left for October, so that fits." The money waiting for a decision is said,
     * as one total for the team and never whose it is, and what is free is what is left after it.
     */
    const free = facts.left - waiting;
    if (free <= 0) {
      parts.push(`${facts.team} has ${money(cur, facts.left)} left for ${month}, and ${waiting >= facts.left ? 'all of it' : money(cur, waiting)} is already asked for and waiting, so none of it is free.`);
      trouble = true;
    } else if (said.amount > free) {
      parts.push(`${facts.team} has ${money(cur, facts.left)} left for ${month}, and ${money(cur, waiting)} of that is already asked for and waiting, so ${money(cur, free)} is free. This is more than that.`);
      trouble = true;
    } else {
      parts.push(`${facts.team} has ${money(cur, facts.left)} left for ${month}, and ${money(cur, waiting)} of that is already asked for and waiting, so ${money(cur, free)} is free. That fits.`);
    }
  } else if (facts.team && facts.left != null) {
    if (facts.left <= 0) { parts.push(`${facts.team} has no budget left for ${month}.`); trouble = true; }
    else if (said.amount > facts.left) { parts.push(`That is over the ${facts.team} budget left for ${month}, which is ${money(cur, facts.left)}.`); trouble = true; }
    else parts.push(`${facts.team} has ${money(cur, facts.left)} left for ${month}, so that fits.`);
  } else if (facts.team) {
    parts.push(`There is no budget set for ${facts.team} for ${month}.`);
  }
  /* Over a threshold of the spending rules (build step 9): that amount, and who decides after. Otherwise the limit, as before. */
  const bar = facts.bar != null ? facts.bar : facts.limit != null && said.amount > facts.limit ? facts.limit : null;
  if (bar != null) {
    const then = (facts.thenTo ?? []).filter(Boolean);
    parts.push(`This is over ${money(cur, bar)}, so ${who} must approve it${then.length ? `, and then ${then.join(', and then ')}` : ''}.`);
    trouble = true;
  }
  for (const e of facts.evidence ?? []) parts.push(e);
  parts.push(`Shall I ${trouble ? 'still ' : ''}send it to ${who} to approve?`);
  return parts.join(' ');
}

export function spendingSent(said: SpendSaid, currency: string | null, approverFirstName: string | null): string {
  return `I have sent your request to spend ${money(currency ?? said.currency, said.amount)} on ${said.what} to ${approverFirstName ?? 'an admin'}. It is not approved until they decide, and nothing is spent until then.`;
}

/** The reason as it joins "on ...": the first letter is lower-case unless the first word is a name or an acronym. */
export function aReasonInASentence(what: string): string {
  const first = what.split(/\s+/)[0] ?? '';
  const aName = first === 'I' || /^[A-Z]{2,}\b/.test(first) || /^.[A-Z]/.test(first);
  return !what || aName ? what : what[0].toLowerCase() + what.slice(1);
}
