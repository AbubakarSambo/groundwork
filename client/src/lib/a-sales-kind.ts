/**
 * A SALES CHECK-IN, OF EITHER SALES KIND (Release 1). "sales team" is one team selling (Drop Access); "sales org" is a sales
 * organisation of several teams. Both are drawn the same sales board until Release 4 draws the sales organisation's own, as
 * the server serves them (api board/the-kind-of-work.ts, isASalesKind). Ask this, never `=== 'sales org'`.
 *
 * Kept in its own file, not in api/board.ts, so a spec that mocks the board's API still draws the sales board.
 */
export function isASalesKind(kind: unknown): boolean {
  return kind === 'sales team' || kind === 'sales org'
}
