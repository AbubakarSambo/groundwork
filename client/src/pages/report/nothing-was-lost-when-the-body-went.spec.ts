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

const GUIDE = strip(read('../../components/gw/WhatToWalkInWith.tsx'))
const SESSION = strip(read('SessionReportPage.tsx'))
const BOARD = strip(read('../board/BoardPage.tsx'))
const PARTY = strip(read('../../components/gw/SharedReportForAParty.tsx'))

describe('the three things that had nowhere else to be', () => {
  it('the private lines for the conversation ahead are on My record', () => {
    expect(GUIDE).toContain('Before you talk to them')
    expect(GUIDE).toContain('Yours alone, and not part of the shared report')
    /* Rendered by the page rather than inside WhatYouAreCarryingForward now: her order puts it last, after
       sign-off, because it is private prep for a conversation rather than part of reading your
       record. Having it third pushed the reading down the page.
       REVIEW ROUND 3, "YOUR WORK" REBUILD: moved again, into the shared `YourWork` component
       both pages now call for My work/My record. */
    const YOUR_WORK = strip(read('../../components/gw/checkin/YourWork.tsx'))
    expect(YOUR_WORK).toContain('<WhatToWalkInWith')
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

  it('and holds no reveal either, because there is no longer one to hold', () => {
    /* This used to require it: "showing yours cannot be undone, it belongs on the tab a person
       opens expecting the report". Nothing is undone and nothing was ever gated - see
       there-is-no-reveal.spec.ts for what the button was actually doing. */
    expect(PARTY).not.toContain('Show mine')
    expect(PARTY).not.toContain('activateMutation')
  })

  it('says nothing at all while the report is still forming', () => {
    /*
     * IT WENT FROM A DEAD END, TO A MESSAGE WITH DOORS, TO NOTHING - AND NOTHING IS RIGHT.
     *
     * Three sentences announcing that a picture was forming, over two buttons to the board and to
     * My record, on a tab whose first row is already a door to the board. My record's coverage bars
     * now say how far off a full report is, in one row, on the page that is about the record.
     */
    expect(PARTY).not.toContain('See what has emerged so far')
    expect(PARTY).not.toContain('Not everyone has checked in yet, so this is not final')
  })

  it('and once everyone has shown theirs, says nothing at all', () => {
    /*
     * IT BRIEFLY SAID WHERE EVERYTHING HAD GONE, AND THAT WAS ALSO WRONG.
     *
     * Replacing the deleted body, this section carried three sentences of directions - "Where the
     * accounts agree and where they differ... is on the team board. Your own account of each
     * session... on My record" - over two buttons to those places. Read back: "remove".
     *
     * Right. The tab already opens with a door to the board and a door to your sessions. A
     * paragraph naming the same two rooms is a third and fourth door to them, and it reads as an
     * apology for the page not holding what it used to.
     */
    expect(PARTY).not.toContain('Read it on the board')
    /* The heading and the directions under it. Not the phrase itself - the toast fired when the
       last person reveals still says "Everyone has shown theirs", which is the right words in the
       right place: a thing that just happened, said once, rather than a standing signpost. */
    expect(PARTY).not.toContain('is on the team board')
    expect(PARTY).not.toMatch(/fontWeight: 700, marginBottom: 5 \}\}>Everyone has shown theirs/)
  })
})
