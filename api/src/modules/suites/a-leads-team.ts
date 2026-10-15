/**
 * WHO IS IN A LEAD'S TEAM, FOR THE SUITES' BOARDS (U.17): somebody whose directory entry names the
 * lead as their manager, or who shares the lead's department. A blank department is nobody's, and a
 * lead is not in their own team. The product's own rule for what a lead may read is their department
 * (grounds/who-may-read-this-check-in.ts); the manager is added, because a manager decides for the
 * people who report to them whatever department the directory gives them.
 */
export interface InTheDirectory { externalId: string; department?: string | null; managerExternalId?: string | null }

export function inTheLeadsTeam(lead: InTheDirectory, person: InTheDirectory): boolean {
  if (person.externalId === lead.externalId) return false;
  if (person.managerExternalId && person.managerExternalId === lead.externalId) return true;
  const mine = lead.department?.trim();
  return !!mine && person.department?.trim() === mine;
}
