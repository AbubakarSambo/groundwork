import { useNavigate, useParams } from 'react-router-dom'
import { TheSessionsReport } from '@/components/gw/TheSessionsReport'

/**
 * ONE ROUND'S REPORT, FOR SOMEBODY WHO HAS NO SESSION OF THEIR OWN ON IT.
 *
 * A lead who runs a check-in without giving an account, and an org admin looking in, both have a
 * legitimate reason to read a round and no check-in id to reach it by. Everybody else opens their
 * own session, which carries their own report above this same view.
 */
export default function RoundReportPage() {
  const { id, sessionNumber } = useParams<{ id: string; sessionNumber: string }>()
  const navigate = useNavigate()
  const n = Number(sessionNumber)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 60px' }}>
      <button
        onClick={() => navigate(`/grounds/${id}?tab=report`)}
        style={{ background: 'none', border: 'none', padding: 0, fontSize: 12.5, color: 'var(--gw-navy)', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 14 }}
      >
        &larr; All sessions
      </button>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>Session {n}</div>
      <div style={{ fontSize: 12, color: 'var(--gw-sub)', marginBottom: 18 }}>
        What the accounts show for this session. It never quotes anyone.
      </div>
      {!!id && Number.isFinite(n) && <TheSessionsReport groundId={id} sessionNumber={n} />}
    </div>
  )
}
