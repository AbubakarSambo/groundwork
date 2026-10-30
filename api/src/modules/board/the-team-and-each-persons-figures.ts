/**
 * RELEASE 4: EACH PERSON'S OWN TARGET BESIDE THE TEAM'S, AND WHY THE NUMBERS DON'T MATCH (release plan, Release 4). Read only from the
 * targets on record: the team's target (no owner) and each person's own target of the same name and unit. Nothing is guessed. A
 * difference is said only where every person's figure is on record, so the record can work it out; otherwise it says who has none.
 */
export interface ATarget {
  id: string
  name: string
  count?: number | null
  target?: number | null
  unit?: string | null
  ownerParticipantId?: string | null
  direction?: string | null
  journey?: { direction?: string | null } | null
}

/** A limit not to go over (LIMIT, ZERO, or a figure that should go down): a person's share of it is a limit too. */
const aLimit = (t: ATarget) => t.direction === 'LIMIT' || t.direction === 'ZERO' || t.journey?.direction === 'down'

const same = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ')
const n = (v: number, unit: string | null | undefined) => {
  const s = Number.isInteger(v) ? v.toLocaleString('en-GB') : String(Math.round(v * 10) / 10)
  if (!unit) return s
  if (unit === '%') return `${s}%`
  if (/^[A-Z]{3}$/.test(unit)) return `${unit} ${s}`
  return `${s} ${unit}`
}
const listed = (xs: string[]) => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`

/** Each team target with the people who hold a target of their own under it, each said as "4 of 10". */
export function eachPersonsOwnBesideTheTeams(targets: ATarget[], nameOf: (participantId: string) => string | null) {
  const team = targets.filter((t) => !t.ownerParticipantId)
  return team.map((t) => {
    const theirs = targets.filter((o) => o.ownerParticipantId && same(o.name, t.name) && (o.unit ?? null) === (t.unit ?? null))
    const atMost = aLimit(t) ? 'at most ' : ''
    return {
      objectiveId: t.id,
      people: theirs.map((o) => ({
        participantId: o.ownerParticipantId as string,
        name: nameOf(o.ownerParticipantId as string) ?? 'Someone',
        says: o.target != null
          ? `${o.count != null ? n(o.count, o.unit) : 'Nothing yet'} of ${atMost}${n(o.target, o.unit)}`
          : o.count != null ? n(o.count, o.unit) : 'No figure yet',
      })),
    }
  }).filter((x) => x.people.length > 0)
}

/** Where the team's figure and the people's own figures do not add up, said plainly, with the difference; only from the record. */
export function whyTheNumbersDoNotMatch(targets: ATarget[], nameOf: (participantId: string) => string | null): { objectiveId: string; says: string }[] {
  const out: { objectiveId: string; says: string }[] = []
  for (const t of targets.filter((x) => !x.ownerParticipantId && x.count != null)) {
    if (t.unit === '%') continue // a rate does not add up across people
    const theirs = targets.filter((o) => o.ownerParticipantId && same(o.name, t.name) && (o.unit ?? null) === (t.unit ?? null))
    if (theirs.length < 2) continue
    const none = theirs.filter((o) => o.count == null).map((o) => nameOf(o.ownerParticipantId as string) ?? 'Someone')
    if (none.length) {
      out.push({ objectiveId: t.id, says: `The team's figure for ${t.name} is ${n(t.count as number, t.unit)}. ${listed(none)} ${none.length === 1 ? 'has' : 'have'} no figure of their own yet, so the two cannot be checked against each other.` })
      continue
    }
    const sum = theirs.reduce((s, o) => s + (o.count as number), 0)
    const diff = (t.count as number) - sum
    if (Math.abs(diff) < 1e-9) continue
    out.push({
      objectiveId: t.id,
      says: `The team's figure for ${t.name} is ${n(t.count as number, t.unit)}, and each person's own figures add up to ${n(sum, t.unit)}. ${diff > 0
        ? `${n(diff, t.unit)} of the team's figure is not in anyone's own figure.`
        : `The people's figures are ${n(-diff, t.unit)} more than the team's.`}`,
    })
  }
  return out
}
