import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api'
import type { GroundScenario, GroundMoment } from '@/types'
import { Button, Input, Label, Card, Select } from '@/components/ui'

const SCENARIOS: { value: GroundScenario; label: string; moment: GroundMoment }[] = [
  { value: 'NEW_HIRE', label: 'New hire', moment: 'STARTING' },
  { value: 'NEW_COFOUNDER', label: 'New cofounder', moment: 'STARTING' },
  { value: 'NEW_ADVISOR', label: 'New advisor / board member', moment: 'STARTING' },
  { value: 'NEW_PROJECT', label: 'New project', moment: 'STARTING' },
  { value: 'RECOGNITION', label: 'Recognition — raise, equity, promotion', moment: 'RECOGNITION' },
  { value: 'DRIFT', label: 'Something has drifted', moment: 'RESOLUTION' },
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
    <div className="min-h-screen bg-muted px-4 py-10">
      <Card className="max-w-lg mx-auto p-8">
        <h1 className="text-xl font-semibold mb-1">Open a ground</h1>
        <p className="text-muted-foreground mb-6">Start at the beginning — not just at the point of breakdown.</p>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
          className="space-y-4"
        >
          <div>
            <Label>What is this about?</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. New cofounder — Ada" required />
          </div>
          <div>
            <Label>Which situation are you in?</Label>
            <Select value={scenario} onChange={(e) => setScenario(e.target.value as GroundScenario)}>
              {SCENARIOS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Opening…' : 'Open ground'}</Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
