import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { groundsApi } from '@/api/grounds'
import { useAuthStore } from '@/stores/auth'
import { GroundAdminPage } from './GroundAdminPage'
import { GroundParticipantPage } from './GroundParticipantPage'

/**
 * ONE URL FOR A GROUND, AND IT LANDS YOU ON YOUR OWN VIEW.
 *
 * `/grounds/:id` was the lead's page. The rail links every ground to it. So a participant clicking
 * their own ground - the obvious thing to do, the only thing the rail offers - was told:
 *
 *   "This view is for whoever runs this ground."
 *
 * with a button to go and find their real page at `/grounds/:id/p`. The refusal screen was written
 * carefully, said who the view was for, and offered the way on; it was still a wall between somebody
 * and their own record, reached by clicking their own ground's name.
 *
 * This decides first and sends nobody to a refusal. Whoever runs the ground gets the lead's view;
 * everybody else gets theirs.
 *
 * `/grounds/:id/p` stays, and is not a fallback for a mistake: a lead who is ALSO a party needs their
 * own party view, and that is where it lives. The link to it from the lead's view is what makes the
 * two parts a person can hold visible, which is what she asked about.
 *
 * WHY A ROUTER RATHER THAN ONE MERGED PAGE. The two views are 519 lines between them and hold
 * different write paths - releasing a report, inviting people, signing off an account. Merging them
 * in the same pass as fixing the wall would put every one of those behind one new set of branches.
 * The tab order, which is the part she could see was wrong, is shared in `ground-tabs.ts` instead, so
 * both views read the same list and cannot drift again.
 */
export function GroundPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore(s => s.user)

  const { data: ground, isLoading } = useQuery({
    queryKey: ['ground', id],
    queryFn: () => groundsApi.get(id!),
    enabled: !!id,
    retry: false,
  })

  /**
   * While it loads, render the lead's page. It draws its own loading and not-found states, which is
   * the same query and therefore already warm - a spinner here would be a second one.
   */
  if (isLoading || !ground) return <GroundAdminPage />

  const isInitiator = (ground as any).initiatorId === user?.id
  const isOrgAdmin = user?.role === 'ADMIN' && (ground as any).organizationId === user?.organizationId
  return isInitiator || isOrgAdmin ? <GroundAdminPage /> : <GroundParticipantPage />
}
