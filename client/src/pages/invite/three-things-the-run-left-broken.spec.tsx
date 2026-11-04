import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * THE LAST THREE FINDINGS FROM THE EIGHTEEN-GROUND RUN.
 *
 * None of them broke a request. All three were things a person would meet and think less of
 * the product for, which is why they are pinned in the same file - they were found together
 * and they fail together.
 */
const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('a check-in is not named after a database value', () => {
  const CREATE = strip(read('../grounds/CreateGroundPage.tsx'))

  it('does not fall back to the raw scenario enum', () => {
    /**
     * `${scenario?.replace(/_/g, ' ')} ground` produced NEW HIRE ground and PIP ground, and the
     * label travels into the invite subject line: "Sahar Okonkwo invited you to check in on:
     * PIP ground". Eighteen out of eighteen grounds in the run were named this way.
     */
    expect(CREATE).not.toMatch(/scenario\?\.replace\(\/_\/g, ' '\)\} ground/)
  })

  it('falls back to the words the person actually clicked', () => {
    /*
     * IT USED TO READ THE WIZARD. `/grounds/new` is a picker that hands over to the setup
     * conversation, whose save is the only thing that creates a check-in now - so the naming rule
     * moved there rather than being deleted with the screen that held it.
     *
     * The conversation's version is the same rule with better material: the situation as it was
     * CLASSIFIED from what the person said, then the first thing they actually typed, and only then
     * "Untitled". A raw enum value never reaches the label, which is what this file is about.
     */
    /*
     * U.6 REVIEW: the fallback is handed the situation the LEAD picked, in its plain words, not the
     * classified one: a check-in set up as "Help someone get back on track" was called "Drift".
     */
    const chat = readFileSync(join(__dirname, '..', 'enter', 'EntryChatPage.tsx'), 'utf8')
    expect(chat).toMatch(/export function fallbackGroundName\(/)
    /*
     * FAULTS 4 AND 6 (live walk, 6 October 2026): THE TWO COMMIT SITES NOW SHARE ONE
     * `theDefaultGroundName()` HELPER, rather than each repeating this exact call - the one place
     * the new hire's own default (naming the person rather than the situation) has to live so the
     * committed name and the side panel's preview can never disagree. The ordering this test pins
     * (the lead's pick first, then the classified situation, never her own first words) now lives
     * inside `theDefaultGroundName`, which still ends by calling `fallbackGroundName` the same way.
     */
    expect(chat).toMatch(/function theDefaultGroundName\(\): string \{\s*\n\s*return effectiveFallbackGroundName\(\s*\n\s*theSituationTheLeadPicked\(\) \?\? onboardingSelections\.classifiedScenario,/)
    expect(chat).toMatch(/return fallbackGroundName\(situation, where, saidSoFar\)/)
    expect(chat).not.toMatch(/fallbackGroundName\([^)]*onboardingSelections\.initial/)
    /* And the raw key is turned into words rather than printed: "NEW_HIRE" is not a name. */
    expect(chat).toMatch(/\.replace\(\/_\/g, ' '\)/)
  })

  it('and does NOT put the person in front of it, which this used to require', () => {
    /**
     * SUPERSEDED, DELIBERATELY, AND THE REVERSAL IS THE POINT.
     *
     * This assertion originally required the opposite: the label led with the participant's name,
     * "Abubakar, new hire", so the string would be recognisable in an inbox. That was a real
     * improvement on "NEW HIRE ground" and it was wrong for a reason not considered at the time.
     *
     * The label is interpolated into the invite subject: "{founder} invited you to check in on:
     * {label}". Leading with the name renders "invited you to check in on: Abubakar", which makes
     * the participant the subject of the sentence. A message to the second party is anchored to the
     * topic and never to the person, and that rule outranks inbox recognition.
     *
     * Kept rather than deleted because a future change that reaches for the name again should meet
     * this, not silence.
     */
    expect(CREATE).not.toMatch(/firstParticipant/)
    expect(CREATE).not.toMatch(/\$\{name\}, \$\{base/)
  })
})

describe('the status badge says something or says nothing', () => {
  const SHELL = strip(read('../../components/gw/AppShell.tsx'))

  it('stays silent on the ordinary working states', () => {
    /**
     * A check-in sits in AWAITING_PARTIES from its first invite until the last person finishes a
     * round - its entire working life. Every row in a ten-ground org wore "Awaiting parties",
     * including rows where everybody had already checked in.
     */
    expect(SHELL).toMatch(/SILENT_STATUSES = \['ACTIVE', 'AWAITING_PARTIES', 'OPEN'\]/)
    expect(SHELL).toMatch(/if \(SILENT_STATUSES\.includes\(status\)\) return null/)
  })

  it('and the row does not reserve space for a badge it will not render', () => {
    expect(SHELL).toMatch(/\{!SILENT_STATUSES\.includes\(g\.status\)/)
    expect(SHELL).not.toMatch(/\{g\.status !== 'ACTIVE' && \(/)
  })

  it('still speaks for the states that change whether you click', () => {
    /** Paused, closed, resolved, stalled, and waiting-on-somebody all still show. */
    /* AWAITING_LEAD no longer exists as a state anybody meets (10 Sep 2026). */
    expect(SHELL).toMatch(/AWAITING_APPROVAL.*PAUSED/)
  })
})

describe('an invited person reads the disclosure before they commit, once', () => {
  const INVITE = read('./InvitePage.tsx')

  it('the invite page carries the privacy briefing itself', () => {
    /**
     * It used to arrive on the NEXT screen, after "Add my version" - a disclosure shown after
     * the decision it is meant to inform.
     *
     * UPDATED 29 September, item 11 conflict A: "Nobody you work with reads it" said no manager
     * and no admin ever saw a person's words, which decision 1 in CLAUDE.md's privacy rules makes
     * untrue for every check-in. It is replaced by "Who can read what you write", built from the
     * check-in's own settings (`whoCanReadThis`) so it can never say something the server does not
     * actually do.
     */
    expect(INVITE).toMatch(/What happens to what you write/)
    expect(INVITE).toMatch(/Who can read what you write/)
    expect(INVITE).not.toMatch(/Nobody you work with reads it/)
    expect(INVITE).toMatch(/Nothing here trains a model/)
  })

  it('including the claim we deliberately do not dress up', () => {
    /** The honest half is the half most likely to be quietly dropped in a move like this. */
    expect(INVITE).toMatch(/not going to dress up/)
    expect(INVITE).toMatch(/processed by Google's models/)
  })

  it('and accepting stamps the acknowledgement so the chat opens on the first question', () => {
    /* `onSuccess: async (res)` since the resumed branch refreshes the user before navigating - see
       InvitePage. Matched on the handler rather than on whether it happens to be async. */
    const onSuccess = INVITE.slice(INVITE.search(/onSuccess: (?:async )?\(res\)/))
    expect(onSuccess).toMatch(/localStorage\.setItem\('gw_privacy_seen', '1'\)/)
  })

  it('the chat no longer shows it to anybody, by decision', () => {
    /*
     * This pinned the opposite: that ChatPage kept a full-page disclosure gate for anyone who had not
     * come through the invitation. "The nobody sees what you write page should be deleted." It is.
     * The disclosure lives where somebody decides whether to take part - this page and the admin's
     * guide - not in front of every session.
     */
    const CHAT = read('../chat/ChatPage.tsx')
    expect(CHAT).not.toMatch(/showPrivacyFirst/)
    expect(CHAT).not.toMatch(/WHAT_HAPPENS_TO_WHAT_YOU_WRITE/)
  })
})

describe('accepting an invitation never ends at another button', () => {
  const ACCEPT = readFileSync(
    join(__dirname, '../../../../api/src/modules/participants/participants.service.ts'), 'utf8',
  )

  it('mints a session 1 when the invited person has none', () => {
    /**
     * `checkInId: null` sent them to the check-in page, where accepting an invitation ended at a
     * third click - "Check in for session 1 of 2" - after the email link and "Add my version".
     */
    expect(ACCEPT).toMatch(/if \(!checkIn\) \{/)
    expect(ACCEPT).toMatch(/sessionNumber: 1, status: CheckInStatus\.NOT_STARTED/)
  })

  it('but never for somebody who has already completed one', () => {
    /**
     * The control, and the one that matters most: minting a fresh session 1 for a person at the
     * end of a finished ground would reopen a closed account.
     */
    expect(ACCEPT).toMatch(/const everCompleted = await this\.prisma\.checkIn\.findFirst/)
    expect(ACCEPT).toMatch(/if \(!everCompleted\) \{/)
  })

  it('and looks for an existing open session before creating anything', () => {
    const body = ACCEPT.slice(ACCEPT.indexOf('let checkIn = await'))
    expect(body.indexOf('findFirst')).toBeLessThan(body.indexOf('checkIn.create'))
  })
})
