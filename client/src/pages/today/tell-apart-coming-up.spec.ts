import { describe, it, expect } from 'vitest'
import { withComingUpTellingTwoApart } from './tell-apart-coming-up'

/**
 * B-044 / REQUEST 193: "Amina's project check-in" and "Amina's project check-in, from 7 October"
 * read as the same row said twice on "Coming up" until the suffix is noticed. Once `GET /today`
 * carries `groundId` and `checkInStartedOn` on each row, two with the identical `what` are told
 * apart by when each one started; a `what` that is already unique is left exactly as it was.
 */
describe('telling two "Coming up" rows apart', () => {
  it('says when each one started, only once another row shares its exact sentence', () => {
    const items = [
      { at: '2026-10-10T09:00:00.000Z', what: "Amina's project check-in", to: '/grounds/g1', groundId: 'g1', checkInStartedOn: '2026-09-01T00:00:00.000Z' },
      { at: '2026-10-10T09:00:00.000Z', what: "Amina's project check-in", to: '/grounds/g2', groundId: 'g2', checkInStartedOn: '2026-10-07T00:00:00.000Z' },
    ]
    const [first, second] = withComingUpTellingTwoApart(items)
    expect(first.apart).toBe('started 1 September')
    expect(second.apart).toBe('started 7 October')
  })

  it('says nothing extra when the sentence is already unique', () => {
    const items = [
      { at: '2026-10-10T09:00:00.000Z', what: "Amina's project check-in", to: '/grounds/g1', groundId: 'g1', checkInStartedOn: '2026-09-01T00:00:00.000Z' },
      { at: '2026-10-10T09:00:00.000Z', what: "Kito's weekly sync", to: '/grounds/g2', groundId: 'g2', checkInStartedOn: '2026-10-07T00:00:00.000Z' },
    ]
    const [first, second] = withComingUpTellingTwoApart(items)
    expect(first.apart).toBeNull()
    expect(second.apart).toBeNull()
  })

  it('an older server with no groundId is left exactly as it reads today', () => {
    const items = [
      { at: '2026-10-10T09:00:00.000Z', what: "Amina's project check-in", to: '/grounds/g1' },
      { at: '2026-10-10T09:00:00.000Z', what: "Amina's project check-in", to: '/grounds/g2' },
    ]
    const result = withComingUpTellingTwoApart(items)
    expect(result.every(r => r.apart === null)).toBe(true)
  })
})
