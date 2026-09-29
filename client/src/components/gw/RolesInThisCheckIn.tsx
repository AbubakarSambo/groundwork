import { useState } from 'react'
import { PeopleTable, PersonRow, Tag, Button, TextField, type TagTone } from '@/components/gw/ui'
import { personLabel as onePersonsLabel } from '@/lib/utils'
import { theLeadsNote } from '@/lib/the-leads-note'

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

  const statusFor = (p: any): { text: string; tone: TagTone } => {
    if (!p.userId && p.inviteDeliveryStatus === 'BOUNCED') return { text: 'The email bounced', tone: 'concern' }
    if (p.awaitingSeat) return { text: 'Waiting for a seat', tone: 'attention' }
    if (p.userId && p.user?.awaitingOrgApproval) return { text: 'Waiting for an admin', tone: 'attention' }
    if (!p.userId) return { text: 'Not joined yet', tone: 'plain' }
    return { text: 'Checking in', tone: 'proven' }
  }

  const rows = leadRow ? [leadRow, ...participants.filter((p) => p !== leadRow)] : participants

  return (
    <div>
      <PeopleTable>
        {rows.map((p: any) => {
          const isLead = p.userId === ground.initiatorId
          const status = statusFor(p)
          return (
            <PersonRow
              key={p.id}
              extraColumns={isInitiator ? '110px minmax(180px, 1fr) 150px' : '110px 150px'}
              person={{ initials: (p.email || '?').charAt(0).toUpperCase(), name: onePersonsLabel(p) ?? p.email, email: p.email }}
            >
              <Tag tone="plain">{isLead ? 'Runs it' : 'Checks in'}</Tag>
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
                    {p.roleAsDescribed ? theLeadsNote(p.roleAsDescribed) : 'Not said'}
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
