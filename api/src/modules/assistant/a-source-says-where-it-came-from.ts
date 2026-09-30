/**
 * EVERY ANSWER FROM THE RECORD SAYS WHERE IT CAME FROM (week 17).
 *
 * A person who is told what a colleague said, or what to do next, is entitled to ask "from where?".
 * The answer is a plain sentence the reader can read ("This is from Femi's check-in of 24 September
 * on Sales team, Q3.") and a block the panel can turn into a link. Both are built here, once, so a
 * lane cannot word its own source differently from the next lane.
 *
 * WHAT THIS NEVER DOES: name a record the reader cannot open. A source is only ever built by a lane
 * that has already read the record as the reader, through the read the product serves them.
 */
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
import { SourceBlock } from './a-reply-is-a-payload-not-a-string';

const possessive = (name: string) => `${name}'s`;

/** A person's check-in on a check-in, as the reader says it. `whose` is a name, or null for the reader's own. */
export function aCheckInSource(input: { whose: string | null; on: Date | null; label: string; groundId: string; sessionNumber: number }): SourceBlock {
  const when = input.on ? ` of ${whenItWas(input.on, 'dayAndMonthLong')}` : '';
  const label = `${input.whose ? possessive(input.whose) : 'your'} check-in${when} on ${input.label}`;
  return {
    type: 'source',
    label,
    says: `This is from ${label}.`,
    href: `/grounds/${input.groundId}/session/${input.sessionNumber}`,
    kind: 'check_in',
    id: input.groundId,
  };
}

/** The report on a check-in, once it has been released to this reader. */
export function aReportSource(input: { on: Date | null; label: string; groundId: string }): SourceBlock {
  const when = input.on ? ` of ${whenItWas(input.on, 'dayAndMonthLong')}` : '';
  const label = `the report on ${input.label}${when}`;
  return { type: 'source', label, says: `This is from ${label}.`, href: `/grounds/${input.groundId}/report`, kind: 'report', id: input.groundId };
}

export const YOUR_TO_DOS_SOURCE: SourceBlock = {
  type: 'source',
  label: 'your to-do list',
  says: 'This is from your to-do list.',
  href: '/suite/todos',
  kind: 'to_dos',
};

export const YOUR_COMMITMENTS_SOURCE: SourceBlock = {
  type: 'source',
  label: 'the commitments you have made in your check-ins',
  says: 'This is from the commitments you have made in your check-ins.',
  href: '/you',
  kind: 'commitments',
};

export const WHAT_NEEDS_YOU_SOURCE: SourceBlock = {
  type: 'source',
  label: 'what needs you on Today',
  says: 'This is from what needs you on Today.',
  href: '/today',
  kind: 'today',
};
