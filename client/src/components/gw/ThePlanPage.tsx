import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi, type PlanCard } from '@/api/grounds'
import { documentsApi } from '@/api/documents'
import { Section, Panel, Button, TextArea, Note, Choices } from '@/components/gw/ui'

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

export function WaitingForYouToConfirm({ groundId }: { groundId: string }) {
  const q = useQuery({ queryKey: KEY(groundId), queryFn: () => groundsApi.planCardsWaiting(groundId), retry: false })
  const cards = q.data?.proposals ?? []
  if (!cards.length) return null
  return (
    <Section heading="Waiting for you to confirm" note="Nothing changes until you confirm it">
      {cards.map((c) => <Card key={c.id} groundId={groundId} card={c} />)}
    </Section>
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
      <p>“{card.fromThePlan}”</p>
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
      <Button kind="secondary" disabled={busy || editing} onClick={() => setEditing(true)}>Edit</Button>{' '}
      <Button kind="quiet" disabled={busy} onClick={() => notNow.mutate()}>Not now</Button>
    </Panel>
  )
}
