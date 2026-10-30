import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { Section, RowList, Row, Select } from '@/components/gw/ui'

/**
 * WHO LOOKS AFTER WHAT (polish round 1, 26 October 2026). Wanjiru could not make Njeri the finance person: the duties had an endpoint
 * (GET and PUT /suites/duties) and no screen, so spending approved by her had nobody to check it and mark it paid. An admin names who
 * looks after finance, HR, and who is the chief executive, here. The server refuses anybody else and anybody not in the organisation.
 */
type TheDuties = { organisation: { key: string; ask: string; holder: { id: string; name: string } | null }[]; people: { id: string; name: string }[]; said: string[] }

export function WhoLooksAfterWhat() {
  const qc = useQueryClient()
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN')
  const q = useQuery({ enabled: isAdmin, queryKey: ['suite-duties'], queryFn: async () => (await apiClient.get('/suites/duties', { skipForbiddenToast: true } as any)).data as TheDuties, retry: false })
  const set = useMutation({
    mutationFn: async (v: { key: string; id: string | null }) => (await apiClient.put('/suites/duties', { [v.key]: v.id })).data as TheDuties,
    onSuccess: (d) => { qc.setQueryData(['suite-duties'], d); toast.success('Saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'That didn’t save. Try again.'),
  })
  if (!isAdmin || !q.data) return null
  return (
    <Section heading="Who looks after what" note="Spending, leave and hours go to these people once they are approved.">
      <RowList label="Who looks after what">
        {q.data.organisation.map((d) => (
          <Row key={d.key} columns="minmax(0, 1fr) minmax(0, 240px)">
            <label htmlFor={`duty-${d.key}`}>{d.ask}</label>
            <Select id={`duty-${d.key}`} value={d.holder?.id ?? ''} disabled={set.isPending} onChange={(e) => set.mutate({ key: d.key, id: e.target.value || null })}>
              <option value="">Nobody yet</option>
              {q.data!.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </Row>
        ))}
      </RowList>
    </Section>
  )
}
