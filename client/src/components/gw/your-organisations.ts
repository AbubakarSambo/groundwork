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
/** `joinedHow`: why they are in it, where the server knows (U.3 review). Null or absent: no reason is given. */
export type YourOrganisation = { id: string; name: string; slug: string; role: string; active: boolean; joinedHow?: 'list' | 'domain' | 'link' | null }

/**
 * "You are in Coamana because …", only with a reason the server gave (U.3 review). It used to say "your
 * email address was on its list of people" to everybody, including people who joined by domain or link.
 */
export function whyYouAreIn(o: Pick<YourOrganisation, 'name' | 'joinedHow'>, email?: string | null): string | null {
  if (o.joinedHow === 'list') return `You are in ${o.name} because your email address was on its list of people.`
  if (o.joinedHow === 'link') return `You are in ${o.name} because you joined through its invite link.`
  if (o.joinedHow === 'domain') {
    const at = (email ?? '').lastIndexOf('@')
    return at > 0
      ? `You are in ${o.name} because anyone with an @${email!.slice(at + 1).toLowerCase()} email can join it.`
      : `You are in ${o.name} because anyone with your email domain can join it.`
  }
  return null
}

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

/**
 * What the person is in this organisation, in the People page's words (A4, U.3 review): "Admin",
 * "Can open check-ins", "Takes part" or "Guest". The sidebar and "More" said "Lead" and "Member",
 * words the People page never uses. One definition: people-here's roleWord adds "Owner" on top.
 */
export function roleWord(role: string | null | undefined): string {
  const r = (role ?? '').toUpperCase()
  if (r === 'ADMIN') return 'Admin'
  if (r === 'LEAD') return 'Can open check-ins'
  if (r === 'GUEST') return 'Guest'
  return 'Takes part'
}

/**
 * What a row on "Choose an organisation" says to a screen reader, in full sentences (U.3 review):
 * "Open Baridi Appliances. You are an admin there. 3 new things need you." The one you are in says so.
 */
export function aRowSays(o: Pick<YourOrganisation, 'name' | 'role' | 'active'>, newCount = 0): string {
  const r = (o.role ?? '').toUpperCase()
  const there = r === 'ADMIN' ? 'You are an admin there.'
    : r === 'LEAD' ? 'You can open check-ins there.'
      : r === 'GUEST' ? 'You are a guest there.'
        : 'You take part there.'
  const first = o.active ? `${o.name}. You are in it now.` : `Open ${o.name}.`
  const news = newCount === 1 ? ' 1 new thing needs you.' : newCount > 1 ? ` ${newCount} new things need you.` : ''
  return `${first} ${there}${news}`
}
