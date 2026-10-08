import { useWhatsAppIsOn } from '@/lib/whatsapp-is-on'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { billingApi, isWhatsAppBillingAdmin } from '@/api/billing'
import { myDataApi, type MyData } from '@/api/my-data'
import { todaysPasswordRules } from '@/pages/auth/password-rules'
import {
  Page, PageTitle, Section, Panel, Stack, FieldRows, FieldRow, SwitchRow, Steps, Step,
  Button, TextField, FieldLabel, SubHeading,
} from '@/components/gw/ui'

/**
 * SETTINGS (A4, #/settings, group 1 of the screens rebuilt from the shared parts). Wording copied
 * from docs/prototype/screens/A4-people-roles-and-access/own-settings.txt.
 *
 * REBUILT FROM THE SHARED PARTS: `Page`/`PageTitle` for the frame, `Section`/`Panel` for each block,
 * `FieldRows`/`FieldRow` for "Your name", "Email" and "WhatsApp", `SwitchRow` for "What we send
 * you", `Steps`/`Step` for the password checklist, and the standard `Button`/`TextField`/`Note`.
 *
 * FieldRows SIT FLAT ON THE PAGE, NOT IN A PANEL (Hafsah, 30 September, the setting row):
 * `srow` (docs/prototype/source/s5.js) draws each row at the page's own left edge, under the
 * section heading, with no white box around it - `Organisation` and `You` no longer wrap their
 * `FieldRows` in a `Panel`.
 *
 * "CHANGE PASSWORD" IS THIS SCREEN'S ONE PRIMARY BUTTON (Hafsah, 30 September, own-settings.jpg):
 * the prototype draws it as the one navy button on this page ("one primary button per screen" is
 * about the screen having ONE, not zero) - every other "Change"/"Save" here stays a small quiet
 * button (`setShell`'s `srow(...)`, `"btn quiet sm"` throughout own-settings.txt).
 *
 * PRIMARY-BUTTONS-NEVER-TOGETHER: `ChangePassword`'s two `kind="primary"` buttons - the closed
 * state's "Change password" and the open form's own "Change password" submit - belong to a single
 * `if (!open)` branch each, so only one of the two is ever on screen at once; the other is the
 * form's "Cancel" (quiet), never a second primary button beside it.
 *
 * PASSWORD, AS THE PRODUCT ACTUALLY WORKS (a gap against the prototype, kept honest rather than
 * hidden): the prototype's form asks for the current password, then a new one twice. Nothing signs
 * a person in with a password they type here to prove who they are - most people never set one, and
 * sign in with Google or an email link instead, which is why that sentence stays on this page. What
 * the server actually offers (`POST /auth/request-password-setup` then `POST /auth/set-password`,
 * both there since the sign-up flow was built, and never called from anywhere until now) proves who
 * you are by your signed-in session, not by a current password, so there is no "current password"
 * field here. The requirement checklist is the prototype's own four rules, read from the same file
 * the server checks (password-rules.ts), minus "both passwords match" which only applies once you
 * have typed the second box.
 *
 * "WHAT WE SEND YOU": the product holds one email preference today, `emailNotifications`, covering
 * check-in invites and reminders together. The prototype's other two rows - "Reports ready" and "A
 * short list each morning, only on days something does" - have no setting behind them anywhere in
 * the product, so they are left off rather than shown as switches that do nothing (not-to-build.md).
 * Both are requests to make, not screen work; see the morning report.
 *
 * "ORGANISATION", FOR AN ADMIN, KEPT FROM TODAY'S PRODUCT: the prototype's own-settings.txt does not
 * draw this, but it is real, working functionality (renaming the organisation) with nowhere else in
 * the product to reach it - CLAUDE.md: nothing valuable is lost. It stays here, admin only, exactly
 * as it worked before this page was rebuilt.
 */

