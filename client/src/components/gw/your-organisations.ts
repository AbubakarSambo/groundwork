import { useQuery } from '@tanstack/react-query'
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
 * Nothing switches from one click here: choosing another organisation opens "Choose an organisation"
 * (#/orgs), whose rows say the role you will have there, because the role change is the part nobody
 * expects. The one you are in is not offered.
 */
export type YourOrganisation = { id: string; name: string; slug: string; role: string; active: boolean }

export function useYourOrganisations() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const navigate = useNavigate()

  const { data: myOrgs = [], isFetched: loaded } = useQuery({
    queryKey: ['my-organizations'],
    queryFn: authApi.myOrganizations,
    enabled: isAuthenticated,
    retry: false,
  })

  /*
   * ONE CLICK IN THE MENU NEVER SWITCHES (W8-71, and U.3). A stray click on a row used to change which
   * organisation's data you saw and your role in one go, which is why a browser confirm box stood in
   * front of it. The confirm box is replaced by the prototype's own page: the row opens "Choose an
   * organisation" (#/orgs), where every row says the role you will have there before you press it.
   * The one you are in is not offered again.
   */
  function chooseOrganisation(o: YourOrganisation) {
    if (o.active) return
    navigate('/orgs')
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

  return { myOrgs, loaded, chooseOrganisation, onlyOneNotChosen, startMyOwnWorkspace }
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
