import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { checkInLinksApi } from '@/api/check-in-links'
import { Section, RowList, Row, Note } from '@/components/gw/ui'
import { whenItWas } from '@/lib/a-date-reads-the-same-everywhere'

/**
 * WAITING ON OTHER TEAMS, AND ASKED OF THIS CHECK-IN BY OTHER TEAMS (D3, U.16). The wording is
 * copied from docs/prototype/screens/B5-the-board/board-as-lead.txt and
 * docs/prototype/screens/D3-links-and-load/asked-of-operations.txt.
 *
 * The server serves each reader only links from check-ins they may open (GET /grounds/:id/links);
 * each part is drawn only when it has something in it.
 *
 * NOT SAID HERE, ON PURPOSE:
 *   - "These show on their boards too": the other board shows a request only to its readers who may
 *     open this check-in too, so for most of them it does not show, and the sentence would not be true.
 *   - "See where it started", and the line after "Asked" such as "Not decided." or "The Mombasa
 *     depot’s count is due Friday.": they are the engine's to write (request 18).
 * If the links do not load, nothing is drawn; the rest of the board is unaffected.
 */
export function CheckInLinks({ groundId, label }: { groundId: string; label: string | null }) {
  const { data } = useQuery({
    queryKey: ['check-in-links', groundId],
    queryFn: () => checkInLinksApi.get(groundId),
    staleTime: 30_000,
    retry: false,
  })
  if (!data) return null
  const waiting = data.waitingOnOtherTeams ?? []
  const asked = data.askedOfThisCheckIn ?? []
  const day = (at: string) => whenItWas(at, 'dayAndMonth')

  return (
    <>
      {waiting.length > 0 && (
        <Section heading="Waiting on other teams">
          <RowList label="Waiting on other teams">
            {waiting.map((w) => (
              <Row key={w.id} columns="1fr">
                <div>
                  <div><strong>{w.team ? `${w.team}: ${w.what}` : w.what}</strong></div>
                  <Note>{`Asked ${day(w.asked)}.`}</Note>
                  {w.open && <Link to={w.open.to}>{`Open in ${w.open.label}`}</Link>}
                </div>
              </Row>
            ))}
          </RowList>
        </Section>
      )}
      {asked.length > 0 && (
        <Section heading={`Asked of ${label || 'this check-in'} by other teams`}>
          <RowList label={`Asked of ${label || 'this check-in'} by other teams`}>
            {asked.map((a) => (
              <Row key={a.id} columns="1fr">
                <div>
                  <div><strong>{`${a.team}: ${a.what}`}</strong></div>
                  <Note>{a.askedBy ? `Asked by ${a.askedBy}, ${day(a.asked)}.` : `Asked ${day(a.asked)}.`}</Note>
                  <Link to={a.open.to}>{`Open in ${a.open.label}`}</Link>
                </div>
              </Row>
            ))}
          </RowList>
        </Section>
      )}
    </>
  )
}
