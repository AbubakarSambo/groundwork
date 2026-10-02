import type { PrismaService } from '../prisma/prisma.service';

/**
 * WHATSAPP, AS THE ORGANISATION'S ADMIN READS IT ON THE CONNECTIONS PAGE (F1).
 *
 * The prototype's card: "WhatsApp", "Connected", "Your people check in by replying to +254 709 000
 * 111, Baridi's WhatsApp Business number. A reply is their check-in, exactly as if typed here.",
 * then three counts. Everything here is a fact from the record or the deployment's settings, said
 * in a sentence, and nothing here is a secret: not the access token, not the app secret, not the
 * verify token, not any part of one. Whether the verify token is set is a yes or a no.
 *
 * Where the record cannot tell a count, the count is null and the sentence says so. A number made
 * up to fill the prototype's box would be read as true.
 */

export type WhatsAppState = 'connected' | 'groundworks_number' | 'switched_off' | 'not_connected';
export type WhatIsOff = 'your_switch' | 'groundworks_switch';

export interface ACount {
  /** The prototype's words under the number. */
  label: string;
  /** Null where the record cannot tell it. */
  count: number | null;
  saying: string;
}

export interface WhatsAppAsTheAdminReadsIt {
  state: WhatsAppState;
  /** The word beside "WhatsApp" on the card. */
  stateLabel: string;
  /** The card's sentence. */
  saying: string;
  /** Only when the state is switched_off: what is off. Never a setting's value. */
  whatIsOff: WhatIsOff[];
  numberInUse: { whose: 'yours' | 'groundworks' | null; number: string | null; saying: string };
  callback: {
    /** The full address to paste into Meta, or null while the API's public address is not set. */
    address: string | null;
    path: string;
    saying: string;
    verifyTokenSet: boolean;
    verifyTokenSaying: string;
  };
  counts: { peopleOnWhatsApp: ACount; checkInsThisMonth: ACount; failedThisWeek: ACount };
  reminders: { approved: boolean; saying: string };
}

/** What the deployment and the record say, gathered before anything is worded. */
export interface WhatWeKnow {
  organisationName: string;
  own: { enabled: boolean; displayNumber: string | null; verifyTokenSet: boolean } | null;
  groundwork: { credentialsConfigured: boolean; switchedOn: boolean; displayNumber: string | null };
  publicApiUrl: string | null;
  organizationId: string;
  peopleOnWhatsApp: number;
  failedThisWeek: number;
  remindersApproved: boolean;
}

export const CALLBACK_PATH = (organizationId: string) => `/api/v1/webhooks/whatsapp/${organizationId}`;

const A_REPLY_IS_THEIR_CHECK_IN = 'A reply is their check-in, exactly as if typed here.';

function people(n: number, one: string, many: string) {
  return n === 1 ? `1 ${one}` : `${n.toLocaleString('en-GB')} ${many}`;
}

