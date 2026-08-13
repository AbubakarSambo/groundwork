import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import { myDataApi, type MyData } from '@/api/my-data'
import { Sec } from '@/components/gw/kit'

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
  const [orgName, setOrgName] = useState(user?.organizationName ?? '')
  const renameOrgMut = useMutation({
    mutationFn: (name: string) => authApi.renameOrganization(name),
    onSuccess: org => { updateUser({ organizationName: org.name } as any); toast.success('Organization name updated') },
    onError: () => toast.error('Could not rename the organization. Try again.'),
  })
  const logout = useAuthStore(s => s.logout)

  const [emailNotif, setEmailNotif] = useState(user?.emailNotifications ?? true)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '')
  const [phoneSaved, setPhoneSaved] = useState(false)

  const savePhone = useMutation({
    mutationFn: (val: string | null) => authApi.setPhoneNumber(val),
    onSuccess: (updated) => {
      updateUser(updated)
      setPhoneSaved(true)
      setTimeout(() => setPhoneSaved(false), 2000)
    },
  })

  const toggleNotif = useMutation({
    mutationFn: (val: boolean) => authApi.setEmailNotifications(val),
    onSuccess: (updated) => {
      updateUser(updated)
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2000)
    },
  })

  const leaveOrg = useMutation({
    mutationFn: authApi.leaveOrg,
    onSuccess: () => {
      logout()
      navigate('/auth')
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Could not leave the organisation. Try again.')
    },
  })

  const [myData, setMyData] = useState<MyData | null>(null)
  const [showEraseConfirm, setShowEraseConfirm] = useState(false)

  const loadMyData = useMutation({
    mutationFn: myDataApi.get,
    onSuccess: setMyData,
    onError: () => toast.error('Could not load your data. Try again.'),
  })

  const eraseMyData = useMutation({
    mutationFn: myDataApi.erase,
    onSuccess: () => { toast.success('Your data has been erased.'); logout(); navigate('/auth') },
    onError: () => toast.error('Could not erase your data. Try again.'),
  })

  /**
   * The download is built from what is already on screen rather than a second request, so what
   * lands in the file is exactly what the page just said we hold. A second fetch could disagree.
   */
  function downloadMyData() {
    if (!myData) return
    const blob = new Blob([JSON.stringify(myData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'groundwork-my-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleNotifToggle(val: boolean) {
    setEmailNotif(val)
    toggleNotif.mutate(val)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        {/* The rail already says Groundwork two inches to the left. This said it again, so
              the page's own name is here instead - which is the thing a second line of
              chrome could usefully carry. W13-11. */}
              <div className="gw-logo">Settings</div>
        <span
          onClick={() => navigate('/grounds')}
          style={{ fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer' }}
        >
          Back
        </span>
      </div>

      <div className="gw-bd" style={{ maxWidth: 520, margin: '0 auto', width: '100%', paddingTop: 28 }}>
        <div className="gw-ttl">Settings</div>

        <section style={{ marginBottom: 32 }}>
          <Sec title="Profile" />
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2 }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 1 }}>{user?.organizationName} · {user?.role === 'ADMIN' ? 'Admin' : 'Team member'}</div>
          </div>
        </section>

        {user?.role === 'ADMIN' && (
          <section style={{ marginBottom: 32 }}>
            <Sec title="Organization" />
            <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Organization name</div>
              <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                Everyone on your team sees this. If you signed up without being asked for it, we
                guessed it from your email address.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  placeholder={user?.organizationName ?? 'Organization name'}
                  style={{ flex: 1, padding: '9px 11px', borderRadius: 7, border: '1px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit' }}
                />
                <button
                  onClick={() => renameOrgMut.mutate(orgName.trim())}
                  disabled={orgName.trim().length < 2 || orgName.trim() === user?.organizationName || renameOrgMut.isPending}
                  style={{
                    padding: '9px 16px', borderRadius: 7, border: 'none', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    background: orgName.trim().length >= 2 && orgName.trim() !== user?.organizationName ? 'var(--gw-navy)' : 'var(--gw-border)',
                    color: orgName.trim().length >= 2 && orgName.trim() !== user?.organizationName ? 'white' : 'var(--gw-muted)',
                    cursor: renameOrgMut.isPending ? 'wait' : 'pointer', whiteSpace: 'nowrap',
                  }}
                >
                  {renameOrgMut.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </section>
        )}

        <section style={{ marginBottom: 32 }}>
          <Sec title="Email" />
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Ground invites and reminders</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2, lineHeight: 1.5 }}>
                  Emails when you are added to a ground or when a check-in is due.
                </div>
              </div>
              <button
                onClick={() => handleNotifToggle(!emailNotif)}
                disabled={toggleNotif.isPending}
                style={{
                  width: 44,
                  height: 24,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  background: emailNotif ? 'var(--gw-navy)' : '#D1CEC9',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background .15s',
                  marginLeft: 16,
                }}
                aria-label={emailNotif ? 'Turn off email notifications' : 'Turn on email notifications'}
              >
                <span style={{
                  position: 'absolute',
                  top: 3,
                  left: emailNotif ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left .15s',
                  boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </button>
            </div>
            {notifSaved && (
              <div style={{ fontSize: 12, color: 'var(--gw-green-t)', padding: '8px 16px', borderTop: '0.5px solid var(--gw-border)', background: '#E8F8F5' }}>
                Saved.
              </div>
            )}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <Sec title="WhatsApp" />
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden', padding: '14px 16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Your WhatsApp number</div>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 10, lineHeight: 1.5 }}>
              Add your number to get check-in links and reminders on WhatsApp instead of email. We match messages to your account by this number.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+234 801 234 5678"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 7, border: '0.5px solid var(--gw-border)', fontSize: 13, fontFamily: 'inherit' }}
              />
              <button
                onClick={() => savePhone.mutate(phoneNumber || null)}
                disabled={savePhone.isPending}
                style={{ padding: '9px 16px', borderRadius: 7, border: 'none', background: 'var(--gw-navy)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: savePhone.isPending ? 0.6 : 1 }}
              >
                {savePhone.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
            {phoneSaved && (
              <div style={{ fontSize: 12, color: 'var(--gw-green-t)', marginTop: 8 }}>Saved.</div>
            )}
          </div>
        </section>

        {/**
          * WHAT WE HOLD ABOUT YOU. W14-9.
          *
          * The marketing site tells people their answers stay theirs. Nothing in the product ever
          * showed them what "theirs" amounted to. The export and erase endpoints have both existed
          * since the GDPR work and neither had a caller, so the claim was true and unevidenced.
          *
          * Loaded on demand rather than on page load: this is somebody's whole record, and fetching
          * it every time anybody opens Settings is the wrong default for the one page that is meant
          * to be careful with it.
          */}
        <section style={{ marginBottom: 32 }}>
          <Sec title="Your data" />
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
            {!myData ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>What Groundwork holds about you</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 12 }}>
                  Everything you have written, which grounds it came from, and nothing anybody else wrote.
                </div>
                <button
                  onClick={() => loadMyData.mutate()}
                  disabled={loadMyData.isPending}
                  style={{ padding: '9px 16px', borderRadius: 7, border: '0.5px solid var(--gw-border)', background: 'var(--gw-slate)', color: 'var(--gw-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {loadMyData.isPending ? 'Loading…' : 'Show me'}
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>What Groundwork holds about you</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.7, marginBottom: 12 }}>
                  {myData.recordEntries.length} things you wrote, across {myData.checkIns.length} check-ins,
                  on {myData.grounds.length} {myData.grounds.length === 1 ? 'ground' : 'grounds'}:
                  <div style={{ marginTop: 6 }}>
                    {myData.grounds.map(g => (
                      <div key={g.id} style={{ color: 'var(--gw-text)' }}>{g.label}</div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={downloadMyData}
                    style={{ padding: '9px 16px', borderRadius: 7, border: '0.5px solid var(--gw-border)', background: 'var(--gw-slate)', color: 'var(--gw-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Download all of it
                  </button>
                  {!showEraseConfirm ? (
                    <button
                      onClick={() => setShowEraseConfirm(true)}
                      style={{ padding: '9px 16px', borderRadius: 7, border: '0.5px solid var(--gw-border)', background: 'none', color: 'var(--gw-red-t)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      Erase it
                    </button>
                  ) : null}
                </div>
                {showEraseConfirm && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '0.5px solid var(--gw-border)' }}>
                    <div style={{ fontSize: 12, color: 'var(--gw-muted)', lineHeight: 1.55, marginBottom: 10 }}>
                      {/**
                        * What this actually does, read off `eraseAccount`, not off what erasure
                        * usually means. It anonymises the account; what you wrote into a ground
                        * stays, because the other people on it have their own claim on the shared
                        * record. Saying "erases your answers" here would be a promise the server
                        * does not keep.
                        */}
                      Your name and email are removed everywhere and cannot be brought back. What you wrote
                      into these grounds stays on the record, without your name on it, because the other
                      people on them have their own account of the same events. Download a copy first if
                      you want one.
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => eraseMyData.mutate()}
                        disabled={eraseMyData.isPending}
                        style={{ padding: '9px 18px', borderRadius: 6, background: 'var(--gw-red-t)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
                      >
                        {eraseMyData.isPending ? 'Erasing…' : 'Yes, erase it'}
                      </button>
                      <button
                        onClick={() => setShowEraseConfirm(false)}
                        style={{ padding: '9px 18px', borderRadius: 6, background: 'var(--gw-slate)', color: 'var(--gw-text)', border: '0.5px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section>
          <Sec title="Membership" />
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                style={{ width: '100%', textAlign: 'left', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-red-t)' }}>Leave {user?.organizationName}</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2 }}>
                  Removes your access. Your past contributions stay on record for the grounds you were part of.
                </div>
              </button>
            ) : (
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Are you sure you want to leave?</div>
                <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                  You will lose access to {user?.organizationName} immediately. Your contributions to existing grounds stay on record.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => leaveOrg.mutate()}
                    disabled={leaveOrg.isPending}
                    style={{ padding: '9px 18px', borderRadius: 6, background: 'var(--gw-red-t)', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
                  >
                    {leaveOrg.isPending ? 'Leaving...' : 'Yes, leave'}
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    style={{ padding: '9px 18px', borderRadius: 6, background: 'var(--gw-slate)', color: 'var(--gw-text)', border: '0.5px solid var(--gw-border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
