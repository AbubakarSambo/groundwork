/**
 * THE NAV ITEMS, AND WHO SEES WHICH (design-audit.md / group 1 rebuild).
 *
 * Pulled out of AppShell.tsx so a rebuilt page (MorePage.tsx) can read `navItemsFor` without
 * pulling in the rest of AppShell's own rendering, which is not part of this task and still uses
 * the old classes and inline styles a rebuilt page may not import even one level away (see
 * the-rebuilt-pages-use-only-the-new-parts.spec.ts). AppShell.tsx imports this file too, so there
 * is exactly one gate, in exactly one place, same as before.
 */
const NAV_ITEMS = [
  {
    /* TODAY (C1, U.5): what needs you now, first under the check-ins, with its count, as
       layout-computer.txt draws it ("Today 5"). Everybody has one. */
    label: 'Today',
    to: '/today',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="3.5" width="15" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M2.5 7.5h15M6.5 2v3M13.5 2v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    /* COMPANY (D2, U.15): the organisation's priorities and what feeds them, between Today and You,
       as layout-computer.txt draws it. Everybody in the organisation has it; a guest from another
       company does not, and the server refuses them too. What each reader is given is the server's. */
    label: 'Company',
    to: '/company',
    membersOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 17.5V8l7-4.5L17 8v9.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M2 17.5h16M8 17.5v-5h4v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    /* YOU (C2, U.12): what is yours, across your check-ins, as layout-computer.txt draws it under
       Today ("Today", "Company", "You"). Everybody has one, and only they may read it. */
    label: 'You',
    to: '/you',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M3 17.5c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    /* SUITES FOR A LEAD (E, U.17): the suites an admin has switched on, without the switches, under
       You, as layout-computer.txt draws it for Wairimu ("Today", "Company", "You", "Suites"). The
       server gives a lead only what is on, and refuses a member and a guest (GET /suites). */
    label: 'Suites',
    to: '/settings/suites',
    leadOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <rect x="11.5" y="2.5" width="6" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
  {
    /*
     * "ALL CHECK-INS", BECAUSE THE RAIL ABOVE IT IS ALREADY A LIST OF CHECK-INS.
     *
     * The top of this rail is a live list of the check-ins somebody is in, and this item said
     * "Check-ins" and went to a page of the same thing - so a person looking at their check-ins was
     * offered a link called check-ins, and reasonably asked which one they were meant to use.
     *
     * The page is not redundant: it holds the ones the rail does not show and the ways in to them.
     * What was redundant was the name.
     */
    /* The phone's bottom bar no longer draws these items (A1): it has its own few, and the rest are
       on "More". So there is no short name to keep; each item has the one name it is called. */
    label: 'All check-ins',
    to: '/grounds',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    /*
      THE BOARDS, WHICH HAD NO ADDRESS OF THEIR OWN.
      A board lived inside one check-in: to read three you opened three check-ins. Asked for
      plainly - "where do I go to see the archive and all team boards" - and there was nowhere to
      send anybody. It sits beside People because it is the same kind of thing: a view across the
      organisation rather than into one piece of work.
      WHO GETS THE DOOR. Anybody overseeing more than one check-in: an admin, who sees the
      organisation's, and a LEAD, who sees their department's. A participant reads the board of the
      check-in they are on and reaches it from that check-in, so a second address across several
      would be a page holding one row - and the member's rail is deliberately two items.
    */
    label: 'Boards',
    to: '/boards',
    oversightOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M2 7.5h16" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6 11h3M6 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    // "Team" and "Teams" sat side by side, one letter apart, pointing at
    // different pages - a coin-flip for anyone looking for the list of people in
    // their org. Named for what each one actually is. GW-011.
    label: 'People',
    to: '/org/members',
    adminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <circle cx="14" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
        <path d="M1 16c0-2.21 2.686-4 6-4s6 1.79 6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M14 12c1.657 0 3 1.12 3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  /**
   * "All grounds" is gone. W9-5.
   *
   * `grounds.list` already returns every ground in the organisation when the caller
   * is an admin, so the roster was the same data at a second address - one page with
   * two levels of detail, not two audiences. The one column it added that mattered,
   * who leads each ground, is on the grounds card now.
   */
  {
    /* A route with no door is a page nobody finds. This one is admin-only because every endpoint
       behind it is, and a nav item that leads to a refusal is worse than no nav item. */
    /* The design system's name for it. */
    label: 'Connections',
    to: '/settings/connections',
    adminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7.5 12.5l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 4.5l1.5-1.5a3.5 3.5 0 015 5L16 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
        <path d="M9 15.5L7.5 17a3.5 3.5 0 01-5-5L4 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    /* SUITES FOR AN ADMIN (E, U.17): under the organisation's name, between Connections and Plan and
       billing, as today-admin.txt draws it. Only an admin switches a suite on or off, on the server. */
    label: 'Suites',
    to: '/settings/suites',
    adminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <rect x="11.5" y="2.5" width="6" height="6" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
  {
    label: 'Plan and billing',
    to: '/billing',
    adminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
        <path d="M2 8.5h16" stroke="currentColor" strokeWidth="1.5" />
        <rect x="4" y="11" width="3" height="2" rx="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    /**
     * "ADMIN" MEANT TWO THINGS AND THIS WAS THE OTHER ONE. W-UX-3.
     *
     * The list page's header carries a pill saying what YOU are in this organisation - "Admin" or
     * "Team member" - and this rail item, pointing at Groundwork's own back office, wore the
     * identical word one inch away. Renaming the page's link and leaving this one would have moved
     * the collision rather than removed it.
     */
    label: 'Platform ops',
    to: '/admin',
    // Groundwork's own back-office, NOT the org admin's area. The route is
    // wrapped in RequirePlatformAdmin, so gating this on `adminOnly` showed
    // every org admin a door that bounced her straight back to /grounds.
    platformAdminOnly: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2.5L12.5 7.5H17.5L13.5 10.5L15 15.5L10 12.5L5 15.5L6.5 10.5L2.5 7.5H7.5L10 2.5Z"
          stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
          fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
      </svg>
    ),
  },
  {
    /**
     * SETTINGS WAS NOT IN THE RAIL AT ALL. It lived only in the user block at the bottom of the
     * grounds list, so the org's own settings - its name, the thing every page shows the team - were
     * reachable from one page and nowhere else.
     *
     * Not `adminOnly`: everybody has settings of their own here (notifications, WhatsApp number, what
     * we hold about them). The org section of that page is already gated inside it.
     */
    label: 'Settings',
    to: '/settings',
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="2.6" stroke="currentColor" strokeWidth="1.5" fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.15 : 0} />
        <path d="M10 2.2v2.2M10 15.6v2.2M4.5 4.5l1.6 1.6M13.9 13.9l1.6 1.6M2.2 10h2.2M15.6 10h2.2M4.5 15.5l1.6-1.6M13.9 6.1l1.6-1.6"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  /**
   * PROFILE IS NOT IN THE RAIL, because the page says it does not exist yet:
   * "A profile that gathers them in one place is not built yet." A permanent menu
   * item that admits it does nothing teaches people the menu is unreliable, and
   * this rail is about to become the main way around the product.
   *
   * The route stays - but I justified that with "links to a person's profile keep
   * working", and there are no such links. Not one, anywhere in the app. Measured
   * after the same mistake was found on the marketing site, where four pages were
   * written, deployed and reachable by nobody. So /profile/:id? is a page that can
   * only be opened by typing its URL, kept for callers that do not exist.
   *
   * Left in place rather than deleted because that is Hafsah's call and the page is
   * three sentences of true copy, worth linking the moment a person's name becomes
   * clickable. `every-page-can-be-reached.spec.ts` lists it as the one real gap so
   * it cannot be forgotten again.
   */
]

/**
 * WHO SEES WHICH NAV ITEM, DECIDED ONCE.
 *
 * There were three renderers - the collapsed rail, the expanded rail, the mobile bar - and three
 * different answers:
 *
 *   collapsed   `!item.adminOnly || user?.role === 'ADMIN'`   correct
 *   expanded    `!item.adminOnly`                             an ADMIN saw no People and no Billing
 *   mobile      no filter at all                              everybody saw both
 *
 * So an admin on a desktop had no way to reach billing from the rail, and a team member on a phone had
 * two doors that would bounce them. Her words: "billing and settings for the org should have its own
 * accessibility at the very top for the admin."
 *
 * A MEMBER THE QUEUE SERVES NEVER SAW "SUITES" EITHER (live walk at a hundred people, fault 1): the
 * item was gated on role alone (`LEAD` or `ADMIN`), so somebody holding finance or HR as an ordinary
 * member - who decides requests in their own queue every day - had no door to the suites at all. The
 * gate now also lets through anybody the approver's queue currently serves something to, by the same
 * quiet count `QueueLink` reads (`GET /suites/queue`); everybody else's sidebar is unchanged.
 */
export function navItemsFor(
  user: { role?: string; isPlatformAdmin?: boolean } | null | undefined,
  opts: { queueServesThem?: boolean } = {},
) {
  return NAV_ITEMS.filter(item => {
    if ((item as any).platformAdminOnly) return !!user?.isPlatformAdmin
    if ((item as any).adminOnly) return user?.role === 'ADMIN'
    /* A lead of this organisation, by role, or anybody else the approver's queue currently serves
       something to. An admin has the same page under the organisation's name. */
    if ((item as any).leadOnly) return user?.role === 'LEAD' || !!opts.queueServesThem
    /* Whoever oversees more than one check-in: the org's, or a department's. */
    if ((item as any).oversightOnly) return user?.role === 'ADMIN' || user?.role === 'LEAD'
    /* Everybody in the organisation, and not a guest from another company. */
    if ((item as any).membersOnly) return !!user && user.role !== 'GUEST'
    return true
  })
}
