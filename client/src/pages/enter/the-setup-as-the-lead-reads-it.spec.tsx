import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { TheSetup, whenTheyOpen } from './TheSetup'
import { WhichDaysTheyWork } from '@/components/gw/WhichDaysTheyWork'
import type { Cadence } from '@/components/gw/when-the-check-ins-land'

/*
 * THE SCHEDULE, AS THE LEAD READS IT BEFORE SAVING (U.6, B1). Word for word against
 * docs/prototype/screens/B1-starting-a-check-in/setup.txt, on the rendered panel, with the prototype's
 * own dates: today is Tuesday 30 June, so "Tomorrow" is Wednesday 1 July.
 */
const TODAY = new Date(2026, 5, 30)

function Harness({ start = '', end = '', cadence = 'FORTNIGHTLY' as Cadence, chosen = false, days = [] as number[] }) {
  const [c, setC] = useState<Cadence>(cadence)
  const [picked, setPicked] = useState(chosen)
  const [wd, setWd] = useState<number[]>(days)
  const [s, setS] = useState(start)
  const [e, setE] = useState(end)
  return (
    <>
      <TheSetup cadence={c} cadenceChosen={picked} onCadence={(x) => { setC(x); setPicked(true) }} anchorDay={null}
        workingDays={wd} daysPicker={<WhichDaysTheyWork value={wd} onChange={setWd} />} startsOn={s} onStartsOn={setS} endsOn={e} onEndsOn={setE} today={TODAY} />
      <output data-testid="saved">{JSON.stringify({ c, s, e, wd })}</output>
    </>
  )
}
const saved = () => JSON.parse(screen.getByTestId('saved').textContent ?? '{}')

describe('the setup, as the lead reads it', () => {
  it('reads the prototype’s sections, in its words', () => {
    render(<Harness />)
    const starts = screen.getByRole('region', { name: 'When it starts' })
    expect(within(starts).getByText('The first check-in opens at the start time.')).toBeTruthy()
    expect(within(starts).getAllByRole('button').map((b) => b.textContent)).toEqual(['Now', 'Tomorrow', 'On a date'])
    expect(within(starts).getByText('Adding someone sends their invitation when it starts.')).toBeTruthy()
    const often = screen.getByRole('region', { name: 'How often' })
    expect(within(often).getAllByRole('button').map((b) => b.textContent)).toEqual(['Once', 'Every day', 'Every week', 'Every 2 weeks', 'Every month', 'When I choose'])
    expect(within(often).getByText('Not set yet. This will run every 2 weeks unless you pick one.')).toBeTruthy()
    const days = screen.getByRole('region', { name: 'On which days' })
    expect(within(days).getAllByRole('button').map((b) => b.textContent)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Weekdays only', 'Any day is fine'])
    const ends = screen.getByRole('region', { name: 'When it ends' })
    expect(within(ends).getByText('You can give it more time later.')).toBeTruthy()
    /* U.6 review: one date, set to when it really ends; "When I end it" is not offered (nothing runs without an end). */
    expect(within(ends).queryAllByRole('button')).toHaveLength(0)
    expect(ends.querySelector('input[type="date"]')).toBeTruthy()
    for (const notBuilt of ['Opens at', 'Closes at', 'Do you check in too?', 'WhatsApp', 'Guest']) {
      expect(document.body.textContent, notBuilt).not.toContain(notBuilt)
    }
  })

  it('“Tomorrow” says the day and saves it as the start date', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Tomorrow' }))
    expect(screen.getByText('Tomorrow, Wednesday 1 July.')).toBeTruthy()
    expect(saved().s).toBe('2026-07-01')
    fireEvent.click(screen.getByRole('button', { name: 'Now' }))
    expect(saved().s).toBe('')
  })

  it('says which days the check-ins open, as the prototype does', () => {
    render(<Harness start="2026-07-01" end="2026-09-30" cadence="DAILY" chosen days={[1, 2, 3, 4, 5]} />)
    /* The prototype's sample says 65; counted for real, 1 July to 30 September 2026 has 66 weekdays
       (23 in July, 21 in August, 22 in September). The sentence is the prototype's; the number is true.
       SCREEN FAULT 10 (FINAL WALK): "until 30 September: 66 in all." joined two pieces with a colon
       and never said what was counted - now "until 30 September, 66 sessions in all.". */
    expect(screen.getByText('Check-ins open on Wed 1 July, Thu 2, Fri 3, Mon 6, Tue 7 and on from there, until 30 September, 66 sessions in all.')).toBeTruthy()
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
    fireEvent.change(document.querySelector('section[aria-label="When it ends"] input[type="date"]')!, { target: { value: '2026-08-31' } })
    expect(saved().e).toBe('2026-08-31')
  })

  it('an unpicked rhythm names the one it will really run at', () => {
    render(<Harness cadence="WEEKLY" />)
    expect(screen.getByText('Not set yet. This will run every week unless you pick one.')).toBeTruthy()
  })

  it('once, and when I choose, have no days to pick and no end', () => {
    render(<Harness cadence="ONE_TIME" chosen start="2026-07-01" />)
    expect(screen.queryByRole('region', { name: 'On which days' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'When it ends' })).toBeNull()
    expect(screen.getByText('The check-in opens on Wednesday 1 July.')).toBeTruthy()
    expect(whenTheyOpen({ cadence: 'SEQUENTIAL', anchorDay: null, startsOn: '', endsOn: '', workingDays: [], today: TODAY })).toBeNull()
  })
})

