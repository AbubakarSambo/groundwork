import { aDaySaidInFull } from '../board/a-day-said-in-full';
/**
 * THE REASON A TARGET EXISTS, WHERE SOMEBODY RECORDED ONE.
 *
 * An objective is a number and a date, and the number is the part that survives
 * in everybody's memory. Why it is that number, and what anybody meant to do
 * about it, are the parts that go first — and they are the two things somebody
 * actually needs in order to act on it.
 *
 * SHOWN ONLY WHERE IT EXISTS. Most objectives in most organisations arrived from
 * a planning tool that never asked, and a line saying nothing was recorded would
 * appear against nearly every one of them — which turns a useful signal into
 * furniture within a week. Silence here means the question was never put, not
 * that somebody refused to answer.
 */

export interface AnObjective {
  title: string;
  target?: string | null;
  dueDate?: Date | string | null;
  justification?: string | null;
  approach?: string | null;
}

/**
 * One objective as a person reads it.
 *
 * The reason and the approach go on their own lines rather than in the
 * parenthesis. Packed into one line they read as more qualifiers on the number,
 * which is the opposite of the point: they are what the number is FOR.
 */
export function asALine(objective: AnObjective): string {
  const target = objective.target ? ` (target: ${objective.target})` : '';
  const due = objective.dueDate
    ? `, due ${typeof objective.dueDate === 'string' ? objective.dueDate : aDaySaidInFull(objective.dueDate)}`
    : '';

  const lines = [`- ${objective.title}${target}${due}`];

  const why = objective.justification?.trim();
  const how = objective.approach?.trim();

  if (why) lines.push(`    why that number: ${why}`);
  if (how) lines.push(`    how it moves: ${how}`);

  return lines.join('\n');
}

/**
 * What to say about a set of objectives none of which carries a reason.
 *
 * Said ONCE, at the bottom, rather than against each objective — and only when
 * there is not a single one, because that is a fact about how the work was set
 * up rather than about any particular target. Where some have reasons and some
 * do not, the ones that do are already doing the work of showing what a good
 * one looks like.
 */
export function whatIsMissingAcrossThem(objectives: AnObjective[]): string | null {
  if (objectives.length === 0) return null;

  const anyReason = objectives.some(
    (o) => (o.justification?.trim().length ?? 0) > 0 || (o.approach?.trim().length ?? 0) > 0,
  );
  if (anyReason) return null;

  return (
    'None of these records why its number is the number or how it is meant to move. '
    + 'That is usually because they came from a planning tool that never asked - worth having to hand '
    + 'before a check-in, where the first useful question about a target being missed is whether the '
    + 'reason for it still holds.'
  );
}
