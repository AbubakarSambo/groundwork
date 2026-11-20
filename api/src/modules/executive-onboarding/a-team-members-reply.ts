/**
 * A TEAM MEMBER'S REPLY IS THEIR PARTICIPATION (Fatima, increment 5; plan 6 and 26.1): no sign-up, no link, no login.
 *
 * Somebody she named, and said yes to, who writes back (a reply to the email, a forward, a message, a voice note) has their words and files kept as
 * material for her work, exactly as hers are, and answered once for the batch. Writing back from the address or number they were given verifies
 * who they are. If they were asked about a gap, the gap is closed. What they send is never shown to another team member, and what they said to
 * Groundwork about anybody is not passed on: the only thing that leaves is what is in the record about the work, which she sees.
 *
 * It does not turn what they say into commitments or check-in answers: that is the adaptive check-in increment. It keeps it, says so, and does
 * not ask them to say it again.
 */
import { keepWhatWasForwarded, type AnArrival, type TheIntakePorts } from './the-intake';
import { markTheirIdentityVerified, theTeamMemberWhoWroteFrom } from './team-introductions';
import { closeWhatTheyAnswered } from './information-gaps';

export const CONTACT_PREFIX = 'contact:';

export async function keepATeamMembersReply(prisma: any, ports: TheIntakePorts, a: Omit<AnArrival, 'principalUserId' | 'fromUserId' | 'organizationId'> & { organizationId: string; contact: any }): Promise<{ batchId: string; alreadySeen: boolean }> {
  const { contact, ...rest } = a;
  await markTheirIdentityVerified(prisma, contact, a.now);
  const kept = await keepWhatWasForwarded(prisma, ports, { ...rest, organizationId: a.organizationId, principalUserId: contact.principalUserId, fromUserId: `${CONTACT_PREFIX}${contact.id}` });
  if (contact.email) await closeWhatTheyAnswered(prisma, { organizationId: a.organizationId, email: contact.email, now: a.now });
  return kept;
}

/** Whether this address belongs to somebody she named and said yes to. */
export const whoWroteFromThisAddress = theTeamMemberWhoWroteFrom;
