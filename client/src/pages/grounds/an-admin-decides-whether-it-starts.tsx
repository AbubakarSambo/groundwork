import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { groundsApi } from '@/api/grounds'
import { Button } from '@/components/gw/kit'

/**
 * WHAT AN ADMIN SEES ON A CHECK-IN WAITING FOR THEM (U.5 review).
 *
 * Today's "… is waiting for you to approve it" opens the check-in itself. It had no Approve button
 * there, and the admin was shown the lead's own banner ("You can keep editing it … An admin in your
 * organisation sees it on their check-ins page"). Now an admin who is not its lead reads who set it
 * up, and can approve it or say no in the same place, with the same server calls as the check-ins
 * list. The server still decides: both calls are admin-only there.
 */
export function AnAdminDecidesWhetherItStarts({ groundId, setUpBy }: { groundId: string; setUpBy: string | null }) {
  const qc = useQueryClient()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const refresh = () => {
    for (const key of [['ground', groundId], ['grounds'], ['today'], ['awaiting-approval']]) void qc.invalidateQueries({ queryKey: key })
  }
  const approve = useMutation({
    mutationFn: () => groundsApi.approve(groundId),
    onSuccess: () => { refresh(); toast.success('Approved. The people involved can be invited now.') },
    onError: () => toast.error('Not approved. Nothing has changed. Try again.'),
  })
  const decline = useMutation({
    mutationFn: () => groundsApi.declineGround(groundId, reason),
    onSuccess: () => { refresh(); toast.success('Declined. Nobody was invited.') },
    onError: () => toast.error('Not declined. Nothing has changed. Try again.'),
  })
  return (
    <section className="gw-ci-waiting" aria-labelledby="admin-decides-h">
      <h2 id="admin-decides-h" className="gw-t-h3">This check-in is waiting for you to approve it</h2>
      <p className="gw-t-small">
        {setUpBy ? `${setUpBy} set it up. ` : ''}Nobody has been invited to it yet. Nothing goes out until you say so.
      </p>
      {declining ? (
        <div className="gw-ci-waiting-acts">
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
            placeholder="Why not? They will see this." aria-label="Why not? They will see this." />
          <Button size="small" onClick={() => decline.mutate()} disabled={decline.isPending}>Decline it</Button>
          <Button kind="secondary" size="small" onClick={() => { setDeclining(false); setReason('') }}>Keep it waiting</Button>
        </div>
      ) : (
        <div className="gw-ci-waiting-acts">
          <Button size="small" onClick={() => approve.mutate()} disabled={approve.isPending}>Approve</Button>
          <Button kind="secondary" size="small" onClick={() => setDeclining(true)}>Not this one</Button>
        </div>
      )}
    </section>
  )
}
