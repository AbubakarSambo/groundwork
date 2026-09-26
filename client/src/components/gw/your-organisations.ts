import { toast } from 'sonner'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

/**
 * THE ORGANISATIONS A PERSON BELONGS TO, AND MOVING BETWEEN THEM.
 *
 * One place, used by the sidebar's organisation menu on a computer and by the "More" page on a phone,
 * so the two can never ask different questions or switch differently. Phones had no way to switch
 * organisation at all before the "More" page.
 *
 * Nothing switches without a confirm that names the organisation and the role you will have there,
 * because the role change is the part nobody expects. The one you are in is not offered.
 */
export type YourOrganisation = { id: string; name: string; slug: string; role: string; active: boolean }

export function useYourOrganisations() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()

  const { data: myOrgs = [], isFetched: loaded } = useQuery({
    queryKey: ['my-organizations'],
    queryFn: authApi.myOrganizations,
    enabled: isAuthenticated,
    retry: false,
  })

  const switchOrg = useMutation({
    mutationFn: (organizationId: string) => authApi.switchOrganization(organizationId),
    onSuccess: (res) => {
      setAuth(res.user, res.accessToken)
      window.location.assign('/grounds')
    },
    onError: () => toast.error('Could not switch organisation. Try again.'),
  })

  /* No confirm box (U.3): every row already says the role you will have there, as the prototype's
     "Choose an organisation" does. The one you are in is not switched to again. */
  function chooseOrganisation(o: YourOrganisation) {
    if (o.active || switchOrg.isPending) return
    switchOrg.mutate(o.id)
  }

  /*
    AND THE PERSON WITH ONE MEMBERSHIP THEY DID NOT CHOOSE.

    Hafsah, 23 September 2026: "someone is my account and created their own account and keep showing
    up to my account. And they cannot switch to their." Somebody joined to a company because their
    address was on its roster has exactly one organisation, so they are offered the door to their own.
  */
  const onlyOneNotChosen = myOrgs.length === 1 && myOrgs[0].role?.toUpperCase() !== 'ADMIN'

  /* "Create an organisation" (A3, #/org-new) asks its name first. No confirm box: the page is the question. */
  function startMyOwnWorkspace() {
    navigate('/org-new')
  }

  return { myOrgs, loaded, chooseOrganisation, switching: switchOrg.isPending, onlyOneNotChosen, startMyOwnWorkspace }
}

/** Two letters for a square: the first letters of the first two words, or the first two letters. */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** What the person is in this organisation, in one ordinary word. */
export function roleWord(role: string | null | undefined): string {
  const r = (role ?? '').toUpperCase()
  if (r === 'ADMIN') return 'Admin'
  if (r === 'LEAD') return 'Lead'
  if (r === 'GUEST') return 'Guest'
  return 'Member'
}
