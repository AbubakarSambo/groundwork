/**
 * THE SWITCHES ARE GROUNDWORK'S, NEVER A CLIENT'S (Hafsah, 25 October 2026, night: "the switchboard, the release switches, the
 * scenario-to-board settings and any other internal controls must be visible and usable only to Groundwork's own ops team, never
 * to clients, including client admins").
 *
 * Every switch an organisation has, in one list, read and set only through the admin controller, which only Groundwork staff
 * (`isPlatformAdmin`) pass. Releases 3 to 9 and the direct morning had no writer at all and were set by hand in the database; they
 * are here now, so the ops team sets them where it sets the others. Nothing outside this list can be written through it.
 */
export const THE_ORGANISATION_SWITCHES = [
  { key: 'release1SalesBoardOn', name: 'Release 1, the sales board' },
  { key: 'release1bTabsOn', name: 'Release 1B, the new check-in tabs' },
  { key: 'release2CollectionsOn', name: 'Release 2, collect what is owed' },
  { key: 'release3InvoicesOn', name: 'Release 3, raising invoices on time' },
  { key: 'invoicesAfterASaleOn', name: 'Release 3, an invoice after each sale' },
  { key: 'release4TeamsOn', name: 'Release 4, every kind of team' },
  { key: 'release5ProjectsOn', name: 'Release 5, projects' },
  { key: 'release6DirectionOn', name: 'Release 6, direction' },
  { key: 'release7PeopleOn', name: 'Release 7, reviews built from check-ins' },
  { key: 'release8SituationsOn', name: 'Release 8, the remaining situations' },
  { key: 'release9PolicyOn', name: 'Release 9, the policy board and setup from documents' },
  { key: 'directMorningOn', name: 'Direct language' },
  { key: 'personJudgementsOn', name: 'What the lead reads about each person' },
] as const;

export type AnOrganisationSwitch = (typeof THE_ORGANISATION_SWITCHES)[number]['key'];

export function isAnOrganisationSwitch(key: string): key is AnOrganisationSwitch {
  return THE_ORGANISATION_SWITCHES.some((s) => s.key === key);
}
