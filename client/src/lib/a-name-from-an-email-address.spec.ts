import { describe, it, expect } from 'vitest'
import { aNameFromAnEmailAddress, isAPublicMailDomain } from './a-name-from-an-email-address'

describe('a suggested organisation name from an email address', () => {
  it('takes the organisation from the address, like a Slack workspace', () => {
    expect(aNameFromAnEmailAddress('hafsah@coamana.com')).toBe('Coamana')
    expect(aNameFromAnEmailAddress('Wairimu@Baridi.co.ke')).toBe('Baridi')
    expect(aNameFromAnEmailAddress('sam@blue-river.co.uk')).toBe('Blue River')
    expect(aNameFromAnEmailAddress('ops@mail.acme.org')).toBe('Acme')
  })

  it('suggests nothing for a public mail service, in any country', () => {
    for (const e of ['sam@gmail.com', 'sam@yahoo.com', 'sam@outlook.com', 'sam@icloud.com', 'sam@yahoo.co.ke', 'sam@hotmail.fr', 'sam@proton.me']) {
      expect(aNameFromAnEmailAddress(e)).toBeNull()
    }
    expect(isAPublicMailDomain('coamana.com')).toBe(false)
  })

  it('and nothing for something that is not an address yet', () => {
    for (const e of ['', 'sam', 'sam@', 'sam@acme', '@acme.com']) expect(aNameFromAnEmailAddress(e)).toBeNull()
  })
})
