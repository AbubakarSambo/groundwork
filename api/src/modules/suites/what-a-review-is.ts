/**
 * WHAT A REVIEW IS, WHO READS IT, AND WHAT HAPPENS NEXT (Batch S, S4, Hafsah 19 November 2026: "evaluations that say plainly what
 * they're based on, who sees them and what to do next").
 *
 * One block of plain sentences, owned here and served by the reviews service (`ReviewsService.one` and `mine`) to the person it is
 * about, to whoever writes it, and to everybody else who may read it, each in their own words ("you" for the reader). The review
 * page and the person's own list read it; nothing else words it. It says only what is true of the review: what it is drawn from
 * (the record, never hours or leave, decision 10), who reads it by name where known, and the next step, with the next steps and
 * the date to look at it again once the writer has decided.
 */
export interface AReviewToSay {
  /** The person it is about, by first name, and whether they are the one reading. */
  person: { first: string; reads: boolean };
  /** Whoever writes it, by first name, or null when it falls to an admin; and whether they are the one reading. */
  writer: { first: string | null; reads: boolean };
  /** The period the record was read for, or null for a review started before the record was read. */
  from: Date | null;
  to: Date;
  hasRecord: boolean;
  hasWords: boolean;
  hasTheirView: boolean;
  /** Who else reads it: with Release 7 on, whoever holds the HR duty and an admin who set up one of their check-ins; otherwise every admin. */
  others: { release7: boolean; hr: string | null };
  decided: { byFirst: string | null; byReader: boolean; on: Date; nextSteps: string | null; lookAgainOn: Date | null } | null;
  appealed: boolean;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const aDay = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const capital = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
const sentence = (s: string) => { const t = s.trim(); return /[.!?]$/.test(t) ? t : `${t}.`; };

export function whatThisReviewIs(r: AReviewToSay): string[] {
  const you = r.person.reads;
  const P = you ? 'you' : r.person.first;
  const Ps = you ? 'your' : `${r.person.first}’s`;
  const W = r.writer.reads ? 'you' : r.writer.first ?? 'an admin';
  const Ws = r.writer.reads ? 'your' : r.writer.first ? `${r.writer.first}’s` : 'the admin’s';
  const out: string[] = [];

  /* What it is drawn from. */
  const period = r.from ? ` between ${aDay(r.from)} and ${aDay(r.to)}` : '';
  const drawnFrom = r.hasRecord
    ? [`${Ps} check-ins${period}`, `the goals and work ${P} ${you ? 'own' : 'owns'}`, `what ${P} committed to and how each went`, `${Ps} own view of ${you ? 'your' : 'the'} work`, `${Ws} own words`]
    : [`${Ps} own view of ${you ? 'your' : 'the'} work`, `${Ws} own words`, `what Groundwork noticed in ${Ps} check-ins`];
  out.push(`This review is drawn from ${listed(drawnFrom)}. Hours and leave are never part of it.`);

  /* Who reads it, by name where known. */
  const readers = [
    you ? 'You' : r.person.first,
    r.writer.reads ? 'you, as the one who writes it' : r.writer.first ? `${r.writer.first}, who writes it` : 'the admin who writes it',
    ...(r.others.release7
      ? [r.others.hr ? `${r.others.hr}, who looks after HR` : null, `an admin who set up or approved one of ${Ps} check-ins`].filter((x): x is string => !!x)
      : ['every admin']),
  ];
  out.push(`${capital(listed(readers))} can read it. Nobody else can.`);

  /* What happens next. */
  if (!r.decided) {
    const steps: string[] = [];
    if (!r.hasWords) steps.push(`${W} ${r.writer.reads ? 'write' : 'writes'} ${r.writer.reads ? 'your' : 'their'} view`);
    if (!r.hasTheirView) steps.push(`${P} ${you ? 'write' : 'writes'} ${you ? 'your' : 'their'} own`);
    out.push(`${steps.length ? `Next, ${listed(steps)}. Then ` : 'Next, '}${W} ${r.writer.reads ? 'decide' : 'decides'}, with reasons, and ${P} ${you ? 'read' : 'reads'} both.`);
    return out;
  }
  const by = r.decided.byReader ? 'You' : r.decided.byFirst ?? 'The writer';
  out.push(`${by} decided it on ${aDay(r.decided.on)}.`);
  out.push(r.decided.nextSteps?.trim() ? `The next steps are these. ${sentence(r.decided.nextSteps)}` : 'No next steps were written down.');
  out.push(r.decided.lookAgainOn
    ? `${by === 'You' ? 'You' : by} will look at it again with ${P === 'you' ? 'you' : P} on ${aDay(r.decided.lookAgainOn)}.`
    : 'No date is set to look at it again.');
  out.push(r.appealed
    ? 'The decision has been appealed, and an admin who did not make it decides the appeal.'
    : `${you ? 'You' : P} can appeal the decision to an admin who did not make it.`);
  return out;
}
