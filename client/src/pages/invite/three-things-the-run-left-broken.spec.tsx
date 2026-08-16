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

describe('a ground is not named after a database value', () => {
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
    expect(CREATE).toMatch(/groundNameFallback\(/)
    expect(CREATE).toMatch(/cardLabel\?\.trim\(\)/)
  })

  it('and puts the named person in front of them when there is one', () => {
    expect(CREATE).toMatch(/firstParticipant/)
  })
})

describe('the status badge says something or says nothing', () => {
  const SHELL = strip(read('../../components/gw/AppShell.tsx'))

  it('stays silent on the ordinary working states', () => {
    /**
     * A ground sits in AWAITING_PARTIES from its first invite until the last person finishes a
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
    expect(SHELL).toMatch(/AWAITING_LEAD.*AWAITING_APPROVAL.*PAUSED/)
  })
})

describe('an invited person reads the disclosure before they commit, once', () => {
  const INVITE = read('./InvitePage.tsx')

  it('the invite page carries the privacy briefing itself', () => {
    /**
     * It used to arrive on the NEXT screen, after "Add my version" - a disclosure shown after
     * the decision it is meant to inform.
     */
    expect(INVITE).toMatch(/What happens to what you write/)
    expect(INVITE).toMatch(/Nobody you work with reads it/)
    expect(INVITE).toMatch(/Nothing here trains a model/)
  })

  it('including the claim we deliberately do not dress up', () => {
    /** The honest half is the half most likely to be quietly dropped in a move like this. */
    expect(INVITE).toMatch(/not going to dress up/)
    expect(INVITE).toMatch(/processed by Google's models/)
  })

  it('and accepting stamps the acknowledgement so the chat opens on the first question', () => {
    const onSuccess = INVITE.slice(INVITE.indexOf('onSuccess: (res)'))
    expect(onSuccess).toMatch(/localStorage\.setItem\('gw_privacy_seen', '1'\)/)
  })

  it('the chat still shows it to anyone who did NOT come through this page', () => {
    /** The control. Removing a gate must not remove the disclosure for a returning participant. */
    const CHAT = read('../chat/ChatPage.tsx')
    expect(CHAT).toMatch(/gw_privacy_seen/)
    expect(CHAT).toMatch(/showPrivacyFirst/)
  })
})
