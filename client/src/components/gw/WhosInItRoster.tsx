import { useState } from 'react'
import { PeopleTable, PersonRow, Tag, Button } from '@/components/gw/ui'
import { PeoplePicker } from '@/components/gw/PeoplePicker'
import { ShareSection } from '@/pages/grounds/ShareSection'
import { looksLikeAnAddress } from '@/components/gw/an-address-that-can-receive-mail'
import { personLabel as onePersonsLabel, atTheStart } from '@/lib/utils'
import { waitsForItsStart } from '@/lib/the-leads-note'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * "WHO'S IN IT" (docs/prototype/screens/A4-people-roles-and-access/check-in-people-and-setup.txt).
 *
 * Carries over, unchanged in meaning, every old "Who is in it" fold on the Setup tab
 * (GroundAdminPage.tsx, ~2543-2748: the seat warning, the approval note, the add-person queue, the
 * access code and share link) plus a roster row per person - name, when they joined, a status tag,
 * and for anyone who needs something before they can start, one sentence and one button underneath.
 *
 * THE SESSION-BY-SESSION GRID STAYS ON SESSIONS. That grid (one cell per session, GW's own roster on
 * the Sessions tab) answers "where has each person got to on THIS run" and belongs there; this
 * roster answers "who is on it, and can they get in" - delivery and access, not progress. Duplicating
 * the grid here would be a second, driftable copy of the same fact.
 *
 * "REMIND GRACE" DOES NOT EXIST. The only remind-an-admin route (`POST /users/me/waiting/remind`) is
 * for the waiting person to nudge their OWN admin - there is no route for a lead to do it on someone
 * else's behalf. So the tinted strip under somebody waiting on an admin says the true thing and its
 * button goes to the real place a lead can act (the People page), rather than a "Remind Grace" that
 * would call nothing.
 */
