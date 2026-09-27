import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { equipmentApi, type EquipmentBoard } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/gw/kit'

/**
 * EQUIPMENT (E10, #/suite/equipment, U.17). ADMINS ONLY, on the server. The wording is copied from
 * docs/prototype/screens/E-suites/suite-equipment.txt: "Laptops, phones and demo freezers: who has
 * what, and what needs fixing. People update it by telling Groundwork.", "Item", "Who has it" and "How
 * it is".
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
    <div className="gw-you gw-suites">
      <nav className="gw-people-crumb" aria-label="Breadcrumb"><Link to="/settings/suites">Suites</Link> / Equipment</nav>
      <h1 className="gw-t-title gw-suites-h1">Equipment</h1>
      <p className="gw-you-sub">Laptops, phones and demo freezers: who has what, and what needs fixing. People update it by telling Groundwork.</p>

      {isLoading && <p className="gw-t-body gw-you-quiet">Loading…</p>}
      {isError && (
        refused?.status === 403 || refused?.status === 404 ? (
          <p role="alert" className="gw-t-body">{refused.data?.message ?? 'Only an admin can open this board.'}</p>
        ) : (
          <div role="alert" className="gw-you-quiet">
            <p className="gw-t-body">The board did not load.</p>
            <Button kind="secondary" size="small" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
          </div>
        )
      )}

      {data && data.items.length === 0 && <p className="gw-t-body gw-you-quiet">No equipment is listed yet.</p>}
      {data && data.items.length > 0 && (
        <div className="gw-you-card gw-time-table-wrap">
          <table className="gw-suite-table">
            <thead>
              <tr><th scope="col">Item</th><th scope="col">Who has it</th><th scope="col">How it is</th><th scope="col"><span className="gw-sr-only">Change</span></th></tr>
            </thead>
            <tbody>{data.items.map(i => <AnItem key={i.id} item={i} people={data.people} />)}</tbody>
          </table>
        </div>
      )}
      {data && <AddAnItem people={data.people} />}
    </div>
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
        <label className="gw-sr-only" htmlFor={`${id}-who`}>{`Who has ${item.name}`}</label>
        <select id={`${id}-who`} value={holder} onChange={e => setHolder(e.target.value)}>
          <option value="">Nobody</option>
          {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </td>
      <td>
        <label className="gw-sr-only" htmlFor={`${id}-how`}>{`How ${item.name} is`}</label>
        <input id={`${id}-how`} value={condition} maxLength={300} onChange={e => setCondition(e.target.value)} />
        {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
      </td>
      <td>
        <span className="gw-leave-acts">
          <Button size="small" onClick={() => save.mutate()} disabled={save.isPending}>Save</Button>
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
    <section className="gw-suites-group gw-you-card" aria-labelledby="equipment-add">
      <h2 id="equipment-add" className="gw-t-h3">Add an item</h2>
      <form className="gw-suite-ask" onSubmit={e => { e.preventDefault(); if (name.trim()) add.mutate() }}>
        <div className="gw-suite-q">
          <label htmlFor="equipment-name">Item</label>
          <input id="equipment-name" value={name} maxLength={120} onChange={e => setName(e.target.value)} />
        </div>
        <div className="gw-suite-q">
          <label htmlFor="equipment-who">Who has it</label>
          <select id="equipment-who" value={holder} onChange={e => setHolder(e.target.value)}>
            <option value="">Nobody</option>
            {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="gw-suite-q">
          <label htmlFor="equipment-how">How it is</label>
          <input id="equipment-how" value={condition} maxLength={300} onChange={e => setCondition(e.target.value)} />
        </div>
        <div><Button type="submit" size="small" disabled={!name.trim() || add.isPending}>Add it</Button></div>
        {problem && <p className="gw-auth-error" role="alert">{problem}</p>}
      </form>
    </section>
  )
}
