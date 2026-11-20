import type { ReactNode } from 'react'
import { Page, Empty, Button } from '@/components/gw/ui'

/**
 * A CARD THAT SAYS WHAT THE PERSON CANNOT HAVE ALWAYS GIVES THEM A WAY OUT (Hafsah, 15 November 2026).
 * "You're not in this check-in / Wairimu runs it and can add you." was a dead end with no button. Every page of this kind uses this one
 * component: the title, the plain sentence, whatever else it offers, and always a plain "Back to Today".
 */
export function NotHereCard({ title, children, more }: { title: string; children: ReactNode; more?: ReactNode }) {
  return (
    <Page narrow>
      <Empty
        title={title}
        action={(
          <div className="gwui-button-row">
            {more}
            <Button kind={more ? 'quiet' : 'secondary'} to="/today">Back to Today</Button>
          </div>
        )}
      >
        {children}
      </Empty>
    </Page>
  )
}
