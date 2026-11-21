import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leavePolicyApi, type ALeavePlacesChange, type ALeaveType, type TheLeavePlaces, type TheLeaveRules } from '@/api/suites'
import { Button, FieldLabel, Note, Select, TextField, ToggleChoices } from '@/components/gw/ui'
import { useTheDesignPass } from '@/lib/the-design-pass'

/**
 * THE DESIGN PASS (21 November 2026): the policy in its sentences first, then each part under its own heading, split by hairlines,
 * with no paragraph explaining the page. Everything stays visible, and each part keeps its own save, beside what it saves.
 */
function APart({ children }: { children: string }) {
  return useTheDesignPass() ? <h3 className="dp-part-h">{children}</h3> : <p className="gwui-panel-text"><b>{children}</b></p>
}

/**
 * THE LEAVE POLICY ON THE SUITES PAGE (Hafsah, 20 November 2026). Under the leave suite's settings: the whole policy in the server's
 * own sentences, and a place to change each part of it. The types of leave, the working week, whether weekends and public holidays
 * count, how annual leave builds up and what is carried over are saved as the leave rules; offices, who works from each, and each
 * place's public holidays as their own rows. Only an admin or whoever looks after HR is served any of it; the server says so.
 * Everything here can also be set by telling Groundwork, which asks one question at a time and can read a written policy.
 */

const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = [
  { key: '1', label: 'Mon', ariaLabel: 'Monday' }, { key: '2', label: 'Tue', ariaLabel: 'Tuesday' }, { key: '3', label: 'Wed', ariaLabel: 'Wednesday' },
  { key: '4', label: 'Thu', ariaLabel: 'Thursday' }, { key: '5', label: 'Fri', ariaLabel: 'Friday' }, { key: '6', label: 'Sat', ariaLabel: 'Saturday' },
  { key: '0', label: 'Sun', ariaLabel: 'Sunday' },
]
const problemOf = (e: any) => e?.response?.data?.message || DID_NOT_GO

export function TheLeavePolicy() {
  const qc = useQueryClient()
  const designPass = useTheDesignPass()
  const rules = useQuery({ queryKey: ['leave-rules'], queryFn: leavePolicyApi.rules, retry: false })
  const places = useQuery({ queryKey: ['leave-places'], queryFn: leavePolicyApi.places, retry: false })
  if (rules.isError) return <Note tone="muted">{problemOf(rules.error)}</Note>
  /* Drawn only from what the server served whole: anything else is not the policy, and nothing is shown. */
  if (!Array.isArray(rules.data?.said) || !rules.data?.rules || !Array.isArray(places.data?.said) || !Array.isArray(places.data?.offices)) return null
  const savedRules = (r: TheLeaveRules) => { qc.setQueryData(['leave-rules'], r); qc.invalidateQueries({ queryKey: ['leave-places'] }) }
  const savedPlaces = (p: TheLeavePlaces) => qc.setQueryData(['leave-places'], p)
  return (
    <div className={designPass ? 'gwui-suite-ask dp-leave-policy' : 'gwui-suite-ask'} aria-label="The leave policy">
      <p className="gwui-panel-text"><b>The leave policy</b></p>
      {[...rules.data.said, ...places.data.said].map(line => <p key={line} className="gwui-panel-text">{line}</p>)}
      {!designPass && <p className="gwui-panel-text">You can change any of this below, or tell Groundwork, for example “sick leave is 10 days a year”. You can also paste your written leave policy to Groundwork and it will set it up from that.</p>}
      <TypesOfLeave page={rules.data} onSaved={savedRules} />
      <TheWorkingWeek page={rules.data} onSaved={savedRules} />
      <AnnualLeave page={rules.data} onSaved={savedRules} />
      <Offices page={places.data} onSaved={savedPlaces} />
      <PublicHolidays page={places.data} onSaved={savedPlaces} />
    </div>
  )
}

function useSave<T>(fn: (x: T) => Promise<any>, onSaved: (r: any) => void) {
  const [problem, setProblem] = useState<string | null>(null)
  const m = useMutation({ mutationFn: fn, onSuccess: r => { setProblem(null); onSaved(r) }, onError: e => setProblem(problemOf(e)) })
  return { save: m.mutate, busy: m.isPending, problem }
}

