import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE PEOPLE PAGE, READ AS AN ADMIN PUTTING 160 PEOPLE ON.
 *
 * It had one email box and a list. Three things were missing and each one of them is the whole job
 * at that size: a way to paste, a way to see where each person actually got to, and a way to make
 * somebody else an admin.
 *
 * Source-read rather than rendered, and bounded to the part each claim is about - a guard on this
 * page passed three times today against deliberately broken copy because it read the whole file
 * and every word it wanted appeared somewhere else in it.
 */
const PAGE = readFileSync(join(__dirname, 'OrgMembersPage.tsx'), 'utf8')

describe('pasting a company in', () => {
  it('checks the list before anything is sent', () => {
    /* The send button only exists once an answer has come back. */
    const send = PAGE.slice(PAGE.indexOf('Check the list'), PAGE.indexOf('{answer && ('))
    expect(send).toContain('answer && answer.preview && answer.rows.some')
  })

  it('stops offering to send once it has sent', () => {
    /* It kept the button after the send, which reads as though the first click did nothing. */
    const send = PAGE.slice(PAGE.indexOf('Check the list'), PAGE.indexOf('{answer && ('))
    expect(send).toContain('answer.preview &&')
  })

  it('changes tense once the invitations have gone', () => {
    /* "Will be invited" after they were invited is the same failure in words. */
    const map = PAGE.slice(PAGE.indexOf('const HOW_IT_READS'), PAGE.indexOf('export function OrgMembersPage'))
    expect(map).toContain("sent: 'Invited'")
    expect(PAGE).toContain('answer.preview ? how.says : (how.sent ?? how.says)')
  })

  it('previews and sends through one call, one flag apart', () => {
    /* Two calls would be two implementations that disagree on the screen where somebody decides
       whether to email their whole company. */
    const calls = PAGE.match(/apiClient\.post\('\/users\/invitations'/g) ?? []
    expect(calls).toHaveLength(1)
    expect(PAGE).toContain('pasteMany(pasted, true)')
    expect(PAGE).toContain('pasteMany(pasted, false)')
  })

  it('says how many seats are left before the send, not during it', () => {
    const block = PAGE.slice(PAGE.indexOf('{answer && ('), PAGE.indexOf('{/* Members list */}'))
    expect(block).toContain('room for {answer.seatsLeft}')
    expect(block).toContain('See the plans')
  })

  it('names what will happen to every kind of row', () => {
    const map = PAGE.slice(PAGE.indexOf('const HOW_IT_READS'), PAGE.indexOf('export function OrgMembersPage'))
    for (const kind of ['invited', 'already here', 'repeated', 'not an email', 'no seat']) {
      expect(map).toContain(`${kind.includes(' ') ? `'${kind}'` : kind}:`)
    }
  })
})

describe('where each person got to', () => {
  const from = PAGE.indexOf("WHERE THEY GOT TO")
  const row = PAGE.slice(from, PAGE.indexOf('SUB-ADMINS', from))

  it('tells an unopened invitation from an account from somebody who has used it', () => {
    expect(row).toContain('Checked in')
    expect(row).toContain('Invited, not opened')
    expect(row).toContain('Signed in, not checked in')
  })
})

describe('sub-admins', () => {
  const control = PAGE.slice(PAGE.indexOf('Sub-admins'), PAGE.indexOf('</select>'))

  it('can be set from the page, which had no way to do it at all', () => {
    expect(control).toContain('roleMut.mutate({ id: m.id, role: e.target.value })')
    expect(control).toContain('value="ADMIN"')
  })

  it('is a badge on your own row, not a control', () => {
    /* The server refuses the last admin demoting themselves. A control that exists to be refused
       is worse than no control. */
    expect(control).toContain('m.id === user?.id')
    expect(control).toContain('>You<')
  })
})
