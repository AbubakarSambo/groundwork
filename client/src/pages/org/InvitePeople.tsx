import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ThisAddsASeat } from '@/components/gw/this-adds-a-seat'
import { toast } from 'sonner'
import { apiClient } from '@/api/client'
import { Section, Panel, Stack, TextArea, Select, Button, Note, Tag } from '@/components/gw/ui'

/**
 * "INVITE PEOPLE" (A4 people.txt): one per line, a name and an email, or a list from a spreadsheet,
 * with the role they join as. "Send their invitations" checks the list first, on the same call the
 * send uses: when every line can go, it goes; when any line cannot (a typo, somebody already here,
 * no seat), the page shows what would happen to each one and sends only after that is read. An
 * admin never emails half a company without knowing which half.
 *
 * WORDING LEFT AS THE PRODUCT'S OWN, ON PURPOSE (design-audit.md item 12). The prototype's text
 * offers "or a WhatsApp number" and "or a WhatsApp message", and a "Guest" role, here. Neither is
 * true of this product yet: the paste-many endpoint this form calls
 * (api/src/modules/users/putting-a-whole-company-on.ts) only ever reads email addresses, whatever
 * the organisation's own WhatsApp switch says, and inviting somebody straight into "Guest" throws on
 * the server (aRoleToInviteAs, inviting-with-a-role-and-a-name.spec.ts) - a guest is somebody a lead
 * adds to one check-in, not somebody an admin invites to the organisation. So this keeps the
 * product's true sentence rather than the prototype's, until WhatsApp invites and Guest-by-invite
 * both exist.
 *
 * REBUILT FROM THE SHARED PARTS (item 11: the role choice, "Send their invitations" and "Upload a
 * list" sit on one line under the text box, which is the standard 16px `TextArea`). The sentence,
 * the text box, the role line and the sentence under it all sit inside one white `Panel`, 22px
 * inside (item 2 - a picture check found them loose on the page, the sentence bold, and the
 * placeholder bold grey, which happened because the text box used to be nested INSIDE the bold
 * `FieldLabel`, inheriting its weight; the label is now a plain, regular-weight sentence beside it).
 */
/**
 * THE NAME READ BESIDE EACH ADDRESS (8 October, night note item 4, B-128). Each row of the preview
 * and of the answer now carries `name` when one was typed or read beside the address - "Дмитрий
 * Иванов <p01@fieldnote.test>", "Ada Obi, ada@x.com", a spreadsheet's two columns. Shown beside the
 * address so the admin sees what was actually read, since the invitation itself begins with it
 * ("Hi Дмитрий,").
 */
interface PastedRow { email: string; result: string; name?: string | null }
interface PasteAnswer { preview: boolean; seatsLeft: number | null; rows: PastedRow[]; summary: string }

/*
 * TENSE FOLLOWS THE CALL. The same word for a check and a send left "Will be invited" on the screen
 * after the invitations had gone.
 */
const HOW_IT_READS: Record<string, { says: string; sent?: string; tone: 'good' | 'quiet' | 'bad' }> = {
  invited: { says: 'Will be invited', sent: 'Invited', tone: 'good' },
  'already here': { says: 'Already here', tone: 'quiet' },
  repeated: { says: 'Listed twice', tone: 'quiet' },
  'not an email': { says: 'Not an email address', tone: 'bad' },
  'no seat': { says: 'No seat on your plan', tone: 'bad' },
}

const ROLES = [
  ['MEMBER', 'Takes part'],
  ['LEAD', 'Can open check-ins'],
  ['ADMIN', 'Admin'],
] as const

function pasteMany(pasted: string, preview: boolean, role: string): Promise<PasteAnswer> {
  return apiClient.post('/users/invitations', { pasted, preview, role }).then((r) => r.data.data ?? r.data)
}

