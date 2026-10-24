import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { groundsApi } from '@/api/grounds'
import { useAskStore } from '@/stores/ask'
import { Button } from '@/components/gw/ui'

/**
 * "CHECK IN YOURSELF" AND "ADD CONTEXT" (decision 133, change 6).
 *
 * After their first check-in the lead checks in when they choose. These two are always there for
 * them: on the check-in page and at the end of each report they read. "Check in yourself" opens their
 * own check-in (POST /grounds/:id/check-in-yourself, the lead only). "Add context" opens Ask already on
 * this check-in, the same way Context and resources does; there is no separate context chat.
 *
 * Drawn only for the lead. The server refuses anybody else, so hiding it is not the rule, only manners.
 */
export function TheLeadsOwnWayIn({ groundId, saying, asLinks }: { groundId: string; saying?: string; /** At the foot of a report, plain links: the prototype draws no buttons there. */ asLinks?: boolean }) {
  const navigate = useNavigate()
  const showForCheckInSetup = useAskStore((s) => s.showForCheckInSetup)
  const [opening, setOpening] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  async function checkInYourself() {
    setOpening(true)
    setFailed(null)
    try {
      const r = await groundsApi.checkInYourself(groundId)
      navigate(`/checkin/${r.checkInId}`)
    } catch (err: any) {
      const said = err?.response?.data?.message
      setFailed(typeof said === 'string' && said ? said : 'Your check-in did not open. Try again.')
    } finally {
      setOpening(false)
    }
  }

  return (
    <div data-testid="the-leads-own-way-in" style={{ display: 'grid', gap: 10 }}>
      {saying && <p className="gwui-panel-text" style={{ margin: 0 }}>{saying}</p>}
      {asLinks ? (
        <p className="t-small gw-links">
          <button type="button" className="gw-link" onClick={checkInYourself} disabled={opening}>{opening ? 'Opening…' : 'Check in yourself'}</button>
          <button type="button" className="gw-link" onClick={() => showForCheckInSetup(groundId)}>Add context</button>
        </p>
      ) : (
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <Button kind="primary" onClick={checkInYourself} disabled={opening}>
          {opening ? 'Opening…' : 'Check in yourself'}
        </Button>
        <Button kind="secondary" onClick={() => showForCheckInSetup(groundId)}>
          Add context
        </Button>
      </div>
      )}
      {failed && <p role="alert" className="gwui-panel-text" style={{ margin: 0 }}>{failed}</p>}
    </div>
  )
}

export const YOU_CHECK_IN_WHEN_YOU_CHOOSE = 'You check in when you choose. Use Check in yourself any time.'
