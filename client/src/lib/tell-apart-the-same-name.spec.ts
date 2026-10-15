import { describe, it, expect } from 'vitest'
import { whatTellsItApart, startedOn } from './tell-apart-the-same-name'

/*
 * WALKTHROUGH PASS 2, ITEM 1: "Help a new hire get started, from 27 September" listed three times
 * in the sidebar and the Ask panel, with nothing to tell a reader which row is which.
 */
describe('startedOn', () => {
  it('says when it started, from startsAt', () => {
    expect(startedOn({ id: 'a', label: 'x', startsAt: '2026-09-27T00:00:00.000Z' })).toBe('started 27 September')
  })

  it('falls back to createdAt when there is no startsAt', () => {
    expect(startedOn({ id: 'a', label: 'x', createdAt: '2026-10-01T00:00:00.000Z' })).toBe('started 1 October')
  })

  it('says nothing when neither is on record', () => {
    expect(startedOn({ id: 'a', label: 'x' })).toBeNull()
  })
})

describe('whatTellsItApart', () => {
  const sameNameTwice = [
    { id: 'a', label: 'Help a new hire get started', startsAt: '2026-09-27T00:00:00.000Z' },
    { id: 'b', label: 'Help a new hire get started', startsAt: '2026-10-01T00:00:00.000Z' },
    { id: 'c', label: 'Sales team, Q3', startsAt: '2026-09-01T00:00:00.000Z' },
  ]

  it('says what tells apart each one of several sharing a label', () => {
    expect(whatTellsItApart(sameNameTwice, sameNameTwice[0])).toBe('started 27 September')
    expect(whatTellsItApart(sameNameTwice, sameNameTwice[1])).toBe('started 1 October')
  })

  it('says nothing for a label nobody else on the list shares', () => {
    expect(whatTellsItApart(sameNameTwice, sameNameTwice[2])).toBeNull()
  })

  it('says nothing for a single check-in, never mind its label', () => {
    expect(whatTellsItApart([sameNameTwice[0]], sameNameTwice[0])).toBeNull()
  })
})
