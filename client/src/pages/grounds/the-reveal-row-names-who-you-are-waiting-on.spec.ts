import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * "NOT YET · PARTY 2" TELLS A LEAD NOTHING SHE CAN ACT ON.
 *
 * WHERE THIS LESSON LIVES NOW. The reveal row was part of the report tab's body, and that body is
 * gone: the tab is a list of sessions and each session's report is its own page. The row itself is
 * not gone - it is better placed, because "who has answered and who has shown theirs" belongs on
 * the report it is about rather than on a list. It comes from the server with the report, carrying
 * the report's OWN labels, so there is no roster join left to get wrong and no positional index to
 * fall back to. The two defects this file was written for are now unreachable rather than fixed.
 *
 * Found on the report tab of a real three-party ground, opened as its lead. The reveal row is the
 * one place on the page that answers "who am I waiting on", and it answered with a positional
 * index. She could see that somebody had not revealed and had no way to know who, on a page that
 * names people freely everywhere else - `participantLabel` is used five times in this same file.
 *
 * Nothing was missing from the client. The roster was already loaded; the row simply counted from
 * one instead of reading it. No new request, no API change.
 *
 * The second defect was in the same heading: `allActivated ? '· Both activated'`, hardcoded from
 * when a check-in was always two people, sitting directly above a row of THREE cards that the same
 * block had just rendered by counting them.
 */
const API = readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'reports', 'reports.service.ts'), 'utf8')
const VIEW = readFileSync(join(__dirname, '..', '..', 'components', 'gw', 'TheSessionsReport.tsx'), 'utf8')
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')

describe('who the report is counting', () => {
  it('names people, and says which one is you', () => {
    /* U.9: said as a sentence now, "You have checked in." rather than "Miriam (you) · Answered". */
    expect(strip(VIEW)).toContain("if (c.isYou) return c.answered ? 'You have checked in.' : 'You have not checked in yet.'")
  })

  it('says whether each person has answered, which is the only state left', () => {
    const code = strip(VIEW)
    expect(code).toContain('has not checked in yet.')
    /* Was 'Answered, and shown theirs'. That second state existed only to report who had pressed
       the reveal, which is deleted - see there-is-no-reveal.spec.ts. */
    expect(code).toContain("c.answered ? `${c.who} has checked in.` : `${c.who} has not checked in yet.`")
  })

  it('takes the label from the report rather than joining a roster on the page', () => {
    /* The old row read `participants.find(...)` and printed `Party ${i + 1}` when it missed. The
       name comes from `namesVisibleTo`, which is the same rule the report body uses to decide
       whose name this particular reader may resolve - not a second guess at that rule. */
    expect(strip(VIEW)).not.toMatch(/participants\s*\?\?\s*\[\]/)
    /* Same rule, now also passed what the check-in's own setting says about naming peers, so the
       report cannot disagree with the roster above it. See
       the-report-names-people-the-way-the-setting-says.spec.ts. */
    /* The engine now asks peersAreNamed about this reader (merge of 1 October): who may be named
       depends on who is reading. The promise is unchanged: names come through namesVisibleTo. */
    expect(API).toContain('namesVisibleTo(me?.id ?? null, ground.participants as any, this.peersAreNamed(ground as any, me?.id ?? null))')
    expect(API).toContain('nameByLabel.get(label)')
  })

  it('and nobody, lead included, is shown an address where a name should be', () => {
    /* `displayName` returns null for an unjoined invitee by design - the address is not a peer's
       to see. To the lead who typed it, "participant B" cannot say which invitation is late. */
    /* Never an email in a name slot, whoever is reading: the same label everywhere. */
    expect(API).not.toContain('return p.email;')
  })

  it('and still gives a nameless party a row rather than dropping them', () => {
    /* Blanking the row would lose the fact that somebody has not answered, which is the point.
       Request 36: the engine now says "A colleague" (or "One colleague", "Another colleague"),
       from its shared plain words, where it said "A teammate", and never the lead's note. */
    expect(API).toContain('return aColleague(p.id);')
    expect(API).toContain("const aColleague = (pid: string) => atTheStart(plainWords.get(pid) ?? 'a colleague');")
    expect(API).not.toContain("'A teammate'")
  })

  it('never counts somebody who was never going to answer', () => {
    /* The roster asks the one population rule now rather than filtering here - see
       how-many-have-answered.ts, and the day four screens quoted four numbers for one session. */
    /* Since 28 September the number people read counts by the header's rule, whoIsInTheRound
       (Hafsah, requests 56 and 69); it still leaves out a lead who only manages. */
    expect(strip(API)).toContain('const counting = whoIsInTheRound(')
    const theRule = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'api', 'src', 'modules', 'reports', 'how-many-have-answered.ts'), 'utf8'))
    /* The engine rewrote this rule again (decision 133): the lead counts only in a session she
       answered, and where the lead only asks she is never counted. The promise is unchanged and is
       checked as behaviour in api/src/modules/reports/a-lead-who-only-manages-is-never-counted.spec.ts;
       here, that both of the rule's functions still leave a lead out by her own test. */
    /* Since the one count (whoHasAnswered) the rule is written once and whoIsInTheRound reads it, so both leave a lead out by
       the same two tests. */
    expect(theRule).toContain('if (p.managingOnly && theLeadOnlyAsks) continue;')
    expect(theRule).toContain('if (checksInOnlyWhenTheyChoose(p) && !did) continue;')
    expect(theRule).toMatch(/export function whoIsInTheRound[\s\S]*?whoHasAnswered\(people, sessionNumber, scenario\)\.onTheCheckIn/)
  })
})
