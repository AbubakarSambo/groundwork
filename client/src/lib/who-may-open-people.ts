/**
 * WHO MAY OPEN PEOPLE (/org/members): an admin, or anybody the server says may add people (`mayAddPeople`, served with the session).
 * The one reading of it, for the route's door and for the pages that link there, so a link is never offered to a door that will not open.
 * The server checks again on everything People does.
 */
export function mayOpenPeople(user: { role?: string | null; mayAddPeople?: boolean | null } | null | undefined): boolean {
  return user?.role === 'ADMIN' || user?.mayAddPeople === true
}
