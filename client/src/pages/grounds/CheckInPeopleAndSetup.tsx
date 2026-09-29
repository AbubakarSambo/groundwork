import { useState } from 'react'
import {
  Section, Panel, FieldRows, FieldRow, SwitchRow, Choices, TextField, Select, FieldLabel,
  Button, Note, Callout,
} from '@/components/gw/ui'
import { WhoIsInThis } from '@/components/gw/WhoIsInThis'
import { WhosInItRoster } from '@/components/gw/WhosInItRoster'
import { RolesInThisCheckIn } from '@/components/gw/RolesInThisCheckIn'
import { MyParticipation } from '@/components/gw/MyParticipation'
import { BaselinePanel } from '@/components/gw/BaselinePanel'
import { StartingPointPanel } from '@/components/gw/StartingPointPanel'
import { WhichDaysTheyWork } from '@/components/gw/WhichDaysTheyWork'
import type { GroundCadence } from '@/api/grounds'
import { SELECTABLE_CADENCES, sessionsFor, cadenceLabel } from '@/lib/cadence'
import { SCENARIO_KEYS, SCENARIO_LABELS } from '@/lib/scenario-catalog'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * "PEOPLE AND SETUP" (the lead's check-in tab), rebuilt from `components/gw/ui`.
 *
 * docs/prototype/screens/A4-people-roles-and-access/check-in-people-and-setup.txt is the target:
 * Who's in it -> Roles in this check-in -> How it runs -> Who sees what -> When someone is blocked
 * -> Ending it -> Who else can see it. `GroundAdminPage.tsx` keeps every hook, query and mutation
 * (`tab === 'settings'`, moved here); this file only reads and writes through the props it is given.
 *
 * NOTHING FROM THE OLD TAB IS DROPPED. Every fold the old tab had that is not in the prototype here
 * is kept, placed next to the prototype section it is closest to, so it reads as an addition rather
 * than a hidden extra: "You in this check-in" (a lead's own sessions - `My work` already covers this
 * for a party, but nothing here duplicates it wrongly, so it stays until Hafsah says to drop it),
 * "What it is" (name and scenario), "What good looks like" (the yardstick and the starting point),
 * and "What has changed here" (the settings change log, folded under the sentence it belongs to).
 *
 * WHERE THE PROTOTYPE WOULD BE UNTRUE, THE PRODUCT'S OWN SENTENCE IS KEPT:
 * - "Ending it": no route closes a check-in. The heading stays; the body is the product's real
 *   "archiving is done by hand for now" plus the working "ask us to archive" mail link, and the
 *   real "delete it if it was only a test" control, which the prototype does not have and is not
 *   removed just because the prototype does not.
 * - "Who else can see it": no one-by-one access grant exists anywhere in the API. Left out rather
 *   than shown as a working control - see docs/requests-to-engine.md / the morning report.
 *
 * ACCESS ON SCREEN MATCHES THE SERVER, NOT THE OTHER WAY ROUND (checked against
 * api/src/modules/grounds/grounds.service.ts, 29 Sept): `canView` is the lead or an admin in this
 * organisation - the same gate `GroundAdminPage` already applies before this component ever mounts.
 * `canEdit` is per setting, read off the service method that actually enforces it:
 *   - lead only: reminders (`setChasing`), hiding email addresses (`setExternalVisibility`)
 *   - lead or an admin here: everything else that changes how this check-in runs - the timeframe,
 *     the name, who sees whom, targets, where people answer, and whether a blocker asks what was
 *     tried (`aSettingOnlyTheLeadMayChange` in the service covers all of these; `updateTimeline`
 *     and `setPeerVisibility`/`setPeopleWorkTogether` use the identical lead-or-admin check).
 * An admin who is not the lead sees every control an admin may use; a reader who is neither sees the
 * same information with no controls at all - the read-only view
 * (docs/prototype/screens/A4-people-roles-and-access/read-only-view.txt) shows this tab still on an
 * admin's own nav, with nothing to press.
 */
export function CheckInPeopleAndSetup(props: {
  ground: any
  user: any
  id: string
  navigate: (to: string) => void
  isInitiator: boolean
  isOrgAdmin: boolean
  viewerIsAParty: boolean
  mySessionsDone: number
  plannedSessions: number | null
  colleagues?: { id: string; name: string }[]
  addingMany: boolean
  addManyParticipants: (picked: { id: string; name: string }[]) => void
  newParticipantEmail: string; setNewParticipantEmail: (v: string) => void
  newParticipantNote: string; setNewParticipantNote: (v: string) => void
  newParticipantDepartment: string; setNewParticipantDepartment: (v: string) => void
  addParticipantMut: { mutate: () => void; isPending: boolean }
  queuedToAdd: { email: string; note: string }[]; setQueuedToAdd: (q: { email: string; note: string }[]) => void
  inviteTheQueue: { mutate: () => void; isPending: boolean }
  lastInvitedEmail: string | null
  whyItWaits: string | null
  lastInviteWaits: boolean
  billingStatus: any
  onShareCode: () => void
  whoIsInThisParties?: { name: string; done: boolean; isSelf: boolean }[]
  whoIsInThisPeersHidden?: boolean
  whoIsInThisNotOpenYet?: boolean
  whoIsInThisLeadName?: string | null
  /** Set when a "give it more time"/"out of time" banner above the tabs sent the reader here. */
  forceOpenTimeframe?: boolean
  fixingEmailId: string | null; setFixingEmailId: (id: string | null) => void
  fixingEmailValue: string; setFixingEmailValue: (v: string) => void
  fixEmail: { mutate: (v: { participantId: string; email: string }) => void; isPending: boolean }
  resendInvite: { mutate: (id: string) => void; isPending: boolean; variables?: string }
  updateRole: { mutate: (v: { participantId: string; role: string }) => void; isPending: boolean }
  settingsChangeCount: number
  startsAtDraft: string; setStartsAtDraft: (v: string) => void
  startsAtOnRecord: string
  canOfferStartDate: boolean
  timelineDaysDraft: number; setTimelineDaysDraft: (n: number) => void
  cadenceDraft: GroundCadence; setCadenceDraft: (c: GroundCadence) => void
  workingDaysDraft: number[]; setWorkingDaysDraft: (d: number[]) => void
  theTimeframeChanged: boolean
  saveSetup: { mutate: (v: any) => void; isPending: boolean }
  groundLabel: string; setGroundLabel: (v: string) => void
  groundScenario: string; setGroundScenario: (v: string) => void
  peersVisible: boolean; peersDefaultHidden: boolean; setPeerVisibility: { mutate: (v: boolean) => void; isPending: boolean }
  contactHidden: boolean; setContactVisibility: { mutate: (v: boolean) => void; isPending: boolean }
  numbersShared: boolean; setWhoSeesTargets: { mutate: (v: boolean) => void; isPending: boolean }
  whatsAppIsOn: boolean
  setOverWhatsApp: { mutate: (v: boolean | null) => void; isPending: boolean }
  expectsUnblocking: boolean; setExpectThemToUnblock: { mutate: (v: boolean) => void; isPending: boolean }
  setWorkTogether: { mutate: (v: boolean) => void; isPending: boolean }
  setChasing: { mutate: (v: { days?: number[]; stopped?: boolean; tellTheLead?: boolean }) => void; isPending: boolean }
  confirmDelete: boolean; setConfirmDelete: (v: boolean) => void
  deleteError: string | null; setDeleteError: (v: string | null) => void
  removeGround: { mutate: () => void; isPending: boolean }
}) {
  const {
    ground, user, navigate, isInitiator, isOrgAdmin, viewerIsAParty, mySessionsDone, plannedSessions,
  } = props
  const canEditRunOrAdmin = isInitiator || isOrgAdmin // aSettingOnlyTheLeadMayChange / updateTimeline / peer-visibility / people-work-together
  const canEditLeadOnly = isInitiator // setExternalVisibility / setChasing

  const [editingWhen, setEditingWhen] = useState(!!props.forceOpenTimeframe)
  const [editingReminders, setEditingReminders] = useState(false)
  const [editingWhere, setEditingWhere] = useState(false)
  const [remindDaysText, setRemindDaysText] = useState(((ground as any)?.chaseAfterDays ?? [1]).join(', '))

  return (
    <div>
      <Section
        heading="Who's in it"
        note={`${(ground.participants ?? []).length} people`}
      >
        <WhoIsInThis
          parties={props.whoIsInThisParties}
          peersHidden={props.whoIsInThisPeersHidden}
          notOpenYet={props.whoIsInThisNotOpenYet}
          viewerIsParty={viewerIsAParty}
          leadName={props.whoIsInThisLeadName}
          viewerIsTheLead={isInitiator}
        />
        <WhosInItRoster
          ground={ground}
          isInitiator={isInitiator}
          isOrgAdmin={isOrgAdmin}
          colleagues={props.colleagues}
          addingMany={props.addingMany}
          addManyParticipants={props.addManyParticipants}
          newParticipantEmail={props.newParticipantEmail} setNewParticipantEmail={props.setNewParticipantEmail}
          newParticipantNote={props.newParticipantNote} setNewParticipantNote={props.setNewParticipantNote}
          newParticipantDepartment={props.newParticipantDepartment} setNewParticipantDepartment={props.setNewParticipantDepartment}
          addParticipantMut={props.addParticipantMut}
          queuedToAdd={props.queuedToAdd} setQueuedToAdd={props.setQueuedToAdd}
          inviteTheQueue={props.inviteTheQueue}
          lastInvitedEmail={props.lastInvitedEmail} whyItWaits={props.whyItWaits} lastInviteWaits={props.lastInviteWaits}
          billingStatus={props.billingStatus}
          navigate={navigate}
          onShareCode={props.onShareCode}
          fixingEmailId={props.fixingEmailId} setFixingEmailId={props.setFixingEmailId}
          fixingEmailValue={props.fixingEmailValue} setFixingEmailValue={props.setFixingEmailValue}
          fixEmail={props.fixEmail}
          resendInvite={props.resendInvite}
        />
      </Section>

      <Section heading="Roles in this check-in" note="Who runs it, who checks in, and each person's role as described">
        <RolesInThisCheckIn ground={ground} isInitiator={isInitiator} viewerUserId={user?.id} updateRole={props.updateRole} />
      </Section>

      {/* NOT IN THE PROTOTYPE HERE. `My work` already shows a lead their own sessions; kept for now
          rather than dropped silently - see the morning report. */}
      {viewerIsAParty && (
        <Section heading="You in this check-in" note={`${mySessionsDone} of ${plannedSessions ?? '?'} sessions done`}>
          <MyParticipation
            viewer={user}
            ground={ground}
            myParticipant={(ground.participants ?? []).find((p: any) => p.userId === user?.id)}
            completedCount={mySessionsDone}
            totalSessions={plannedSessions ?? null}
          />
        </Section>
      )}

      {/* NOT IN THE PROTOTYPE HERE - kept as its own row; list for Hafsah. */}
      <Section heading="What it is" note="What it is called, and which situation it runs as">
        <FieldLabel htmlFor="ground-name">Name</FieldLabel>
        <TextField id="ground-name" value={props.groundLabel} onChange={(e) => props.setGroundLabel(e.target.value)} disabled={!canEditRunOrAdmin} />
        {canEditRunOrAdmin && (
          <Button
            size="small"
            disabled={!props.groundLabel.trim() || props.groundLabel === ground.label}
            onClick={() => props.saveSetup.mutate({ label: props.groundLabel.trim() })}
          >
            Save name
          </Button>
        )}
        <FieldLabel htmlFor="ground-scenario">Situation</FieldLabel>
        <Select id="ground-scenario" value={props.groundScenario} onChange={(e) => props.setGroundScenario(e.target.value)} disabled={!canEditRunOrAdmin}>
          {SCENARIO_KEYS.map((val) => <option key={val} value={val}>{SCENARIO_LABELS[val]}</option>)}
        </Select>
        {canEditRunOrAdmin && (
          <Button
            size="small"
            disabled={!props.groundScenario || props.groundScenario === ground.scenario}
            onClick={() => props.saveSetup.mutate({ scenario: props.groundScenario })}
          >
            Save situation
          </Button>
        )}
      </Section>

      <div id="how-long-this-runs" />
      <Section heading="How it runs">
        <FieldRows>
          <FieldRow
            label="How often"
            value={`${cadenceLabel(ground.cadence)}. ${sessionsFor(ground.timelineDays, ground.cadence) ?? '?'} session${(sessionsFor(ground.timelineDays, ground.cadence) ?? 0) === 1 ? '' : 's'} in total.`}
            action={canEditRunOrAdmin ? <Button kind="quiet" size="small" onClick={() => setEditingWhen((v) => !v)}>Change</Button> : undefined}
          />
          <FieldRow
            label="How long"
            value={props.startsAtOnRecord
              ? `Started ${whenItWas(props.startsAtOnRecord, 'dayAndMonthLong')}. Runs for ${ground.timelineDays ?? '?'} days.`
              : `Not started yet. Runs for ${ground.timelineDays ?? '?'} days once it starts.`}
          />
          {props.whatsAppIsOn && (ground as any)?.orgHasWhatsApp && (
            <FieldRow
              label="Where people answer"
              value={(ground as any).overWhatsApp === true ? 'On WhatsApp' : (ground as any).overWhatsApp === false ? 'In Groundwork' : 'Whatever this organisation does'}
              action={canEditRunOrAdmin ? <Button kind="quiet" size="small" onClick={() => setEditingWhere((v) => !v)}>Change</Button> : undefined}
            />
          )}
          <FieldRow
            label="Reminders"
            value={(ground as any)?.chasingStopped
              ? 'Off. Nobody is reminded.'
              : `At the usual time, to anyone who has not answered after ${(((ground as any)?.chaseAfterDays ?? [1]) as number[]).join(' or ')} day${(((ground as any)?.chaseAfterDays ?? [1]) as number[]).every((d: number) => d === 1) ? '' : 's'}.`}
            action={canEditLeadOnly ? <Button kind="quiet" size="small" onClick={() => setEditingReminders((v) => !v)}>Change</Button> : undefined}
          />
        </FieldRows>

        {editingWhen && canEditRunOrAdmin && (
          <Panel>
            {props.canOfferStartDate && (
              <>
                <FieldLabel htmlFor="starts-at">When it starts</FieldLabel>
                <TextField id="starts-at" type="date" value={props.startsAtDraft} onChange={(e) => props.setStartsAtDraft(e.target.value)} />
                <Note>
                  Session 1 opens on this day, and anybody you add before it is invited on it. Leave it
                  empty to open the check-in as soon as people are added.
                </Note>
                <Button
                  size="small"
                  disabled={props.startsAtDraft === props.startsAtOnRecord || props.saveSetup.isPending}
                  onClick={() => props.saveSetup.mutate({ startsAt: props.startsAtDraft || undefined })}
                >
                  Save start date
                </Button>
              </>
            )}
            <FieldLabel htmlFor="ends-on">Ends on</FieldLabel>
            <TextField
              id="ends-on"
              type="date"
              value={(() => {
                const from = props.startsAtOnRecord ? new Date(props.startsAtOnRecord) : new Date()
                const end = new Date(from.getTime() + props.timelineDaysDraft * 86_400_000)
                return Number.isFinite(end.getTime()) ? end.toISOString().slice(0, 10) : ''
              })()}
              onChange={(e) => {
                const from = props.startsAtOnRecord ? new Date(props.startsAtOnRecord) : new Date()
                const days = Math.round((new Date(e.target.value).getTime() - from.getTime()) / 86_400_000)
                if (Number.isFinite(days) && days >= 1) props.setTimelineDaysDraft(days)
              }}
            />
            <Select value={props.cadenceDraft} onChange={(e) => props.setCadenceDraft(e.target.value as GroundCadence)} aria-label="Session cadence">
              {SELECTABLE_CADENCES.map((c) => <option key={c.cadence} value={c.cadence}>{c.label}</option>)}
            </Select>
            {props.cadenceDraft !== 'ONE_TIME' && (
              <WhichDaysTheyWork value={props.workingDaysDraft} onChange={props.setWorkingDaysDraft} />
            )}
            <Note>
              {props.timelineDaysDraft} days, {sessionsFor(props.timelineDaysDraft, props.cadenceDraft) ?? 1} session{(sessionsFor(props.timelineDaysDraft, props.cadenceDraft) ?? 1) === 1 ? '' : 's'}.
              {' '}Sessions already completed are never removed. On the last one, everybody is asked
              how this should close, and it ends on the answer you agree.
            </Note>
            <Button
              size="small"
              disabled={!props.theTimeframeChanged || props.saveSetup.isPending}
              onClick={() => props.saveSetup.mutate({ timelineDays: props.timelineDaysDraft, cadence: props.cadenceDraft, workingDays: props.workingDaysDraft })}
            >
              Save timeframe
            </Button>
          </Panel>
        )}

        {editingWhere && canEditRunOrAdmin && props.whatsAppIsOn && (ground as any)?.orgHasWhatsApp && (
          <Panel>
            <Choices
              label="Where people answer this"
              value={(ground as any).overWhatsApp === true ? 'on' : (ground as any).overWhatsApp === false ? 'in' : 'whatever'}
              onChange={(key) => props.setOverWhatsApp.mutate(key === 'on' ? true : key === 'in' ? false : null)}
              stacked
              options={[
                { key: 'whatever', label: 'Whatever this organisation does', description: 'The default. People who have a number on their profile get it on WhatsApp; everybody else answers here.' },
                { key: 'on', label: 'On WhatsApp', description: 'The check-in, the reminders and the report go to their phone. They reply to the message and that reply is their answer.' },
                { key: 'in', label: 'In Groundwork', description: 'This one stays here even though your organisation has a number. For a conversation you would rather was not on somebody’s phone.' },
              ]}
            />
          </Panel>
        )}

        {editingReminders && canEditLeadOnly && (
          <Panel>
            <SwitchRow
              title="Remind people who have not answered"
              detail="Never more than one a day."
              on={!(ground as any)?.chasingStopped}
              onChange={(on) => props.setChasing.mutate({ stopped: !on })}
              disabled={props.setChasing.isPending}
            />
            <FieldLabel htmlFor="chase-days">Remind after how many days of no answer</FieldLabel>
            <TextField
              id="chase-days"
              value={remindDaysText}
              onChange={(e) => setRemindDaysText(e.target.value)}
              placeholder="1"
            />
            <Button
              size="small"
              disabled={props.setChasing.isPending}
              onClick={() => {
                const days = remindDaysText.split(',').map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => Number.isInteger(n) && n >= 1 && n <= 365)
                if (days.length) props.setChasing.mutate({ days })
              }}
            >
              Save reminder days
            </Button>
            <SwitchRow
              title="Tell me who never started"
              detail="A separate note to you when somebody has not opened it at all."
              on={!!(ground as any)?.tellTheLead}
              onChange={(on) => props.setChasing.mutate({ tellTheLead: on })}
              disabled={props.setChasing.isPending}
            />
          </Panel>
        )}
      </Section>

      {/* NOT IN THE PROTOTYPE HERE - kept as its own section; list for Hafsah. */}
      <Section heading="What good looks like" note="stated by the lead, read by everybody">
        <BaselinePanel groundId={props.id} canState={isInitiator} />
        <StartingPointPanel groundId={props.id} canRecord={isInitiator} />
      </Section>

      <Section heading="Who sees what">
        <SwitchRow
          title="Each other's check-ins"
          detail={props.peersVisible
            ? "Each person sees the others by name and whether they have checked in. Nobody ever sees what anybody wrote."
            : (ground as any)?.peersVisibleToEachOther == null
              ? `Not set, so this check-in uses the default for its kind: ${props.peersDefaultHidden ? 'hidden' : 'shown'}. Nobody sees another person's answers. Everyone sees the team's report once you share it.`
              : "Each person sees only themselves. Nobody sees another person's answers. Everyone sees the team's report once you share it."}
          on={props.peersVisible}
          onChange={(on) => props.setPeerVisibility.mutate(on)}
          disabled={!canEditRunOrAdmin || props.setPeerVisibility.isPending}
        />
        <SwitchRow
          title="Hide email addresses between participants"
          detail={props.contactHidden
            ? "Participants can't see each other's email addresses."
            : "Participants can see each other's email addresses. Turning this off lets participants contact each other directly."}
          on={props.contactHidden}
          onChange={(on) => props.setContactVisibility.mutate(on)}
          disabled={!canEditLeadOnly || props.setContactVisibility.isPending}
        />
        <SwitchRow
          title="Targets"
          detail={props.numbersShared ? "Each person sees their own share and the team's total." : 'Each person sees only their own number. You see all of them.'}
          on={props.numbersShared}
          onChange={(on) => props.setWhoSeesTargets.mutate(on)}
          disabled={!canEditRunOrAdmin || props.setWhoSeesTargets.isPending}
        />
        {/* NOT IN THE PROTOTYPE; kept - it decides whether people here can corroborate each other,
            which the board's fairness reads depend on. */}
        <SwitchRow
          title="Who can corroborate whom"
          detail="Whether these people see each other's work day to day. If they cannot, nobody here is in a position to confirm what anyone else said, and the board says so rather than reading somebody being quiet as work going missing."
          on={!!ground.peopleWorkTogether}
          onChange={(on) => props.setWorkTogether.mutate(on)}
          disabled={!canEditRunOrAdmin || props.setWorkTogether.isPending}
        />
        {/* THE TEAM'S REPORT SHARING IS NOT A SETTING HERE. Release happens from the report itself
            (Board/Context), so this row says the true, current state rather than offering a control
            this tab does not have. */}
        <FieldRow
          label="The team's report"
          value={ground.report?.releasedAt ? `Shared on ${whenItWas(ground.report.releasedAt, 'dayAndMonthLong')}.` : 'Not shared yet. Share it from the report when it is ready.'}
        />
        {props.settingsChangeCount > 0 && (
          <details className="gwui-folded">
            <summary className="gwui-folded-summary">
              <b>Anything you change here applies from the next check-in, and the change is noted with your name and the date.</b>
              <span className="gwui-folded-note">{props.settingsChangeCount === 1 ? '1 change since setup' : `${props.settingsChangeCount} changes since setup`}</span>
            </summary>
            <div className="gwui-folded-body">
              {[...((ground as any).settingsChanges ?? [])].reverse().map((c: any, i: number) => (
                <Note key={i}>
                  {c.weeks && `How long this runs: ${c.weeks.from ?? 'not set'} to ${c.weeks.to} weeks. `}
                  {c.cadence && `How often people check in: ${c.cadence.from ?? 'not set'} to ${c.cadence.to}. `}
                  Changed by the {c.by} on {whenItWas(c.changedAt, 'day')}.
                </Note>
              ))}
            </div>
          </details>
        )}
        {props.settingsChangeCount === 0 && (
          <Note>
            Anything you change here applies from the next check-in, and the change is noted with your
            name and the date.
          </Note>
        )}
      </Section>

      <Section heading="When someone is blocked">
        <SwitchRow
          title="What we ask them"
          detail={props.expectsUnblocking
            ? 'A blocker is recorded with what has already been done about it, and the person is offered ways through on their own report. Their lead sees the same thing as one thing to ask for.'
            : 'What is in their way is recorded, and nothing is asked about what they tried. For people with no standing to chase anybody, or a check-in that is there to hear what happened.'}
          on={props.expectsUnblocking}
          onChange={(on) => props.setExpectThemToUnblock.mutate(on)}
          disabled={!canEditRunOrAdmin || props.setExpectThemToUnblock.isPending}
        />
      </Section>

      {/* "ENDING IT": THE PROTOTYPE'S OWN SENTENCE WOULD BE FALSE. No route ends a check-in - see
          grounds.controller.ts. The product's true state is kept instead: archiving is done by hand
          for now, and the real "delete it if it was only a test" control, which is not in the
          prototype and is not dropped for that reason. */}
      <Section heading="Ending it" note="archiving is done by hand for now">
        <Callout>
          When it ends, nobody can add to it and everything stays as it is. Each person keeps their
          own history. This can't be undone.
        </Callout>
        <Note>
          Closing a check-in permanently archives it. Self-serve close is coming; until then we
          archive it by hand, usually the same day.
          {isOrgAdmin && !isInitiator && ' You are not the lead here, so closing it ends something somebody else is running.'}
        </Note>
        <a
          className="gwui-btn gwui-btn-danger"
          href={`mailto:hello@myground.work?subject=Archive check-in: ${encodeURIComponent(ground.label)}`}
        >
          Ask us to archive this check-in
        </a>

        {isInitiator && (
          <Panel>
            <Note>
              Delete it, if it was only a test. For the ones you started to see how this works. It goes
              completely - the conversation, the sessions and anything uploaded. If somebody else has
              already answered, this refuses and tells you: that is a record, not a test, and closing is
              the thing to do with it.
            </Note>
            {props.deleteError && <Note tone="error">{props.deleteError}</Note>}
            {props.confirmDelete ? (
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <span>Delete "{ground.label}" for good?</span>
                <Button kind="danger" dangerSolid disabled={props.removeGround.isPending} onClick={() => props.removeGround.mutate()}>
                  {props.removeGround.isPending ? 'Deleting…' : 'Yes, delete it'}
                </Button>
                <Button kind="secondary" onClick={() => { props.setConfirmDelete(false); props.setDeleteError(null) }}>Keep it</Button>
              </div>
            ) : (
              <Button kind="danger" onClick={() => { props.setDeleteError(null); props.setConfirmDelete(true) }}>Delete this check-in</Button>
            )}
          </Panel>
        )}
      </Section>

      {/* "WHO ELSE CAN SEE IT": LEFT OUT. No one-by-one access grant exists anywhere in the API - see
          docs/requests-to-engine.md. Only admins and the people on the roster above can read this
          check-in's board and reports, which is the product's true, current state. */}
    </div>
  )
}
