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
export const SPEND_NOTHING_WAITING = 'There is no spending request waiting to be sent. Tell me what you want to spend and I will ask.';

export interface SpendSaid { amount: number; what: string; currency: string | null }

export type SpendRead =
  | { kind: 'none' }
  | { kind: 'ask'; say: string }
  | { kind: 'ok'; said: SpendSaid };

const SAYS_SPEND = /\b(?:i|we|i've|i have)\s+(?:spent|paid|need to spend|want to spend|would like to spend|am going to spend|have to spend)\b|\b(?:i|we)(?:'d| would)\s+like to spend\b|\b(?:can|may|could|should)\s+(?:i|we)\s+spend\b/i;

const CURRENCY = '(kes|ksh|ngn|usd|gbp|eur|zar|ugx|tzs|ghs|rwf|₦|\\$|£|€)';
const MONEY = new RegExp(`(?:${CURRENCY}\\.?\\s*)?(\\d{1,3}(?:,\\d{3})+|\\d+)(\\.\\d+)?\\s*(k|m|thousand|million)?\\b(?:\\s*${CURRENCY}\\b)?`, 'gi');
const SYMBOL: Record<string, string> = { '₦': 'NGN', $: 'USD', '£': 'GBP', '€': 'EUR', ksh: 'KES' };
const codeOf = (c: string) => SYMBOL[c.toLowerCase()] ?? c.toUpperCase();

export function soundsLikeSpending(message: string): boolean {
  return SAYS_SPEND.test(message ?? '') && /\d/.test(message ?? '');
}

/** What the money is for, in the person's own words, cut at the end of the sentence. */
function whatFor(after: string): string {
  const m = /^\s*(?:on|for|to buy|to pay for|towards)\s+(.+?)\s*[.?!]*\s*$/i.exec(after);
  return (m?.[1] ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
}

export function readSpending(message: string, suiteCurrency: string | null): SpendRead {
  const t = (message ?? '').trim();
  if (!soundsLikeSpending(t)) return { kind: 'none' };
  const afterVerb = t.slice((SAYS_SPEND.exec(t)?.index ?? 0));
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
  const amounts = [...new Set(found.map(asAmount))];
  if (amounts.length > 1) {
    return { kind: 'ask', say: 'I found more than one amount in that. Tell me the one amount you want to spend and what it is for, and I will ask again.' };
  }
  const first = found[0];
  const amount = amounts[0];
  if (!(amount > 0) || !Number.isFinite(amount) || amount > 1e12) {
    return { kind: 'ask', say: 'I could not read how much that is. Tell me the amount as a number and what it is for, and I will ask again.' };
  }
  const said = first[1] ?? first[5];
  const currency = said ? codeOf(said) : null;
  if (currency && suiteCurrency && currency !== suiteCurrency.toUpperCase()) {
    return { kind: 'ask', say: `Your organisation counts spending in ${suiteCurrency}, and you wrote ${currency}. Tell me the amount in ${suiteCurrency} and I will ask again.` };
  }
  const what = whatFor(afterVerb.slice((first.index ?? 0) + first[0].length));
  if (!what) return { kind: 'ask', say: `What is the ${money(suiteCurrency, amount)} for? Tell me in a few words and I will ask again.` };
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
}

/**
 * The say-back, with anything over the budget or against the rule said before the yes. It names the
 * month and the person's own team, and nothing about anybody else's spending.
 */
export function spendingSaidBack(said: SpendSaid, facts: SpendFacts, month: string): string {
  const cur = facts.currency ?? said.currency;
  const who = facts.approverFirstName ?? 'an admin';
  const parts = [`You asked to spend ${money(cur, said.amount)} on ${said.what}.`];
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
  if (facts.limit != null && said.amount > facts.limit) {
    parts.push(`This is over ${money(cur, facts.limit)}, so ${who} must approve it.`);
    trouble = true;
  }
  parts.push(`Shall I ${trouble ? 'still ' : ''}send it to ${who} to approve?`);
  return parts.join(' ');
}

export function spendingSent(said: SpendSaid, currency: string | null, approverFirstName: string | null): string {
  return `I have sent your request to spend ${money(currency ?? said.currency, said.amount)} on ${said.what} to ${approverFirstName ?? 'an admin'}. It is not approved until they decide, and nothing is spent until then.`;
}
