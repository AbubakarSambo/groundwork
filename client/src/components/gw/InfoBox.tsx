import { ReactNode } from 'react'

type Variant = 'blue' | 'green' | 'amber' | 'red'

export function InfoBox({ variant = 'blue', children }: { variant?: Variant; children: ReactNode }) {
  return <div className={`gw-box gw-box-${variant}`}>{children}</div>
}
