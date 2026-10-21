import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { boardApi } from '@/api/board'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Panel, Tag, Button } from '@/components/gw/ui'
import { aShortDay } from './pictured/ThePicturedSalesBoard'
import './pictured/pictured-board.css'

/**
 * ONE PERSON IN A CHECK-IN, FOR WHOEVER RUNS IT (screen match, 16 October; the target is
 * docs/prototype/screens/B5-the-board/person-page.jpg, "#/c/sales/person/miriam", opened from "The team
 * today": "Open anyone to see what they said and what the proof shows").
 *
 * Everything here is what the board already serves this reader about this person, after every wall:
 * their deals, their check-ins, what keeps coming up about their work and their own answer to it, what
 * they said they would do, what to ask them (the lead's alone), and the lead's own notes about them from
 * the check-in's context. A reader who does not run the check-in is not served any of it, and is told so.
 *
 * People are named, never "her" or "him": the product does not know anybody's pronouns (the picture
 * says "Her deals"; this says "Miriam’s deals").
 */
type Any = any

const firstName = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/)[0] || ''
const initials = (n: string | null | undefined) => (n ?? '').trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
const DAY = 86_400_000
const isoDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
/** "Miriam Wanjiku said, “Visit Westgate Deli on Friday.”" read as the words alone. */
const theirWords = (text: string) => String(text ?? '').replace(/^[^"“]*?said,\s*/i, '').replace(/^["“]|["”]$/g, '').trim()

function aDayInWords(at: Date, now: Date): string {
  const d = isoDay(at)
  if (d === isoDay(now)) return 'Today'
  if (d === isoDay(new Date(now.getTime() - DAY))) return 'Yesterday'
  if (now.getTime() - at.getTime() < 6 * DAY) return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(at)
  return aShortDay(at)
}

export function ThePersonPage() {
  const { id, participantId } = useParams<{ id: string; participantId: string }>()
  const user = useAuthStore((s) => s.user)
  const { data: board } = useQuery({ queryKey: ['board', id], queryFn: () => boardApi.get(id!), enabled: !!id })
  const { data: ground } = useQuery({ queryKey: ['ground', id], queryFn: () => groundsApi.get(id!), enabled: !!id })
  const b: Any = board
  const g: Any = ground
  if (!b || !g) return <Page><PageTitle subtitle="Loading this person’s page…" /></Page>
  const runsIt = !!user?.id && g.initiatorId === user.id
  const person = (b.participants ?? []).find((p: Any) => p.id === participantId)
  const title = b.title ?? 'This check-in'
  const crumbs = [{ label: 'Check-ins', to: '/grounds' }, { label: title, to: `/grounds/${id}/board` }]
  if (!person || !runsIt) {
    return (
      <Page>
        <PageTitle crumbs={crumbs} title="Not available" subtitle="This page is for whoever runs this check-in. Each person’s own check-ins stay with them." />
      </Page>
    )
  }
  const name = person.name ?? 'This person'
  const first = firstName(name)
  const now = new Date()
  const share = (b.objectives ?? []).find((o: Any) => o.ownerParticipantId === participantId && o.target != null)
  const joinedAt = (g.participants ?? []).find((p: Any) => p.id === participantId)?.createdAt ?? null
  const subtitle = [
    person.role ? `${person.role} team${joinedAt ? `, since ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(new Date(joinedAt))}` : ''}.` : null,
    share ? `${first}’s share is ${share.target}, and ${first} has ${share.count}.` : null,
  ].filter(Boolean).join(' ')

  const dealSection = (b.workRecords ?? []).find((s: Any) => s.section === 'Deal grid')
  const stages: string[] = (dealSection?.stages ?? []).filter((_s: string, i: number, all: string[]) => i < all.length - 1)
  const deals: Any[] = (dealSection?.rows ?? []).filter((r: Any) => r.kind === 'deal' && r.ownerParticipantId === participantId)

  const gridRow = (b.checkInGrid?.rows ?? []).find((r: Any) => r.participantId === participantId)
  const lastSessions: number[] = (b.checkInGrid?.sessions ?? []).slice(-20)
  const cells = lastSessions.map((n) => gridRow?.cells?.[String(n)] ?? 'empty')
  const done = cells.filter((c) => c === 'done').length
  const sessionDate = new Map<number, string>((b.phaseSpine?.sessions ?? []).map((s: Any) => [s.n, s.opensOn ?? s.date]))
  const items: Any[] = ((b.whoOwnsWhat ?? []).find((w: Any) => w.participantId === participantId)?.items ?? [])
  const recent = [...new Set(items.map((i) => i.sessionNumber).filter(Boolean) as number[])].sort((a, c) => c - a).slice(0, 3)

  const patterns: Any[] = (b.patterns ?? []).filter((p: Any) => p.participantId === participantId)
  const history = (b.personHistory ?? []).find((h: Any) => h.participantId === participantId)
  const promised: string[] = (b.obligations ?? []).find((o: Any) => o.participantId === participantId)?.promised ?? []
  const probe = (b.coaching?.eachPerson ?? []).find((c: Any) => c.participantId === participantId)
  const notes: Any[] = (g.contextItems ?? []).filter((l: Any) => l.kind === 'ABOUT_A_PERSON' && l.aboutParticipantId === participantId && !l.closedAt)

  return (
    <Page>
      <PageTitle
        crumbs={[...crumbs, { label: name }]}
        title={name}
        avatarInitials={initials(name)}
        subtitle={subtitle || undefined}
        action={<Button kind="secondary" to={`/grounds/${id}?tab=context`}>{`Ask ${first} something`}</Button>}
      />
      <p className="pb-updated">{`You see what the reports and the proof show about ${first}’s work. ${first}’s word-for-word check-ins stay with ${first}.`}</p>

      {/* Only a check-in that keeps deals has a section for them (a performance plan's case has none). */}
      {dealSection && (
      <Section heading={`${first}’s deals`} note={`Ringed is ${first}’s word; filled is proven`}>
        {deals.length ? (
          <div className="pb-person-deals">
            {deals.map((r) => {
              const at = Math.max(-1, stages.findIndex((s) => s.toLowerCase() === String(r.stage ?? '').toLowerCase()))
              return (
                <div className="pb-person-deal" key={r.id}>
                  <div><b>{r.name}</b><div className="pb-sub">{r.value ?? ''}</div></div>
                  <span>{r.next ?? r.nextSays ?? ''}</span>
                  <div className="pb-track" aria-label={`${r.name}: ${r.stage ?? 'no stage yet'}`}>
                    {stages.map((s, i) => (
                      <span key={s} className="pb-track-step">
                        <span className={`pb-dot ${i <= at ? (r.mark === 'proven' ? 'pb-dot-proof' : 'pb-dot-said') : 'pb-dot-said pb-dot-ahead'}`} />
                        <span className="pb-track-name">{s}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : <Panel><p className="gwui-panel-text">{`No deal of ${first}’s is on record yet.`}</p></Panel>}
      </Section>
      )}

      <Section heading={`${first}’s check-ins`} note={g.cadence === 'DAILY' ? `Last ${cells.length} weekdays: ${done} of ${cells.length}` : `Last ${cells.length} sessions: ${done} of ${cells.length}`}>
        <div className="pb-squares pb-person-squares">
          {cells.map((c, i) => <span key={i} className={`pb-sq${c === 'done' ? '' : ' pb-sq-miss'}`} aria-label={c === 'done' ? 'Checked in' : 'Missed'} />)}
        </div>
        <div className="pb-person-days">
          {recent.map((n) => {
            const said = items.filter((i) => i.sessionNumber === n && i.type !== 'COMMITMENT').map((i) => theirWords(i.text)).join(' ')
            const will = items.filter((i) => i.sessionNumber === n && i.type === 'COMMITMENT').map((i) => theirWords(i.text))
            const when = sessionDate.get(n)
            return (
              <div className="pb-person-day" key={n}>
                <b>{when ? aDayInWords(new Date(when), now) : `Session ${n}`}</b>
                <span>{said}</span>
                <span>{will.length ? <><span className="pb-sub">Committed to: </span>{will.join(' ')}</> : null}</span>
              </div>
            )
          })}
        </div>
      </Section>

      <div className="pb-two">
        <Section heading="Signals">
          <Panel>
            {patterns.length ? patterns.map((p) => (
              <div key={p.id} className="pb-signal-box">
                <b>{p.whatHappened ?? p.heading}</b>
                <p className="pb-foot">A person decides what it means, not Groundwork.</p>
                {p.theirWords && (
                  <div className="pb-answer-box">
                    <span className="pb-sub">{`${first}’s answer.`}</span>
                    <p className="pb-read">{`“${p.theirWords}”`}</p>
                  </div>
                )}
              </div>
            )) : <p className="gwui-panel-text">Nothing has come up three check-ins in a row yet.</p>}
          </Panel>
        </Section>
        <Section heading={`What ${first} has kept to`}>
          <Panel>
            {history?.says && <p className="gwui-panel-text">{history.says}</p>}
            {promised.map((p) => <p className="gwui-panel-text" key={p}>{p}</p>)}
            {!history?.says && !promised.length && <p className="gwui-panel-text">{`Nothing ${first} said they would do is on record yet.`}</p>}
          </Panel>
        </Section>
      </div>

      <Section heading="What to probe them on" note="Only you see this. Questions to ask">
        <Panel>
          {(probe?.probe ?? []).length
            ? probe.probe.map((q: string) => <p className="pb-read" key={q}>{q}</p>)
            : <p className="gwui-panel-text">Nothing to ask about yet.</p>}
          <p className="pb-foot">From gaps in their work.</p>
        </Panel>
      </Section>

      <Section heading={`Your notes on ${first}`} action={<Tag tone="plain">Only you see these</Tag>}>
        <Panel>
          {notes.length
            ? notes.map((n) => <p className="pb-read" key={n.id}>{`“${n.text}”`}</p>)
            : <p className="gwui-panel-text">{`You have not written anything about ${first} yet.`}</p>}
          <p className="gwui-panel-text">{`Shapes the questions ${first}’s check-in asks. ${first} never sees it as your words.`}</p>
          <div><Button kind="quiet" to={`/grounds/${id}?tab=context`}>Change</Button></div>
        </Panel>
      </Section>
    </Page>
  )
}
