import { describe, it, expect } from 'vitest'
import { groundTabs, type GroundTabKey } from './ground-tabs'

/**
 * A TAB'S NAME MEANS ONE THING, WHOEVER IS READING IT.
 *
 * `groundTabs()` used to return one list for everybody, on the reasoning that content differing by
 * role is the page's business and not this function's. Content differing by role IS fine. A NAME
 * differing by role is not.
 *
 * One key, `record`, was labelled "Sessions" on both views and rendered EVERYONE'S state on the one
 * that runs the check-in and YOUR OWN account on the other - same word, same position, same `?tab=`
 * value, different content, on two pages that are otherwise indistinguishable. That is what an
 * admin reported as not being able to tell the two views apart.
 *
 * They are two keys now. This is the guard that they stay two.
 */
const forViewer = (canRunThisCheckIn: boolean, isAParty: boolean) =>
  groundTabs({ canRunThisCheckIn, isAParty })

const keys = (canRun: boolean, party: boolean) => forViewer(canRun, party).map(t => t.key)

describe('one name means one thing', () => {
  it('everyone\'s state and your own account are separate tabs', () => {
    expect(keys(true, true)).toContain('sessions')
    expect(keys(true, true)).toContain('record')
  })

  it('THE COLLISION: no key ever carries two different labels', () => {
    const seen = new Map<GroundTabKey, string>()
    for (const canRun of [true, false]) {
      for (const party of [true, false]) {
        for (const tab of forViewer(canRun, party)) {
          const already = seen.get(tab.key)
          if (already !== undefined) expect(already).toBe(tab.label)
          seen.set(tab.key, tab.label)
        }
      }
    }
  })

  it('and no label is ever carried by two different keys', () => {
    const byLabel = new Map<string, GroundTabKey>()
    for (const canRun of [true, false]) {
      for (const party of [true, false]) {
        for (const tab of forViewer(canRun, party)) {
          const already = byLabel.get(tab.label)
          if (already !== undefined) expect(already).toBe(tab.key)
          byLabel.set(tab.label, tab.key)
        }
      }
    }
  })

  it('somebody who only runs it is not offered a record they do not have', () => {
    expect(keys(true, false)).toContain('sessions')
    expect(keys(true, false)).not.toContain('record')
  })

  it('and somebody who is only in it is not offered everyone else\'s state', () => {
    expect(keys(false, true)).toContain('record')
    expect(keys(false, true)).not.toContain('sessions')
  })

  it('a viewer who is neither still gets the tabs that are nobody\'s in particular', () => {
    // An admin looking at a check-in they neither lead nor take part in.
    const neither = keys(false, false)
    expect(neither).toEqual(['chat', 'report', 'context', 'settings'])
  })

  it('every list starts at the conversation, so the landing tab never moves', () => {
    for (const canRun of [true, false]) {
      for (const party of [true, false]) {
        expect(forViewer(canRun, party)[0].key).toBe('chat')
      }
    }
  })
})
