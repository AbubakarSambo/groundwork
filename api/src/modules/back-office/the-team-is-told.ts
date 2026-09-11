/**
 * WHO IS TOLD, AND WHAT COUNTS AS SOMEBODY ELSE.
 *
 * Every active person on the back-office roster with a connected account is told. "Us" is derived
 * from that same roster: an organisation is ours if any roster account belongs to it, or if the
 * address that signed it up is a roster account's address. Nothing is listed anywhere.
 */

export interface RosterAccount {
  email: string;
  organizationId: string;
}

export function isOneOfUs(org: { id: string; adminEmail?: string | null }, roster: RosterAccount[]): boolean {
  const admin = org.adminEmail?.toLowerCase() ?? null;
  return roster.some((r) => r.organizationId === org.id || (admin !== null && r.email.toLowerCase() === admin));
}

export function recipients(roster: RosterAccount[]): string[] {
  return [...new Set(roster.map((r) => r.email.toLowerCase()))];
}

export const WHAT_A_CALL_IS_ABOUT: Record<string, string> = {
  CALL: 'a call',
  COACHING: 'coaching',
  HANDS_ON: 'hands-on setup help',
  INTEGRATION: 'connecting their systems',
};