// ------------------------------------------------ types of leave ------------------------------------------------

function TypesOfLeave({ page, onSaved }: { page: TheLeaveRules; onSaved: (r: TheLeaveRules) => void }) {
  const [kinds, setKinds] = useState<ALeaveType[]>(() => page.rules.kinds ?? [])
  const [newName, setNewName] = useState('')
  const { save, busy, problem } = useSave((k: ALeaveType[]) => leavePolicyApi.setRules({ kinds: k.length ? k : null }), onSaved)
  const change = (i: number, part: Partial<ALeaveType>) => setKinds(ks => ks.map((k, j) => (j === i ? { ...k, ...part } : k)))
  const num = (v: string) => (v.trim() === '' ? null : Number(v))
  return (
    <form onSubmit={e => { e.preventDefault(); save(kinds) }} aria-label="Types of leave">
      <APart>Types of leave</APart>
      {kinds.length === 0 && <p className="gwui-panel-text">No types of leave are set, so every request is simply leave.</p>}
      {kinds.map((k, i) => {
        const id = `leave-type-${i}`
        return (
          <fieldset key={k.key ?? i} className="gwui-suite-q" aria-label={k.name}>
            <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
            <TextField id={`${id}-name`} value={k.name} onChange={e => change(i, { name: e.target.value })} />
            <FieldLabel htmlFor={`${id}-days`}>How many days?</FieldLabel>
            <TextField id={`${id}-days`} type="number" inputMode="numeric" min={0} max={365} value={k.days ?? ''} onChange={e => change(i, { days: num(e.target.value) })} />
            <FieldLabel htmlFor={`${id}-per`}>Are those days a year, or each time it is taken?</FieldLabel>
            <Select id={`${id}-per`} value={k.per ?? 'year'} onChange={e => change(i, { per: e.target.value === 'occasion' ? 'occasion' : undefined })}>
              <option value="year">A year</option>
              <option value="occasion">Each time it is taken</option>
            </Select>
            <FieldLabel htmlFor={`${id}-paid`}>Is it paid?</FieldLabel>
            <Select id={`${id}-paid`} value={k.paid === undefined ? '' : k.paid ? 'yes' : 'no'} onChange={e => change(i, { paid: e.target.value === '' ? undefined : e.target.value === 'yes' })}>
              <option value="">Not said</option>
              <option value="yes">Paid</option>
              <option value="no">Unpaid</option>
            </Select>
            <FieldLabel htmlFor={`${id}-notice`}>How many days’ notice does it need?</FieldLabel>
            <TextField id={`${id}-notice`} type="number" inputMode="numeric" min={0} max={365} value={k.noticeDays ?? ''} onChange={e => change(i, { noticeDays: num(e.target.value) ?? undefined })} />
            <FieldLabel htmlFor={`${id}-who`}>Who can take it? Leave it empty for everyone.</FieldLabel>
            <TextField id={`${id}-who`} value={k.whoFor ?? ''} onChange={e => change(i, { whoFor: e.target.value || undefined })} />
            <FieldLabel htmlFor={`${id}-adoptive`}>Can adoptive parents take it as well as birth parents?</FieldLabel>
            <Select id={`${id}-adoptive`} value={k.adoptive === undefined ? '' : k.adoptive ? 'yes' : 'no'} onChange={e => change(i, { adoptive: e.target.value === '' ? undefined : e.target.value === 'yes' })}>
              <option value="">Not said</option>
              <option value="yes">Yes, adoptive parents too</option>
              <option value="no">Birth parents only</option>
            </Select>
            <FieldLabel htmlFor={`${id}-doc`}>Does it need a document, such as a sick note? Leave it empty for none.</FieldLabel>
            <TextField id={`${id}-doc`} value={k.document ?? ''} onChange={e => change(i, { document: e.target.value || undefined, documentAfterDays: e.target.value ? k.documentAfterDays ?? 0 : undefined })} />
            {k.document && (
              <>
                <FieldLabel htmlFor={`${id}-doc-after`}>After how many working days is the document needed?</FieldLabel>
                <TextField id={`${id}-doc-after`} type="number" inputMode="numeric" min={0} max={60} value={k.documentAfterDays ?? 0} onChange={e => change(i, { documentAfterDays: num(e.target.value) ?? 0 })} />
              </>
            )}
            <FieldLabel htmlFor={`${id}-every`}>Do weekends and public holidays inside it count as days of it?</FieldLabel>
            <Select id={`${id}-every`} value={k.everyDay ? 'yes' : 'no'} onChange={e => change(i, { everyDay: e.target.value === 'yes' || undefined })}>
              <option value="no">As for all leave</option>
              <option value="yes">Yes, every day counts</option>
            </Select>
            <Button kind="quiet" size="small" onClick={() => setKinds(ks => ks.filter((_, j) => j !== i))}>Remove {k.name}</Button>
          </fieldset>
        )
      })}
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="leave-type-new">Add a type of leave</FieldLabel>
        <TextField id="leave-type-new" value={newName} placeholder="For example, Study leave" onChange={e => setNewName(e.target.value)} />
        <Button kind="quiet" size="small" disabled={newName.trim().length < 2} onClick={() => { setKinds(ks => [...ks, { name: newName.trim(), days: null }]); setNewName('') }}>Add it</Button>
      </div>
      <Button kind="secondary" size="small" type="submit" disabled={busy}>Save the types of leave</Button>
      {problem && <Note tone="error">{problem}</Note>}
    </form>
  )
}