/** The sentences. Pure, so every state can be read as each reader would read it. */
export function whatsAppAsTheAdminReadsIt(k: WhatWeKnow): WhatsAppAsTheAdminReadsIt {
  const org = k.organisationName.trim() || 'your organisation';
  const groundworkLive = k.groundwork.credentialsConfigured && k.groundwork.switchedOn;
  const yours = k.own?.displayNumber?.trim() || null;
  const ours = k.groundwork.displayNumber?.trim() || null;

  let state: WhatsAppState;
  const whatIsOff: WhatIsOff[] = [];
  if (k.own) {
    if (!k.own.enabled) whatIsOff.push('your_switch');
    if (!k.groundwork.switchedOn) whatIsOff.push('groundworks_switch');
    state = whatIsOff.length ? 'switched_off' : 'connected';
  } else {
    state = groundworkLive ? 'groundworks_number' : 'not_connected';
  }

  const orgs = /s$/i.test(org) ? `${org}'` : `${org}'s`;
  const yourNumberAs = yours ? `${yours}, ${orgs} WhatsApp Business number` : `${orgs} WhatsApp Business number`;
  const yourNumberIs = yours ? `Your WhatsApp Business number, ${yours},` : 'Your WhatsApp Business number';
  const ourNumberAs = ours ? `${ours}, Groundwork's WhatsApp number` : "Groundwork's WhatsApp number";

  let stateLabel: string;
  let saying: string;
  if (state === 'connected') {
    stateLabel = 'Connected';
    saying = `Your people check in by replying to ${yourNumberAs}. ${A_REPLY_IS_THEIR_CHECK_IN}`;
  } else if (state === 'groundworks_number') {
    stateLabel = "On Groundwork's number";
    saying = `Your people check in by replying to ${ourNumberAs}. ${A_REPLY_IS_THEIR_CHECK_IN} You can connect your own WhatsApp Business number instead.`;
  } else if (state === 'switched_off') {
    stateLabel = 'Switched off';
    const parts: string[] = [];
    if (whatIsOff.includes('your_switch')) {
      parts.push(`${yourNumberIs} is set up, but you have switched it off, so nobody can check in by replying to it. Turn it on to use it again.`);
      if (groundworkLive) parts.push(`Until then, messages from Groundwork go from ${ourNumberAs}.`);
    }
    if (whatIsOff.includes('groundworks_switch')) {
      parts.push(whatIsOff.includes('your_switch')
        ? 'Groundwork has also switched WhatsApp off for everyone for now.'
        : `${yourNumberIs} is set up and switched on, but Groundwork has switched WhatsApp off for everyone for now. You do not need to do anything.`);
    }
    saying = parts.join(' ');
  } else {
    stateLabel = 'Not connected';
    saying = "WhatsApp is not connected. Connect your organisation's WhatsApp Business number, and your people can check in by replying to it.";
  }

  let numberInUse: WhatsAppAsTheAdminReadsIt['numberInUse'];
  if (k.own) {
    numberInUse = {
      whose: 'yours',
      number: yours,
      saying: state === 'connected'
        ? (yours ? `The number in use is ${yours}, your WhatsApp Business number.` : 'Your WhatsApp Business number is in use. Its number was not typed in when it was connected, so it cannot be shown here.')
        : (yours ? `Your WhatsApp Business number is ${yours}. It is switched off at the moment.` : 'Your WhatsApp Business number is switched off at the moment.'),
    };
  } else if (state === 'groundworks_number') {
    numberInUse = { whose: 'groundworks', number: ours, saying: `The number in use is ${ourNumberAs}.` };
  } else {
    numberInUse = { whose: null, number: null, saying: 'No WhatsApp number is in use.' };
  }

  const path = CALLBACK_PATH(k.organizationId);
  const base = k.publicApiUrl?.trim().replace(/\/+$/, '') || null;
  const address = base ? `${base}${path}` : null;
  const callback = {
    address,
    path,
    saying: address
      ? `The callback address to paste into Meta is ${address}.`
      : `The full callback address will be known once Groundwork is hosted. It ends in ${path}.`,
    verifyTokenSet: !!k.own?.verifyTokenSet,
    verifyTokenSaying: k.own?.verifyTokenSet
      ? 'The verify token is set.'
      : 'There is no verify token yet. One is made when you connect your number.',
  };

  const counts = {
    peopleOnWhatsApp: {
      label: 'people checking in on WhatsApp',
      count: k.peopleOnWhatsApp,
      saying: k.peopleOnWhatsApp === 0
        ? 'Nobody in your check-ins has a WhatsApp number yet. You can add numbers under People.'
        : `${people(k.peopleOnWhatsApp, 'person in your check-ins has', 'people in your check-ins have')} a WhatsApp number and can check in by replying.`,
    },
    checkInsThisMonth: {
      label: 'check-ins this month',
      count: null,
      saying: 'Groundwork does not yet record which check-ins came in by WhatsApp, so this number cannot be shown.',
    },
    failedThisWeek: {
      label: 'failed messages this week',
      count: k.failedThisWeek,
      saying: k.failedThisWeek === 0
        ? 'No messages failed to send in the last seven days.'
        : `${people(k.failedThisWeek, 'message', 'messages')} failed to send in the last seven days.`,
    },
  };

  const reminders = {
    approved: k.remindersApproved,
    saying: k.remindersApproved
      ? 'Meta has approved the reminder messages, so Groundwork can send the first message, such as a reminder that a check-in is open.'
      : 'Meta has not approved the reminder messages yet. Until it does, Groundwork can only answer people who write first. It cannot send the first message, so no reminders go by WhatsApp.',
  };

  return { state, stateLabel, saying, whatIsOff, numberInUse, callback, counts, reminders };
}

/** Grounds still running, where a check-in can still be answered. */
const NOT_RUNNING = ['AWAITING_APPROVAL', 'RESOLVED', 'STALLED', 'CLOSED'] as const;

/**
 * PEOPLE IN THIS ORGANISATION'S CHECK-INS WHO HAVE A WHATSAPP NUMBER. On the roster, active, with a
 * phone, not having said STOP, and a party to a check-in still running here that has not been kept
 * off the phone. A count only: no number and no name leaves this function.
 */
export async function peopleOnWhatsAppIn(prisma: PrismaService, organizationId: string): Promise<number> {
  const parties = await prisma.groundParticipant.findMany({
    where: {
      leftAt: null,
      ground: { organizationId, status: { notIn: [...NOT_RUNNING] as any }, NOT: { overWhatsApp: false } },
    },
    select: { email: true, userId: true },
  });
  if (!parties.length) return 0;
  const emails = [...new Set(parties.map((p) => p.email?.trim().toLowerCase()).filter(Boolean) as string[])];
  const userIds = [...new Set(parties.map((p) => p.userId).filter(Boolean) as string[])];
  const or: any[] = [];
  if (emails.length) or.push({ email: { in: emails, mode: 'insensitive' } });
  if (userIds.length) or.push({ linkedUserId: { in: userIds } });
  return prisma.person.count({
    where: { organizationId, active: true, phone: { not: null }, whatsappStoppedAt: null, OR: or },
  });
}

/**
 * MESSAGES THAT FAILED TO SEND IN THE LAST SEVEN DAYS. A message held because the organisation has
 * not turned WhatsApp on, or has used the month's messages, is not a failure of the connection and
 * is told elsewhere (Plan and billing), so it is not counted here.
 */
export async function failedThisWeekIn(prisma: PrismaService, organizationId: string, now: Date): Promise<number> {
  const aWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return prisma.whatsAppSend.count({
    where: {
      organizationId,
      failedAt: { gte: aWeekAgo },
      OR: [{ kind: null }, { AND: [{ NOT: { kind: 'held' } }, { NOT: { kind: { endsWith: ':held' } } }] }],
    },
  });
}
