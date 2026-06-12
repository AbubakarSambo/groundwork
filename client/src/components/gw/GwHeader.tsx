import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { GroundworkLogo } from '@/components/gw/GroundworkLogo'

interface GwHeaderProps {
  back?: string | (() => void)
  backLabel?: string
  right?: ReactNode
  sub?: string
}

export function GwHeader({ back, backLabel = '← Back', right, sub }: GwHeaderProps) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (!back) return
    if (typeof back === 'function') back()
    else navigate(back)
  }

  return (
    <div className="gw-hdr">
      <div>
        <GroundworkLogo />
        {sub && <div style={{ fontSize: 11, color: 'var(--gw-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
        {right}
        {back && (
          <button className="gw-back" onClick={handleBack}>{backLabel}</button>
        )}
      </div>
    </div>
  )
}
