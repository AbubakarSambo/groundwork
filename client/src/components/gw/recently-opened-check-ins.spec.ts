import { describe, it, expect, beforeEach } from 'vitest'
import { recentlyOpenedFor, rememberOpened } from './recently-opened-check-ins'

beforeEach(() => window.localStorage.clear())

describe('recentlyOpenedFor / rememberOpened', () => {
  it('starts empty', () => {
    expect(recentlyOpenedFor('u1')).toEqual([])
  })

  it('remembers what was opened, most recent first', () => {
    rememberOpened('u1', 'g1')
    rememberOpened('u1', 'g2')
    expect(recentlyOpenedFor('u1')).toEqual(['g2', 'g1'])
  })

  it('opening the same one again moves it back to the front, without a repeat', () => {
    rememberOpened('u1', 'g1')
    rememberOpened('u1', 'g2')
    rememberOpened('u1', 'g1')
    expect(recentlyOpenedFor('u1')).toEqual(['g1', 'g2'])
  })

  it('is kept per person: one person\'s history is not another\'s', () => {
    rememberOpened('u1', 'g1')
    expect(recentlyOpenedFor('u2')).toEqual([])
  })

  it('with no signed-in person, nothing is written and nothing is read back', () => {
    rememberOpened(null, 'g1')
    expect(recentlyOpenedFor(null)).toEqual([])
  })

  it('a blocked store (reading) just comes back empty, never throws', () => {
    const real = window.localStorage.getItem
    window.localStorage.getItem = () => { throw new Error('blocked') }
    try {
      expect(recentlyOpenedFor('u1')).toEqual([])
    } finally {
      window.localStorage.getItem = real
    }
  })

  it('a blocked store (writing) just is not remembered, never throws', () => {
    const real = window.localStorage.setItem
    window.localStorage.setItem = () => { throw new Error('blocked') }
    try {
      expect(() => rememberOpened('u1', 'g1')).not.toThrow()
    } finally {
      window.localStorage.setItem = real
    }
  })

  it('keeps only the most recent twenty', () => {
    for (let i = 0; i < 25; i++) rememberOpened('u1', `g${i}`)
    expect(recentlyOpenedFor('u1')).toHaveLength(20)
    expect(recentlyOpenedFor('u1')[0]).toBe('g24')
  })
})
