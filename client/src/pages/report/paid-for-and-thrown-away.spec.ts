import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'

/**
 * A MODEL CALL PER PARTICIPANT PER RELEASE, DISCARDED.
 *
 * Found by the sibling of the audit that caught G37: diff what the service returns against what the
 * client reads, and look at what only one side knows about.
 *
 * `postReportGuide` is three lines generated for each participant when a report is released - an
 * opening line, a question to carry into the room, and one thing the other person said that is worth
 * taking seriously. It is on the report payload. No client file mentioned it.
 *
 * And `POST_REPORT_GUIDE_ENABLED=true` sits in `.env.example` immediately under its own comment:
 *
 *   "OFF by default so it does not spend a Gemini call per participant per release into a void.
 *    Set to 'true' only once a client surface shows each participant their guide."
 *
 * So the call was being spent, every release, for every person, and the result thrown away. The
 * comment predicted the exact failure and the flag was turned on anyway.
 *
 * Rendered rather than switched off: it is already computed, already paid for, and already sanitised.
 */
/*
 * THE PANEL MOVED TO MY RECORD, AND EVERY ASSERTION BELOW IS UNCHANGED.
 *
 * It was declared inside `ReportPage.tsx` and rendered inside the shared report body. That body is
 * gone - every part of it now has one home instead of being a fourth place to read the same
 * findings - so the panel is its own file and My record renders it. My record is the tab whose
 * whole promise is that it is yours, which is what this panel had to say about itself in prose
 * because its surroundings implied otherwise.
 *
 * Both files are read and joined, so what is asserted is that the guide reaches its person - not
 * which file happens to hold the markup.
 */
/*
 * REVIEW ROUND 3, "YOUR WORK" REBUILD: `<WhatToWalkInWith` MOVED AGAIN, from the two calling
 * pages into the shared `YourWork` (components/gw/checkin/YourWork.tsx) both of them now render
 * for My work/My record. Added to the join rather than swapped in, so this still reads the
 * guide's own file, the carry-forward panel (unrelated but harmless to keep), the page and the
 * shared component together.
 */
const SRC = [
  readFileSync(join(__dirname, '../../components/gw/WhatToWalkInWith.tsx'), 'utf8'),
  readFileSync(join(__dirname, '../../components/gw/WhatYouAreCarryingForward.tsx'), 'utf8'),
  readFileSync(join(__dirname, '../grounds/GroundParticipantPage.tsx'), 'utf8'),
  readFileSync(join(__dirname, '../../components/gw/checkin/YourWork.tsx'), 'utf8'),
].join('\n')
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the guide reaches the person it was written for', () => {
  it('the page reads it off the report', () => {
    /* The page reads it off the report and hands it down; the panel renders it. Optional chaining
       because the report is fetched only where one exists - the guide is on it or it is not. */
    expect(CODE).toMatch(/\(report as any\)\??\.postReportGuide/)
    expect(CODE).toContain('<WhatToWalkInWith')
  })

  it('all three lines are rendered', () => {
    for (const field of ['openingLine', 'questionToCarry', 'toAcknowledge']) {
      expect(CODE).toContain(`guide.${field}`)
    }
  })

  it('and it says plainly that nobody else sees it', () => {
    /**
     * It is generated from the other person's account, so a reader will assume it is shared unless
     * told. The server only ever fills it for the requesting participant.
     */
    expect(CODE).toMatch(/Yours alone, and not part of the shared report/)
  })

  it('a guide whose fields were all stripped renders nothing rather than an empty card', () => {
    /**
     * `guide-sanitiser.ts` drops any line that names a party or quotes them, and it can drop all
     * three. A heading over nothing reads as a broken page, and this section's whole value is that it
     * is trustworthy.
     */
    expect(CODE).toMatch(/if \(!rows\.length\) return null/)
  })

  it('it uses the kit\'s heading rather than a tenth copy', () => {
    /*
     * GROUP 3, PIECE 2: `Sec` (kit.tsx, the old kit) moved to `Section` (components/gw/ui), the
     * same heading component's newer name - a rename forced by ReportPage.tsx joining
     * REBUILT_PAGES, whose guard refuses any old kit part one import deep. Still one shared
     * heading, not a tenth copy.
     */
    expect(CODE).toMatch(/<Section heading="Before you talk to them" \/>/)
  })
})

describe('and the flag that was paying for it', () => {
  const EXAMPLE = readFileSync(join(__dirname, '../../../../api/.env.example'), 'utf8')

  it('is still on, which is now the correct setting rather than a leak', () => {
    // The condition its own comment set - "only once a client surface shows each participant their
    // guide" - is met by this file's subject.
    expect(EXAMPLE).toMatch(/POST_REPORT_GUIDE_ENABLED=true/)
  })

  it('and the comment describes the surface that now exists', () => {
    /**
     * Asserted as a positive, not as the absence of the old sentence. The rewritten comment QUOTES
     * the old claim to explain what went wrong, so a `not.toMatch` on that phrase fails against a
     * correct file - the comment trap, for the fourth time in this session's guards. Checking that
     * the surface is named is the thing that actually has to stay true.
     */
    expect(EXAMPLE).toMatch(/Before you talk to them/)
    expect(EXAMPLE).toMatch(/shown only to the\n# person whose guide it is/)
  })
})
