import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'
import { toast } from 'sonner'

interface OrgMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
  /** Where this person actually got to. Computed server side - see users.service findAll. */
  state?: 'invited' | 'signed in' | 'checked in'
  /** Named as somebody who may open a check-in. Not a role - see the schema. */
  mayOpenCheckIns?: boolean
}

/** What happened, or would happen, to one pasted address. */
interface PastedRow { email: string; result: string }
interface PasteAnswer { preview: boolean; seatsLeft: number | null; rows: PastedRow[]; summary: string }

/**
 * EVERY PERSON, NOT THE FIRST PAGE OF THEM.
 *
 * `limit=200` looked like the obvious fix and came back 400: the shared pagination DTO caps every
 * paginated endpoint in the product at 100, and raising that cap to suit this page would widen the
 * biggest page anybody can request everywhere else too. Found by loading the page, not by reading
 * the DTO - and it failed as "No members yet", which is a 400 wearing the costume of an empty
 * company.
 *
 * So it pages, and stops. The ceiling exists because a runaway loop against a paginated endpoint
 * is worse than a truncated list, and a truncated list says so.
 */
const MOST_PAGES = 10
const PER_PAGE = 100

async function fetchMembers(): Promise<{ data: OrgMember[]; meta: { total: number } }> {
  const all: OrgMember[] = []
  let total = 0
  for (let page = 1; page <= MOST_PAGES; page += 1) {
    const r = await apiClient.get(`/users?limit=${PER_PAGE}&page=${page}`)
    const body = r.data.data ? r.data : { data: r.data, meta: { total: 0 } }
    all.push(...(body.data ?? []))
    total = body.meta?.total ?? all.length
    if (all.length >= total || (body.data ?? []).length < PER_PAGE) break
  }
  return { data: all, meta: { total } }
}

/*
 * PREVIEW AND SEND ARE THE SAME CALL, one flag apart. Two calls would be two implementations, and
 * they would disagree on the screen where somebody decides whether to email their whole company.
 */
function pasteMany(pasted: string, preview: boolean): Promise<PasteAnswer> {
  return apiClient.post('/users/invitations', { pasted, preview }).then(r => r.data.data ?? r.data)
}

/**
 * How each answer reads, and whether it is a problem.
 *
 * TENSE FOLLOWS THE CALL. The same word for a check and a send left "Will be invited" on the screen
 * after the invitations had gone - which reads as though nothing happened, on the one screen where
 * somebody needs to know that something did. Seen after clicking send on the running page.
 */
const HOW_IT_READS: Record<string, { says: string; sent?: string; tone: 'good' | 'quiet' | 'bad' }> = {
  invited: { says: 'Will be invited', sent: 'Invited', tone: 'good' },
  'already here': { says: 'Already here', tone: 'quiet' },
  repeated: { says: 'Listed twice', tone: 'quiet' },
  'not an email': { says: 'Not an address', tone: 'bad' },
  'no seat': { says: 'No seat on your plan', tone: 'bad' },
}

