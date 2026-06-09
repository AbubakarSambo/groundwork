import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api'
import type { GroundScenario, GroundMoment } from '@/types'

type TriggerCategory = 'STARTING' | 'RECOGNITION' | 'RESOLUTION'

interface TriggerDef {
  value: TriggerCategory
  symbol: string
  label: string
  purpose: string
  moment: GroundMoment
}

const TRIGGERS: TriggerDef[] = [
  {
    value: 'STARTING',
    symbol: '+',
    label: 'Something new is starting',
    purpose: 'Build alignment from the beginning. Replace assumption with explicit record.',
    moment: 'STARTING',
  },
  {
    value: 'RECOGNITION',
    symbol: '↑',
    label: 'Someone wants recognition',
    purpose: 'Ground a reward decision in a historical record.',
    moment: 'RECOGNITION',
  },
  {
    value: 'RESOLUTION',
    symbol: '◉',
    label: 'Everyone needs to see the same thing',
    purpose: 'Create shared reality under pressure, drift, or conflict.',
    moment: 'RESOLUTION',
  },
]

interface ScenarioDef {
  value: GroundScenario
  label: string
  desc: string
  trigger: TriggerCategory
}

const SCENARIOS: ScenarioDef[] = [
  { value: 'NEW_HIRE',         label: 'New hire',                      desc: 'Define 90-day success before day one sets in.',                          trigger: 'STARTING' },
  { value: 'NEW_COFOUNDER',    label: 'New cofounder / partner',       desc: 'Define contribution before the equity discussion.',                      trigger: 'STARTING' },
  { value: 'NEW_ADVISOR',      label: 'New board member / advisor',    desc: 'Define expected return vs cost from the start.',                         trigger: 'STARTING' },
  { value: 'NEW_PROJECT',      label: 'New project',                   desc: 'Scope, ownership, and success criteria defined upfront.',                trigger: 'STARTING' },
  { value: 'NEW_MANAGER',      label: 'New manager / consultant',      desc: 'Define scope and expectations before the engagement starts.',            trigger: 'STARTING' },
  { value: 'CONTRACT_RENEWAL', label: 'Contract renewal or exit',      desc: 'Record-based decisioning at the end of a period.',                      trigger: 'STARTING' },
  { value: 'RECOGNITION',      label: 'Raise, equity, or promotion',   desc: 'Both sides on record before the decision is made.',                     trigger: 'RECOGNITION' },
  { value: 'DRIFT',            label: 'Something has drifted',         desc: 'A relationship or dynamic that has been wrong for too long.',            trigger: 'RESOLUTION' },
  { value: 'CRISIS_ALIGNMENT', label: 'Revenue pressure or team misalignment', desc: 'Cofounder tension, cash crunch, or a team not seeing the same thing.', trigger: 'RESOLUTION' },
]

function labelPlaceholder(trigger: TriggerCategory): string {
  switch (trigger) {
    case 'STARTING':    return 'e.g. New cofounder — Ada, Senior hire — Marcus'
    case 'RECOGNITION': return 'e.g. Priya\'s raise, Engineering lead promotion'
    case 'RESOLUTION':  return 'e.g. Engineering drift, Cofounder tension — Q2'
  }
}

export function CreateGroundPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [trigger, setTrigger] = useState<TriggerCategory | null>(null)
  const [scenario, setScenario] = useState<GroundScenario | null>(null)
  const [label, setLabel] = useState('')

  const scenariosForTrigger = trigger ? SCENARIOS.filter((s) => s.trigger === trigger) : []
  const selectedMoment = trigger ? TRIGGERS.find((t) => t.value === trigger)!.moment : null

  function selectTrigger(t: TriggerCategory) {
    setTrigger(t)
    const options = SCENARIOS.filter((s) => s.trigger === t)
    setScenario(options.length === 1 ? options[0].value : null)
    setStep(2)
  }

  const mutation = useMutation({
    mutationFn: () => groundsApi.create({ label, scenario: scenario!, moment: selectedMoment! }),
    onSuccess: (ground) => {
      qc.invalidateQueries({ queryKey: ['grounds'] })
      toast.success('Ground opened')
      navigate(`/grounds/${ground.id}`)
    },
  })

  const canSubmit = label.trim() && scenario && !mutation.isPending

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gw-bg)', display: 'flex', flexDirection: 'column' }}>
      <div className="gw-hdr">
        <div className="gw-logo">Groundwork</div>
        <button className="gw-back" onClick={() => step === 1 ? navigate('/') : setStep(1)}>← Back</button>
      </div>

      <div className="gw-bd" style={{ maxWidth: 520, margin: '0 auto', width: '100%', paddingTop: 24 }}>

        {step === 1 && (
          <>
            <div className="gw-ttl">Open a ground</div>
            <div className="gw-sub-t">What is bringing you here?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              {TRIGGERS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => selectTrigger(t.value)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
                    border: '1px solid #E2E0DB', background: 'white',
                    textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1.2, paddingTop: 1, color: '#0C447C', fontWeight: 700, minWidth: 20 }}>
                    {t.symbol}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1916' }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 2 }}>{t.purpose}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && trigger && (
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
            <div className="gw-ttl">{TRIGGERS.find((t) => t.value === trigger)!.label}</div>

            {scenariosForTrigger.length > 1 && (
              <div className="gw-fld">
                <label className="gw-label">Which situation are you in?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {scenariosForTrigger.map((s) => (
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
            )}

            {scenariosForTrigger.length === 1 && (
              <div className="gw-sub-t" style={{ marginTop: 4 }}>{scenariosForTrigger[0].desc}</div>
            )}

            <div className="gw-fld" style={{ marginTop: scenariosForTrigger.length === 1 ? 20 : undefined }}>
              <label className="gw-label">Name the ground</label>
              <input
                className="gw-input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={labelPlaceholder(trigger)}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="gw-btn-sec" style={{ flex: 0 }} onClick={() => setStep(1)}>← Back</button>
              <button type="submit" className="gw-btn" style={{ flex: 1 }} disabled={!canSubmit}>
                {mutation.isPending ? 'Opening…' : 'Open ground →'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}
