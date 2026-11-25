import { describe, it, expect } from 'vitest'
import { namesToCallAmong, theNameToCall } from './names-that-tell-people-apart'

/** Page audit, 24 November, rows 11 and 15: "Juma" for three people on one board, and "Neema and Neema are invited". */
describe('the name to call somebody, told apart within the same list or check-in', () => {
  it('is the first name where nobody else shares it, and the whole name where somebody does', () => {
    const here = ['Juma Otieno', 'Neema Kamau', 'Amani Wekesa', 'Juma Test', 'Juma Test', 'Neema Wanjiru', 'Wairimu Njoroge']
    expect(here.map(namesToCallAmong(here))).toEqual(['Juma Otieno', 'Neema Kamau', 'Amani', 'Juma Test', 'Juma Test', 'Neema Wanjiru', 'Wairimu'])
  })
  it('counts the same person listed twice as one person', () => {
    expect(theNameToCall('Amani Wekesa', ['Amani Wekesa', 'Amani Wekesa'])).toBe('Amani')
  })
  it('says nothing for nobody', () => {
    expect(theNameToCall('', ['Juma Otieno'])).toBe('')
  })
})
