import { isTheDirectMorningOn } from '@/lib/the-direct-morning'
import { useQuery } from '@tanstack/react-query'
import { groundsApi, type PeopleAndSetup } from '@/api/grounds'
import { Panel, FieldRows, FieldRow, Text, Note, Stack } from '@/components/gw/ui'
import { statusSentence, sessionsCompletedSentence } from '@/components/gw/MyParticipation'
import { whatThisStatusMeans } from '@/components/gw/what-a-status-means-to-the-person-in-it'

/**
 * A TEAM MEMBER'S PEOPLE AND SETUP (Release 1B, pull request 1 of 3; people-and-setup-sales-member.txt and
 * people-and-setup-new-hire-member.txt). A short page with no settings: one sentence on how it runs, then Your role, Your
 * status, Your sessions, Runs it, and one line on who can see what.
 *
 * EVERYTHING HERE IS WHAT THE SERVER SERVES A MEMBER, AND THE SERVER SERVES A MEMBER NOTHING ELSE (api
 * grounds/people-and-setup.ts): no other person's details, no lead-only setting, nothing for an admin. Drawn only where the
 * organisation's Release 1B switch is on; off, GroundParticipantPage draws today's tab exactly as it was.
 */
type Member = Extract<PeopleAndSetup, { view: 'member' }>
type Reader = Extract<PeopleAndSetup, { view: 'reader' }>

export function YourPeopleAndSetup({ groundId }: { groundId: string }) {
  const { data, isError } = useQuery({ queryKey: ['people-and-setup', groundId], queryFn: () => groundsApi.peopleAndSetup(groundId), enabled: !!groundId, retry: false })
  if (isError) return <Note>That didn’t load. Try again.</Note>
  if (!data || !data.on) return null
  if (data.view === 'reader') {
    const r = data as Reader
    return (
      <Panel>
        <Stack gap={10}>
          <Text size="18" as="p">{r.howItRuns}</Text>
          {r.runsIt && <FieldRows><FieldRow label="Runs it" value={r.runsIt} /></FieldRows>}
        </Stack>
      </Panel>
    )
  }
  if (data.view !== 'member') return null
  const m = data as Member
  return (
    <Panel>
      <Stack gap={10}>
        <Text size="18" as="p">{m.howItRuns}</Text>
        <FieldRows>
          <FieldRow label="Your role" value={m.yourRole} />
          <FieldRow label="Your status" value={statusSentence(whatThisStatusMeans(m.status as any))} />
          <FieldRow label="Your sessions" value={sessionsCompletedSentence(m.yourSessionsDone, m.sessionsPlanned)} />
          {m.runsIt && <FieldRow label="Runs it" value={m.runsIt} />}
        </FieldRows>
        {/* The direct morning: no note about who sees what. Who sees what is the backend's rule, the same either way. */}
        {!isTheDirectMorningOn(data) && <Note>{m.whoSeesWhat}</Note>}
      </Stack>
    </Panel>
  )
}
