import { describe, it, expect, beforeEach } from 'vitest'
import {
  A_MARGIN, THE_NAV_STRIP_IS, WHERE_IT_STARTS, asStyle, keepItOnScreen, rememberIt,
  theyMeantToMoveIt, whereItLands, whereTheyLeftIt, whichCorner,
} from './a-button-that-gets-out-of-the-way'

const wide = { width: 1440, height: 900 }
const phone = { width: 375, height: 812 }

describe('which corner a drop belongs to', () => {
  it('reads halves, not distance to the nearest corner', () => {
    /* Dropped at the middle of the left edge: on the left, and in the top half. Measuring radially
       from the centre would make this a coin toss between two corners the person did not pick. */
    expect(whichCorner({ x: 4, y: 440 }, wide)).toBe('top-left')
    expect(whichCorner({ x: 4, y: 460 }, wide)).toBe('bottom-left')
    expect(whichCorner({ x: 1400, y: 860 }, wide)).toBe('bottom-right')
    expect(whichCorner({ x: 1400, y: 40 }, wide)).toBe('top-right')
  })
})

describe('where a drop lands', () => {
  it('measures from the corner it chose, not from the origin', () => {
    const landed = whereItLands({ x: 1300, y: 800 }, wide, 44)
    expect(landed.corner).toBe('bottom-right')
    expect(landed.x).toBe(1440 - 1300 - 44)
    expect(landed.y).toBe(900 - 800 - 44)
  })
})

describe('it is never off-screen, whatever it was told', () => {
  it('refuses a position past the right edge', () => {
    const held = keepItOnScreen({ corner: 'bottom-left', x: 5000, y: 20 }, phone)
    expect(held.x).toBeLessThanOrEqual(phone.width - 44 - A_MARGIN)
  })

  it('refuses a negative offset', () => {
    const held = keepItOnScreen({ corner: 'top-left', x: -300, y: -300 }, wide)
    expect(held.x).toBe(A_MARGIN)
    expect(held.y).toBe(A_MARGIN)
  })

  it('keeps the oldest version of this bug from coming back by hand', () => {
    /* The nav strip is 60px of fixed bottom bar on a narrow screen. Dragging the button into it is
       exactly the overlap the CSS offsets were written to cure. */
    const held = keepItOnScreen({ corner: 'bottom-right', x: 12, y: 0 }, phone)
    expect(held.y).toBeGreaterThanOrEqual(THE_NAV_STRIP_IS)
  })

  it('leaves the nav strip out of it where there is no nav strip', () => {
    /* Wide screen: the bar is not there, so the floor is the ordinary margin and a person can put
       the button right down in the corner. */
    expect(keepItOnScreen({ corner: 'bottom-right', x: 12, y: 0 }, wide).y).toBe(A_MARGIN)
    /* Top corners never have one at any width. */
    expect(keepItOnScreen({ corner: 'top-right', x: 12, y: 0 }, phone).y).toBe(A_MARGIN)
  })
})

describe('a position taken on one screen, read back on another', () => {
  beforeEach(() => localStorage.clear())

  it('does not put the button somewhere the phone cannot reach', () => {
    /* THE BUG THIS EXISTS FOR: dragged to the far side of a wide monitor, opened on a phone. The
       stored offsets are honoured, the button is off the side, and it cannot be dragged back
       because you cannot grab what you cannot see. */
    rememberIt({ corner: 'bottom-left', x: 1200, y: 40 })
    const back = whereTheyLeftIt(phone)
    expect(back.x).toBeLessThanOrEqual(phone.width - 44 - A_MARGIN)
  })

  it('gives the default when nothing was ever stored', () => {
    expect(whereTheyLeftIt(wide)).toEqual(WHERE_IT_STARTS)
  })

  it('gives the default rather than throwing on rubbish', () => {
    localStorage.setItem('gw-feedback-button-position', '{oh dear')
    expect(whereTheyLeftIt(wide)).toEqual(WHERE_IT_STARTS)
    localStorage.setItem('gw-feedback-button-position', '{"corner":"middle","x":"ten"}')
    expect(whereTheyLeftIt(wide)).toEqual(WHERE_IT_STARTS)
  })

  it('remembers what it was given', () => {
    rememberIt({ corner: 'top-left', x: 30, y: 40 })
    expect(whereTheyLeftIt(wide)).toEqual({ corner: 'top-left', x: 30, y: 40 })
  })
})

describe('a drag and a press are told apart', () => {
  it('a press is not a drag', () => {
    expect(theyMeantToMoveIt({ x: 100, y: 100 }, { x: 101, y: 102 })).toBe(false)
  })
  it('a move is', () => {
    expect(theyMeantToMoveIt({ x: 100, y: 100 }, { x: 100, y: 140 })).toBe(true)
  })
})

describe('the CSS the corner implies', () => {
  it('positions from the corner it chose, and from nothing else', () => {
    expect(asStyle({ corner: 'top-left', x: 8, y: 9 })).toEqual({ top: '9px', left: '8px' })
    expect(asStyle({ corner: 'bottom-right', x: 8, y: 9 })).toEqual({ bottom: '9px', right: '8px' })
  })
})
