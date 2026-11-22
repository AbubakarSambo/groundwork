import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TheSetup, theDatesInWords } from './TheSetup'
import { WhichDaysTheyWork } from '@/components/gw/WhichDaysTheyWork'
import type { Cadence } from '@/components/gw/when-the-check-ins-land'

/*
 * THE SCHEDULE, AS THE LEAD READS IT BEFORE SAVING (U.6, B1). Word for word against
 * docs/prototype/screens/B1-starting-a-check-in/setup.txt, on the rendered panel, with the prototype's
 * own dates: today is Tuesday 30 June, so "Tomorrow" is Wednesday 1 July.
 */
const TODAY = new Date(2026, 5, 30)

function Harness({ start = '', end = '', cadence = 'FORTNIGHTLY' as Cadence, chosen = false, days = [] as number[], anchorDay = null as number | null, until = false, withNameAndPeople = false, opens = null as string | null }) {
  const [c, setC] = useState<Cadence>(cadence)
  const [picked, setPicked] = useState(chosen)
  const [wd, setWd] = useState<number[]>(days)
  const [s, setS] = useState(start)
  const [e, setE] = useState(end)
  const [ad, setAd] = useState<number | null>(anchorDay)
  const [u, setU] = useState(until)
  return (
    <>
      <TheSetup cadence={c} cadenceChosen={picked} onCadence={(x) => { setC(x); setPicked(true) }} anchorDay={ad} onAnchorDay={setAd}
        workingDays={wd} daysPicker={<WhichDaysTheyWork value={wd} onChange={setWd} />} startsOn={s} onStartsOn={setS} endsOn={e} onEndsOn={setE}
        runsUntilEnded={u} onRunsUntilEnded={setU} today={TODAY} opens={opens} takes="About ten minutes" /* as the server serves it */
        nameField={withNameAndPeople ? <input aria-label="Name this situation" defaultValue="Sales team, Q3" /> : undefined}
        people={withNameAndPeople ? <p>Not ready? You can add people any time from the check-in itself. Nothing goes out until you do.</p> : undefined} />
      <output data-testid="saved">{JSON.stringify({ c, s, e, wd, ad, u })}</output>
    </>
  )
}
const saved = () => JSON.parse(screen.getByTestId('saved').textContent ?? '{}')