export function WhosInItRoster({
  ground, isInitiator, isOrgAdmin, colleagues, addingMany, addManyParticipants,
  newParticipantEmail, setNewParticipantEmail, newParticipantNote, setNewParticipantNote,
  newParticipantDepartment, setNewParticipantDepartment, addParticipantMut,
  queuedToAdd, setQueuedToAdd, inviteTheQueue, lastInvitedEmail, whyItWaits, lastInviteWaits,
  billingStatus, navigate, onShareCode, fixingEmailId, setFixingEmailId, fixingEmailValue,
  setFixingEmailValue, fixEmail, resendInvite,
}: {
  ground: any
  isInitiator: boolean
  isOrgAdmin: boolean
  colleagues?: { id: string; name: string }[]
  addingMany: boolean
  addManyParticipants: (picked: { id: string; name: string }[]) => void
  newParticipantEmail: string
  setNewParticipantEmail: (v: string) => void
  newParticipantNote: string
  setNewParticipantNote: (v: string) => void
  newParticipantDepartment: string
  setNewParticipantDepartment: (v: string) => void
  addParticipantMut: { mutate: () => void; isPending: boolean }
  queuedToAdd: { email: string; note: string }[]
  setQueuedToAdd: (q: { email: string; note: string }[]) => void
  inviteTheQueue: { mutate: () => void; isPending: boolean }
  lastInvitedEmail: string | null
  whyItWaits: string | null
  lastInviteWaits: boolean
  billingStatus: any
  navigate: (to: string) => void
  onShareCode: () => void
  fixingEmailId: string | null
  setFixingEmailId: (id: string | null) => void
  fixingEmailValue: string
  setFixingEmailValue: (v: string) => void
  fixEmail: { mutate: (v: { participantId: string; email: string }) => void; isPending: boolean }
  resendInvite: { mutate: (id: string) => void; isPending: boolean; variables?: string }
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [showLink, setShowLink] = useState(false)
  const participants: any[] = ground.participants ?? []
  const checkingIn = participants.filter((p) => p.userId && p.inviteDeliveryStatus !== 'BOUNCED' && !p.awaitingSeat && !p.user?.awaitingOrgApproval).length
  const needSomething = participants.length - checkingIn

  const seats = billingStatus?.people
  const seatsFull = seats?.cap != null && seats?.count != null && seats.count >= seats.cap

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {isInitiator && ground.joinToken && (
          <Button kind="quiet" onClick={() => setShowLink((v) => !v)}>Copy an invite link</Button>
        )}
        {isInitiator && <Button kind="quiet" onClick={() => setShowAdd((v) => !v)}>Add people</Button>}
      </div>

      {isInitiator && showLink && ground.joinToken && (
        <div className="gwui-panel gwui-panel-pad">
          <ShareSection joinToken={ground.joinToken} />
        </div>
      )}

      {isInitiator && showAdd && (
        <div className="gwui-panel gwui-panel-pad">
          <p className="gwui-switch-row-title">Add a person to this check-in</p>
          {seatsFull && (
            <div className="gwui-note gwui-note-error" role="alert">
              Your plan covers {seats.cap} people, including you, and all {seats.cap} are taken. Move to a
              larger plan to add more.{' '}
              <button
                onClick={() => navigate('/billing')}
                className="gwui-btn gwui-btn-quiet"
                style={{ display: 'inline' }}
              >
                View plans
              </button>
            </div>
          )}
          <p className="gwui-note">
            They give their own version of the same work. You cannot see what they write until the
            report releases.
          </p>
          <p className="gwui-note">
            {isOrgAdmin
              ? "You are an admin here, so adding somebody is the approval - there is no queue. Anybody from outside your organisation gets a login here and appears on your People page, where you can take them off again."
              : "Somebody from outside your organisation is invited straight away, and an admin here has to let them in before they can check in. They are told the same thing, and you can see it beside their name below."}
          </p>
          <PeoplePicker
            people={colleagues ?? []}
            alreadyIn={participants.map((m) => m.userId ?? '').filter(Boolean)}
            adding={addingMany}
            onAdd={(picked) => addManyParticipants(picked)}
          />
          <input
            type="email" placeholder="name@company.com" aria-label="Their email address"
            value={newParticipantEmail} onChange={(e) => setNewParticipantEmail(e.target.value)}
            className="gwui-input"
          />
          <input
            type="text" placeholder="What do you want them to cover? (optional)" aria-label="What they are accountable for"
            value={newParticipantNote} onChange={(e) => setNewParticipantNote(e.target.value)}
            className="gwui-input"
          />
          <input
            type="text" placeholder="Their department (optional)" aria-label="Their department"
            value={newParticipantDepartment} onChange={(e) => setNewParticipantDepartment(e.target.value)}
            className="gwui-input"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            <Button
              onClick={() => addParticipantMut.mutate()}
              disabled={!looksLikeAnAddress(newParticipantEmail) || addParticipantMut.isPending}
            >
              {addParticipantMut.isPending ? 'Inviting…' : 'Send invite'}
            </Button>
            <Button
              kind="secondary"
              onClick={() => {
                const email = newParticipantEmail.trim().toLowerCase()
                if (!looksLikeAnAddress(email)) return
                if (queuedToAdd.some((q) => q.email === email)) return
                setQueuedToAdd([...queuedToAdd, { email, note: newParticipantNote.trim() }])
                setNewParticipantEmail('')
                setNewParticipantNote('')
              }}
              disabled={!looksLikeAnAddress(newParticipantEmail)}
            >
              + Add another
            </Button>
          </div>

          {queuedToAdd.length > 0 && (
            <div className="gwui-panel">
              {queuedToAdd.map((q) => (
                <div key={q.email} className="gwui-field-row">
                  <div className="gwui-field-row-value">
                    {q.email}
                    <div className="gwui-switch-row-detail">
                      {q.note || 'No note - they will be asked the general questions for this situation.'}
                    </div>
                  </div>
                  <button
                    onClick={() => setQueuedToAdd(queuedToAdd.filter((x) => x.email !== q.email))}
                    aria-label={`Remove ${q.email}`}
                    className="gwui-btn gwui-btn-quiet gwui-btn-small"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <Button onClick={() => inviteTheQueue.mutate()} disabled={inviteTheQueue.isPending}>
                {inviteTheQueue.isPending
                  ? 'Inviting…'
                  : `Invite ${queuedToAdd.length} ${queuedToAdd.length === 1 ? 'person' : 'people'}`}
              </Button>
            </div>
          )}
          {lastInvitedEmail && (
            <p className="gwui-note">
              {whyItWaits
                ? `${lastInvitedEmail} is on the check-in. ${whyItWaits}`
                : lastInviteWaits
                  ? `${lastInvitedEmail} is on the check-in. Their invitation goes out on the start date.`
                  : `Invite sent to ${lastInvitedEmail}`}
            </p>
          )}
          <Button kind="quiet" onClick={onShareCode}>Or share an access code instead</Button>
        </div>
      )}

      <PeopleTable>
        {participants.map((p: any) => {
          const name = onePersonsLabel(p) ?? p.email
          const bounced = !p.userId && p.inviteDeliveryStatus === 'BOUNCED'
          const waitingForSeat = !!p.awaitingSeat
          const waitingForAdmin = !!p.userId && !!p.user?.awaitingOrgApproval
          const when = p.userId
            ? (p.invitedAt ? `Joined ${whenItWas(p.invitedAt, 'dayAndMonthLong')}` : 'Checking in')
            : (p.invitedAt ? `Invited ${whenItWas(p.invitedAt, 'dayAndMonthLong')}` : 'Invited')

          let statusText = 'Checking in'
          if (bounced) statusText = 'The email bounced'
          else if (waitingForSeat) statusText = 'Waiting for a seat'
          else if (waitingForAdmin) statusText = 'Waiting for an admin'
          else if (!p.userId) statusText = waitsForItsStart(p) ? 'Invited' : 'Not joined yet'

          let help: { tone: 'look' | 'concern'; text: string; action?: React.ReactNode } | undefined
          if (bounced) {
            help = fixingEmailId === p.id
              ? {
                  tone: 'concern',
                  text: 'Type the corrected address and resend.',
                  action: (
                    <span style={{ display: 'inline-flex' }}>
                      <input
                        autoFocus
                        type="email"
                        value={fixingEmailValue}
                        onChange={(e) => setFixingEmailValue(e.target.value)}
                        placeholder="corrected@email.com"
                        className="gwui-input"
                      />
                      <Button
                        size="small"
                        disabled={fixEmail.isPending || !looksLikeAnAddress(fixingEmailValue)}
                        onClick={() => fixEmail.mutate({ participantId: p.id, email: fixingEmailValue })}
                      >
                        {fixEmail.isPending ? 'Resending…' : 'Resend invite'}
                      </Button>
                    </span>
                  ),
                }
              : {
                  tone: 'concern',
                  text: `${atTheStart(name)}'s invite email never arrived.`,
                  action: isInitiator
                    ? <Button size="small" kind="secondary" onClick={() => { setFixingEmailId(p.id); setFixingEmailValue(p.email) }}>Fix the address</Button>
                    : undefined,
                }
          } else if (waitingForSeat) {
            help = {
              tone: 'look',
              text: 'Your plan has no seat for them yet - an admin has to make room before their invitation goes out.',
              action: <Button size="small" kind="secondary" onClick={() => navigate('/org/members')}>View plans</Button>,
            }
          } else if (waitingForAdmin) {
            help = {
              tone: 'look',
              text: `${atTheStart(name)} is from outside your organisation, so an admin has to let them in before they can check in.`,
              action: <Button size="small" kind="secondary" onClick={() => navigate('/org/members')}>Go to People</Button>,
            }
          } else if (!p.userId && isInitiator) {
            help = {
              tone: 'look',
              text: waitsForItsStart(p) ? 'Their invitation goes out on the morning the check-in starts.' : 'They have not joined yet.',
              action: !waitsForItsStart(p)
                ? <Button size="small" kind="secondary" disabled={resendInvite.isPending} onClick={() => resendInvite.mutate(p.id)}>
                    {resendInvite.isPending && resendInvite.variables === p.id ? 'Sending…' : 'Resend invite'}
                  </Button>
                : undefined,
            }
          }

          return (
            <PersonRow
              key={p.id}
              extraColumns="1fr 140px"
              person={{ initials: (p.email || '?').charAt(0).toUpperCase(), name, email: p.userId ? p.email : undefined, level: when }}
              help={help}
            >
              <span />
              <Tag tone="plain">{statusText}</Tag>
            </PersonRow>
          )
        })}
      </PeopleTable>
      <p className="gwui-note">
        {participants.length} {participants.length === 1 ? 'person' : 'people'}.
        {' '}{checkingIn} checking in{needSomething > 0 ? `; ${needSomething} need${needSomething === 1 ? 's' : ''} something before they can start.` : '.'}
      </p>
    </div>
  )
}
