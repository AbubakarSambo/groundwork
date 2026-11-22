import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { useAuthStore } from '@/stores/auth'
import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { type OrgMember, fetchMembers, nameOf, firstNameOf, initialsOf, statusWord, A_FAILURE, whatRemovingSays } from './people-here'
import { useSaveTheirNumber } from './their-number'
import { AskFirst, RemoveFromTheOrganisation } from './ask-first-in-the-page'
import { Page, PageTitle, Section, Panel, Stack, FieldRows, FieldRow, ChoiceCards, Tag, Button, TextField, Select, Note, Skeleton } from '@/components/gw/ui'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'
import { WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS } from '@/lib/what-an-admin-cannot-read-without-access'
import { APersonsDetails } from './APersonsDetails'
import { ATeamPicker } from './ATeamPicker'

/**
 * ONE PERSON, AS AN ADMIN READS THEM (U.4, A4 one-person.txt, #/settings/people/miriam).
 *
 * Where they sit, their role here, their team, their status and seat, their WhatsApp number when
 * WhatsApp is on, their check-ins here, what an admin can see, and removing them from the
 * organisation.
 *
 * "Across check-ins" (D3, U.16) says only how many check-ins they are in, which is all an admin
 * reads of someone's load: what is asked of them is on their own You page, served to them alone. It
 * stops before "they choose who else sees it", because nothing lets anybody share it yet.
 *
 * "What an admin can see" stops after "You don't see anyone's private notes.": the prototype's next
 * clause, "and what someone writes in their own check-in stays theirs", is untrue here - rule 5 in
 * decisions.md has an admin reading every board and report, including what people said in them.
 *
 * The role note stops at "Changes apply straight away.": nothing records or shows who made a change,
 * so "and are noted with your name" would also be untrue.
 *
 * Left out, each for a reason: "Region" (no such field exists) and "Free this seat" (only a
 * plan-wide release exists - POST /users/waiting/seats/release - nothing frees one person's seat).
 *
 * REBUILT FROM THE SHARED PARTS (design-audit.md section 3, "One person (the admin's view)",
 * items 1 to 11; components/gw/ui only, no inline styles for size, colour or spacing).
 *
 * GUEST IS OFFERED (item 6, all four roles). Reading users.service.ts's `update()`: `UpdateUserDto`
 * validates `role` against the full `Role` enum, which includes GUEST; `mayChange` only ever blocks
 * a change to the account that holds the organisation, never a particular target role; and `setRole`
 * writes whatever it is given to both `User.role` and the membership row with no check that it is
 * one of the three `RoleWrite` values its own type promises. So `PATCH /users/:id { role: 'GUEST' }`
 * on an existing member is accepted today - unlike inviting somebody new as a guest, which
 * `aRoleToInviteAs` refuses on purpose. This reads as a gap nobody decided on rather than a choice,
 * and is worth Hafsah's eyes; until she says otherwise, this page follows what the server actually
 * does.
 */
type RoleWrite = 'ADMIN' | 'LEAD' | 'MEMBER' | 'GUEST'
const ROLE_CHOICES: { value: RoleWrite; title: string; says: string }[] = [
  { value: 'ADMIN', title: 'Admin', says: 'Manages people and billing, and can read every check-in.' },
  { value: 'LEAD', title: 'Can open check-ins', says: 'Can start check-ins and run them. Takes part in others.' },
  { value: 'MEMBER', title: 'Takes part', says: 'Answers the check-ins they’re invited to.' },
  /* Not "from another organisation" any more: an admin can let somebody into this one as a guest (Hafsah, 21 November 2026). */
  { value: 'GUEST', title: 'Guest', says: 'Sees only the check-ins they’re added to, and nothing else here.' },
]

