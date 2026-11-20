/**
 * A MATTER IS SAID WITHOUT THE CLIENT'S NAME WHERE THE CLIENT IS ALREADY SAID BESIDE IT (fix plan 16 November, group 10; boards pass 4,
 * defect 16: "Nyota Logistics" over "Nyota Logistics contract review", in every client cell). The matter as typed is kept whole where it does
 * not start with the client's name. Where it does, only what follows the name is drawn, and nothing is drawn when nothing follows.
 */
export function theMatterWithoutTheClient(client: string | null | undefined, matter: string | null | undefined, startsASentence = true): string | null {
  const m = String(matter ?? '').trim()
  if (!m) return null
  const c = String(client ?? '').trim()
  if (!c || !m.toLowerCase().startsWith(c.toLowerCase())) return m
  const rest = m.slice(c.length).replace(/^[\s,:;-]+/, '').trim()
  return rest ? (startsASentence ? `${rest.charAt(0).toUpperCase()}${rest.slice(1)}` : rest) : null
}
