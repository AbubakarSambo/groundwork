import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { whenItRunsOut, sayHowLongIsLeft, DAYS_OF_NOTICE } from './when-it-runs-out'

/**
 * A RISK OF STALLING SHOWS. IT DOES NOT JUST STALL.
 *
 * Hafsah, 23 September 2026: "have a risk of stalling show, don't just stall."
 *
 * The product had one thing to say about a deadline and said it afterwards: a 3am sweep wrote the
 * check-in off and emailed everybody that it was over. The date sat in a quiet line on the page and
 * nothing anywhere said what happened when it arrived.
 */
describe('how long is left', () => {
  it('says nothing while there is time', () => {
    expect(whenItRunsOut({ daysLeft: 40, status: 'ACTIVE' })).toEqual({ state: 'fine' })
    expect(whenItRunsOut({ daysLeft: DAYS_OF_NOTICE + 1, status: 'ACTIVE' })).toEqual({ state: 'fine' })
  })

  it('and speaks up a week out, which is when somebody can still act', () => {
    expect(whenItRunsOut({ daysLeft: DAYS_OF_NOTICE, status: 'ACTIVE' })).toEqual({ state: 'soon', daysLeft: 7 })
    expect(whenItRunsOut({ daysLeft: 1, status: 'ACTIVE' })).toEqual({ state: 'soon', daysLeft: 1 })
  })

  it('and says the time is up on the day', () => {
    expect(whenItRunsOut({ daysLeft: 0, status: 'ACTIVE' }).state).toBe('out')
    expect(whenItRunsOut({ daysLeft: -3, status: 'ACTIVE' }).state).toBe('out')
  })

  /* A check-in with no fixed length has no deadline to warn about. */
  it('and nothing at all where there is no end date', () => {
    expect(whenItRunsOut({ daysLeft: null, status: 'ACTIVE' })).toEqual({ state: 'fine' })
    expect(whenItRunsOut(null)).toEqual({ state: 'fine' })
  })

  /* One that already stopped has its own banner, and two banners saying it is over is one too many. */
  it('and stays quiet on one that has already stopped', () => {
    expect(whenItRunsOut({ daysLeft: -9, status: 'STALLED' })).toEqual({ state: 'fine' })
  })
})

describe('what it says', () => {
  /* "Runs out in 5 days" is a fact nobody can act on without knowing what running out costs. */
  it('names the consequence, not just the number', () => {
    const said = sayHowLongIsLeft({ state: 'soon', daysLeft: 5 }, 3)
    expect(said).toContain('runs out in 5 days')
    expect(said).toContain('3 people have not answered yet')
    expect(said).toContain('until somebody gives it more time')
  })

  it('and reads properly at one day and one person', () => {
    const said = sayHowLongIsLeft({ state: 'soon', daysLeft: 1 }, 1)
    expect(said).toContain('runs out tomorrow')
    expect(said).toContain('1 person has not answered yet')
    expect(said).not.toContain('in 1 days')
  })

  it('and does not invent people who have not answered', () => {
    expect(sayHowLongIsLeft({ state: 'soon', daysLeft: 4 }, 0)).not.toMatch(/answered/)
  })

  it('and says nothing where there is nothing to say', () => {
    expect(sayHowLongIsLeft({ state: 'fine' }, 2)).toBe('')
  })
})

describe('and it shows where somebody is looking', () => {
  const at = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

  it('on the check-in, beside the control that fixes it', () => {
    const page = at('pages/grounds/GroundAdminPage.tsx')
    expect(page).toContain('const left = whenItRunsOut(ground as any)')
    expect(page).toContain("sayHowLongIsLeft(left, ground.overdue ?? 0)")
    /* The same button as the out-of-time banner: it opens the timeframe control and scrolls to it. */
    expect(page.match(/scrollToId\('how-long-this-runs'\)/g)?.length).toBe(2)
  })

  it('and in the list, before whose turn it is', () => {
    /* U.5: each row's "Needs you" is worked out in how-a-row-reads.ts now. Running out is still
       said before whose turn it is. */
    const list = at('pages/grounds/how-a-row-reads.ts')
    expect(list).toContain('const out = whenItRunsOut(g as never)')
    expect(list.indexOf("out.state === 'soon'")).toBeLessThan(list.indexOf("a.kind === 'yours' || a.kind === 'overdue'"))
    /* And one that already ran out says so rather than reading as nothing to do. */
    expect(list).toContain("text: 'Out of time'")
  })

  /* Seven days, and the server warns on the same number - grounds.cron's DAYS_OF_NOTICE. */
  it('and on the same clock as the email', () => {
    const cron = readFileSync(join(__dirname, '../../../api/src/modules/grounds/grounds.cron.ts'), 'utf8')
    expect(cron).toContain(`const DAYS_OF_NOTICE = ${DAYS_OF_NOTICE};`)
  })
})
