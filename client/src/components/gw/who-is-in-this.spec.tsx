import { readFileSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhoIsInThis } from './WhoIsInThis'

/**
 * WHO IS IN THIS, AND WHETHER THEY ARE DOING IT. W13-5.
 *
 * From the audit: a participant saw their own tabs and nothing else, while the lead saw every
 * party and every session. So the two things that would settle somebody's nerves before writing
 * honestly - who is going to read this, and is anybody else actually doing it - were the two
 * things only the lead could see.
 *
 * WHAT THIS IS NOT. It is coverage, never content: that a person has checked in, never a word
 * of what they said. And there is deliberately NO permission check in the component.
 * `grounds.service.ts` decides whether parties see each other and FILTERS THE OTHERS OUT OF THE
 * PAYLOAD when they must not - hidden by default on evaluation and cohort grounds, where a
 * roster tells four people exactly who they are being measured against. A second rule here
 * would be a second place to get it wrong, which is the lesson from the two times a private
 * read leaked through an instruction rather than a query.
 *
 * ROUND 4, ITEM A STEP 2: MOVED FROM `GroundChat`'s Check-in tab TO `WhoIsInThis`, on People and
 * setup. The component under test changed; the rule it protects did not, and every assertion
 * below is the same one this file has always made.
 */

function renderRoster(parties: { name: string; done: boolean; isSelf: boolean }[], extra: Partial<Parameters<typeof WhoIsInThis>[0]> = {}) {
  return render(<WhoIsInThis parties={parties} {...extra} />)
}

describe('the roster on People and setup', () => {
  it('names the other parties and says who has checked in, as full sentences', () => {
    /*
     * U.8 REVIEW: the roster read "Hafsah · checked in" / "You · waiting" - a name with a status
     * word stuck on with a dot, which CLAUDE.md's wording rule (no pieces joined with dots) rules
     * out same as any other screen. It is "Hafsah has checked in." and "You have not checked in
     * yet." now, so this no longer looks for the bare word "waiting" - the honest sentence for
     * somebody who has not checked in does not use it.
     */
    renderRoster([
      { name: 'Hafsah', done: true, isSelf: false },
      { name: 'Abubakar', done: false, isSelf: true },
    ])
    expect(screen.getByText(/Who is in this/)).toBeTruthy()
    expect(screen.getByText('Hafsah has checked in.')).toBeTruthy()
    expect(screen.getByText('You have not checked in yet.')).toBeTruthy()
  })

  it('calls the reader "You" rather than repeating their own name at them', () => {
    renderRoster([
      { name: 'Hafsah', done: true, isSelf: false },
      { name: 'Abubakar', done: false, isSelf: true },
    ])
    expect(screen.getByText(/You/)).toBeTruthy()
    expect(screen.queryByText(/Abubakar/)).toBeNull()
  })

  it('says nothing about a roster on a check-in with one party', () => {
    /**
     * A roster of one is a sentence about yourself. It is also what a reader sees when the
     * service has filtered the others out, and chips over an empty list would advertise that
     * there is something they cannot see.
     */
    renderRoster([{ name: 'Hafsah', done: true, isSelf: true }])
    expect(screen.getByText(/Who is in this/)).toBeTruthy()
    expect(screen.queryByText('Hafsah has checked in.')).toBeNull()
  })

  it('says which kind of empty it is when peers are hidden', () => {
    /**
     * W14-5. With peer visibility off, the service filters the other parties out of the payload,
     * so this component gets a roster of one and used to render nothing at all. A participant
     * could not tell whether nobody else was here yet or whether they are not allowed to know -
     * and the second is a fact about the check-in they are in, not a detail.
     */
    renderRoster([{ name: 'Abubakar', done: false, isSelf: true }], { peersHidden: true })
    /*
     * U.8 third review: with no `leadName` given, this falls back to "Your lead" - the name-bearing
     * case is pinned separately in who-is-in-this-when-peers-are-hidden.spec.tsx, along with the
     * lead's own true sentence when she is the one reading it about herself.
     */
    expect(screen.getByText(/Your lead knows who is here/)).toBeTruthy()
    // And it still never says what anybody wrote.
    expect(screen.getByText(/will not see the others or what they wrote/)).toBeTruthy()
  })

  it('and a genuinely single-party ground still shows no roster', () => {
    // The distinction the flag exists for: one party is not the same as a hidden roster.
    renderRoster([{ name: 'Hafsah', done: true, isSelf: true }])
    expect(screen.getByText(/Who is in this/)).toBeTruthy()
    expect(screen.queryByText('Hafsah has checked in.')).toBeNull()
  })

  it('and never renders anything a person wrote', () => {
    renderRoster([
      { name: 'Hafsah', done: true, isSelf: false },
      { name: 'Abubakar', done: true, isSelf: true },
    ])
    screen.getByText(/Who is in this/)
    // The only per-person facts in the roster are a name and a state.
    expect(document.body.textContent ?? '').not.toMatch(/said|wrote|answered that/i)
  })
})

describe('the permission stays in the service', () => {
  const code = (rel: string) =>
    readFileSync(join(__dirname, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')

  it('the component does not decide who may be seen', () => {
    /**
     * If this component grows its own `peersVisible` check, the rule exists in two places and
     * they will disagree. The service filters the payload; the component draws what it is given.
     */
    expect(code('WhoIsInThis.tsx')).not.toMatch(/peersVisible|restrictExternalVisibility|hidePeers/)
  })

  it('and the pages build the roster from the payload rather than from a role', () => {
    const part = code('../../pages/grounds/GroundParticipantPage.tsx')
    expect(part).toMatch(/whoIsInThisParties = \(ground\.participants \?\? \[\]\)/)
  })

  it('and both pages pass the check-in\'s peer rule, so an empty roster can explain itself', () => {
    /**
     * FOUND BY BITE-CHECK. Removing this wiring from the participant page left all 550 tests
     * green: the component's own behaviour was pinned and the fact that anything passes it was
     * not. A prop nothing supplies is a feature nobody gets.
     */
    expect(code('../../pages/grounds/GroundParticipantPage.tsx'))
      .toMatch(/peersHidden=\{\(ground as any\)\.peersVisibleEffective === false\}/)
  })

  /**
   * AND THE VIEW THAT RUNS THE CHECK-IN IS NOT ONE OF THE PEOPLE THE RULE APPLIES TO.
   *
   * `peersVisibleEffective` is the rule BETWEEN THE PARTIES: on an evaluation-family ground they
   * check in without seeing each other. The lead's view passed it straight through, so a lead - or
   * an org admin, who reads the same page - was shown the party sentence: "Your lead knows who is
   * here; you will not see the others or what they wrote, and they will not see you." Said to an
   * admin, on a page that lists both parties by name and email on the next tab, under a banner
   * reading "You can see everything here, which is the point of being an admin".
   *
   * Found walking a second admin of a real organisation, not by reading the prop.
   */
  it('so the running view qualifies it by who is reading', () => {
    expect(code('../../pages/grounds/GroundAdminPage.tsx'))
      .toMatch(/whoIsInThisPeersHidden = \(ground as any\)\.peersVisibleEffective === false && !canRunThisGround/)
  })

  /** The rule itself is unchanged for everybody it does apply to. */
  it('and the party view still gets it unqualified', () => {
    expect(code('../../pages/grounds/GroundParticipantPage.tsx'))
      .not.toMatch(/peersVisibleEffective === false &&/)
  })
})
