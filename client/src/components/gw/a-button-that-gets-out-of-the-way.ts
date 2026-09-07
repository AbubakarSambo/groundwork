/**
 * THE FEEDBACK BUTTON IS ALWAYS COVERING SOMETHING IMPORTANT.
 *
 * Her words, and the history of this file's neighbours proves it: the trigger has been moved three
 * times already - up to clear the mobile nav bar, down to clear a chat page's header, and offset
 * again when a sixth item arrived in the bar. Every move fixed one screen and put it on top of
 * something on another, because a fixed position is a bet that no screen will ever need that corner,
 * and every screen eventually does.
 *
 * So it stops being our bet and becomes the reader's: they drag it, and it stays where they put it.
 *
 * WHAT THIS FILE IS. The arithmetic only - where a drag lands, which corner it settles in, and how a
 * remembered position survives a window that has since been resized. Kept out of the component so it
 * can be tested without a browser, because every bug this has ever had is arithmetic: a button
 * half-off the screen, a button under the nav bar, a button whose remembered position was taken on a
 * monitor the person no longer has.
 */

export type Corner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export type Resting = {
  corner: Corner;
  /** Distance from the corner's own edges, in pixels. Never negative, never off-screen. */
  x: number;
  y: number;
};

/** Where it sits when nobody has ever moved it: where it has always been. */
export const WHERE_IT_STARTS: Resting = { corner: 'bottom-right', x: 20, y: 20 };

/**
 * Kept away from the very edge so the button is never half-off, and away from the mobile nav strip
 * so the oldest version of this bug cannot come back by dragging.
 */
export const A_MARGIN = 8;
export const THE_NAV_STRIP_IS = 60;

export type Where = { x: number; y: number };
export type Viewport = { width: number; height: number };

/**
 * WHICH CORNER A DRAG BELONGS TO, and it is not the nearest one by distance.
 *
 * Halves, not quadrants measured from the centre: a button dropped at the middle of the left edge is
 * on the left, and which half of the page it is in vertically decides top or bottom. Measuring
 * radially would send it to whichever corner happened to be closest, which for anything near a
 * midpoint is a coin toss the person did not ask to flip.
 */
export function whichCorner(at: Where, view: Viewport): Corner {
  const right = at.x > view.width / 2;
  const bottom = at.y > view.height / 2;
  return `${bottom ? 'bottom' : 'top'}-${right ? 'right' : 'left'}` as Corner;
}

/** A drop, turned into a resting place measured from its own corner. */
export function whereItLands(at: Where, view: Viewport, size = 44): Resting {
  const corner = whichCorner(at, view);
  const fromRight = corner.endsWith('right');
  const fromBottom = corner.startsWith('bottom');
  return keepItOnScreen(
    {
      corner,
      x: Math.round(fromRight ? view.width - at.x - size : at.x),
      y: Math.round(fromBottom ? view.height - at.y - size : at.y),
    },
    view,
    size,
  );
}

/**
 * A REMEMBERED POSITION IS A CLAIM ABOUT A WINDOW THAT MAY NO LONGER EXIST.
 *
 * Somebody drags it on a wide monitor, then opens the same account on a phone. The stored offsets
 * are honoured blindly and the button is somewhere off the side of the screen - present, clickable
 * by nothing, and impossible to drag back because you cannot grab what you cannot see.
 *
 * So every read goes through this, not just every write.
 */
export function keepItOnScreen(resting: Resting, view: Viewport, size = 44): Resting {
  const room = {
    x: Math.max(A_MARGIN, view.width - size - A_MARGIN),
    y: Math.max(A_MARGIN, view.height - size - A_MARGIN),
  };
  /* The nav strip only exists at the bottom and only on a narrow screen. Anywhere else this floor
     is just the ordinary margin. */
  const floor = resting.corner.startsWith('bottom') && view.width < 768 ? THE_NAV_STRIP_IS + A_MARGIN : A_MARGIN;
  return {
    corner: resting.corner,
    x: Math.min(Math.max(resting.x, A_MARGIN), room.x),
    y: Math.min(Math.max(resting.y, floor), room.y),
  };
}

/** The CSS the corner implies, so the component never works it out twice. */
export function asStyle(resting: Resting): Record<string, string> {
  const style: Record<string, string> = {};
  style[resting.corner.startsWith('bottom') ? 'bottom' : 'top'] = `${resting.y}px`;
  style[resting.corner.endsWith('right') ? 'right' : 'left'] = `${resting.x}px`;
  return style;
}

const KEY = 'gw-feedback-button-position';

/** Reading never throws and never returns something off-screen. */
export function whereTheyLeftIt(view: Viewport): Resting {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return WHERE_IT_STARTS;
    const parsed = JSON.parse(raw) as Partial<Resting>;
    if (!parsed || typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return WHERE_IT_STARTS;
    const corner: Corner = (['bottom-right', 'bottom-left', 'top-right', 'top-left'] as Corner[]).includes(
      parsed.corner as Corner,
    )
      ? (parsed.corner as Corner)
      : WHERE_IT_STARTS.corner;
    return keepItOnScreen({ corner, x: parsed.x, y: parsed.y }, view);
  } catch {
    return WHERE_IT_STARTS;
  }
}

export function rememberIt(resting: Resting): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(resting));
  } catch {
    /* A private window refusing storage is not a reason for a button to stop working. */
  }
}

/**
 * WAS THAT A DRAG OR A PRESS?
 *
 * Without this the button either stops opening feedback (every click is read as a tiny drag) or
 * cannot be moved (every drag is read as a click). Four pixels is below what a hand does by accident
 * and well under what a person means by moving something.
 */
export const A_DRAG_IS_AT_LEAST = 4;

export function theyMeantToMoveIt(from: Where, to: Where): boolean {
  return Math.abs(to.x - from.x) >= A_DRAG_IS_AT_LEAST || Math.abs(to.y - from.y) >= A_DRAG_IS_AT_LEAST;
}
