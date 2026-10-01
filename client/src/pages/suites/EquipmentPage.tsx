import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { equipmentApi, type EquipmentBoard } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Page, PageTitle, Section, Panel, Button, Note, Empty, FieldLabel, Select, TextField } from '@/components/gw/ui'

/**
 * EQUIPMENT (E10, #/suite/equipment, group 2 piece 4). ADMINS ONLY, on the server. The wording is
 * copied from docs/prototype/screens/E-suites/suite-equipment.txt: "See who has each laptop, phone
 * and demo freezer, and what needs fixing. People update it by telling Groundwork." (group 2's
 * second review, fault 3: "Laptops, phones and demo freezers. See who has what..." was still two
 * fragments stapled together with a full stop), "Item", "Who has it" and "How it is".
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` (crumbs, subtitle), `Panel` with
 * `.gwui-record-table`, `Section` for "Add an item", `FieldLabel`/`Select`/`TextField` for every
 * field, `Button` for Change/Save/Cancel/Add it, and `Note`/`Empty` for loading, error and empty
 * states. No new parts were needed.
 *
 * LEFT OUT (item 28): "Book a repair", because nothing yet tells anybody about a repair, and a button
 * that seems to book one and does not would be worse than none; and "How people use it", because
 * telling Groundwork is the engine's and does not work yet (request 29).
 *
 * WORDING NO SCREEN SHOWS (item 28): "Change", "Save", "Cancel", "Nobody", "Add an item", "Add it",
 * "No equipment is listed yet." and "The board did not load."
 */
const DID_NOT_GO = 'That did not go through, and nothing has changed. Try again.'

export function EquipmentPage() {
  const user = useAuthStore(s => s.user)
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['suite-equipment'],
    queryFn: equipmentApi.get,
    enabled: !!user,
    retry: false,
  })
  const refused = (error as { response?: { status?: number; data?: { message?: string } } } | null)?.response

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Suites', to: '/settings/suites' }, { label: 'Equipment' }]}
        title="Equipment"
        subtitle="See who has each laptop, phone and demo freezer, and what needs fixing. People update it by telling Groundwork."
      />

      {isLoading && <Note>Loading…</Note>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <Note tone="error">{refused.data?.message ?? 'Only an admin can open this board.'}</Note>
        ) : (
          <div>
            <Note tone="error">The board did not load.</Note>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && data.items.length === 0 && <Empty>No equipment is listed yet.</Empty>}
      {data && data.items.length > 0 && (
        <Panel>
          <table className="gwui-record-table">
            <thead>
              <tr><th scope="col">Item</th><th scope="col">Who has it</th><th scope="col">How it is</th><th scope="col"><span className="gwui-sr-only">Change</span></th></tr>
            </thead>
            <tbody>{data.items.map(i => <AnItem key={i.id} item={i} people={data.people} />)}</tbody>
          </table>
        </Panel>
      )}
      {data && <AddAnItem people={data.people} />}
    </Page>
  )
}

function AnItem({ item, people }: { item: EquipmentBoard['items'][number]; people: EquipmentBoard['people'] }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [holder, setHolder] = useState(item.holderId ?? '')
  const [condition, setCondition] = useState(item.condition ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  const save = useMutation({
    mutationFn: () => equipmentApi.change(item.id, { holderId: holder || null, condition: condition.trim() || null }),
    onSuccess: (b) => { setProblem(null); setEditing(false); qc.setQueryData(['suite-equipment'], b) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  if (!editing) {
    return (
      <tr>
        <th scope="row">{item.name}</th>
        <td>{item.holder ?? 'Nobody'}</td>
        <td>{item.condition ?? ''}</td>
        <td><Button kind="quiet" size="small" onClick={() => setEditing(true)} aria-label={`Change ${item.name}`}>Change</Button></td>
      </tr>
    )
  }
  const id = `equipment-${item.id}`
  return (
    <tr>
      <th scope="row">{item.name}</th>
      <td>
        <label className="gwui-sr-only" htmlFor={`${id}-who`}>{`Who has ${item.name}`}</label>
        <Select id={`${id}-who`} value={holder} onChange={e => setHolder(e.target.value)}>
          <option value="">Nobody</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </td>
      <td>
        <label className="gwui-sr-only" htmlFor={`${id}-how`}>{`How ${item.name} is`}</label>
        <TextField id={`${id}-how`} value={condition} maxLength={300} onChange={e => setCondition(e.target.value)} />
        {problem && <Note tone="error">{problem}</Note>}
      </td>
      <td>
        <span className="gwui-edge-acts">
          {/* ONE NAVY BUTTON PER SCREEN: "Add an item" below stays the page's one primary action,
              so a row being changed uses "secondary" here, the same way every other board's
              row-level action (Approve, Mark done, Change) stays secondary beside the page's own
              primary form. */}
          <Button kind="secondary" size="small" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
          <Button kind="quiet" size="small" onClick={() => { setEditing(false); setHolder(item.holderId ?? ''); setCondition(item.condition ?? '') }}>Cancel</Button>
        </span>
      </td>
    </tr>
  )
}

function AddAnItem({ people }: { people: EquipmentBoard['people'] }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [holder, setHolder] = useState('')
  const [condition, setCondition] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const add = useMutation({
    mutationFn: () => equipmentApi.add({ name: name.trim(), holderId: holder || null, condition: condition.trim() || null }),
    onSuccess: (b) => { setProblem(null); setName(''); setHolder(''); setCondition(''); qc.setQueryData(['suite-equipment'], b) },
    onError: (e: any) => setProblem(e?.response?.data?.message || DID_NOT_GO),
  })
  return (
    <Section heading="Add an item">
      <Panel>
        <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (name.trim()) add.mutate() }}>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="equipment-name">Item</FieldLabel>
            <TextField id="equipment-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} />
          </div>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="equipment-who">Who has it</FieldLabel>
            <Select id="equipment-who" value={holder} onChange={e => setHolder(e.target.value)}>
              <option value="">Nobody</option>
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="equipment-how">How it is</FieldLabel>
            <TextField id="equipment-how" value={condition} maxLength={300} onChange={e => setCondition(e.target.value)} />
          </div>
          <div><Button type="submit" size="small" disabled={!name.trim() || add.isPending}>Add it</Button></div>
          {problem && <Note tone="error">{problem}</Note>}
        </form>
      </Panel>
    </Section>
  )
}
