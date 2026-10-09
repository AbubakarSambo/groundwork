import type { ComingUp } from '@/api/today'
import { whatTellsItApart } from '@/lib/tell-apart-the-same-name'

/**
 * REQUEST 193, B-044: TWO CHECK-INS NAMED ALMOST ALIKE, ON "COMING UP".
 *
 * The audit found "Amina's project check-in" and "Amina's project check-in, from 7 October" on the
 * same list, their second-session dates one line after the other, reading as the same item said
 * twice until the small suffix is noticed. `GET /today` used to serve `comingUp` as one finished
 * sentence (`{ at, what, to }`) built from the check-in's own label, with nothing the screen could
 * use to tell two of them apart on its own.
 *
 * Request 193 answered: each row now carries `groundId` and, when the check-in's start day is
 * known, `checkInStartedOn`. This reaches for the same disambiguation the sidebar already gives two
 * check-ins that share one label (`tell-apart-the-same-name.ts`) - when two "Coming up" rows read
 * the exact same `what`, each reads when its own check-in started.
 */
export function withComingUpTellingTwoApart(items: ComingUp[]): (ComingUp & { apart: string | null })[] {
  const withIds = items.map((c, i) => ({ id: c.groundId ?? `row-${i}`, label: c.what, startsAt: c.checkInStartedOn }))
  return items.map((c, i) => ({ ...c, apart: c.groundId ? whatTellsItApart(withIds, withIds[i]) : null }))
}