// ------------------------------------------------ the working week ------------------------------------------------

function TheWorkingWeek({ page, onSaved }: { page: TheLeaveRules; onSaved: (r: TheLeaveRules) => void }) {
  const r = page.rules
  const [week, setWeek] = useState<string[]>(() => (r.workingWeek ?? [1, 2, 3, 4, 5]).map(String))
  const [weekends, setWeekends] = useState(r.weekendsCount ? 'yes' : 'no')
  const [holidays, setHolidays] = useState(r.holidaysCount ? 'yes' : 'no')
  const [country, setCountry] = useState(r.country ?? '')
  const { save, busy, problem } = useSave(() => leavePolicyApi.setRules({
    workingWeek: week.map(Number), weekendsCount: weekends === 'yes', holidaysCount: holidays === 'yes', country: country.trim() || null,
  }), onSaved)
  return (
    <form onSubmit={e => { e.preventDefault(); if (week.length) save(undefined as never) }} aria-label="The working week">
      <APart>The working week and what counts as leave</APart>
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="leave-week">Which days do people work?</FieldLabel>
        <ToggleChoices label="Which days do people work?" options={WEEK} values={week} onToggle={k => setWeek(w => (w.includes(k) ? w.filter(x => x !== k) : [...w, k]))} />
      </div>
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="leave-weekends">Do the days people do not work count as leave days when they fall inside somebody’s leave?</FieldLabel>
        <Select id="leave-weekends" value={weekends} onChange={e => setWeekends(e.target.value)}>
          <option value="no">No, they do not count</option>
          <option value="yes">Yes, they count</option>
        </Select>
      </div>
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="leave-holidays">Do public holidays count as leave days when they fall inside somebody’s leave?</FieldLabel>
        <Select id="leave-holidays" value={holidays} onChange={e => setHolidays(e.target.value)}>
          <option value="no">No, they do not count</option>
          <option value="yes">Yes, they count</option>
        </Select>
      </div>
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="leave-country">Which country is your organisation in?</FieldLabel>
        <TextField id="leave-country" value={country} onChange={e => setCountry(e.target.value)} />
      </div>
      <Button kind="secondary" size="small" type="submit" disabled={busy || !week.length}>Save the working week</Button>
      {!week.length && <Note tone="muted">Choose at least one day people work.</Note>}
      {problem && <Note tone="error">{problem}</Note>}
    </form>
  )
}

// ------------------------------------------------ annual leave ------------------------------------------------

