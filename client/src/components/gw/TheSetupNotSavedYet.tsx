import { EdgeRow, Button } from '@/components/gw/ui'
import { finishSettingUp, EVERYTHING_YOU_SAID_IS_KEPT } from '@/pages/auth/entry-handover'

/**
 * THE SETUP NOT SAVED YET, AS ONE ROW (Hafsah's blocker, 31 October 2026: "nothing anyone says in setup is ever lost"). Today and
 * Check-ins draw this same row from the same reader (useAnUnfinishedSetup), so the two pages never disagree about it. "Carry on" opens
 * /start, which opens the setup as it was left; it continues a setup, it never starts one.
 */
export function TheSetupNotSavedYet({ unfinished, primary }: { unfinished: { theirWords: string | null }; primary?: boolean }) {
  return (
    <EdgeRow
      kind="decide"
      title={finishSettingUp(unfinished)}
      detail={EVERYTHING_YOU_SAID_IS_KEPT}
      to="/start"
      actions={<Button kind={primary ? 'primary' : 'secondary'} size="small" to="/start">Carry on</Button>}
    />
  )
}
