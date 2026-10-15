import { PartyType } from '@prisma/client';
import { LabelParty, labelsForParties } from '../reports/party-labels';
import { TheEndingIsAbout } from './end-states';

/**
 * WHO AN ENDING ABOUT ONE PERSON IS ABOUT, AS THIS READER MAY NAME THEM (request 123 item 8).
 *
 * The ending "The role does not continue." names the person (end-states.ts, theRoleDoesNotContinue).
 * That person is the one party in the check-in who is not its lead. With more than one, nothing on
 * the record says which of them the ending is about, so it stays neutral.
 *
 * No new name source: `names` is the map the caller already reads every other name through
 * (`namesVisibleTo`, label to name). A reader who may not see the person's name gets null, and the
 * ending says "the person". An address is never used as a name here.
 */
export function whoTheEndingIsAbout(
  parties: LabelParty[],
  names: Map<string, string>,
  readerParticipantId?: string | null,
): TheEndingIsAbout | null {
  const others = parties.filter((p) => p.partyType !== PartyType.INITIATOR);
  if (others.length !== 1) return null;
  const theOne = others[0];
  if (readerParticipantId && theOne.id === readerParticipantId) return { isTheReader: true };
  const label = labelsForParties(parties).get(theOne.id);
  const name = label ? names.get(label) : undefined;
  if (!name || name.includes('@')) return null;
  /* "Kwame Mensah (Harvestline Foods)" is read as "Kwame", as the prototype's ending reads. */
  const first = name.replace(/\s*\([^)]*\)\s*$/, '').trim().split(/\s+/)[0];
  return first ? { name: first } : null;
}
