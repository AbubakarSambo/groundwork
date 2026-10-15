import { useState } from 'react'
import {
  Page, PageTitle, CheckInHeader, Tabs, Section, Panel, EdgeRow, EdgeList,
  PeopleTable, PeopleTableHead, PersonRow, Avatar, FieldRows, FieldRow, Folded,
  Choices, ChoiceCards, Toggle, SwitchRow, FieldLabel, TextField, TextArea, Select,
  Button, Tag, Note, Empty, Toast, Modal,
} from '@/components/gw/ui'

/**
 * THE SHARED PARTS' SAMPLE PAGE (design-audit.md section 4, step 1).
 *
 * Every part from `components/gw/ui`, in every state, so a picture check at 1440px can be held
 * against docs/prototype/screens/A1-look-and-layout/design-system.jpg (route #/system in the
 * prototype). Development only - see the route guard in App.tsx (`import.meta.env.DEV`). Never
 * reachable in a built, production app.
 */
export default function PartsSamplePage() {
  const [tab, setTab] = useState('board')
  const [choice, setChoice] = useState('all')
  const [role, setRole] = useState('member')
  const [on, setOn] = useState(true)
  const [off, setOff] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [showToast, setShowToast] = useState(true)

  return (
    <Page>
      <PageTitle
        eyebrow="Baridi Appliances"
        crumbs={[{ label: 'Dev', to: '/dev/parts' }, { label: 'Parts' }]}
        title="The shared parts"
        subtitle="Every part in components/gw/ui, in every state, for a picture check against the prototype's own design-system screen."
        avatarInitials="BA"
        action={<Button>Primary action</Button>}
      />

      <Section heading="Buttons" note="prototype: .btn">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button kind="primary">Start your check-in</Button>
          <Button kind="secondary">Read it</Button>
          <Button kind="quiet">Not now</Button>
          <Button kind="secondary" redText>End this check-in</Button>
          <Button kind="danger">Remove</Button>
          <Button kind="primary" size="big">Answer today's check-in now</Button>
          <Button kind="secondary" size="small">Copy</Button>
          <Button kind="primary" disabled>Disabled</Button>
        </div>
      </Section>

      <Section heading="Tags" note="prototype: .tag">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Tag tone="proven">Proven</Tag>
          <Tag tone="attention">Waiting for an admin</Tag>
          <Tag tone="action">Owner</Tag>
          <Tag tone="concern">The email bounced</Tag>
          <Tag tone="plain">Plain</Tag>
        </div>
      </Section>

      <Section heading="Tabs" note="prototype: .tabs, only the chosen tab underlined">
        <Tabs
          label="Sample tabs"
          active={tab}
          items={[
            { key: 'board', label: 'Board' },
            { key: 'checkin', label: 'Check-in' },
            { key: 'context', label: 'Context and resources' },
            { key: 'mywork', label: 'My work' },
            { key: 'people', label: 'People and setup' },
          ]}
          onChange={setTab}
        />
      </Section>

      <Section heading="Check-in header" note="PageTitle + Tabs, 18px below">
        <Panel>
          <CheckInHeader
            crumbs={[{ label: 'Check-ins', to: '/dev/parts' }, { label: 'Sales team, Q3' }]}
            title="Sales team, Q3"
            subtitle="Daily on weekdays, from 4pm. Session 38 of 65. Runs until 30 September."
            active="board"
            tabHref={key => `/dev/parts#${key}`}
          />
        </Panel>
      </Section>

      <Section heading="What needs you" note="prototype: .list, .item">
        <EdgeList label="What needs you">
          {/*
            THE STANDARD BUTTON, NOT A SMALL ONE. The prototype's "what needs you" row (#/system,
            and the Today screen) uses the ordinary 44px, 16px bold button - the same one every
            other primary action on the page uses - never the 36px `small` size, which is for a
            button living inside an already-compact panel (a table row's "Copy", "Change").
          */}
          <EdgeRow
            kind="ready"
            title="Today's report is ready"
            detail="3 deals moved stage. Kito Foods is cooling."
            actions={<Button kind="secondary">Read it</Button>}
          />
          <EdgeRow
            kind="decide"
            title="Decide whether a price range counts as a budget"
            detail="Brian and Miriam both raised it. It changes 4 deals."
            actions={<Button kind="primary">Decide</Button>}
          />
          <EdgeRow
            kind="look"
            title="Samuel has chased the same 5 leads for 3 check-ins"
            detail="Talk to them before Friday."
            actions={<Button kind="secondary">Open</Button>}
          />
          <EdgeRow
            kind="concern"
            title="The email bounced"
            detail="Fix the address so the invitation can be sent again."
            actions={<Button kind="danger">Fix the address</Button>}
          />
        </EdgeList>
      </Section>

      <Section heading="People table" note="prototype: .panel + .row, the people screen's own column widths">
        <PeopleTable>
          <PeopleTableHead extraColumns="160px" labels={['Person', 'Role']} />
          <PersonRow
            extraColumns="160px"
            person={{ initials: 'MW', name: 'Miriam Wanjiku', level: 'Sales rep, reports to Wairimu Kamau', email: 'miriam@baridi.co.ke' }}
          >
            <Tag tone="action">Owner</Tag>
          </PersonRow>
          <PersonRow
            extraColumns="160px"
            person={{ initials: 'PK', name: 'Peter Kamau', level: 'Sales rep', email: 'peter@example.com' }}
            help={{ tone: 'look', text: 'Peter is from outside Baridi, so Grace Achieng, your admin, has to let him in.', action: <Button kind="secondary" size="small">Remind Grace</Button> }}
          >
            <Tag tone="attention">Waiting for an admin</Tag>
          </PersonRow>
        </PeopleTable>
      </Section>

      <Section heading="Avatars" note="prototype: .av">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Avatar initials="MW" size={34} />
          <Avatar initials="BA" size={56} />
        </div>
      </Section>

      <Section heading="Field rows" note="a label and value row">
        <Panel pad={false}>
          <FieldRows>
            <FieldRow label="Level" value="Sales rep" action={<Button kind="quiet" size="small">Change</Button>} />
            <FieldRow label="How often" value="Daily on weekdays, from 4pm" action={<Button kind="quiet" size="small">Change</Button>} />
          </FieldRows>
        </Panel>
      </Section>

      <Section heading="Folded panel" note="People: &quot;Who reports to whom&quot;">
        <Folded summary="Who reports to whom" note="Level and reporting lines describe the organisation. What someone can do still comes from their role.">
          <p className="gwui-panel-text">Amani Njoroge, Chief executive</p>
        </Folded>
      </Section>

      <Section heading="Switch row" note="People item 15: the heading reads bigger than its sentence">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SwitchRow
            title="Anyone with an @baridi.co.ke email"
            detail="They can join Baridi Appliances without an invitation, as “Takes part”. You can change their role after."
            on={on}
            onChange={setOn}
          />
          <SwitchRow
            title="Check-ins wait for an admin"
            detail="Each new check-in waits for an admin before invitations go out."
            on={off}
            onChange={setOff}
          />
        </div>
      </Section>

      <Section heading="Choices" note="prototype: .seg">
        <Choices
          label="Who can open a check-in"
          value={choice}
          onChange={setChoice}
          options={[
            { key: 'all', label: 'Everyone' },
            { key: 'admins', label: 'Admins only' },
            { key: 'owner', label: 'Just me' },
          ]}
        />
        <div style={{ height: 14 }} />
        <Choices
          label="Stacked choices"
          stacked
          value={choice}
          onChange={setChoice}
          options={[
            { key: 'all', label: 'Everyone', description: 'Anyone signed in to Baridi Appliances.' },
            { key: 'admins', label: 'Admins only', description: 'Only people with an admin role.' },
          ]}
        />
      </Section>

      <Section heading="Choice cards" note="the role on one person's page">
        <ChoiceCards
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { key: 'member', title: 'Member', description: 'Takes part in check-ins.' },
            { key: 'admin', title: 'Admin', description: 'Can invite people and change settings.' },
            { key: 'guest', title: 'Guest', description: 'From outside the organisation.' },
          ]}
        />
      </Section>

      <Section heading="Toggle" note="a switch, green when on">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Toggle label="Reminders on" on={on} onChange={setOn} />
          <Toggle label="Reminders off" on={off} onChange={setOff} />
        </div>
      </Section>

      <Section heading="Form fields" note="prototype: label.f, .input">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420 }}>
          <FieldLabel htmlFor="sample-text">Full name
            <TextField id="sample-text" placeholder="Miriam Wanjiku" />
          </FieldLabel>
          <FieldLabel htmlFor="sample-area">Note
            <TextArea id="sample-area" placeholder="Say what happened" />
          </FieldLabel>
          <FieldLabel htmlFor="sample-select">Role
            <Select id="sample-select" defaultValue="member">
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </FieldLabel>
        </div>
      </Section>

      <Section heading="Note and empty" note="a plain sentence, or a locked door">
        <Note>A quiet note under a heading, 13.5px.</Note>
        <div style={{ height: 10 }} />
        <Empty>None</Empty>
        <div style={{ height: 14 }} />
        <Empty title="You cannot change this" action={<Button kind="secondary">Talk to your admin</Button>}>
          Only an admin at Baridi can change this. Grace Achieng is your admin.
        </Empty>
      </Section>

      <Section heading="Toast and modal" note="prototype: .toast, .modal">
        <div style={{ display: 'flex', gap: 10 }}>
          <Button kind="secondary" onClick={() => setShowToast(true)}>Show the toast</Button>
          <Button kind="secondary" onClick={() => setShowModal(true)}>Open the modal</Button>
        </div>
        {showToast && (
          <div style={{ position: 'relative', marginTop: 14 }}>
            <Toast>Saved.</Toast>
          </div>
        )}
        {showModal && (
          <Modal title="Remove Peter Kamau?" onClose={() => setShowModal(false)}>
            <p className="gwui-empty-panel-title" style={{ margin: 0 }}>Remove Peter Kamau?</p>
            <p style={{ margin: 0, fontSize: 16, color: 'var(--gw-sub)' }}>He will no longer be part of this check-in.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button kind="quiet" onClick={() => setShowModal(false)}>Don't remove him</Button>
              <Button kind="danger" onClick={() => setShowModal(false)}>Remove</Button>
            </div>
          </Modal>
        )}
      </Section>
    </Page>
  )
}