describe('counting the days (U.6 review)', () => {
  /* Read live: "Now" gave one check-in fewer than the same range from a date, because "now" carried
     the clock's time and the last day's check-in fell after that day's midnight. */
  const afternoon = new Date(2026, 5, 30, 15, 30)
  it('"Now" counts the same days as starting on today\'s date', () => {
    const now = whenTheyOpen({ cadence: 'DAILY', anchorDay: null, startsOn: '', endsOn: '2026-07-10', workingDays: [], today: afternoon })
    const onTheDate = whenTheyOpen({ cadence: 'DAILY', anchorDay: null, startsOn: '2026-06-30', endsOn: '2026-07-10', workingDays: [], today: afternoon })
    expect(now).toBe(onTheDate)
    /* Screen fault 10 (final walk): a comma, not a colon, and "sessions" said plainly. */
    expect(now).toMatch(/, 11 sessions in all\.$/)
  })
  it('and a weekly run keeps its last day', () => {
    expect(whenTheyOpen({ cadence: 'WEEKLY', anchorDay: null, startsOn: '', endsOn: '2026-07-21', workingDays: [], today: afternoon }))
      .toBe('Check-ins open on Tue 30 June, Tue 7 July, Tue 14 and Tue 21, 4 sessions in all.')
  })
})

describe('one day picker (U.6 review)', () => {
  /* Read live: "On which day?" said Saturday, "On which days" said weekdays only, and weekly came
     out fortnightly. There is one picker now, the same as on the check-in's own Setup. */
  it('a weekly rhythm offers "On which days" and nothing else about days', () => {
    render(<Harness cadence="WEEKLY" chosen />)
    expect(screen.getAllByRole('region', { name: 'On which days' })).toHaveLength(1)
    expect(document.body.textContent).not.toContain('On which day?')
    expect(screen.queryByRole('combobox')).toBeNull()
  })
  it('and so does a monthly one', () => {
    render(<Harness cadence="MONTHLY" chosen />)
    expect(document.body.textContent).not.toContain('On which day of the month?')
    expect(screen.queryByRole('combobox')).toBeNull()
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

describe('the chosen end, as the server will keep it (U.6 review)', () => {
  /* The server walks the same dates (timelineDaysForAChosenEnd) and holds exactly this many check-ins,
     so the check-in's header, its Setup and its invitation say the same. */
  it('weekly from Sunday 27 September until 6 November is 6 check-ins', () => {
    expect(whenTheyOpen({ cadence: 'WEEKLY', anchorDay: null, startsOn: '2026-09-27', endsOn: '2026-11-06', workingDays: [], today: new Date(2026, 8, 27) }))
      .toBe('Check-ins open on Sun 27 September, Sun 4 October, Sun 11, Sun 18, Sun 25 and on from there, until 6 November, 6 sessions in all.')
  })
})
