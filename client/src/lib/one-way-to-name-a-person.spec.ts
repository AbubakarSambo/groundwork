import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { personLabel, participantLabel, SOMEONE_WITH_NO_NAME } from './utils'

/**
 * ONE FORMAT FOR WHO SOMEBODY IS. W-UX-4, then decision 115 (B-058).
 *
 * The audit's line, found on two separate screens: "Some people show as email addresses, others as
 * names, in the same column." It reads as two different kinds of person, and it happened because
 * seven places each wrote their own fallback chain by hand - some starting at the name, some at the
 * role, some at the address.
 *
 * TWO HELPERS, AND THE DIFFERENCE BETWEEN THEM IS A PRIVACY RULE, NOT A STYLE PREFERENCE.
 *   `participantLabel` - how a party is shown to ANOTHER PARTY. Never the email, because a party's
 *      address can be hidden from the others and we name people by name regardless.
 *   `personLabel` - the LEAD's own view. Used to fall back to the address they typed, as a
 *      "legitimate last resort". Decision 115 removed that last resort too: E1 on Riverbank
 *      Trading's old data found the very same person read as a guessed name on the Context and
 *      Report tabs and as "Someone who has not given a name yet" on People. Now personLabel falls
 *      back to that same placeholder sentence instead, never the address.
 */
describe('personLabel says what a person would say out loud', () => {
  const user = { firstName: 'Jordan', lastName: 'Reyes' }

  it('their name first', () => {
    expect(personLabel({ user, roleAsDescribed: 'the new hire', email: 'j@x.test' })).toBe('Jordan Reyes')
  })

  it('then the placeholder sentence, never their address - a role in a list of people used to read as a job title, and an address read as a guessed name', () => {
    /* 10 Sep 2026: "runs the connect page · waiting" sat in WHO IS IN THIS as if it were a name. */
    expect(personLabel({ roleAsDescribed: 'the new hire', email: 'j@x.test' })).toBe(SOMEONE_WITH_NO_NAME)
  })

  /* Request 36: the role is never the name, not even with no address. `roleAsDescribed` is mostly the
     lead's own private sentence about the person; the lead reads it as their note, beside the name. */
  it('and never the role, even when there is no address either', () => {
    expect(personLabel({ roleAsDescribed: 'the new hire' })).toBe('a colleague')
    expect(personLabel({ roleAsDescribed: 'Daniel - Your sales manager, who you said is not meeting his agreed targets' })).toBe('a colleague')
  })

  /* "a teammate" became "a colleague", and "the lead" for a lead: Hafsah's decision and the engine's
     shared wording. The prototype never says "teammate". */
  it('never blank', () => {
    expect(personLabel(null)).toBe('a colleague')
    expect(personLabel({})).toBe('a colleague')
    expect(personLabel({ partyType: 'INITIATOR' })).toBe('the lead')
  })
})

describe('and the party-facing helper still refuses the address', () => {
  it('an email is not a name, even when it is the only thing we hold', () => {
    /** The rule this file must not quietly relax while tidying the other one. */
    expect(participantLabel({ email: 'j@x.test' } as any)).toBe('a colleague')
    expect(participantLabel({ email: 'j@x.test', roleAsDescribed: 'Head of Design' } as any)).toBe('a colleague')
  })
})

describe('nothing renders an address where a name belongs', () => {
  const read = (p: string) =>
    readFileSync(join(__dirname, '..', p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  /**
   * The seven hand-written chains that shipped. Each is the whole rendered value of a name slot, so
   * a match means an address is being shown as somebody's identity.
   */
  const ADDRESS_AS_IDENTITY = [
    /\{p\.email\}\{p\.roleAsDescribed/,
    /roleAsDescribed \|\| p\.email/,
    /p\?\.roleAsDescribed \|\| p\?\.email/,
    /\{u\.email \?\? 'A party'\}/,
    /<span>\{p\.email\}<\/span>/,
    /\{a\.email \?\? a\.participantId\}/,
    /lead\?\.email \?\? "your lead"/,
  ]

  /* 'pages/report/ReportPage.tsx' came off this list 1 October 2026, the moment ReportBody - its
     only content, and the only thing on this page that ever called personLabel - was deleted. See
     the comment at the top of ReportPage.tsx for where each of its name-resolving sections went:
     SessionReportPage.tsx and the components it draws (WhatToProbeThemOn.tsx,
     UpdatesToTheRecord.tsx) go through peopleLabels rather than personLabel directly, and
     BoardPage.tsx (already on this list's sibling sweep below) is where the board's own names are
     resolved. */
  for (const page of ['pages/grounds/GroundAdminPage.tsx']) {
    it(`${page} names people with a helper`, () => {
      const code = read(page)
      expect(ADDRESS_AS_IDENTITY.filter(re => re.test(code))).toEqual([])
      expect(code).toMatch(/\bpersonLabel\(/)
    })
  }
})

/**
 * AND THE OTHER SHAPE OF THE SAME BUG, WHICH THE LIST ABOVE DID NOT CATCH. W-UX-4.
 *
 * Not "show the address" but "show HALF the address": `email.split('@')[0]`, which renders
 * "hafsah · waiting" and "Led by abubakar" - lowercase, truncated, and looking like a login handle
 * beside real names. Found on the running page at phone width, on two screens, one of them two
 * lines below a comment that already called itself "the third place doing this".
 *
 * Four hand-written chains for one question is the shape of the problem. This bans the shape.
 */
describe('and half an address is not a name either', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap(name => {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) return walk(p)
      return /\.tsx?$/.test(name) && !name.includes('.spec.') ? [p] : []
    })

  it('nothing in the signed-in app splits an address to make a name', () => {
    const offenders: string[] = []
    for (const f of [...walk(join(__dirname, '../pages')), ...walk(join(__dirname, '../components'))]) {
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      /**
       * JoinPage is the one legitimate caller and is exempt by name: it is seeding a brand-new
       * account's firstName at the moment of creation, from the only string it has, and the person
       * can change it in Settings straight afterwards - which is a button that now exists.
       */
      if (f.endsWith('JoinPage.tsx')) continue
      if (/\bemail[^\n]*\.split\('@'\)\[0\]/.test(code)) offenders.push(f.split('/src/')[1])
    }
    expect(offenders).toEqual([])
  })
})