export function InvitePeople() {
  const qc = useQueryClient()
  const [pasted, setPasted] = useState('')
  const [role, setRole] = useState<string>('MEMBER')
  const [answer, setAnswer] = useState<PasteAnswer | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const send = useMutation({
    mutationFn: () => pasteMany(pasted, false, role),
    onSuccess: (a) => {
      setAnswer(a)
      setPasted('')
      qc.invalidateQueries({ queryKey: ['org-members'] })
      /* And the head count, "N people, on the … plan", which went stale until a reload (U.4 review). */
      qc.invalidateQueries({ queryKey: ['billing-status-people'] })
      toast.success(a.summary)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'None of those invitations went out, and nobody has been emailed. Try again.'),
  })
  const check = useMutation({
    mutationFn: () => pasteMany(pasted, true, role),
    onSuccess: (a) => {
      /* Every line can go: send, as the prototype's one button does. Anything else: show it first. */
      if (a.rows.length > 0 && a.rows.every((r) => r.result === 'invited')) send.mutate()
      else setAnswer(a)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'We could not read that list. Try again.'),
  })

  const canGo = answer?.preview ? answer.rows.filter((r) => r.result === 'invited').length : 0

  return (
    <Section heading="Invite people">
      <Panel>
        <Stack gap={10}>
          <label htmlFor="invite-list" className="gwui-panel-text" style={{ display: 'block' }}>
            {/* FAULT I (reviewer, third round): a label built from a clipped fragment joined by a
                colon reads as a filing instruction, not a sentence. */}
            Write one person on each line, with their name and email. Or paste a list from a spreadsheet.
          </label>
          <TextArea
            id="invite-list"
            rows={4}
            value={pasted}
            onChange={(e) => { setPasted(e.target.value); setAnswer(null) }}
            placeholder={'Faith Kerubo, faith@yourcompany.com\nJoseph Kiprono, joseph@yourcompany.com'}
          />
          <div className="gwui-invite-actions">
            <label className="gwui-inline-label">
              Role{' '}
              <Select value={role} onChange={(e) => { setRole(e.target.value); setAnswer(null) }} aria-label="Role" style={{ width: 'auto' }}>
                {ROLES.map(([v, w]) => <option key={v} value={v}>{w}</option>)}
              </Select>
            </label>
            <Button disabled={!pasted.trim() || check.isPending || send.isPending} onClick={() => check.mutate()}>
              {check.isPending || send.isPending ? 'Sending…' : 'Send their invitations'}
            </Button>
            <Button kind="quiet" onClick={() => file.current?.click()}>Upload a list</Button>
            <input
              ref={file}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              hidden
              aria-label="Upload a list"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const text = await f.text()
                setPasted((prev) => (prev.trim() ? `${prev.trim()}\n${text}` : text))
                setAnswer(null)
                e.target.value = ''
              }}
            />
          </div>
          <Note>They’ll get an email with a link to set themselves up.</Note>
          <ThisAddsASeat />
        </Stack>
      </Panel>

      {answer && (
        <div className="gwui-invite-answer">
          <p className="gwui-panel-text"><b>{answer.summary}</b></p>
          {answer.seatsLeft !== null && (
            <Note>
              {answer.seatsLeft === 0
                ? 'Your plan has no room for anyone else.'
                : `Your plan has room for ${answer.seatsLeft} more ${answer.seatsLeft === 1 ? 'person' : 'people'}.`}{' '}
              {answer.rows.some((r) => r.result === 'no seat') && <a href="/billing">See the plans</a>}
            </Note>
          )}
          <div>
            {answer.rows.map((r, i) => {
              const how = HOW_IT_READS[r.result] ?? { says: r.result, tone: 'quiet' as const }
              const tone = how.tone === 'good' ? 'proven' : how.tone === 'bad' ? 'concern' : 'plain'
              return (
                <div key={`${r.email}-${i}`} className="gwui-invite-row">
                  <span className="gwui-panel-text">{r.name?.trim() ? `${r.name.trim()}, ${r.email}` : r.email}</span>
                  <Tag tone={tone}>{answer.preview ? how.says : (how.sent ?? how.says)}</Tag>
                </div>
              )
            })}
          </div>
          {/* SECONDARY, NOT PRIMARY (Hafsah, 30 September): the form's own "Send their invitations"
              button above stays the one primary action on this section; this only appears once
              that button has been pressed and some lines could not go, so two navy buttons would
              otherwise sit on screen together while the reader decides what to do with the rest. */}
          {answer.preview && canGo > 0 && (
            <div className="gwui-invite-actions">
              <Button kind="secondary" disabled={send.isPending} onClick={() => send.mutate()}>
                {send.isPending ? 'Sending…' : canGo === 1 ? 'Send 1 invitation' : `Send ${canGo} invitations`}
              </Button>
            </div>
          )}
        </div>
      )}
    </Section>
  )
}
