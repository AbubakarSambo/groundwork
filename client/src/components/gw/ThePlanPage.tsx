import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi, type PlanCard } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import { Section, Panel, Button, TextArea, TextField, FieldLabel, Note, Choices, Stack } from '@/components/gw/ui'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * "FROM A PLAN" AND "WAITING FOR YOU TO CONFIRM" (prototype: B2-context/context.txt).
 *
 * The server reads a plan into cards (goals, roles, commitments, rules, questions, decisions and
 * dates), keeps each one as waiting, and writes nothing until the lead says yes to that card. This
 * only draws what the server sends and sends the lead's yes, change or not now. The words on each
 * card are the server's. Only the lead is shown these; the server refuses anybody else.
 */
const KEY = (groundId: string) => ['plan-cards', groundId]

const THE_WAYS = [
  { key: 'AIM', label: 'An aim to reach' },
  { key: 'LIMIT', label: 'A limit not to go over' },
]

export function FromAPlan({ groundId }: { groundId: string }) {
  const qc = useQueryClient()
  const [pasting, setPasting] = useState(false)
  const [text, setText] = useState('')
  const [said, setSaid] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const done = (r: { says: string }) => {
    setSaid(r.says)
    setText('')
    setPasting(false)
    qc.invalidateQueries({ queryKey: KEY(groundId) })
  }
  const failed = (e: any) => toast.error(e?.response?.data?.message ?? 'Groundwork could not read that plan just now. Please try again.')
  const readText = useMutation({ mutationFn: () => groundsApi.readAPlan(groundId, { text }), onSuccess: done, onError: failed })
  const readFile = useMutation({
    mutationFn: async (f: File) => {
      const doc: any = await documentsApi.upload(groundId, f)
      return groundsApi.readAPlan(groundId, { documentId: doc?.id })
    },
    onSuccess: done,
    onError: failed,
  })
  const busy = readText.isPending || readFile.isPending
  return (
    <Section heading="From a plan" note="Nothing is added until you confirm it">
      <Panel>
        <p>Upload a plan, and Groundwork will propose the goals, roles and commitments in it for you to check one by one.</p>
        <input
          ref={file}
          type="file"
          hidden
          aria-label="Choose a plan to upload"
          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) readFile.mutate(f) }}
        />
        <Button kind="secondary" disabled={busy} onClick={() => file.current?.click()}>{readFile.isPending ? 'Reading…' : 'Upload a plan'}</Button>
        {' '}
        {/* A quiet text link, not a second boxed button: the prototype's "From a plan" has the one button, "Upload a plan". */}
        <button type="button" className="gwui-plain-link" disabled={busy} onClick={() => setPasting((p) => !p)}>Paste a plan instead</button>
        {pasting && (
          <div>
            <TextArea
              value={text}
              onChange={(e: any) => setText(e.target.value)}
              placeholder="Paste your plan here."
              aria-label="Paste your plan here"
              rows={6}
            />
            <Button disabled={busy || !text.trim()} onClick={() => readText.mutate()}>{readText.isPending ? 'Reading…' : 'Read this plan'}</Button>
          </div>
        )}
        {said && <Note role="status">{said}</Note>}
      </Panel>
    </Section>
  )
}

/** `heading`: the light Context page says "Needs you" (approved rename of "Waiting for you to confirm"). */
/** `lookAgain`: at the end of her own check-in, where the targets she gave are still being read, it looks again every few seconds until they are there. */
/** `onlyTheTargetsYouGave`: the end of her own check-in shows only the targets read from it (which exist only with Release 1's sales board on), never a plan's other cards. */
export function WaitingForYouToConfirm({ groundId, heading = 'Waiting for you to confirm', lookAgain = false, onlyTheTargetsYouGave = false }: { groundId: string; heading?: string; lookAgain?: boolean; onlyTheTargetsYouGave?: boolean }) {
  const q = useQuery({
    queryKey: KEY(groundId),
    queryFn: () => groundsApi.planCardsWaiting(groundId),
    retry: false,
    /* For about a minute at most: reading her check-in takes seconds, and with no target in it there is nothing to wait for. */
    refetchInterval: (query) => (lookAgain && query.state.dataUpdateCount < 15 && !(query.state.data?.proposals ?? []).some((c) => c.fromYourCheckIn) ? 4000 : false),
  })
  const cards = (q.data?.proposals ?? []).filter((c) => !onlyTheTargetsYouGave || c.fromYourCheckIn)
  if (!cards.length) return null
  /* The targets from her own check-in are one card, listed together; everything else is a card of its own. */
  const fromHerCheckIn = cards.filter((c) => c.fromYourCheckIn)
  const others = cards.filter((c) => !c.fromYourCheckIn)
  return (
    <Section heading={heading} note="Nothing changes until you confirm it">
      {fromHerCheckIn.length > 0 && <TheTargetsYouGave groundId={groundId} cards={fromHerCheckIn} />}
      {others.map((c) => <Card key={c.id} groundId={groundId} card={c} />)}
    </Section>
  )
}

/*
 * THE TARGETS YOU GAVE, AS ONE CARD (Hafsah, 18 October: "at the end of setup, one confirm card lists the targets you took down;
 * the lead taps right or corrects them before they go on record"). The server holds each target read from her check-in as waiting
 * and writes nothing until she confirms. Confirm puts every one on record, Edit corrects one, Not now keeps them all off it.
 */
export function theTargetsCardHeading(cards: PlanCard[]): string {
  const days = [...new Set(cards.map((c) => c.saidOn).filter(Boolean) as string[])].sort()
  const when = days.length ? ` on ${whenItWas(`${days[days.length - 1]}T12:00:00Z`, 'dayAndMonthLong')}` : ''
  return cards.length === 1
    ? `The target you gave in your check-in${when}. It goes on record only once you confirm it.`
    : `The ${cards.length} targets you gave in your check-in${when}. They go on record only once you confirm them.`
}

