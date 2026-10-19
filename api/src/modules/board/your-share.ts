import { aNumberPeopleCanRead } from './an-aim-is-a-sentence-about-somebody';

/** Said to a person who checks in and has no number of their own on the board (request 110 a). */
export const YOU_HAVE_NO_SHARE_YET = 'There is no number of yours on this board yet, so there is no share to show.';

/**
 * YOUR SHARE, IN SENTENCES (request 107 c). The aim is already named for the reader ("You are aiming
 * for 3 shops in Kilimani."); this adds where it stands, in the reader's own words:
 *   an aim to reach:      "You are aiming for 3 shops in Kilimani. You have 1 of the 3 so far."
 *   a limit not to pass:  "You are keeping field visits to no more than 180,000. You are at 120,000 so far."
 *   nothing counted yet:  "... Nothing has been counted against it yet."
 */
export function theShareSays(
  name: string, count: number | null | undefined, target: number, direction?: string | null,
  /* Where the count is the reader's own deals on record (a-sales-aim-is-counted-from-the-deals). */
  fromTheDeals?: { counts: string; proven: number | null; shown?: number | null; currency?: string | null; thing?: string | null; paidDeals?: { name: string; holds: number }[]; signedDeals?: { name: string; holds: number; paysWhen: string | null }[]; saidDeals?: { name: string; holds: number }[] } | null,
): string {
  const aim = /[.!?]$/.test((name ?? '').trim()) ? name.trim() : `${(name ?? '').trim()}.`;
  /*
   * YOUR SHARE IN SHORT, NAMING YOUR DEALS (Hafsah's quality pass, 18 October, R-5): "You have sold 25 of your 40 units so far, all
   * to Greenfield Supermarket, on a signed order. Payment is due on delivery on Friday 16 October." Where the deals are named
   * (Release 1's sales board), from the reader's own deals only.
   */
  if (fromTheDeals && fromTheDeals.counts !== 'new leads' && !direction && count && (fromTheDeals.paidDeals || fromTheDeals.signedDeals || fromTheDeals.saidDeals)) {
    const say = (v: number) => (fromTheDeals.counts === 'value' && fromTheDeals.currency ? `${fromTheDeals.currency} ${aNumberPeopleCanRead(v)}` : aNumberPeopleCanRead(v));
    const thing = fromTheDeals.counts === 'value' ? '' : ` ${fromTheDeals.counts === 'sales' ? 'sales' : (fromTheDeals.thing ?? 'units')}`;
    const listed = (xs: { name: string }[]) => (xs.length <= 1 ? xs.map((x) => x.name).join('') : `${xs.slice(0, -1).map((x) => x.name).join(', ')} and ${xs[xs.length - 1].name}`);
    const sum = (xs: { holds: number }[]) => xs.reduce((t, x) => t + x.holds, 0);
    const groups = [
      { xs: fromTheDeals.paidDeals ?? [], word: 'paid' },
      { xs: fromTheDeals.signedDeals ?? [], word: 'on a signed order' },
      { xs: fromTheDeals.saidDeals ?? [], word: 'on your word' },
    ].filter((g) => g.xs.length);
    const how = groups.length === 1
      ? `all to ${listed(groups[0].xs)}, ${groups[0].word}`
      : groups.map((g) => `${say(sum(g.xs))} ${g.word} (${listed(g.xs)})`).join(', ').replace(/, ([^,]*)$/, ' and $1');
    const signed = fromTheDeals.signedDeals ?? [];
    const due = signed.length === 1 && signed[0].paysWhen ? ` Payment is due ${signed[0].paysWhen.replace(/^pays\s+/, '')}.` : '';
    return `You have sold ${say(count)} of your ${say(target)}${thing} so far, ${how}.${due}`;
  }
  /*
   * YOUR OWN SALES, AS THE PROTOTYPE SAYS THEM ("4 of your 5 sales so far; 3 paid", board-as-participant.txt), in full
   * sentences: what is sold, and how much of it proof of payment shows (Hafsah's answer of 17 October: a sale on your
   * word counts too, and is said as your word).
   */
  if (fromTheDeals && fromTheDeals.counts !== 'new leads' && !direction && count) {
    const say = (v: number) => (fromTheDeals.counts === 'value' && fromTheDeals.currency ? `${fromTheDeals.currency} ${aNumberPeopleCanRead(v)}` : aNumberPeopleCanRead(v));
    const n = say(count);
    const proven = fromTheDeals.proven ?? 0;
    const it = fromTheDeals.counts === 'value' ? 'it' : 'them';
    /* A document that is not a payment (a signed order) proves the order, not the payment, and is never "your word" (point 12). */
    const shown = Math.min(Math.max(0, fromTheDeals.shown ?? 0), Math.max(0, count - proven));
    const word = count - proven - shown;
    const backed = shown === 0 ? ''
      : word === 0 && proven === 0
        ? ` A document backs ${it}, but it does not show a payment.`
        : ` A document backs ${say(shown)} more, but it does not show a payment.`;
    const paid = proven >= count
      ? `Proof of payment shows all of ${it}.`
      : shown === 0
        ? (proven === 0
          ? `None of ${it} has proof of payment yet, so ${fromTheDeals.counts === 'value' ? 'it rests' : 'they rest'} on your word.`
          : `Proof of payment shows ${say(proven)} of ${it}, and the rest is on your word.`)
        : `${proven === 0 ? `None of ${it} has proof of payment yet.` : `Proof of payment shows ${say(proven)} of ${it}.`}${backed}${word > 0 ? ` The rest is on your word.` : ''}`;
    return `${aim} You have sold ${n} of the ${say(target)} so far. ${paid}`;
  }
  if (direction === 'ZERO' && (count == null || count === 0)) return `${aim} There have been none so far, which is where it should stay.`;
  if (direction === 'DEADLINE' && (count == null || count === 0)) return `${aim} It is not done yet.`;
  if (count == null || count === 0) return `${aim} Nothing has been counted against it yet.`;
  if (direction === 'LIMIT') return `${aim} You are at ${aNumberPeopleCanRead(count)} so far.`;
  /* The other kinds, each in its own words (decision 75, item 17). */
  if (direction === 'RATE') return `${aim} You are at ${aNumberPeopleCanRead(count)}% so far.`;
  if (direction === 'ZERO') return `${aim} There ${count === 1 ? 'has been 1' : `have been ${aNumberPeopleCanRead(count)}`} so far, and any at all is a breach.`;
  if (direction === 'DEADLINE') return `${aim} ${count >= (target > 0 ? target : 1) ? 'It is done.' : 'It is not done yet.'}`;
  return `${aim} You have ${aNumberPeopleCanRead(count)} of the ${aNumberPeopleCanRead(target)} so far.`;
}
