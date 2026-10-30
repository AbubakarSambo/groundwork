import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { boardApi } from '@/api/board'

type What = 'milestone' | 'money' | 'stakeholder'
const LINK: Record<What, string> = { milestone: 'Add a milestone', money: 'Add a month of money in and out', stakeholder: 'Add a stakeholder' }

/**
 * RELEASE 5: THE LEAD ADDS TO THE PROJECT'S RECORD on its board, in the prototype's fields (.input, .btn): a milestone with its day and its
 * share of the contract; a month with what comes in and goes out; a stakeholder with who keeps in touch, what they need, the next update
 * and what they asked last time. A plain link opens it; nothing is written until Save. The server refuses anybody but the lead.
 */
export function AddToTheProject({ groundId, what, participants }: { groundId: string; what: What; participants: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<Record<string, string>>({})
  const qc = useQueryClient()
  const set = (k: string) => (e: { target: { value: string } }) => setV((x) => ({ ...x, [k]: e.target.value }))
  const save = useMutation({
    mutationFn: () => {
      if (what === 'milestone') return boardApi.addWorkItem(groundId, { kind: 'milestone', name: v.name ?? '', stage: 'Planned', due: v.due || null, fields: v.share ? { Share: `${v.share.replace(/%$/, '')}%`, ...(v.amount ? { Amount: v.amount } : {}) } : {} })
      if (what === 'money') return boardApi.addWorkItem(groundId, { kind: 'money', name: v.month ?? '', fields: Object.fromEntries(Object.entries({ Month: v.month ?? '', In: v.in ?? '', 'In for': v.inFor ?? '', Out: v.out ?? '', 'Out for': v.outFor ?? '' }).filter(([, x]) => x)) })
      return boardApi.addWorkItem(groundId, { kind: 'stakeholder', name: v.name ?? '', ownerParticipantId: v.owner || null, fields: Object.fromEntries(Object.entries({ Needs: v.needs ?? '', 'Next update': v.next ?? '', 'Asked last time': v.asked ?? '' }).filter(([, x]) => x)) })
    },
    onSuccess: () => { setOpen(false); setV({}); qc.invalidateQueries({ queryKey: ['board', groundId] }); toast.success('Added to the project.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That did not save. Try again.'),
  })
  if (!open) return <button type="button" className="gw-link t-small gw-start" onClick={() => setOpen(true)}>{LINK[what]}</button>
  const field = (k: string, label: string, type = 'text', placeholder?: string) => (
    <label className="gw-col-6 t-small" key={k}><span className="mut">{label}</span><input className="input" type={type} value={v[k] ?? ''} placeholder={placeholder} onChange={set(k)} /></label>
  )
  return (
    <form className="panel pad gw-col-10" onSubmit={(e) => { e.preventDefault(); save.mutate() }} aria-label={LINK[what]}>
      {what === 'milestone' && <>{field('name', 'What is delivered', 'text', 'The inception report')}{field('due', 'When it is due', 'date')}{field('share', 'Its share of the contract, as a percentage', 'text', '30')}{field('amount', 'Its amount, if known', 'text', 'KES 1,800,000')}</>}
      {what === 'money' && <>{field('month', 'Which month', 'month')}{field('inFor', 'What comes in')}{field('in', 'How much comes in', 'text', 'KES 1,000,000')}{field('outFor', 'What goes out')}{field('out', 'How much goes out', 'text', 'KES 650,000')}</>}
      {what === 'stakeholder' && <>
        {field('name', 'Who they are', 'text', 'The funder’s programme lead')}
        <label className="gw-col-6 t-small"><span className="mut">Who keeps in touch with them</span>
          <select className="input" value={v.owner ?? ''} onChange={set('owner')}><option value="">Nobody yet</option>{participants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {field('needs', 'What they need', 'text', 'Monthly updates, evidence over opinion')}{field('next', 'Their next update', 'date')}{field('asked', 'What they asked last time')}
      </>}
      <p className="gw-links"><button type="submit" className="btn pri sm" disabled={save.isPending || !(v.name || v.month)}>Save</button><button type="button" className="gw-link" onClick={() => setOpen(false)}>Cancel</button></p>
    </form>
  )
}
