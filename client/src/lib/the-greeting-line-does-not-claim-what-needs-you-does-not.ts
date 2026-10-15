/**
 * THE GREETING NEVER SAYS "YOU HAVE NOT CHECKED IN YET." WHEN NOTHING NEEDS YOU (screen fault 4,
 * final walk).
 *
 * Today's greeting line (GET /today's `line`) and "What needs you" (`needs`) are both the server's
 * own read, but they can still disagree about an open session the way GroundAdminPage.tsx and the
 * check-in's own tab can disagree with each other too (decision 76's kind of problem, on a
 * different pair of surfaces). Walked live: a lead with no open session anywhere - the check-in's
 * own tab said "No check-in open right now" - still had this exact sentence in the greeting, right
 * beside "Nothing needs you right now.". Read together, one claims something outstanding and the
 * other says there is nothing to do; only one of them can be true, and `needs` is the one place an
 * open session actually has to show up to be actionable at all.
 *
 * This drops exactly that one claim from the greeting when `needs` is empty - nothing invented in
 * its place, since "Nothing needs you right now." already says the true thing. Every other
 * greeting line (an open session that IS in `needs`, who in a team round has not answered, and so
 * on) passes through unchanged.
 */
const THE_UNCHECKED_IN_CLAIM = 'You have not checked in yet.'

export function todayGreetingLine(line: string | null | undefined, needsCount: number): string | null {
  if (!line) return line ?? null
  if (needsCount > 0) return line
  if (!line.includes(THE_UNCHECKED_IN_CLAIM)) return line
  const rest = line.split(THE_UNCHECKED_IN_CLAIM).join('').replace(/\s+/g, ' ').trim()
  return rest.length ? rest : null
}
