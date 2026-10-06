import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { fileARequestApi } from '@/api/suites'
import { useAuthStore } from '@/stores/auth'
import { whatFilingARequestSays } from '@/lib/file-a-request-error'
import { Page, PageTitle, Panel, FieldLabel, TextField, Select, Button, Note } from '@/components/gw/ui'

/**
 * REQUEST LEAVE, FROM ITS OWN FORM (request 165, Hafsah 6 October; docs/requests-to-engine.md;
 * docs/answers-from-engine.md, "request 165, the forms for leave and spending").
 *
 * Reached from the check-in's own "Request leave" button (anchor pieces 26/27,
 * `RequestOffer.tsx`'s `OpenTheRequest`), which carries what was read from the person's own words
 * in router state as `prefill: { startsOn?, endsOn? }`. With no prefill, every field starts empty.
 *
 * `GET /suites/leave/form` is open to anybody in the organisation who is not a guest, and answers
 * only the kinds of leave and who could stand in - never the rules themselves, which stay on
 * `/suites/leave/rules` for an admin or the HR duty holder. With the suite off, that read refuses
 * with the board's own off sentence, and this page shows it with no fields at all rather than a
 * form that could never be sent.
 *
 * On success `POST /suites/leave/requests` answers `{ id, says }`; the person goes to
 * "Your requests" (`/suite/mine`) and reads `says`. A refusal is read in the server's own words
 * (`whatFilingARequestSays`).
 */
export function LeaveRequestNewPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const prefill = (location.state as { prefill?: { startsOn?: string; endsOn?: string } | null } | null)?.prefill

  const [startsOn, setStartsOn] = useState(prefill?.startsOn ?? '')
  const [endsOn, setEndsOn] = useState(prefill?.endsOn ?? '')
  const [kind, setKind] = useState('')
  /* WHO COVERS, TYPED RATHER THAN PICKED FROM A HUNDRED NAMES (live walk at a hundred people, fault
     5): `GET /suites/leave/form`'s `standIns` carries no team to group by, so the field is a
     searchable choice instead - a text field that filters the list as it is typed, the same shared
     parts (`TextField` plus a native `<datalist>`) the finance page already uses for its budget
     line. What is actually sent is the matching person's id, never the typed text itself. */
  const [standInQuery, setStandInQuery] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const form = useQuery({ queryKey: ['leave-form'], queryFn: fileARequestApi.leaveForm, retry: false })
  /* With the suite off (or this reader refused for some other reason), the read fails and its own
     message is what the board already uses - read the same way a failed send is. */
  const offSentence = form.isError ? whatFilingARequestSays(form.error, user?.organizationName) : null
  const standInMatch = form.data?.standIns.find(p => p.name.trim().toLowerCase() === standInQuery.trim().toLowerCase())
  const standInUserId = standInMatch?.userId ?? ''

  const send = useMutation({
    mutationFn: () => fileARequestApi.leave({
      startsOn, endsOn,
      ...(kind ? { kind } : {}),
      ...(standInUserId ? { standInUserId } : {}),
    }),
    onSuccess: (res) => navigate('/suite/mine', { state: { sentMessage: res?.says ?? 'Your request for leave has been sent.' } }),
    onError: (e: unknown) => setProblem(whatFilingARequestSays(e, user?.organizationName)),
  })

  const canSend = !!startsOn && !!endsOn && !send.isPending && !offSentence

  return (
    <Page>
      <PageTitle
        crumbs={[{ label: 'Your requests', to: '/suite/mine' }, { label: 'Request leave' }]}
        title="Request leave"
        subtitle="Say when you will be away, and Groundwork will send it to the right person."
      />
      <Panel>
        {offSentence ? (
          <Note tone="error">{offSentence}</Note>
        ) : (
          <form className="gwui-suite-ask-alone" onSubmit={e => { e.preventDefault(); if (canSend) send.mutate() }}>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor="leave-starts">Start date</FieldLabel>
              <TextField id="leave-starts" type="date" value={startsOn} onChange={e => setStartsOn(e.target.value)} />
            </div>
            <div className="gwui-suite-q">
              <FieldLabel htmlFor="leave-ends">End date</FieldLabel>
              <TextField id="leave-ends" type="date" value={endsOn} onChange={e => setEndsOn(e.target.value)} />
            </div>
            {form.data?.kinds && form.data.kinds.length > 0 && (
              <div className="gwui-suite-q">
                <FieldLabel htmlFor="leave-kind">Kind of leave</FieldLabel>
                <Select id="leave-kind" value={kind} onChange={e => setKind(e.target.value)}>
                  <option value="">Not sure</option>
                  {form.data.kinds.map(k => <option key={k.key} value={k.key}>{k.name}</option>)}
                </Select>
              </div>
            )}
            {form.data?.standIns && form.data.standIns.length > 0 && (
              <div className="gwui-suite-q">
                <FieldLabel htmlFor="leave-stand-in">Who covers for you?</FieldLabel>
                <TextField
                  id="leave-stand-in" list="leave-stand-in-names" value={standInQuery}
                  placeholder="Nobody in particular" onChange={e => setStandInQuery(e.target.value)}
                />
                <datalist id="leave-stand-in-names">
                  {form.data.standIns.map(p => <option key={p.userId} value={p.name} />)}
                </datalist>
              </div>
            )}
            <div><Button type="submit" disabled={!canSend}>Send</Button></div>
            {problem && <Note tone="error">{problem}</Note>}
          </form>
        )}
      </Panel>
    </Page>
  )
}