function AnnualLeave({ page, onSaved }: { page: TheLeaveRules; onSaved: (r: TheLeaveRules) => void }) {
  const r = page.rules
  const [accrual, setAccrual] = useState(r.accrual ?? 'start')
  const [yearStarts, setYearStarts] = useState(String(r.yearStarts ?? 1))
  const [carry, setCarry] = useState(r.carryOver === 'all' ? 'all' : r.carryOver ? 'some' : 'none')
  const [upTo, setUpTo] = useState(typeof r.carryOver === 'number' ? String(r.carryOver) : '5')
  const [expires, setExpires] = useState(r.carryExpires ? String(r.carryExpires) : '')
  const { save, busy, problem } = useSave(() => leavePolicyApi.setRules({
    accrual, yearStarts: Number(yearStarts),
    carryOver: carry === 'none' ? null : carry === 'all' ? 'all' : Number(upTo),
    ...(carry === 'none' ? {} : { carryExpires: expires ? Number(expires) : null }),
  }), onSaved)
  return (
    <form onSubmit={e => { e.preventDefault(); save(undefined as never) }} aria-label="Annual leave">
      <APart>How annual leave builds up</APart>
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="leave-accrual">How is annual leave given?</FieldLabel>
        <Select id="leave-accrual" value={accrual} onChange={e => setAccrual(e.target.value as 'start' | 'monthly')}>
          <option value="start">All at the start of the leave year</option>
          <option value="monthly">Built up at the end of each month</option>
        </Select>
      </div>
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="leave-year">In which month does the leave year start?</FieldLabel>
        <Select id="leave-year" value={yearStarts} onChange={e => setYearStarts(e.target.value)}>
          {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
        </Select>
      </div>
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="leave-carry">Can people carry annual leave they have not used into the next leave year?</FieldLabel>
        <Select id="leave-carry" value={carry} onChange={e => setCarry(e.target.value)}>
          <option value="none">No</option>
          <option value="some">Up to a number of days</option>
          <option value="all">Yes, all of it</option>
        </Select>
      </div>
      {carry === 'some' && (
        <div className="gwui-suite-q">
          <FieldLabel htmlFor="leave-carry-days">Up to how many days?</FieldLabel>
          <TextField id="leave-carry-days" type="number" inputMode="numeric" min={1} max={365} value={upTo} onChange={e => setUpTo(e.target.value)} />
        </div>
      )}
      {carry !== 'none' && (
        <div className="gwui-suite-q">
          <FieldLabel htmlFor="leave-carry-expires">By the end of which month must carried-over days be used?</FieldLabel>
          <Select id="leave-carry-expires" value={expires} onChange={e => setExpires(e.target.value)}>
            <option value="">They never expire</option>
            {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
          </Select>
        </div>
      )}
      <Button kind="secondary" size="small" type="submit" disabled={busy}>Save how annual leave builds up</Button>
      {problem && <Note tone="error">{problem}</Note>}
    </form>
  )
}

// ------------------------------------------------ offices and public holidays ------------------------------------------------

function Offices({ page, onSaved }: { page: TheLeavePlaces; onSaved: (p: TheLeavePlaces) => void }) {
  const [offices, setOffices] = useState(() => page.offices.map(o => ({ name: o.name, country: o.country, people: o.people.map(p => p.id) })))
  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const { save, busy, problem } = useSave((o: ALeavePlacesChange['offices']) => leavePolicyApi.setPlaces({ offices: o }), onSaved)
  return (
    <form onSubmit={e => { e.preventDefault(); save(offices) }} aria-label="Offices">
      <APart>Offices in other countries</APart>
      {offices.length === 0 && <p className="gwui-panel-text">There are no offices in other countries, so everybody follows the public holidays of {page.country ?? 'your organisation'}.</p>}
      {offices.map((o, i) => (
        <fieldset key={o.name} className="gwui-suite-q" aria-label={o.name}>
          <p className="gwui-panel-text">The {o.name} office is in {o.country}.</p>
          <FieldLabel htmlFor={`office-${i}-people`}>Who works from it?</FieldLabel>
          <Select id={`office-${i}-people`} multiple value={o.people} onChange={e => {
            const chosen = Array.from((e.target as HTMLSelectElement).selectedOptions).map(x => x.value)
            setOffices(os => os.map((x, j) => (j === i ? { ...x, people: chosen } : x)))
          }}>
            {page.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Button kind="quiet" size="small" onClick={() => setOffices(os => os.filter((_, j) => j !== i))}>Remove the {o.name} office</Button>
        </fieldset>
      ))}
      <div className="gwui-suite-q">
        <FieldLabel htmlFor="office-new-name">Add an office</FieldLabel>
        <TextField id="office-new-name" value={name} placeholder="For example, Lagos" onChange={e => setName(e.target.value)} />
        <FieldLabel htmlFor="office-new-country">Its country</FieldLabel>
        <TextField id="office-new-country" value={country} placeholder="For example, Nigeria" onChange={e => setCountry(e.target.value)} />
        <Button kind="quiet" size="small" disabled={!name.trim() || !country.trim()} onClick={() => { setOffices(os => [...os, { name: name.trim(), country: country.trim(), people: [] }]); setName(''); setCountry('') }}>Add it</Button>
      </div>
      <Button kind="secondary" size="small" type="submit" disabled={busy}>Save the offices</Button>
      {problem && <Note tone="error">{problem}</Note>}
    </form>
  )
}

function PublicHolidays({ page, onSaved }: { page: TheLeavePlaces; onSaved: (p: TheLeavePlaces) => void }) {
  const placesHere: { office: string | null; label: string }[] = [
    { office: null, label: page.country ? `${page.country}, for everybody not tied to an office` : 'Your organisation, for everybody not tied to an office' },
    ...page.offices.map(o => ({ office: o.name, label: `The ${o.name} office, in ${o.country}` })),
  ]
  return (
    <div aria-label="Public holidays">
      <APart>Public holidays</APart>
      {!useTheDesignPass() && <p className="gwui-panel-text">Only a holiday you have confirmed counts. Groundwork can draft a country’s list when you set up leave by talking to it, and you check each date here.</p>}
      {placesHere.map(p => <HolidaysOfOnePlace key={p.office ?? ''} page={page} office={p.office} label={p.label} onSaved={onSaved} />)}
    </div>
  )
}

function HolidaysOfOnePlace({ page, office, label, onSaved }: { page: TheLeavePlaces; office: string | null; label: string; onSaved: (p: TheLeavePlaces) => void }) {
  const designPass = useTheDesignPass()
  const mine = page.holidays.filter(h => h.office === office)
  const [on, setOn] = useState('')
  const [name, setName] = useState('')
  const { save, busy, problem } = useSave((c: ALeavePlacesChange) => leavePolicyApi.setPlaces(c), onSaved)
  /* Saved a year at a time, the way the server keeps them. */
  const yearOf = (d: string) => Number(d.slice(0, 4))
  const write = (list: { on: string; name: string; confirmed: boolean }[], year: number) => save({ holidays: [{ office, year, list: list.filter(h => yearOf(h.on) === year) }] })
  const asKept = mine.map(h => ({ on: h.on, name: h.name, confirmed: h.confirmed }))
  const id = `holidays-${office ?? 'organisation'}`
  return (
    <fieldset className="gwui-suite-q" aria-label={label}>
      <p className="gwui-panel-text">{label}</p>
      {mine.length === 0 && <p className="gwui-panel-text">No public holidays are set here yet.</p>}
      {mine.map(h => (
        <p key={h.id} className="gwui-panel-text">
          {h.name}, on {h.when}. {h.confirmed ? 'You have confirmed it.' : 'It is not confirmed yet, so it does not count.'}{' '}
          {!h.confirmed && <Button kind="quiet" size="small" disabled={busy} onClick={() => write(asKept.map(x => (x.on === h.on ? { ...x, confirmed: true } : x)), yearOf(h.on))}>Confirm it</Button>}
          <Button kind="quiet" size="small" disabled={busy} onClick={() => write(asKept.filter(x => x.on !== h.on), yearOf(h.on))}>Remove it</Button>
        </p>
      ))}
      <FieldLabel htmlFor={`${id}-on`}>{designPass ? 'The date of a public holiday to add' : 'Add a public holiday: its date'}</FieldLabel>
      <TextField id={`${id}-on`} type="date" value={on} onChange={e => setOn(e.target.value)} />
      <FieldLabel htmlFor={`${id}-name`}>Its name</FieldLabel>
      <TextField id={`${id}-name`} value={name} placeholder="For example, Madaraka Day" onChange={e => setName(e.target.value)} />
      <Button kind="quiet" size="small" disabled={busy || !on || !name.trim()} onClick={() => { write([...asKept, { on, name: name.trim(), confirmed: true }], yearOf(on)); setOn(''); setName('') }}>Add it</Button>
      {problem && <Note tone="error">{problem}</Note>}
    </fieldset>
  )
}
