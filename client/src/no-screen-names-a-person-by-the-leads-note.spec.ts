import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * NO SCREEN READS `roleAsDescribed` EXCEPT THE FEW THAT SHOW IT AS WHAT IT IS. Request 36.
 *
 * `roleAsDescribed` is mostly the lead's own private sentence about a person. The rendered specs
 * (pages/board, pages/grounds and pages/report `no-label-is-the-leads-note.spec.tsx`) read the
 * screens that name people. This one covers every other screen, including Today, the You board, the
 * invitation, People and Jump to, which name people only from what the server sends: a new place
 * that reads the field has to be added here on purpose, with the reason it is not a name.
 */
const ROOT = __dirname
const code = (f: string) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'test' ? [] : walk(p)
    return /\.tsx?$/.test(name) && !name.includes('.spec.') ? [p] : []
  })

/** Each allowed file, and why reading the field there does not make it a name. */
const ALLOWED: Record<string, string> = {
  'types/index.ts': 'the type',
  'api/grounds.ts': 'the type',
  'api/participants.ts': 'the type, and the call that saves it',
  'api/entry.ts': 'the type of what setup sends',
  'api/admin.ts': 'the type',
  'lib/utils.ts': 'named in the type so a row can be passed whole, and never read',
  'components/gw/EachPerson.tsx': 'the lead’s own labelled note, beside the name, for the lead only',
  'pages/grounds/GroundAdminPage.tsx': 'the lead’s own labelled note, and the box to change it',
  'components/gw/MyParticipation.tsx': 'your own role, on your own row',
  /*
   * U.4 REVIEW, ITEM 11 (30 Sept): "You in this check-in" (MyParticipation's own facts) folded into
   * "What it is" and "How it runs" here, for the lead reading their own People and setup tab. Same
   * reason as MyParticipation.tsx above - `myParticipant` is always the reader's own row, found by
   * `p.userId === user?.id`, never another person's.
   */
  'pages/grounds/CheckInPeopleAndSetup.tsx': 'your own role, on your own row, folded in from MyParticipation',
  'pages/grounds/PeopleAndSetupAsPictured.tsx': 'B8: the box where the lead who runs it describes each person’s role here; anybody else reads only whether it has been described',
  'components/gw/RolesInThisCheckIn.tsx': "the lead's own labelled note, for the person who runs the check-in only",
  'pages/admin/AdminPage.tsx': 'a role column for whoever runs the check-in',
  'pages/join/JoinPage.tsx': 'what the person types about themselves when joining',
  'pages/enter/EntryChatPage.tsx': 'the lead’s own part, sent at setup',
  'pages/org/IntegrationsPage.tsx': 'an example request in the developer docs',
}

describe('no screen reads the lead’s note about a person except to show it as their note', () => {
  it('every file that reads roleAsDescribed is on the list, with its reason', () => {
    const readers = walk(ROOT)
      .filter((f) => code(f).includes('roleAsDescribed'))
      .map((f) => f.slice(ROOT.length + 1))
    expect(readers.filter((f) => !(f in ALLOWED))).toEqual([])
  })

  it('and the label helpers never read it', () => {
    expect(code(join(ROOT, 'lib', 'utils.ts'))).not.toMatch(/\.roleAsDescribed/)
    expect(code(join(ROOT, 'lib', 'a-colleague.ts'))).not.toMatch(/roleAsDescribed/)
  })
})