/** A label/value row that becomes a small form when "Change" is pressed (Level, Reports to, WhatsApp). */
function EditableField({ label, value, empty, onSave, choices, saving, inputLabel }: {
  label: string
  value: string
  empty: string
  onSave: (v: string) => void
  choices?: { value: string; label: string }[]
  saving?: boolean
  /** The field's own accessible name, when it differs from the row label - e.g. "WhatsApp number for Miriam". */
  inputLabel?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const shown = choices ? choices.find((c) => c.value === value)?.label ?? '' : value

  if (editing) {
    return (
      <FieldRow
        label={label}
        value={choices ? (
          <Select aria-label={inputLabel ?? label} value={draft} onChange={(e) => setDraft(e.target.value)}>
            <option value="">{empty}</option>
            {choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        ) : (
          <TextField aria-label={inputLabel ?? label} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={120} />
        )}
        action={(
          <span className="gwui-edge-acts">
            <Button kind="quiet" size="small" disabled={saving} aria-label={`Save ${label.toLowerCase()}`} onClick={() => { onSave(draft); setEditing(false) }}>Save</Button>
            <Button kind="quiet" size="small" onClick={() => setEditing(false)}>Cancel</Button>
          </span>
        )}
      />
    )
  }
  return (
    <FieldRow
      label={label}
      value={shown || empty}
      action={<Button kind="quiet" size="small" aria-label={`Change ${label.toLowerCase()}`} onClick={() => { setDraft(value); setEditing(true) }}>Change</Button>}
    />
  )
}

export function OnePersonPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const whatsappOn = useWhatsAppIsOn()
  const orgName = user?.organization?.name ?? user?.organizationName ?? 'your organisation'
  const { data, isLoading, isError } = useQuery({ queryKey: ['org-members'], queryFn: fetchMembers })
  const owner = useQuery({
    queryKey: ['org-owner'],
    queryFn: () => apiClient.get('/users/organization/owner').then((r) => r.data.data ?? r.data),
    retry: false,
  })
  const ownerId: string | null = owner.data?.ownerUserId ?? null
  const [team, setTeam] = useState<string | null>(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['org-members'] })
  const sit = useMutation({
    mutationFn: (change: { level?: string; team?: string; reportsToUserId?: string }) => apiClient.patch(`/users/${id}/where-they-sit`, change),
    onSuccess: () => { refresh(); toast.success('Saved.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })
  const role = useMutation({
    mutationFn: ({ what }: { what: RoleWrite; first: string }) => apiClient.patch(`/users/${id}`, { role: what }),
    /* By name (U.4 review): "Amina’s role has changed." */
    onSuccess: (_r, v) => { refresh(); toast.success(`${v.first}’s role has changed.`) },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })
  const phone = useSaveTheirNumber(id ?? '')
  const handOver = useMutation({
    mutationFn: () => apiClient.patch('/users/organization/owner', { userId: id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-owner'] }); toast.success('Handed over. They now own this organisation.') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? A_FAILURE),
  })
  /* What is being asked first, in the page (ask-first-in-the-page.tsx): the browser's own confirm box is swallowed by the app's pane. */
  const [asking, setAsking] = useState<null | 'admin' | 'handOver' | 'remove'>(null)

  if (isError) {
    return (
      <Page>
        <Note>That didn’t load. Reload the page.</Note>
      </Page>
    )
  }
  if (isLoading) {
    return (
      <Page>
        <Skeleton what="Getting this person" shape="lines" />
      </Page>
    )
  }
  const everybody = data?.data ?? []
  const m: OrgMember | undefined = everybody.find((p) => p.id === id)
  if (!m) {
    return (
      <Page>
        <Note>{`This person is not in ${orgName}.`}</Note>
        <Button kind="quiet" to="/org/members">People</Button>
      </Page>
    )
  }

  const name = nameOf(m)
  const first = firstNameOf(m)
  const isOwner = !!ownerId && m.id === ownerId
  const isMe = m.id === user?.id
  const managers = everybody.filter((p) => p.id !== m.id && p.role !== 'GUEST').map((p) => ({ value: p.id, label: nameOf(p) }))
  const checkIns = m.checkIns ?? []
  const status = statusWord(m)

  return (
    <Page>
      <PageTitle eyebrow={orgName} title="People" />
      <PageTitle
        crumbs={[{ label: 'People', to: '/org/members' }, { label: name }]}
        title={name}
        avatarInitials={initialsOf(name)}
        subtitle={name !== m.email ? m.email : undefined}
      />

      <Section heading="Where they sit" foot={`This describes the organisation. What ${first} can do still comes only from their role and their access to each check-in.`}>
        <FieldRows flush>
          <EditableField label="Level" value={m.level ?? ''} empty="Not set" saving={sit.isPending} onSave={(v) => sit.mutate({ level: v })} />
          <EditableField label="Reports to" value={m.reportsTo?.id ?? ''} empty="Nobody" choices={managers} saving={sit.isPending} onSave={(v) => sit.mutate({ reportsToUserId: v })} />
        </FieldRows>
      </Section>

      {/* No Section heading here (one-proto-0.png): the title is a bold line inside the panel itself, with the sentence under it. */}
      <Panel>
        <Stack gap={10}>
          <p className="gwui-panel-text"><b>Across check-ins</b></p>
          <p className="gwui-panel-text-muted">{`${checkIns.length === 1 ? '1 check-in' : `${checkIns.length} check-ins`}. What’s asked of them is on their own You page.`}</p>
        </Stack>
      </Panel>

      <Section heading={`Role at ${orgName}`} note="Changes apply straight away.">
        {isOwner && <Note>{isMe ? 'You own this organisation, so your role cannot be changed here.' : `${first} owns this organisation, so their role cannot be changed here.`}</Note>}
        <ChoiceCards
          label={`Role at ${orgName}`}
          value={m.role}
          disabled={isOwner || isMe || role.isPending}
          onChange={(next) => {
            /*
             * B-169: MAKING SOMEBODY AN ADMIN ASKS FIRST. Every other role here changes what one
             * person can do; this one changes who else can be made an admin, see every member's
             * organisation-wide data, and change anyone else's role in turn - the one choice this
             * page cannot undo by picking something else, the way the deep page audit's own click
             * test found out by accident (B-169's write-up: a single press changed a real role on
             * this computer's database, with nothing asking first). The other three roles still
             * apply the moment they are chosen, as "Changes apply straight away" still promises.
             */
            if (next === 'ADMIN') {
              setAsking('admin')
              return
            }
            role.mutate({ what: next as RoleWrite, first })
          }}
          options={ROLE_CHOICES.map((c) => ({ key: c.value, title: c.title, description: c.says }))}
        />
        {ownerId === user?.id && !isMe && m.role === 'ADMIN' && (
          <Button
            kind="quiet"
            onClick={() => setAsking('handOver')}
          >Hand over</Button>
        )}
      </Section>

      <Section heading="Team" note="Used to add whole teams to a check-in">
        <Panel>
          <div className="gwui-invite-actions">
            <ATeamPicker value={team ?? m.team ?? ''} onChange={setTeam} />
            <Button kind="secondary" disabled={team === null || sit.isPending} onClick={() => { sit.mutate({ team: team ?? '' }); setTeam(null) }}>Save</Button>
          </div>
        </Panel>
      </Section>

      <Section heading="Status">
        <FieldRows flush>
          <FieldRow label="Now" value={status === 'Checking in' ? <Tag tone="proven">Checking in</Tag> : status} />
          {/* A guest with an account takes a seat too (U.4 re-review); one held for a seat does not yet. */}
          {!m.awaitingOrgApproval && <FieldRow label="Seat" value={m.heldForASeat ? 'No seat on your plan' : 'Holds a seat'} />}
          {/* Their phone number is always here to add or change, whether WhatsApp is on or off (Hafsah, 30 October 2026). Only what
              is said about WhatsApp, the line below, waits until it is on (her rule of 26 September). */}
          <EditableField
            label="Phone number"
            inputLabel={`Phone number for ${first}`}
            value={m.phoneNumber ?? ''}
            empty="Not set"
            saving={phone.isPending}
            onSave={(v) => phone.mutate(v)}
          />
          {/* Where they are on WhatsApp, from the record (pilots on WhatsApp, 14 October). Saving an empty number removes it. */}
          {whatsappOn && m.whatsappSays && <FieldRow label="On WhatsApp" value={m.whatsappSays} />}
          {m.whatsappCheckInSays && <FieldRow label="Checking in on WhatsApp" value={m.whatsappCheckInSays} />}
        </FieldRows>
        {/* WHO DECIDED, AND WHEN (U.4 review, item 2). "Not let in" on its own says what happened but
            not why the reader cannot just let them in from here - this says who decided, and when. */}
        {m.notLetIn && (
          <Note>
            {m.notLetInAt
              ? `${m.notLetInBy ?? 'An admin'} did not let ${first} in, on ${whenItWas(m.notLetInAt, 'dayAndMonthLong')}. ${first} cannot check in.`
              : `${m.notLetInBy ?? 'An admin'} did not let ${first} in, so ${first} cannot check in.`}
          </Note>
        )}
        {m.arrivedThroughACheckIn && <Note>They came in by accepting an invitation to a check-in.</Note>}
      </Section>

      <Section heading="Check-ins" note={checkIns.length === 1 ? '1 check-in' : `${checkIns.length} check-ins`}>
        {checkIns.length === 0 ? (
          <Note>{`${first} is not on a check-in here yet.`}</Note>
        ) : (
          <FieldRows flush>
            {checkIns.map((c) => (
              <FieldRow
                key={c.id}
                label={c.label ?? 'A check-in with no name yet'}
                value={c.runsIt ? 'Runs it' : 'Checks in'}
                action={<Button kind="quiet" size="small" aria-label={`Open ${c.label ?? 'this check-in'}`} onClick={() => navigate(`/grounds/${c.id}`)}>Open</Button>}
              />
            ))}
          </FieldRows>
        )}
      </Section>

      {id && <APersonsDetails userId={id} own={isMe} />}
      <Section heading="What an admin can see">
        <Panel>
          {/*
            FAULT 5, 6 Oct 2026: "CHANGE ITS SETUP" WAS NEVER TRUE. Only the lead changes a
            check-in's setup (the 1 October decision; `mayChangeSetup`, served on every check-in,
            is the server's own answer). This also left out the one real limit on an admin's
            reach: decision 5 and `who-may-read-this-check-in.ts` close a performance plan, a
            promotion, a renewal or somebody's first 90 days unless the admin is given access.
          */}
          <p className="gwui-panel-text-muted">{`As an admin you can read every check-in at ${orgName}, and ask us to end it. ${WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS[0].toUpperCase()}${WHAT_AN_ADMIN_CANNOT_READ_WITHOUT_ACCESS.slice(1)} stays closed to you unless you are given access to it. You don’t see anyone’s private notes.`}</p>
        </Panel>
      </Section>

      {!isMe && !isOwner && (
        <Section heading={`Remove from ${orgName}`}>
          <Panel>
            <div className="gwui-sentence-row">
              <p className="gwui-panel-text-muted">{whatRemovingSays(name, orgName, m.alsoIn).detail}</p>
              <Button
                kind="secondary"
                onClick={() => setAsking('remove')}
              >Remove</Button>
            </div>
          </Panel>
        </Section>
      )}
      {asking === 'admin' && (
        <AskFirst
          title={`Make ${name} an admin`}
          question={`Make ${name} an admin of ${orgName}?`}
          detail="An admin can see everyone's check-ins, change anyone's role, and manage billing."
          yes="Make an admin" working="Changing…" pending={role.isPending}
          onYes={() => role.mutate({ what: 'ADMIN' as RoleWrite, first }, { onSettled: () => setAsking(null) })}
          onClose={() => setAsking(null)}
        />
      )}
      {asking === 'handOver' && (
        <AskFirst
          title="Hand over the organisation"
          question={`Hand this organisation to ${name}?`}
          detail="They become the person who cannot be removed by other admins, and you stop being that person. You stay an admin."
          yes="Hand over" working="Handing over…" pending={handOver.isPending}
          onYes={() => handOver.mutate(undefined, { onSettled: () => setAsking(null) })}
          onClose={() => setAsking(null)}
        />
      )}
      {asking === 'remove' && (
        <RemoveFromTheOrganisation id={id ?? m.id} name={name} orgName={orgName} alsoIn={m.alsoIn} onClose={() => setAsking(null)} onRemoved={() => navigate('/org/members')} />
      )}
    </Page>
  )
}
