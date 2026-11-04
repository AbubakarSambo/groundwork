/**
 * THE PUBLIC HOLIDAYS A CHECK-IN DOES NOT OPEN ON (fix plan, pattern 4; quarter test, 24 December 2026). Kevin and Peter read "Tomorrow,
 * 8am: Your next check-in for Sales team, Q4 opens" on Christmas Eve: the schedule knew the team's working days and nothing else.
 *
 * The fixed-date holidays of the countries our organisations are in, read from the organisation's own time zone. Holidays that move
 * each year (Easter, the two Eids, Diwali) are not here yet: they need a date list per year, and until then a session may still open on
 * one. A zone we do not know gets the three days nearly everyone keeps.
 */
const EVERYWHERE = ['01-01', '12-25', '12-26'];
const BY_ZONE: Record<string, string[]> = {
  /* Kenya: New Year, Labour Day, Madaraka, Mazingira, Mashujaa, Jamhuri, Christmas, Boxing Day. */
  'Africa/Nairobi': ['01-01', '05-01', '06-01', '10-10', '10-20', '12-12', '12-25', '12-26'],
  /* Nigeria: New Year, Workers' Day, Democracy Day, Independence Day, Christmas, Boxing Day. */
  'Africa/Lagos': ['01-01', '05-01', '06-12', '10-01', '12-25', '12-26'],
};

/** Whether a calendar day (midnight UTC, as the schedule keeps days) is a public holiday where the organisation is. */
export function isAPublicHoliday(day: number, zone: string | null | undefined): boolean {
  const mmdd = new Date(day).toISOString().slice(5, 10);
  return (BY_ZONE[zone ?? ''] ?? EVERYWHERE).includes(mmdd);
}
