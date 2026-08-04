import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

export function SettingsPage() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const updateUser = useAuthStore(s => s.updateUser)
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

  function handleNotifToggle(val: boolean) {
    setEmailNotif(val)
    toggleNotif.mutate(val)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gw-bg)' }}>
      <div className="gw-hdr">
        <div className="gw-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/grounds')}>Groundwork</div>
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
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            Profile
          </div>
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{user?.firstName} {user?.lastName}</div>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 2 }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: 'var(--gw-muted)', marginTop: 1 }}>{user?.organizationName} · {user?.role === 'ADMIN' ? 'Admin' : 'Team member'}</div>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            Email
          </div>
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
              <div style={{ fontSize: 12, color: '#085041', padding: '8px 16px', borderTop: '0.5px solid var(--gw-border)', background: '#E8F8F5' }}>
                Saved.
              </div>
            )}
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            WhatsApp
          </div>
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
              <div style={{ fontSize: 12, color: '#085041', marginTop: 8 }}>Saved.</div>
            )}
          </div>
        </section>

        <section>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gw-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>
            Membership
          </div>
          <div style={{ background: 'white', border: '0.5px solid var(--gw-border)', borderRadius: 10, overflow: 'hidden' }}>
            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                style={{ width: '100%', textAlign: 'left', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: '#791F1F' }}>Leave {user?.organizationName}</div>
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
                    style={{ padding: '9px 18px', borderRadius: 6, background: '#791F1F', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
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
