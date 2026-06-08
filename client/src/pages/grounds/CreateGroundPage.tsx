import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api'
import type { GroundScenario, GroundMoment } from '@/types'

const SCENARIOS: { value: GroundScenario; label: string; desc: string; moment: GroundMoment }[] = [
  { value: 'NEW_HIRE', label: 'New hire', desc: 'Align before day one sets in.', moment: 'STARTING' },
  { value: 'NEW_COFOUNDER', label: 'New cofounder', desc: 'Surface assumptions before they calcify.', moment: 'STARTING' },
  { value: 'NEW_ADVISOR', label: 'New advisor / board member', desc: 'Set the terms clearly from the start.', moment: 'STARTING' },
  { value: 'NEW_PROJECT', label: 'New project', desc: 'Shared picture before the sprint starts.', moment: 'STARTING' },
  { value: 'RECOGNITION', label: 'Recognition — raise, equity, promotion', desc: 'Both sides on record before the decision.', moment: 'RECOGNITION' },
  { value: 'DRIFT', label: 'Something has drifted', desc: 'Name it. Find the gap. Decide what happens next.', moment: 'RESOLUTION' },
]

export function CreateGroundPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [scenario, setScenario] = useState<GroundScenario>('NEW_HIRE')

  const mutation = useMutation({
    mutationFn: () => {
      const moment = SCENARIOS.find((s) => s.value === scenario)!.moment
      return groundsApi.create({ label, scenario, moment })
    },
    onSuccess: (ground) => {
      qc.invalidateQueries({ queryKey: ['grounds'] })
      toast.success('Ground opened')
      navigate(`/grounds/${ground.id}`)
    },
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <button className="gw-back" onClick={() => navigate('/')}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 520, margin: '0 auto', width: '100%', paddingTop: 24 }}>
        <div className="gw-ttl">Open a ground</div>
        <div className="gw-sub-t">Start at the beginning — not just at the point of breakdown.</div>

        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
          <div className="gw-fld">
            <label className="gw-label">Name the ground</label>
            <input
              className="gw-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. New cofounder — Ada, Priya's raise, Engineering drift"
              required
            />
          </div>

          <div className="gw-fld">
            <label className="gw-label">Which situation are you in?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              {SCENARIOS.map((s) => (
                <label
                  key={s.value}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                    border: scenario === s.value ? '1.5px solid #0C447C' : '1px solid #E2E0DB',
                    background: scenario === s.value ? '#EEF4FB' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="scenario"
                    value={s.value}
                    checked={scenario === s.value}
                    onChange={() => setScenario(s.value)}
                    style={{ marginTop: 2, accentColor: '#0C447C' }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 1 }}>{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="button" className="gw-btn-sec" style={{ flex: 0 }} onClick={() => navigate('/')}>Cancel</button>
            <button type="submit" className="gw-btn" style={{ flex: 1 }} disabled={mutation.isPending || !label.trim()}>
              {mutation.isPending ? 'Opening…' : 'Open ground →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