function ChangePassword({ email }: { email?: string | null }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const setAuth = useAuthStore(s => s.setAuth)
  /*
   * "You can also sign in with Google" is only true where this deployment has Google configured
   * (authApi.methods, the same gate AuthPage and GoogleFailedPage use). Saying it when Google is
   * off would promise a button that does not exist anywhere else in the product.
   */
  const { data: methods } = useQuery({
    queryKey: ['auth-methods'],
    queryFn: authApi.methods,
    staleTime: 10 * 60 * 1000,
    retry: false,
  })

  const change = useMutation({
    mutationFn: async () => {
      const { token } = await authApi.requestPasswordSetup()
      return authApi.setPassword(token, password)
    },
    onSuccess: (r) => {
      setAuth(r.user, r.accessToken)
      setPassword('')
      setConfirm('')
      setOpen(false)
      toast.success('Your password is changed.')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Your password did not change. Try again.'),
  })

  const rules = todaysPasswordRules(password, confirm, email)
  const met = rules.every(r => r.met)

  return (
    <Section heading="Password" note={methods?.google ? 'You can also sign in with Google or an email link' : 'You can also sign in with an email link'}>
      <Panel>
        {!open ? (
          <Button kind="primary" onClick={() => setOpen(true)}>Change password</Button>
        ) : (
          <Stack gap={12}>
            <div>
              <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
              <TextField id="settings-new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div>
              <FieldLabel htmlFor="settings-confirm-password">Type it again</FieldLabel>
              <TextField id="settings-confirm-password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <Steps>
              {rules.map(r => <Step key={r.text} done={r.met}>{r.text}</Step>)}
            </Steps>
            <div className="gwui-invite-actions">
              <Button kind="primary" onClick={() => change.mutate()} disabled={!met || change.isPending}>
                {change.isPending ? 'Saving…' : 'Change password'}
              </Button>
              <Button kind="quiet" onClick={() => { setOpen(false); setPassword(''); setConfirm('') }}>Cancel</Button>
            </div>
          </Stack>
        )}
      </Panel>
    </Section>
  )
}

export function SettingsPage() {
  const whatsappOn = useWhatsAppIsOn()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const logout = useAuthStore(s => s.logout)
  const orgName = user?.organizationName ?? ''
  const isAdmin = user?.role === 'ADMIN'

  /*
   * THE WHATSAPP ADD-ON, FOR A LEAD OR A MEMBER (decision 78, screens gap closed 5 October). Plan
   * and billing says why their check-ins stay in the app, but that page is admin-only - a lead or
   * member who opens it reads only "You need admin access". So the server's own sentence lands
   * here instead, on the one row that already talks about WhatsApp. An admin manages this on
   * /settings/billing already, so this does not ask for it again.
   */
  const { data: whatsappBilling } = useQuery({
    queryKey: ['billing-whatsapp', 'settings'],
    queryFn: billingApi.getWhatsApp,
    enabled: whatsappOn && !isAdmin,
  })
  const whatsAppOffSays = whatsappBilling && !isWhatsAppBillingAdmin(whatsappBilling) && !whatsappBilling.on
    ? whatsappBilling.says
    : null

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [editingName, setEditingName] = useState(false)
  const saveName = useMutation({
    mutationFn: () => authApi.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() }),
    onSuccess: u => {
      updateUser({ firstName: u.firstName, lastName: u.lastName } as any)
      setEditingName(false)
      toast.success('Your name is updated. This is what your team sees.')
    },
    onError: () => toast.error('Your name did not change. Nothing else was altered - try again.'),
  })
  const nameChanged = firstName.trim() !== (user?.firstName ?? '') || lastName.trim() !== (user?.lastName ?? '')

  const [orgName2, setOrgName2] = useState(user?.organizationName ?? '')
  const [editingOrgName, setEditingOrgName] = useState(false)
  const renameOrgMut = useMutation({
    mutationFn: (name: string) => authApi.renameOrganization(name),
    onSuccess: (org) => { updateUser({ organizationName: org.name } as any); setEditingOrgName(false); toast.success('Organisation name updated.') },
    onError: () => toast.error('Could not rename the organisation. Try again.'),
  })

  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '')
  const [editingPhone, setEditingPhone] = useState(false)
  const savePhone = useMutation({
    mutationFn: (val: string | null) => authApi.setPhoneNumber(val),
    onSuccess: (updated) => { updateUser(updated); setEditingPhone(false); toast.success('Saved.') },
    onError: () => toast.error('That did not save. Try again.'),
  })

  const [emailNotif, setEmailNotif] = useState((user?.emailNotifications ?? true) && !user?.emailsStoppedFromAMail)
  const toggleNotif = useMutation({
    mutationFn: (val: boolean) => authApi.setEmailNotifications(val),
    onSuccess: (updated) => updateUser(updated),
    onError: () => toast.error('That did not change. Try again.'),
  })

  const [myData, setMyData] = useState<MyData | null>(null)
  const [showEraseConfirm, setShowEraseConfirm] = useState(false)
  function saveAsAFile(data: MyData) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'groundwork-my-data.json'
    /*
     * ATTACHED BEFORE THE CLICK, REMOVED AFTER (group 1 re-review, fault G): clicking a link that
     * was never part of the page is exactly the kind of thing a browser can handle inconsistently
     * - including, on the picture that flagged this, focus drifting away from the button somebody
     * actually pressed. A normal, connected element behaves like every other link on the page.
     */
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  /*
   * THE PROTOTYPE'S OWN ONE BUTTON, "Download it" (own-settings.txt, beside the heading): loaded
   * on demand, never on every visit to Settings, so this is somebody's whole record and fetching
   * it because they came to change a phone number would be the wrong default. One press both
   * saves the file straight away and fills in the sentence and the list below it, so nothing the
   * page did before ("Show me") is lost - it is the same load, the file just comes with it now,
   * matching the prototype's own single button rather than adding a second one beside it (the
   * button-count check, e2e/the-prototype-count-of-buttons.spec.ts, holds the product to the
   * prototype's own count for this screen).
   */
  const downloadItRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null)
  const loadMyData = useMutation({
    mutationFn: myDataApi.get,
    onSuccess: (data) => {
      setMyData(data)
      saveAsAFile(data)
      /*
       * GROUP 1 RE-REVIEW, FAULT G: a picture taken right after this press showed "Skip to
       * content" over the Email label - the skip link briefly gaining focus once the download's
       * own browser activity (a native file save) moved it away from this button. This keeps
       * focus where the person's attention already is, on the button whose own text now confirms
       * what happened, rather than leaving it to drift.
       */
      requestAnimationFrame(() => downloadItRef.current?.focus())
    },
    onError: () => toast.error('Could not load your data. Try again.'),
  })
  const eraseMyData = useMutation({
    mutationFn: myDataApi.erase,
    onSuccess: () => { toast.success('Your way in is gone. What you shared stays with the check-ins you were part of.'); logout(); navigate('/auth') },
    onError: () => toast.error('That did not happen. Nothing has changed - try again.'),
  })
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const leaveOrg = useMutation({
    mutationFn: authApi.leaveOrg,
    onSuccess: () => { logout(); navigate('/auth') },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Could not leave the organisation. Try again.'),
  })

  return (
    <Page>
      <PageTitle title="Settings" subtitle={orgName} />

      <ChangePassword email={user?.email} />

      {user?.role === 'ADMIN' && (
        <Section heading="Organisation">
          <FieldRows>
            <FieldRow
              label="Organisation name"
              value={!editingOrgName ? (
                <span>
                  {orgName || 'Not set'}
                  <span className="gwui-field-help">Everyone on your team sees this.</span>
                </span>
              ) : (
                <Stack gap={10}>
                  <TextField value={orgName2} onChange={e => setOrgName2(e.target.value)} placeholder={orgName || 'Organisation name'} aria-label="Organisation name" />
                  <div className="gwui-invite-actions">
                    <Button kind="secondary" size="small" onClick={() => renameOrgMut.mutate(orgName2.trim())} disabled={orgName2.trim().length < 2 || orgName2.trim() === orgName || renameOrgMut.isPending}>
                      {renameOrgMut.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button kind="quiet" size="small" onClick={() => { setEditingOrgName(false); setOrgName2(orgName) }}>Cancel</Button>
                  </div>
                </Stack>
              )}
              action={!editingOrgName && <Button kind="quiet" size="small" onClick={() => setEditingOrgName(true)}>Change</Button>}
            />
          </FieldRows>
          <p className="gwui-fine">
            Who can open a check-in, and whether new check-ins wait for an admin, are set on the{' '}
            <Link to="/org/members">People page</Link>. Your plan and how many people it covers are on{' '}
            <Link to="/settings/billing">Plan and billing</Link>.
          </p>
        </Section>
      )}

      <Section heading="You">
        <FieldRows>
          <FieldRow
            label="Your name"
            value={!editingName ? (
              <span>
                {user?.firstName ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}` : 'Not set'}
                <span className="gwui-field-help">This is what your team sees. A first name is enough.</span>
              </span>
            ) : (
              <Stack gap={10}>
                <div className="gwui-field-pair">
                  <TextField value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" aria-label="First name" />
                  <TextField value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" aria-label="Last name" />
                </div>
                <div className="gwui-invite-actions">
                  <Button kind="secondary" size="small" onClick={() => saveName.mutate()} disabled={!nameChanged || !firstName.trim() || saveName.isPending}>
                    {saveName.isPending ? 'Saving…' : 'Save'}
                  </Button>
                  <Button kind="quiet" size="small" onClick={() => { setEditingName(false); setFirstName(user?.firstName ?? ''); setLastName(user?.lastName ?? '') }}>Cancel</Button>
                </div>
              </Stack>
            )}
            action={!editingName && <Button kind="quiet" size="small" onClick={() => setEditingName(true)}>Change</Button>}
          />
          <FieldRow
            label="Email"
            value={<span>{user?.email}<span className="gwui-field-help">Where your sign-in links go.</span></span>}
          />
          {whatsappOn && (
            <FieldRow
              label="WhatsApp"
              value={!editingPhone ? (
                <span>
                  {user?.phoneNumber || 'Not set'}
                  <span className="gwui-field-help">You can check in by replying on WhatsApp.</span>
                  {whatsAppOffSays && (
                    <span className="gwui-field-help">{whatsAppOffSays}</span>
                  )}
                  {/*
                   * "CONNECT WHATSAPP" (decision 106, 5 October, night): an optional convenience,
                   * never something a person must do to get their check-ins. Groundwork already
                   * writes to every saved number once the templates are approved - this one tap
                   * just says hello back, so the engine serves it only while that would still do
                   * something: while it hasn't happened yet. Null otherwise, so nothing draws.
                   */}
                  {user?.connectWhatsApp && (
                    <span className="gwui-field-help">
                      Optional. Tap to say hello to Groundwork on WhatsApp.{' '}
                      <a
                        className="gwui-btn gwui-btn-quiet gwui-btn-small"
                        href={user.connectWhatsApp.link}
                        target="_blank"
                        rel="noopener"
                      >
                        {user.connectWhatsApp.says}
                      </a>
                    </span>
                  )}
                </span>
              ) : (
                <Stack gap={10}>
                  <TextField value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+254 712 345 678" aria-label="Your WhatsApp number" />
                  <div className="gwui-invite-actions">
                    <Button kind="secondary" size="small" onClick={() => savePhone.mutate(phoneNumber || null)} disabled={savePhone.isPending}>
                      {savePhone.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button kind="quiet" size="small" onClick={() => { setEditingPhone(false); setPhoneNumber(user?.phoneNumber ?? '') }}>Cancel</Button>
                  </div>
                </Stack>
              )}
              action={!editingPhone && <Button kind="quiet" size="small" onClick={() => setEditingPhone(true)}>Change</Button>}
            />
          )}
        </FieldRows>
      </Section>

      <Section heading="What we send you">
        <FieldRows>
          <SwitchRow
            title="Emails from Groundwork that we decide to send"
            detail={user?.emailsStoppedFromAMail
              ? 'You turned these off from a link in one of our emails. Turn them back on here whenever you like.'
              : 'Reminders, summaries and insights Groundwork sends without being asked.'}
            on={emailNotif}
            onChange={(v) => { setEmailNotif(v); toggleNotif.mutate(v) }}
            disabled={toggleNotif.isPending}
          />
        </FieldRows>
        <p className="gwui-fine">Notices say something is ready and link to it. They never include what anyone said.</p>
      </Section>

      <Section heading="Your data">
        <Panel>
          <Stack gap={12}>
            <div className="gwui-sentence-row">
              <SubHeading>Everything you’ve written</SubHeading>
              {/*
               * THE PROTOTYPE'S OWN OUTLINED BUTTON (own-settings.jpg; group 1 re-review, fault E):
               * a quiet text link read as decoration, not something to press - "Download it" is
               * `kind="secondary"`, the same outlined weight the prototype draws it in.
               */}
              <Button ref={downloadItRef} kind="secondary" size="small" onClick={() => loadMyData.mutate()} disabled={loadMyData.isPending}>
                {loadMyData.isPending ? 'Downloading…' : 'Download it'}
              </Button>
            </div>
            <p className="gwui-panel-text-muted">
              The file holds every answer you gave and which check-in it came from, and nothing anyone else wrote. You can open it on any computer.
            </p>
            {/*
             * "Saved. ..." (fault E): confirms the file actually saved, then states what it holds,
             * with the real counts - never a second "Download all of it" button repeating the one
             * action "Download it" already did.
             */}
            {myData && (
              <div>
                <p className="gwui-panel-text-muted">
                  Saved. You have written {myData.recordEntries.length} answer{myData.recordEntries.length === 1 ? '' : 's'}, in{' '}
                  {myData.grounds.length} check-in{myData.grounds.length === 1 ? '' : 's'}.
                </p>
                <Stack gap={0}>
                  {myData.grounds.map(g => <p key={g.id} className="gwui-panel-text">{g.label}</p>)}
                </Stack>
              </div>
            )}
          </Stack>
          {/*
           * "REMOVE YOUR NAME AND EMAIL", NEVER "ERASE IT" (group 1's third review): the old label
           * said the opposite of what this does - your answers stay on the record, only your name
           * and email go. Said plainly before the link, not just inside the confirmation, and the
           * confirmation's own words now agree with the label.
           *
           * REACHABLE WITHOUT DOWNLOADING FIRST (fault E), as it was before "Download it" started
           * saving a file on press: it no longer waits for `myData`. Still a plain text link
           * (`.gwui-plain-link`), like "Cancel" and "Never mind" elsewhere on this page, rather than
           * a second boxed button - the prototype's own screen has no erase flow at all, so a second
           * always-visible button here would put this screen over the prototype's own button count
           * (e2e/the-prototype-count-of-buttons.spec.ts already holds it to exactly the prototype's
           * five).
           */}
          <Stack gap={12}>
            {!showEraseConfirm && (
              <div>
                <p className="gwui-panel-text-muted">Your answers stay in the check-ins, without your name.</p>
                <button type="button" className="gwui-plain-link" onClick={() => setShowEraseConfirm(true)}>Remove your name and email</button>
              </div>
            )}
            {showEraseConfirm && (
              <Stack gap={10}>
                <p className="gwui-panel-text-muted">
                  Your name and email are removed everywhere and cannot be brought back. What you wrote
                  into these check-ins stays on the record, without your name on it, because the other
                  people on them have their own account of the same events. Download a copy first if
                  you want one.
                </p>
                <div className="gwui-invite-actions">
                  <Button kind="danger" onClick={() => eraseMyData.mutate()} disabled={eraseMyData.isPending}>
                    {eraseMyData.isPending ? 'Removing…' : 'Yes, remove them'}
                  </Button>
                  <Button kind="quiet" onClick={() => setShowEraseConfirm(false)}>Cancel</Button>
                </div>
              </Stack>
            )}
          </Stack>
        </Panel>
      </Section>

      <Section heading={`Leaving ${orgName || 'this organisation'}`}>
        <Panel>
          {!showLeaveConfirm ? (
            <div className="gwui-sentence-row">
              <p className="gwui-panel-text-muted">
                You’ll lose access. What you shared stays in the check-ins you were part of, as it is today.
              </p>
              <Button kind="secondary" redText onClick={() => setShowLeaveConfirm(true)}>Leave</Button>
            </div>
          ) : (
            <Stack gap={12}>
              <p className="gwui-panel-text-muted">
                You will lose access to {orgName} immediately. What you said in your check-ins stays on the record.
              </p>
              <div className="gwui-invite-actions">
                <Button kind="danger" onClick={() => leaveOrg.mutate()} disabled={leaveOrg.isPending}>
                  {leaveOrg.isPending ? 'Leaving…' : 'Yes, leave'}
                </Button>
                <Button kind="quiet" onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
              </div>
            </Stack>
          )}
        </Panel>
      </Section>

      <Section heading="This device">
        <Panel>
          <div className="gwui-sentence-row">
            <div>
              <p className="gwui-panel-text">Sign out</p>
              <p className="gwui-panel-text-muted">Signs you out of Groundwork on this device. Nothing you have written is affected.</p>
            </div>
            {/* A PLAIN LINK, NOT A BUTTON (Hafsah, 30 September): "/signout" is a real page
                (SignOutPage.tsx) that does the actual signing out as it opens - this only goes
                there, and does nothing itself. */}
            <Link className="gwui-open-link" to="/signout" replace>Sign out</Link>
          </div>
        </Panel>
      </Section>
    </Page>
  )
}