export function TheTargetsYouGave({ groundId, cards }: { groundId: string; cards: PlanCard[] }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<string | null>(null)
  const [what, setWhat] = useState('')
  const [number, setNumber] = useState('')
  const settle = () => {
    qc.invalidateQueries({ queryKey: KEY(groundId) })
    qc.invalidateQueries({ queryKey: ['ground', groundId] })
    qc.invalidateQueries({ queryKey: ['board', groundId] })
  }
  const refused = (e: any) => toast.error(e?.response?.data?.message ?? 'That did not go through, and nothing has changed. Try again.')
  /* One at a time, in order, so one refusal stops the rest and says why. */
  const confirmAll = useMutation({
    mutationFn: async () => { for (const c of cards) await groundsApi.confirmPlanCard(groundId, c.id, null) },
    onSuccess: settle,
    onError: (e) => { settle(); refused(e) },
  })
  const notNowAll = useMutation({
    mutationFn: async () => { for (const c of cards) await groundsApi.planCardNotNow(groundId, c.id) },
    onSuccess: settle,
    onError: (e) => { settle(); refused(e) },
  })
  const correct = useMutation({
    mutationFn: (id: string) => groundsApi.correctATargetCard(groundId, id, { what: what.trim(), number: number.trim() ? Number(number.replace(/,/g, '')) : null }),
    onSuccess: () => { setEditing(null); settle() },
    onError: refused,
  })
  const busy = confirmAll.isPending || notNowAll.isPending || correct.isPending
  return (
    <Panel>
      <p>{theTargetsCardHeading(cards)}</p>
      {cards.map((c) => (
        <Stack key={c.id} gap={6}>
          {editing === c.id ? (
            <div>
              <FieldLabel htmlFor={`what-${c.id}`}>What it counts</FieldLabel>
              <TextField id={`what-${c.id}`} value={what} onChange={(e: any) => setWhat(e.target.value)} />
              <FieldLabel htmlFor={`number-${c.id}`}>The number</FieldLabel>
              <TextField id={`number-${c.id}`} value={number} onChange={(e: any) => setNumber(e.target.value)} inputMode="numeric" />
              <Button disabled={busy || !what.trim()} onClick={() => correct.mutate(c.id)}>Save</Button>{' '}
              <Button kind="quiet" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          ) : (
            <>
              <p><strong>{c.says}</strong></p>
              <p>{`You said, “${c.fromThePlan}”`}</p>
              <Button kind="secondary" size="small" disabled={busy || !!editing} onClick={() => { setEditing(c.id); setWhat(c.fields?.what ?? ''); setNumber(c.fields?.number != null ? String(c.fields.number) : '') }}>Edit</Button>
            </>
          )}
        </Stack>
      ))}
      <p>
        <Button disabled={busy || !!editing} onClick={() => confirmAll.mutate()}>Confirm</Button>{' '}
        <Button kind="quiet" disabled={busy || !!editing} onClick={() => notNowAll.mutate()}>Not now</Button>
      </p>
    </Panel>
  )
}

function Card({ groundId, card }: { groundId: string; card: PlanCard }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [says, setSays] = useState(card.says)
  const [way, setWay] = useState(card.directionSuggested === 'AIM' || card.directionSuggested === 'LIMIT' ? card.directionSuggested : '')
  const settle = () => {
    qc.invalidateQueries({ queryKey: KEY(groundId) })
    qc.invalidateQueries({ queryKey: ['ground', groundId] })
  }
  const refused = (e: any) => toast.error(e?.response?.data?.message ?? 'That did not go through, and nothing has changed. Try again.')
  const confirm = useMutation({ mutationFn: () => groundsApi.confirmPlanCard(groundId, card.id, way || null), onSuccess: settle, onError: refused })
  const notNow = useMutation({ mutationFn: () => groundsApi.planCardNotNow(groundId, card.id), onSuccess: settle, onError: refused })
  const save = useMutation({
    mutationFn: () => groundsApi.editPlanCard(groundId, card.id, says),
    onSuccess: () => { setEditing(false); settle() },
    onError: refused,
  })
  const busy = confirm.isPending || notNow.isPending || save.isPending
  return (
    <Panel>
      <p>{card.heading}</p>
      {/* Groundwork's own suggestion (a stall rule, standing decision 4) quotes nobody, so it has no quotation. */}
      {!card.suggested && <p>“{card.fromThePlan}”</p>}
      {editing ? (
        <div>
          <TextArea value={says} onChange={(e: any) => setSays(e.target.value)} aria-label="Change what this says" rows={2} />
          <Button disabled={busy || !says.trim()} onClick={() => save.mutate()}>Save</Button>{' '}
          <Button kind="quiet" onClick={() => { setSays(card.says); setEditing(false) }}>Cancel</Button>
        </div>
      ) : (
        <p><strong>{card.says}</strong></p>
      )}
      {card.note && <Note>{card.note}</Note>}
      {card.whichWay && (
        <div>
          <p>{card.whichWay}</p>
          <Choices label="Which way this goal goes" options={THE_WAYS} value={way} onChange={setWay} />
        </div>
      )}
      <Button disabled={busy || editing} onClick={() => confirm.mutate()}>Confirm</Button>{' '}
      {!card.suggested && <><Button kind="secondary" disabled={busy || editing} onClick={() => setEditing(true)}>Edit</Button>{' '}</>}
      <Button kind="quiet" disabled={busy} onClick={() => notNow.mutate()}>Not now</Button>
    </Panel>
  )
}
