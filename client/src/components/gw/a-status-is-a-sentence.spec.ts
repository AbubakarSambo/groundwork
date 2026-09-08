import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WHAT_A_STATUS_MEANS, whatThisStatusMeans } from './what-a-status-means-to-the-person-in-it'

/**
 * Zainab's Setup tab read "Status / AWAITING_PARTIES". The enum is the database's word for the row;
 * a person reading it has to guess which parties, and whether they are one of them.
 */
describe('a status is a sentence a person can read', () => {
  it('has a line for every status the app declares, so a new one cannot slip through as an enum', () => {
    const declared = readFileSync(join(__dirname, '../../types/index.ts'), 'utf8')
      .slice(0, undefined)
      .match(/export type GroundStatus =([\s\S]*?)\n\n/)![1]
      .match(/'([A-Z_]+)'/g)!.map(s => s.replace(/'/g, ''))
    expect(declared.length).toBeGreaterThan(5)
    expect(declared.filter(s => !(s in WHAT_A_STATUS_MEANS))).toEqual([])
  })

  it('never hands back SHOUTING_SNAKE_CASE', () => {
    for (const s of Object.keys(WHAT_A_STATUS_MEANS)) {
      expect(whatThisStatusMeans(s)).not.toMatch(/[A-Z]{2,}_/)
    }
  })

  it('falls back to the blunt word rather than inventing reassurance', () => {
    expect(whatThisStatusMeans('SOMETHING_NEW')).toBe('something new')
    expect(whatThisStatusMeans(null)).toBe('Not set')
  })

  it('the Setup card renders it through this, not raw', () => {
    const card = readFileSync(join(__dirname, 'MyParticipation.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(card).toMatch(/whatThisStatusMeans\(ground\.status\)/)
    expect(card).not.toMatch(/\{ground\.status\}/)
  })
})