export function OrgMembersPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [pasted, setPasted] = useState('')
  const [answer, setAnswer] = useState<PasteAnswer | null>(null)
  const isAdmin = user?.role === 'ADMIN'

  const { data, isLoading, isError } = useQuery({
    queryKey: ['org-members'],
    queryFn: fetchMembers,
    enabled: isAdmin,
  })

  const inviteMut = useMutation({
    mutationFn: (email: string) => authApi.teamInvite(email),
    onSuccess: () => {
      toast.success('Invite sent')
      setInviteEmail('')
      qc.invalidateQueries({ queryKey: ['org-members'] })
    },
    onError: () => toast.error('Could not send invite. Try again.'),
  })

  /*
   * PREVIEW, THEN SEND. The preview is not a nicety here - `teamInvite` refuses one at a time when
   * the plan is full, so pasting 160 into a small plan without one means the first forty land and
   * the admin has emailed a fraction of their company with no way to tell which fraction.
   */
  const previewMut = useMutation({
    mutationFn: () => pasteMany(pasted, true),
    onSuccess: setAnswer,
    onError: () => toast.error('Could not read that list. Try again.'),
  })
  const sendManyMut = useMutation({
    mutationFn: () => pasteMany(pasted, false),
    onSuccess: (a) => {
      setAnswer(a)
      setPasted('')
      qc.invalidateQueries({ queryKey: ['org-members'] })
      toast.success(a.summary)
    },
    onError: () => toast.error('Could not send those invitations. Try again.'),
  })

  /*
   * WHAT SOMEBODY IS HERE, AS AN ADMIN THINKS OF IT: member, lead, or admin.
   *
   * THREE WORDS, TWO FIELDS, and they stay two fields. A lead runs check-ins for their own team and
   * has no admin powers whatever - folding that into `role` as a third value would hand every lead
   * the organisation, the billing and the ability to promote people. So the control says the three
   * things an admin means and writes `role` and `mayOpenCheckIns` accordingly.
   */
  const roleMut = useMutation({
    mutationFn: ({ id, what }: { id: string; what: 'MEMBER' | 'LEAD' | 'ADMIN' }) =>
      apiClient.patch(`/users/${id}`, {
        role: what === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        /* An admin may open check-ins by virtue of being one, so the flag is about the other two. */
        mayOpenCheckIns: what === 'LEAD',
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-members'] }); toast.success('Role updated') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not change that role.'),
  })

  function handleInvite() {
    const email = inviteEmail.trim()
    if (!email.includes('@')) return
    inviteMut.mutate(email)
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '48px 32px', maxWidth: 560 }}>
        <div style={{ fontSize: 15, color: 'var(--gw-sub)' }}>You need admin access to manage team members.</div>
      </div>
    )
  }

  const members = data?.data ?? []

  return (
    <div style={{ padding: '40px 32px', maxWidth: 720 }}>
      {/* This page had no internal link of any kind. The rail is there, so nobody was
          trapped, but an admin who came here to invite somebody had no way back to the
          thing they were doing. */}
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => navigate('/grounds')}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: 13, color: 'var(--gw-sub)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ← Back to check-ins
        </button>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--gw-navy)', marginBottom: 6, letterSpacing: '-.02em' }}>
        People
      </h1>
      <p style={{ fontSize: 14, color: 'var(--gw-sub)', marginBottom: 32, lineHeight: 1.6 }}>
        Everyone with a Groundwork account in your organisation. Invite colleagues to give them access.
      </p>

      {/* Invite form */}
      <div style={{ background: 'var(--gw-blue-bg)', border: '1px solid var(--gw-blue-b)', borderRadius: 12, padding: '20px 22px', marginBottom: 32 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Invite a team member</div>
        <div style={{ fontSize: 13, color: 'var(--gw-sub)', marginBottom: 14, lineHeight: 1.5 }}>
          They will receive an email with a link to set up their Groundwork account.
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleInvite()}
            style={{
              flex: 1, padding: '10px 13px', fontSize: 14, border: '1px solid var(--gw-blue-b)',
              borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white',
            }}
          />
          <button
            onClick={handleInvite}
            disabled={inviteMut.isPending || !inviteEmail.includes('@')}
            style={{
              padding: '10px 20px', background: 'var(--gw-navy)', color: 'white', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              opacity: inviteMut.isPending || !inviteEmail.includes('@') ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {inviteMut.isPending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </div>

      {/*
        * PUTTING A COMPANY ON, which this page could only do one address at a time.
        *
        * Under the single-invite box rather than replacing it: inviting one person is still the
        * common case, and a textarea is the wrong shape for it.
        */}
      <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '18px 20px', marginBottom: 28, background: 'var(--gw-card)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 4 }}>Put your whole team on</div>
        <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6, marginBottom: 10 }}>
          Paste a list of addresses, from a spreadsheet column or your mail client. You see exactly
          what will happen to each one before anything is sent.
        </div>
        <textarea
          value={pasted}
          onChange={e => { setPasted(e.target.value); setAnswer(null) }}
          rows={4}
          placeholder={'ada@yourcompany.com\nbob@yourcompany.com'}
          style={{
            width: '100%', padding: '10px 13px', fontSize: 13.5, border: '1px solid var(--gw-border)',
            borderRadius: 8, fontFamily: 'inherit', outline: 'none', background: 'white',
            resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 10,
          }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => previewMut.mutate()}
            disabled={!pasted.trim() || previewMut.isPending}
            style={{
              /* Secondary once there is something to send: checking is the step before the act. */
              padding: '9px 18px', background: 'white', color: 'var(--gw-navy)',
              border: '1px solid var(--gw-navy)',
              borderRadius: 8, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
              cursor: pasted.trim() ? 'pointer' : 'default', opacity: pasted.trim() ? 1 : 0.5,
            }}
          >
            {previewMut.isPending ? 'Checking…' : 'Check the list'}
          </button>
          {/*
            * SENDING IS ONLY OFFERED AFTER A CHECK, and only when there is something to send. A
            * send button that is always live invites somebody to email 160 people without looking.
            */}
          {/*
            * ONLY WHILE IT IS STILL A PREVIEW. After the send this offered to send the same list
            * again - harmless, since everybody in it is now already here, but it reads as though
            * the first click did nothing.
            */}
          {answer && answer.preview && answer.rows.some(r => r.result === 'invited') && (
            <button
              onClick={() => sendManyMut.mutate()}
              disabled={sendManyMut.isPending}
              style={{
                /*
                 * `var(--gw-accent)` is not a token this product has. It resolved to nothing, so
                 * this was white text on a transparent background - the primary action, invisible.
                 * Seen in a screenshot of the running page; the code read fine.
                 */
                padding: '9px 18px', background: 'var(--gw-navy)', color: 'white', border: 'none',
                borderRadius: 8, fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              {sendManyMut.isPending
                ? 'Sending…'
                : `Send ${answer.rows.filter(r => r.result === 'invited').length} invitations`}
            </button>
          )}
        </div>

        {answer && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 8 }}>{answer.summary}</div>
            {/*
              * SEATS SAID BEFORE THE SEND, not discovered during it. This is the number that turns
              * a rollout into a half-rollout, and it is the one thing the old page could not say.
              */}
            {answer.seatsLeft !== null && (
              <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', marginBottom: 10, lineHeight: 1.6 }}>
                Your plan has room for {answer.seatsLeft} more {answer.seatsLeft === 1 ? 'person' : 'people'}.{' '}
                {answer.rows.some(r => r.result === 'no seat') && (
                  <a href="/billing" style={{ color: 'var(--gw-navy)', fontWeight: 600 }}>See the plans →</a>
                )}
              </div>
            )}
            <div style={{ border: '1px solid var(--gw-border)', borderRadius: 8, overflow: 'hidden', maxHeight: 260, overflowY: 'auto' }}>
              {answer.rows.map((r, i) => {
                const how = HOW_IT_READS[r.result] ?? { says: r.result, tone: 'quiet' as const }
                const says = answer.preview ? how.says : (how.sent ?? how.says)
                return (
                  <div key={`${r.email}-${i}`} style={{
                    display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center',
                    padding: '8px 12px', fontSize: 12.5,
                    borderBottom: i < answer.rows.length - 1 ? '1px solid var(--gw-border)' : 'none',
                    background: 'white',
                  }}>
                    <span style={{ color: 'var(--gw-navy)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email}</span>
                    <span style={{
                      flexShrink: 0, fontWeight: 600,
                      color: how.tone === 'bad' ? 'var(--gw-amber-t)' : how.tone === 'good' ? 'var(--gw-green-t)' : 'var(--gw-sub)',
                    }}>{says}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/*
        * TRAINING, WHICH IS THE STEP BETWEEN 160 ACCOUNTS AND 160 PEOPLE WHO USE THEM.
        *
        * Here rather than in the rail: it is a link an admin sends other people, not a section of
        * their own console, and this is the page they are on when they are thinking about the
        * people they just invited.
        */}
      <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, padding: '14px 18px', marginBottom: 28, background: 'var(--gw-card)', display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--gw-navy)', marginBottom: 2 }}>Send your team the guide</div>
          <div style={{ fontSize: 12.5, color: 'var(--gw-sub)', lineHeight: 1.6 }}>
            How to run a check-in, what happens to what people write, and what you can see as their admin.
          </div>
        </div>
        <button
          onClick={() => navigate('/org/guide')}
          style={{
            padding: '8px 16px', background: 'white', color: 'var(--gw-navy)',
            border: '1px solid var(--gw-navy)', borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          Read it
        </button>
      </div>

      {/* Members list */}
      {/*
        * A FAILED LOAD IS NOT AN EMPTY COMPANY. This page rendered "No members yet" over a 400,
        * which tells an admin their people are gone.
        */}
      {isError ? (
        <div style={{ border: '1px solid var(--gw-amber-b-soft)', background: 'var(--gw-amber-bg)', borderRadius: 12, padding: '16px 18px', fontSize: 13.5, color: 'var(--gw-amber-t)', lineHeight: 1.6 }}>
          We could not load your people just now. Nobody has been removed - reload the page, and if
          it keeps happening tell us.
        </div>
      ) : isLoading ? (
        <div style={{ color: 'var(--gw-sub)', fontSize: 14 }}>Loading…</div>
      ) : (
        <div style={{ border: '1px solid var(--gw-border)', borderRadius: 12, overflow: 'hidden' }}>
          {members.length === 0 ? (
            <div style={{ padding: '24px 20px', color: 'var(--gw-sub)', fontSize: 14 }}>No members yet.</div>
          ) : (
            members.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', background: 'var(--gw-card)',
                  borderBottom: i < members.length - 1 ? '1px solid var(--gw-border)' : 'none',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gw-navy)', marginBottom: 2 }}>
                    {m.firstName || m.lastName ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : m.email}
                  </div>
                  {(m.firstName || m.lastName) && (
                    <div style={{ fontSize: 12, color: 'var(--gw-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {/*
                    * WHERE THEY GOT TO, which at 160 people is the only question. "Pending" said
                    * one third of it: it could tell an unopened invitation from an account, and
                    * not an account from somebody who has actually used the thing.
                    */}
                  <span style={{
                    fontSize: 11, borderRadius: 6, padding: '2px 7px', fontWeight: 600,
                    background: m.state === 'checked in' ? 'var(--gw-green-bg)' : m.state === 'invited' ? 'var(--gw-amber-bg)' : 'var(--gw-bg)',
                    color: m.state === 'checked in' ? 'var(--gw-green-t)' : m.state === 'invited' ? 'var(--gw-amber-t)' : 'var(--gw-sub)',
                    border: `1px solid ${m.state === 'checked in' ? 'var(--gw-green-b)' : m.state === 'invited' ? 'var(--gw-amber-b-soft)' : 'var(--gw-border)'}`,
                  }}>
                    {m.state === 'checked in' ? 'Checked in'
                      : m.state === 'invited' ? 'Invited, not opened'
                        : 'Signed in, not checked in'}
                  </span>
                  {/*
                    * SUB-ADMINS. A select rather than a badge, because "add my team as sub admins"
                    * had no answer in the product at all - the role was set at sign-up and never
                    * again.
                    *
                    * Your own row is a badge, not a control. The server refuses the last admin
                    * demoting themselves; showing a control that exists to be refused is worse
                    * than not showing one.
                    */}
                  {m.id === user?.id ? (
                    <span style={{
                      fontSize: 11, borderRadius: 6, padding: '2px 7px', fontWeight: 600,
                      background: 'var(--gw-blue-bg)', color: 'var(--gw-navy)', border: '1px solid var(--gw-blue-b)',
                    }}>You</span>
                  ) : (
                    <select
                      value={m.role === 'ADMIN' ? 'ADMIN' : m.mayOpenCheckIns ? 'LEAD' : 'MEMBER'}
                      disabled={roleMut.isPending}
                      onChange={e => roleMut.mutate({ id: m.id, what: e.target.value as 'MEMBER' | 'LEAD' | 'ADMIN' })}
                      style={{
                        fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                        borderRadius: 6, padding: '3px 6px', background: 'white',
                        color: m.role === 'ADMIN' ? 'var(--gw-navy)' : 'var(--gw-sub)',
                        border: `1px solid ${m.role === 'ADMIN' ? 'var(--gw-blue-b)' : 'var(--gw-border)'}`,
                      }}
                    >
                      <option value="MEMBER">Takes part</option>
                      <option value="LEAD">Can open check-ins</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {data?.meta.total != null && data.meta.total > members.length && (
        <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginTop: 12, textAlign: 'center' }}>
          Showing {members.length} of {data.meta.total} members
        </div>
      )}
    </div>
  )
}