describe('the setup, as the lead reads it', () => {
  /*
   * SETUP PAGE, PIECE 3A: the prototype's own structure (setup.txt). Each question is a block with
   * its heading and one sentence, and its choices are the shared `Choices` (one radio each, the
   * prototype's `.seg`). "When it ends" offers "On a date" and "When I end it" again: the engine
   * keeps `runsUntilEnded`, and Hafsah asked for every scheduling choice the product has.
   */
  it('reads the prototype’s sections, in its words', () => {
    render(<Harness />)
    const choices = (region: HTMLElement) => within(region).getAllByRole('radio').map((b) => b.textContent)
    const starts = screen.getByRole('region', { name: 'When it starts' })
    expect(within(starts).getByText('The first check-in opens at the start time.')).toBeTruthy()
    expect(choices(starts)).toEqual(['Now', 'Tomorrow', 'On a date'])
    /* With no people block handed in, the invitations sentence stays where it always was. */
    expect(within(starts).getByText('Adding someone sends their invitation when it starts.')).toBeTruthy()
    const often = screen.getByRole('region', { name: 'How often' })
    expect(within(often).getByText('Each check-in takes about ten minutes.') /* Hafsah's fixed length, 3 November */).toBeTruthy()
    expect(choices(often)).toEqual(['Once', 'Every day', 'Every week', 'Every 2 weeks', 'Every month', 'When I choose'])
    expect(within(often).getByText('Not set yet. This will run every 2 weeks unless you pick one.')).toBeTruthy()
    /* "On which days" belongs to a daily rhythm only now (setup page review): see "every day asks on which days" below. */
    const ends = screen.getByRole('region', { name: 'When it ends' })
    expect(within(ends).getByText('You can give it more time later.')).toBeTruthy()
    expect(choices(ends)).toEqual(['On a date', 'When I end it'])
    expect(ends.querySelector('input[type="date"]')).toBeTruthy()
    for (const notBuilt of ['Opens at', 'Closes at', 'Do you check in too?', 'WhatsApp', 'Guest']) {
      expect(document.body.textContent, notBuilt).not.toContain(notBuilt)
    }
  })

  it('reads in the prototype’s order, with the name first and the people last', () => {
    render(<Harness withNameAndPeople />)
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings).toEqual(['A name', 'When it starts', 'How often', 'When it ends', 'Who’s in it'])
    const who = screen.getByRole('region', { name: 'Who’s in it' })
    expect(within(who).getByText('Adding someone sends their invitation when it starts.')).toBeTruthy()
    /* The choice to add nobody now stays, in its own words. */
    expect(within(who).getByText('Not ready? You can add people any time from the check-in itself. Nothing goes out until you do.')).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'When it starts' })).queryByText('Adding someone sends their invitation when it starts.')).toBeNull()
  })

  it('“When I end it” keeps no last date, and “On a date” brings the date back', () => {
    render(<Harness start="2026-07-01" end="2026-09-30" cadence="WEEKLY" chosen />)
    const ends = screen.getByRole('region', { name: 'When it ends' })
    fireEvent.click(within(ends).getByRole('radio', { name: 'When I end it' }))
    expect(saved().u).toBe(true)
    expect(within(ends).getByText('It keeps going until you end it. There is no last date.')).toBeTruthy()
    expect(ends.querySelector('input[type="date"]')).toBeNull()
    /* The sentence about when they open no longer counts to an end. */
    expect(screen.getByText('Check-ins open on Wed 1 July, Wed 8, Wed 15, Wed 22, Wed 29 and on from there.')).toBeTruthy()
    fireEvent.click(within(ends).getByRole('radio', { name: 'On a date' }))
    expect(saved().u).toBe(false)
    expect(ends.querySelector('input[type="date"]')).toBeTruthy()
  })

  it('“Tomorrow” says the day and saves it as the start date', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('radio', { name: 'Tomorrow' }))
    expect(screen.getByText('Tomorrow, Wednesday 1 July.')).toBeTruthy()
    expect(saved().s).toBe('2026-07-01')
    fireEvent.click(screen.getByRole('radio', { name: 'Now' }))
    expect(saved().s).toBe('')
  })

  it('says which days the check-ins open, as the prototype does', () => {
    /* The days and the count are served (POST /entry/the-dates); the page says them as given. */
    render(<Harness start="2026-07-01" end="2026-09-30" cadence="DAILY" chosen days={[1, 2, 3, 4, 5]} opens={theDatesInWords({ days: ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-06', '2026-07-07'], count: 66 }, 'DAILY', '2026-09-30')} />)
    /* The prototype's sample says 65; counted for real, 1 July to 30 September 2026 has 66 weekdays
       (23 in July, 21 in August, 22 in September). The sentence is the prototype's; the number is true.
       SCREEN FAULT 10 (FINAL WALK): "until 30 September: 66 in all." joined two pieces with a colon
       and never said what was counted - now "until 30 September, 66 check-ins in all.". */
    expect(screen.getByText('Check-ins open on Wed 1 July, Thu 2, Fri 3, Mon 6, Tue 7 and on from there, until 30 September, 66 check-ins in all.')).toBeTruthy()
    expect(screen.queryByText(/Not set yet/)).toBeNull()
  })

  it('“Any day is fine” and “Weekdays only” set the days people work', () => {
    render(<Harness cadence="DAILY" chosen />)
    fireEvent.click(screen.getByRole('button', { name: 'Weekdays only' }))
    expect(saved().wd).toEqual([1, 2, 3, 4, 5])
    fireEvent.click(screen.getByRole('button', { name: 'Any day is fine' }))
    expect(saved().wd).toEqual([])
  })

  it('the end is a date the lead can change', () => {
    render(<Harness start="2026-07-01" end="2026-09-30" cadence="WEEKLY" chosen />)
    fireEvent.change(screen.getByRole('region', { name: 'When it ends' }).querySelector('input[type="date"]')!, { target: { value: '2026-08-31' } })
    expect(saved().e).toBe('2026-08-31')
  })

  it('an unpicked rhythm names the one it will really run at', () => {
    render(<Harness cadence="WEEKLY" />)
    expect(screen.getByText('Not set yet. This will run every week unless you pick one.')).toBeTruthy()
  })

  it('once, and when I choose, have no days to pick and no end', () => {
    render(<Harness cadence="ONE_TIME" chosen start="2026-07-01" opens={theDatesInWords({ days: ['2026-07-01'], count: 1 }, 'ONE_TIME')} />)
    expect(screen.queryByRole('region', { name: 'On which days' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'When it ends' })).toBeNull()
    expect(screen.getByText('The check-in opens on Wednesday 1 July.')).toBeTruthy()
    expect(theDatesInWords({ days: [], count: null }, 'SEQUENTIAL')).toBeNull()
  })
})

/*
 * COUNTING THE DAYS IS THE SERVER'S NOW (Hafsah, 22 November 2026: the page said 29 where the saved check-in held 25). The cases that
 * were here, "Now" on a Sunday, the set day, the chosen end, are checked against the one schedule in
 * api/src/modules/entry/the-dates-before-it-is-saved.spec.ts; the page only says the days it is given (theDatesInWords).
 */

describe('which day it lands on (nothing-removed-screens.md item 2)', () => {
  /*
   * RESTORED: live offered "On which day?" for a weekly or fortnightly rhythm, sent as
   * `cadenceAnchorDay`. It was removed here (U.6 review, "one day picker") out of concern that a
   * second, disconnected picker could say Saturday while "On which days" said weekdays only and the
   * two together turned a weekly rhythm into a fortnightly one - but `whenTheCheckInsLand` already
   * folds an anchor day and the working days together correctly (it lands on the anchor day, then
   * moves forward to the next working day), so restoring the picker does not reintroduce that bug.
   */
  /*
   * SETUP PAGE REVIEW, 13 OCTOBER: ONE DAY PICKER. Every week showed "Which day of the week should
   * check-ins open? (optional)" and "On which days" together, and a click on Thursday in the second
   * turned Thursday off in a Thursday check-in. A weekly rhythm now asks only on which day, and shows
   * the day it really lands on until one is picked; a monthly one asks only the day of the month.
   */
  it('a weekly rhythm asks one thing, on which day, and never picks a day nobody chose', () => {
    /* Hafsah, 22 November 2026: a weekly rhythm showed Sunday picked when nobody had said a day. The served dates say where it lands. */
    render(<Harness cadence="WEEKLY" chosen />)
    expect(screen.queryByRole('region', { name: 'On which days' })).toBeNull()
    expect(document.body.textContent).not.toContain('(optional)')
    const day = screen.getByRole('radiogroup', { name: 'On which day' })
    expect(within(day).getAllByRole('radio').map((b) => b.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(within(day).getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toEqual([])
  })

  it('picking Thursday keeps Thursday on, and lands every one on a Thursday', () => {
    render(<Harness cadence="WEEKLY" chosen start="2026-07-01" end="2026-07-31" />)
    fireEvent.click(screen.getByRole('radio', { name: 'Thu' }))
    expect(saved().ad).toBe(4)
    fireEvent.click(screen.getByRole('radio', { name: 'Thu' }))
    expect(saved().ad).toBe(4)
    expect(screen.getByRole('radio', { name: 'Thu' })).toHaveAttribute('aria-checked', 'true')
  })

  /* Second round of the review: monthly and back to weekly dropped the Thursday she had chosen. */
  it('keeps her Thursday across a switch to monthly and back, and her day of the month too', () => {
    render(<Harness cadence="WEEKLY" chosen />)
    fireEvent.click(screen.getByRole('radio', { name: 'Thu' }))
    expect(saved().ad).toBe(4)
    fireEvent.click(screen.getByRole('radio', { name: 'Every month' }))
    expect(saved().ad).toBeNull()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '15' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Every week' }))
    expect(saved().ad).toBe(4)
    expect(screen.getByRole('radio', { name: 'Thu' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Every month' }))
    expect(saved().ad).toBe(15)
  })

  it('a monthly rhythm offers a day of the month, not a weekday', () => {
    render(<Harness cadence="MONTHLY" chosen />)
    expect(screen.getByText('On which day of the month')).toBeTruthy()
    const select = screen.getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '15' } })
    expect(saved().ad).toBe(15)
    expect(screen.queryByRole('radio', { name: 'Mon' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'On which days' })).toBeNull()
  })

  it('every day asks on which days, and "Any day is fine" shows all seven on', () => {
    render(<Harness cadence="DAILY" chosen />)
    const days = screen.getByRole('region', { name: 'On which days' })
    expect(within(days).getAllByRole('button', { pressed: true }).map((b) => b.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Any day is fine'])
    expect(within(days).getByText('Check-ins can open on any day, including Saturday and Sunday.')).toBeTruthy()
    fireEvent.click(within(days).getByRole('button', { name: 'Sunday' }))
    expect(saved().wd).toEqual([1, 2, 3, 4, 5, 6])
    expect(within(days).getByText('Check-ins open Monday to Saturday, never on a Sunday.')).toBeTruthy()
    fireEvent.click(within(days).getByRole('button', { name: 'Weekdays only' }))
    expect(within(days).getByText('Check-ins open on weekdays only, never at the weekend.')).toBeTruthy()
  })

  it('a check-in once, or when I choose, offers neither', () => {
    render(<Harness cadence="ONE_TIME" chosen start="2026-07-01" opens={theDatesInWords({ days: ['2026-07-01'], count: 1 }, 'ONE_TIME')} />)
    expect(screen.queryByRole('radiogroup', { name: 'On which day' })).toBeNull()
    expect(document.body.textContent).not.toContain('On which day of the month')
  })

  it('changing the rhythm clears a day picked for the one before it', () => {
    render(<Harness cadence="MONTHLY" chosen anchorDay={15} />)
    expect(saved().ad).toBe(15)
    fireEvent.click(screen.getByRole('radio', { name: 'Every week' }))
    expect(saved().ad).toBeNull()
  })
})


describe('what is still to set, after saving (U.6 review)', () => {
  /* Read live: "Still to set: a name and a start date." after the lead had chosen "Now". */
  it('does not list a start the lead chose with "Now"', async () => {
    const { whatIsSetAndWhatIsNot } = await import('@/components/gw/when-the-check-ins-land')
    const said = whatIsSetAndWhatIsNot({ name: 'Daniel, the next six weeks', cadenceChosen: true, startsAt: new Date(), workingDays: [], peopleAdded: 1 })
    expect(said).toBe('Set: a name, a rhythm, a start date and 1 person.')
  })
})

