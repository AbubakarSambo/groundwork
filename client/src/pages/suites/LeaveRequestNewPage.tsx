import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { fileARequestApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whatFilingARequestSays } from '@/lib/file-a-request-error'
import { Page, PageTitle, Panel, FieldLabel, TextField, Select, Button, Note } from '@/components/gw/ui'

/**
 * REQUEST LEAVE, FROM ITS OWN FORM (request 165, Hafsah 6 October; docs/requests-to-engine.md).
 *
 * Reached from the check-in's own "Request leave" button (anchor pieces 26/27,
 * `RequestOffer.tsx`'s `OpenTheRequest`), which carries what was read from the person's own words
 * in router state as `prefill: { startsOn?, endsOn? }`. With no prefill, every field starts empty.
 *
 * `POST /suites/leave/requests` does not exist on the server yet (request 165), so sending this
 * today gets a 404, which is said plainly rather than as a raw server error - see
 * `whatFilingARequestSays`. On success, the person goes to "Your requests" (`/suite/mine`), told
 * it was sent in the server's own sentence where it sends one.
 *
 * The kind of leave is asked only when the organisation has named any - `GET /suites/leave/rules`
 * is for an admin or whoever holds the HR duty, so a plain member simply gets no kind field
 * (`fileARequestApi.kindsForFiling` reads that refusal and returns `null`).
 */
export function LeaveRequestNewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const prefill = (location.state as { prefill?: { startsOn?: string; endsOn?: string } | null } | null)?.prefill

  const [startsOn, setStartsOn] = useState(prefill?.startsOn ?? '')
  const [endsOn, setEndsOn] = useState(prefill?.endsOn ?? '')
  const [kind, setKind] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const kinds = useQuery({ queryKey: ['leave-kinds-for-filing'], queryFn: fileARequestApi.kindsForFiling })

  const send = useMutation({
    mutationFn: () => fileARequestApi.leave({ startsOn, endsOn, ...(kind ? { kind } : {}) }),
    onSuccess: (res) => navigate('/suite/mine', { state: { sentMessage: res?.message ?? 'Your request for leave has been sent.' } }),
    onError: (e: unknown) => setProblem(whatFilingARequestSays(e, user?.organizationName)),
  })

  const canSend = !!startsOn && !!endsOn && !send.isPending

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Your requests', to: '/suite/mine' }, { label: 'Request leave' }]}
        title="Request leave"
        subtitle="Say when you will be away, and Groundwork will send it to the right person."
      />
      <Panel>
        <form className="gwui-suite-ask" onSubmit={e => { e.preventDefault(); if (canSend) send.mutate() }}>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="leave-starts">Start date</FieldLabel>
            <TextField id="leave-starts" type="date" value={startsOn} onChange={e => setStartsOn(e.target.value)} />
          </div>
          <div className="gwui-suite-q">
            <FieldLabel htmlFor="leave-ends">End date</FieldLabel>
            <TextField id="leave-ends" type="date" value={endsOn} onChange={e => setEndsOn(e.target.value)} />
          </div>
          {kinds.data && kinds.data.length > 0 && (
            <div className="gwui-suite-q">
              <FieldLabel htmlFor="leave-kind">Kind of leave</FieldLabel>
              <Select id="leave-kind" value={kind} onChange={e => setKind(e.target.value)}>
                <option value="">Not sure</option>
                {kinds.data.map(k => <option key={k.key} value={k.key}>{k.name}</option>)}
              </Select>
            </div>
          )}
          <div><Button type="submit" disabled={!canSend}>Send</Button></div>
          {problem && <Note tone="error">{problem}</Note>}
        </form>
      </Panel>
    </Page>
  )
}
