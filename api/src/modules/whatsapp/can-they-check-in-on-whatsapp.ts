import type { WhereOnWhatsApp } from './where-they-are-on-whatsapp';

/**
 * WHETHER A PERSON CAN CHECK IN ON WHATSAPP, SAID PLAINLY (Hafsah, 21 November 2026). There is no setting per person: it follows
 * from facts on the record, and this is the one place that puts them together, for People and for each person's page.
 *
 *   the organisation's WhatsApp is on    an admin turned it on (PATCH /billing/whatsapp), or the free WhatsApp month is running
 *                                        (whatsAppIsOnFor, only-where-whatsapp-is-turned-on.ts);
 *   their number is saved                the number every sender uses (the-number-each-person-is-reached-on.ts);
 *   a check-in of theirs asks on it      a check-in still running whose lead has not set it to stay in the app (`overWhatsApp`),
 *                                        out of the check-ins the reader is shown for them, so the line and the Check-ins column
 *                                        name the same ones;
 *   whether they have written from it    where-they-are-on-whatsapp.ts: only once they have is it "Checks in"; before, "Can".
 */
export interface WhatTheRecordSays {
  organisationName: string;
  whatsappIsOn: boolean;
  /** Their number, as every sender uses it, or null. */
  phone: string | null;
  /** Where they are on WhatsApp, from what has gone to and come from that number. */
  where: WhereOnWhatsApp;
  /** The names of their running check-ins that ask on WhatsApp, out of those the reader is shown. */
  checkInsOnWhatsApp: string[];
}

function inAList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** The WhatsApp part alone, for the person's page. */
export function canTheyCheckInOnWhatsApp(r: WhatTheRecordSays): string {
  if (!r.whatsappIsOn) return `Can’t check in on WhatsApp yet, because WhatsApp is off for ${r.organisationName}.`;
  if (!r.phone) return 'Can’t check in on WhatsApp yet, because no phone number is saved for them.';
  if (!r.checkInsOnWhatsApp.length) return 'Can’t check in on WhatsApp yet, because none of their check-ins asks on WhatsApp.';
  return `${r.where === 'connected' ? 'Checks' : 'Can check'} in on WhatsApp in ${inAList(r.checkInsOnWhatsApp)}.`;
}

const HOW_THE_NUMBER_STANDS: Record<WhereOnWhatsApp, string> = {
  'no-number': '',
  'not-connected': 'not connected yet',
  waiting: 'waiting for their first message on WhatsApp',
  connected: 'connected',
};

/**
 * THEIR NUMBER, WHETHER IT IS CONNECTED, AND WHATSAPP, AS ONE LINE for their row on People: "+254700100008, connected. Can check in
 * on WhatsApp in Sales team, Q4." Every fact the three sentences said is kept. While WhatsApp is off, nothing about a connection is
 * said (Hafsah, 26 September), only the number and why they cannot check in on it.
 */
export function theirPhoneLine(r: WhatTheRecordSays): string {
  if (!r.phone) return r.whatsappIsOn ? 'No phone number yet, so they can’t check in on WhatsApp.' : 'No phone number yet.';
  if (!r.whatsappIsOn) return `${r.phone}. ${canTheyCheckInOnWhatsApp(r)}`;
  return `${r.phone}, ${HOW_THE_NUMBER_STANDS[r.where] || 'not connected yet'}. ${canTheyCheckInOnWhatsApp(r)}`;
}

/** A check-in that is still running, and asks on WhatsApp unless its lead set it to stay in the app. */
export const A_RUNNING_CHECK_IN = ['OPEN', 'AWAITING_PARTIES', 'REPORT_READY', 'ACTIVE'];
export function itAsksOnWhatsApp(g: { status?: string | null; overWhatsApp?: boolean | null }): boolean {
  return A_RUNNING_CHECK_IN.includes(String(g.status)) && g.overWhatsApp !== false;
}
