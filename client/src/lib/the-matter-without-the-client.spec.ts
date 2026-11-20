import { describe, it, expect } from 'vitest'
import { theMatterWithoutTheClient } from './the-matter-without-the-client'

describe('the matter under a client', () => {
  it('does not say the client twice', () => {
    expect(theMatterWithoutTheClient('Nyota Logistics', 'Nyota Logistics contract review')).toBe('Contract review')
  })
  it('keeps the matter\'s own capitals where it follows "on"', () => {
    expect(theMatterWithoutTheClient('Nyota Logistics', 'Nyota Logistics contract review', false)).toBe('contract review')
  })
  it('keeps a matter that does not start with the client, whole', () => {
    expect(theMatterWithoutTheClient('Nyota Logistics', 'Contract review for the Mombasa depot')).toBe('Contract review for the Mombasa depot')
  })
  it('says nothing where the matter is only the client, or nothing', () => {
    expect(theMatterWithoutTheClient('Nyota Logistics', 'Nyota Logistics')).toBeNull()
    expect(theMatterWithoutTheClient('Nyota Logistics', null)).toBeNull()
  })
})
