import type { GroundStatus } from '@/types'

const CONFIG: Record<string, { label: string; cls: string }> = {
  OPEN:             { label: 'Open',               cls: 'gw-pill-blue'  },
  AWAITING_PARTIES: { label: 'Awaiting check-ins', cls: 'gw-pill-amber' },
  REPORT_READY:     { label: 'Report ready',        cls: 'gw-pill-green' },
  ACTIVE:           { label: 'Active',              cls: 'gw-pill-green' },
  RESOLVED:         { label: 'Resolved',            cls: 'gw-pill-gray'  },
  STALLED:          { label: 'Stalled',             cls: 'gw-pill-amber' },
  CLOSED:           { label: 'Closed',              cls: 'gw-pill-gray'  },
}

export function StatusPill({ status }: { status: GroundStatus | string }) {
  const cfg = CONFIG[status] ?? { label: status, cls: 'gw-pill-gray' }
  return <span className={`gw-pill ${cfg.cls}`}>{cfg.label}</span>
}
