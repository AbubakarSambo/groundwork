import type { ATile } from './the-quick-read-agrees-with-the-report';

/**
 * THE QUICK READ AND THE BOARD COUNT THE WAITS ONCE (onboarding review: "2 waiting" above a list of four waits on Tobi).
 *
 * The Blockers tile counted only the waits raised in the open round, while the top line and the Blockers section count
 * every wait still open, as this reader may read them. Two sources for one number. The tile now takes the top line's
 * count, which is already cut to what this reader may read, and keeps its own sentence.
 *
 * Only a tile that counts waits ("2 waiting") is changed. A count of hard blockers, worries, or "None" is left alone, and
 * so is a board that has no count to give.
 */
export function theQuickReadCountsTheWaitsTheBoardCounts<T extends ATile>(tiles: T[] | null | undefined, waitsOnTheBoard: number | null | undefined): T[] | null | undefined {
  if (!Array.isArray(tiles) || !Number.isInteger(waitsOnTheBoard) || (waitsOnTheBoard as number) < 1) return tiles;
  return tiles.map((t) => (t?.label === 'Blockers' && /^\d+ waiting$/.test(String(t.value ?? '')) ? { ...t, value: `${waitsOnTheBoard} waiting` } : t));
}
