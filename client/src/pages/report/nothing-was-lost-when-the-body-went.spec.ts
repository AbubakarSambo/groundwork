import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

/**
 * "DO WE LOSE ANYTHING BY DELETING THIS BIT?"
 *
 * The shared report body embedded on the party's Report tab is gone. Most of it was a fourth place
 * to read three findings the board and the session page already held. Three things were not:
 *
 *   the private lines for the conversation ahead   ->  My record
 *   the inferred claims, each with "Correct this"  ->  the session page, beside the correction control
 *   how the report is put together                 ->  the foot of the board
 *
 * Each had exactly ONE render in the whole client, inside that body. Deleting without moving them
 * would have taken away, in order: the only forward-looking thing in the product, the only way to
 * dispute a claim nobody actually said, and the only account of the method.
 *
 * The middle one is the serious one. The report underlines inferred claims and says "worked out
 * from what people wrote, not stated by anyone". Losing the panel leaves the underline on the page
 * with nothing behind it - a disclosure with no remedy, which is worse than neither.
 *
 * This file is the tripwire on that answer. If any of the three loses its home the promise breaks
 * silently, because nothing on any screen says the thing used to be there.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const read = (...p: string[]) => readFileSync(path.join(__dirname, ...p), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const MY_RECORD = strip(read('../../components/gw/MyPrivateReport.tsx'))
const GUIDE = strip(read('../../components/gw/WhatToWalkInWith.tsx'))
const SESSION = strip(read('SessionReportPage.tsx'))
const BOARD = strip(read('../board/BoardPage.tsx'))
const PARTY = strip(read('../../components/gw/SharedReportForAParty.tsx'))

describe('the three things that had nowhere else to be', () => {
  it('the private lines for the conversation ahead are on My record', () => {
    expect(GUIDE).toContain('Before you talk to them')
    expect(GUIDE).toContain('Yours alone, and not part of the shared report')
    expect(MY_RECORD).toContain('<WhatToWalkInWith')
  })

  it('the inferred claims are on the page that already corrects the record', () => {
    /* Beside the correction control on purpose: everything about putting the record right is in
       one place rather than split across a shared document and a private one. */
    expect(SESSION).toContain('<InferenceReviewPanel')
    expect(SESSION).toContain('startSelfCorrection')
  })

  it('and how it is put together is at the foot of the board', () => {
    expect(BOARD).toContain('How this board is put together')
  })
})

describe('and the body they came out of is really gone', () => {
  it('the party view embeds no report body', () => {
    expect(PARTY).not.toContain('<ReportBody')
  })

  it('but still holds the reveal, which is an act rather than a reading surface', () => {
    /* Showing yours cannot be undone. It belongs on the tab a person opens expecting the report,
       not on a page about one session. */
    expect(PARTY).toContain('Show mine')
    expect(PARTY).toContain('activateMutation.mutate()')
  })

  it('and offers somewhere real to go in both states', () => {
    /* Forming and released. A message with nothing to open is the dead end that
       GroundParticipantPage.formingReport.spec was written for. */
    expect(PARTY).toContain('See what has emerged so far')
    expect(PARTY).toContain('Read it on the board')
  })
})
