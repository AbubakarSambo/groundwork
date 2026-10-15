import { useState } from 'react'
import { TheLeadsNote } from '@/components/gw/TheLeadsNote'
import { PeopleTable, PeopleTableHead, PersonRow, Tag, Button, TextField, type TagTone } from '@/components/gw/ui'
import { personLabel as onePersonsLabel, atTheStart, hasARealName } from '@/lib/utils'
import { initialsOf } from '@/pages/org/people-here'

/**
 * "ROLES IN THIS CHECK-IN"
 * (docs/prototype/screens/A4-people-roles-and-access/check-in-people-and-setup.txt, "Who runs it,
 * who checks in, and each person's role as described").
 *
 * `roleAsDescribed` is real (`GroundParticipant.roleAsDescribed`) - it is what the lead typed when
 * adding somebody, already used elsewhere as "your note" from the lead. This is the first place it
 * is read back as its own column rather than a caption under a name.
 *
 * THE COLUMN IS THE LEAD'S TO READ, NOT EVERYONE'S (picture check, 29 Sept). Walked as Juma, an
 * admin who does not run this check-in: he saw "I sell fridges in Kilimani" beside Faraji's name.
 * `no-screen-names-a-person-by-the-leads-note.spec.ts`'s own comment says this field "is mostly the
 * lead's own private sentence about a person" - CLAUDE.md and docs/decisions.md rule 5 are the same
 * rule. So the whole column, and its Edit control, exist only for `isInitiator`. Everyone else sees
 * the person, "Runs it"/"Checks in", and the status - no column, no gap where it was (the row is two
 * tracks wide instead of three, not three with an empty middle). A person's own role stays editable
 * on their own row elsewhere (MyParticipation) - this table no longer offers a second way to do it.
 */
export function RolesInThisCheckIn({
  ground, isInitiator, updateRole,
}: {
  ground: any
  isInitiator: boolean
  updateRole: { mutate: (v: { participantId: string; role: string }) => void; isPending: boolean }
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const participants: any[] = ground.participants ?? []
  const leadRow = participants.find((p) => p.userId === ground.initiatorId)

  /* B-077: the same rule WhosInItRoster.tsx already uses - in an anchor check-in, a lead who only
     manages never checks in, so her own row never reads "Checking in". */
  const leavesOutTheManager = ground.scenario === 'HELP_TEAM_UNDERSTAND'
  const isManagingOnly = (p: any) => leavesOutTheManager && p.managingOnly === true

  const statusFor = (p: any): { text: string; tone: TagTone } => {
    if (isManagingOnly(p)) return { text: 'Runs it', tone: 'plain' }
    if (!p.userId && p.inviteDeliveryStatus === 'BOUNCED') return { text: 'The email bounced', tone: 'concern' }
    if (p.awaitingSeat) return { text: 'Waiting for a seat', tone: 'attention' }
    /* SOMEBODY AN ADMIN HAS DECLINED IS NOT "WAITING" (U.4 re-review, item 2a). `p.notLetIn` is the
       same field the roster (WhosInItRoster.tsx) already reads; without this check, this table kept
       saying "Waiting for an admin" about somebody an admin had already said no to, which is untrue
       once a decision has been made. */
    if (p.notLetIn) return { text: 'Not let in', tone: 'concern' }
    if (p.userId && p.user?.awaitingOrgApproval) return { text: 'Waiting for an admin', tone: 'attention' }
    if (!p.userId) return { text: 'Not joined yet', tone: 'plain' }
    return { text: 'Checking in', tone: 'proven' }
  }

  const rows = leadRow ? [leadRow, ...participants.filter((p) => p !== leadRow)] : participants

  const extraColumns = isInitiator ? '110px minmax(180px, 1fr) 150px' : '110px 150px'
  const headLabels = isInitiator
    ? ['Person', 'In this check-in', 'Their role, as described', 'Status']
    : ['Person', 'In this check-in', 'Status']

  return (
    <div>
      <PeopleTable>
        <PeopleTableHead extraColumns={extraColumns} labels={headLabels} />
        {rows.map((p: any) => {
          const isLead = p.userId === ground.initiatorId
          const status = statusFor(p)
          /* NEVER A NAME GUESSED OUT OF THE ADDRESS (U.4 re-review, item 4): with no real name on
             record, this shows the plain address (visible here only to whoever the server already
             lets see it), never "Zawadi U8" out of "zawadi.u8@example.test". See WhosInItRoster.tsx. */
          /* The same naming as the roster above: an address this reader may see, or, with neither a
             name nor an address, "Somebody invited by email" rather than a made-up "A colleague". */
          const name = !hasARealName(p) ? (p.email || 'Somebody invited by email') : atTheStart(onePersonsLabel(p))
          return (
            <PersonRow
              key={p.id}
              extraColumns={extraColumns}
              person={{ initials: initialsOf(name), name, email: p.email }}
            >
              {/* "Runs it" is a blue tag in the prototype (check-in-people-and-setup.jpg); "Checks
                  in" is not called out the same way, so it stays the plain tag. */}
              <Tag tone={isLead ? 'action' : 'plain'}>{isLead ? 'Runs it' : 'Checks in'}</Tag>
              {isInitiator && (
                editingId === p.id ? (
                  <span style={{ display: 'inline-flex' }}>
                    <TextField
                      autoFocus
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { updateRole.mutate({ participantId: p.id, role: value }); setEditingId(null) }
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                    />
                    <Button size="small" onClick={() => { updateRole.mutate({ participantId: p.id, role: value }); setEditingId(null) }}>Save</Button>
                  </span>
                ) : (
                  <span>
                    {p.roleAsDescribed ? <TheLeadsNote role={p.roleAsDescribed} /> : 'Nobody has described it yet.'}
                    {/* B-108: no space between the sentence and "Edit" ran the two together as
                        "yet.Edit" - JSX drops the line break between them, so a space is written
                        in explicitly, the same way other rows on this page already join text and
                        a button. */}
                    {' '}
                    <Button kind="quiet" size="small" onClick={() => { setEditingId(p.id); setValue(p.roleAsDescribed ?? '') }}>
                      Edit
                    </Button>
                  </span>
                )
              )}
              <Tag tone={status.tone}>{status.text}</Tag>
            </PersonRow>
          )
        })}
      </PeopleTable>
      {isInitiator && (
        <p className="gwui-note">
          "Role, as described" is what the check-in uses to shape each person's questions. Their role
          in your organisation is set in People.
        </p>
      )}
    </div>
  )
}
