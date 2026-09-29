import { useState } from 'react'
import { PeopleTable, PersonRow, Tag, Button, TextField } from '@/components/gw/ui'
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
 * Editable by the lead for anyone, or by a participant for themselves - the same rule the old roster
 * used ("What someone is answerable for is the lead's to set, or their own").
 */
export function RolesInThisCheckIn({
  ground, isInitiator, viewerUserId, updateRole,
}: {
  ground: any
  isInitiator: boolean
  viewerUserId?: string
  updateRole: { mutate: (v: { participantId: string; role: string }) => void; isPending: boolean }
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [value, setValue] = useState('')
  const participants: any[] = ground.participants ?? []
  const leadRow = participants.find((p) => p.userId === ground.initiatorId)

  const statusFor = (p: any) => {
    if (!p.userId && p.inviteDeliveryStatus === 'BOUNCED') return 'The email bounced'
    if (p.awaitingSeat) return 'Waiting for a seat'
    if (p.userId && p.user?.awaitingOrgApproval) return 'Waiting for an admin'
    if (!p.userId) return 'Not joined yet'
    return 'Checking in'
  }

  const rows = leadRow ? [leadRow, ...participants.filter((p) => p !== leadRow)] : participants

  return (
    <div>
      <PeopleTable>
        {rows.map((p: any) => {
          const isLead = p.userId === ground.initiatorId
          const canEdit = isInitiator || p.userId === viewerUserId
          return (
            <PersonRow
              key={p.id}
              extraColumns="110px minmax(180px, 1fr) 150px"
              person={{ initials: (p.email || '?').charAt(0).toUpperCase(), name: onePersonsLabel(p) ?? p.email, email: p.email }}
            >
              <Tag tone="plain">{isLead ? 'Runs it' : 'Checks in'}</Tag>
              {editingId === p.id ? (
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
                  {canEdit && (
                    <Button kind="quiet" size="small" onClick={() => { setEditingId(p.id); setValue(p.roleAsDescribed ?? '') }}>
                      Edit
                    </Button>
                  )}
                </span>
              )}
              <Tag tone="plain">{statusFor(p)}</Tag>
            </PersonRow>
          )
        })}
      </PeopleTable>
      <p className="gwui-note">
        "Role, as described" is what the check-in uses to shape each person's questions. Their role
        in your organisation is set in People.
      </p>
    </div>
  )
}
