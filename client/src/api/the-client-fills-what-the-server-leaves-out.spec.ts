import { describe, it, expect } from 'vitest'
import { fillTheShape } from './shapes'
import { apiClient } from './client'
import { serveThroughTheClient } from '@/test/serve-through-the-client'

/**
 * THE CLIENT FILLS WHAT THE SERVER LEAVES OUT, ONCE (Hafsah, 15 November 2026). An absent list or count is the empty one, so a component
 * reads it as present. What the server did send is never changed, and a part that is absent as a whole is not invented.
 */
describe('fillTheShape', () => {
  it('a board held back with no sections reads as a board with an empty list of sections', () => {
    const board = fillTheShape('/grounds/g1/board', { groundId: 'g1', renders: false }) as any
    expect(board.sections).toEqual([])
    expect(board.participants).toEqual([])
    expect(board.renders).toBe(false)
  })
  it('what the server sent is left as it is', () => {
    const sent = { sections: ['quickRead'], participants: [{ id: 'p' }] }
    expect(fillTheShape('/grounds/g1/board', sent)).toEqual({ ...sent, objectives: [], decisions: [], patterns: [] })
  })
  it('a grid that is there gets its lists, and a grid that is not there is not made up', () => {
    expect((fillTheShape('/grounds/g1/board', { checkInGrid: { sessions: [1] } }) as any).checkInGrid).toEqual({ sessions: [1], rows: [] })
    expect('checkInGrid' in (fillTheShape('/grounds/g1/board', {}) as any)).toBe(false)
  })
  it('"What success looks like" always has its count, in whichever answer it comes', () => {
    expect((fillTheShape('/grounds/g1/report/against-success', { stated: 'x' }) as any).spokenTo).toEqual({ count: 0, of: 0 })
    expect((fillTheShape('/grounds/g1/report/against-success', { spokenTo: { of: 3 } }) as any).spokenTo).toEqual({ count: 0, of: 3 })
    const inAReport = fillTheShape('/grounds/g1/report/session/2', { againstSuccess: { stated: 'x' } }) as any
    expect(inAReport.againstSuccess.conditions).toEqual([])
    expect(inAReport.againstSuccess.spokenTo).toEqual({ count: 0, of: 0 })
  })
  it('My work is filled only when it is on', () => {
    expect(fillTheShape('/grounds/g1/my-work', { on: false })).toEqual({ on: false })
    expect((fillTheShape('/grounds/g1/my-work', { on: true }) as any).coaching.better).toEqual([])
  })
  it('anything that is not an object, and any route it does not know, comes back as it came', () => {
    expect(fillTheShape('/today', null)).toBeNull()
    expect(fillTheShape('/nowhere', { a: 1 })).toEqual({ a: 1 })
  })
  it('is done on the way in, by the client every call goes through', async () => {
    serveThroughTheClient({ '/grounds/g1/board': { renders: false } })
    const r = await apiClient.get('/grounds/g1/board')
    expect(r.data.sections).toEqual([])
  })
})
