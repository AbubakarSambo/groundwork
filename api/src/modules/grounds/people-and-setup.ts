import { thePlannedSessionsOf, theSessionAndItsCount } from './this-sessions-count';
import { theOrganisationsZone } from '../../common/the-organisations-own-day';
import { howOftenItRuns } from './the-check-ins-own-schedule';
import { aDayInItsZone } from '../board/a-day-said-in-full';
import { whoAnswersThisCheckIn } from '../reports/how-many-have-answered';
import { NotFoundException } from '@nestjs/common';
import { readsAsAnAdmin } from './who-may-read-this-check-in';
import { theLastDayOf } from './when-the-clock-starts';
import { theSessionRowsOf, theRoundsDone, theSessionsDoneBy } from './the-sessions-done';
import { leaveOfThePeopleOn } from '../suites/who-is-away';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { theBoardKindsOffered } from '../admin/what-is-hidden-at-release';
import { TYPES_A_SCENARIO_OFFERS, CHECK_IN_TYPE_LABEL, theTypeToOffer, whatTheSwitchboardServes } from '../board/the-switchboard';
import { oneOfTheKinds } from '../board/the-kind-of-work';

/**
 * PEOPLE AND SETUP, AS EACH READER IS SERVED IT (Release 1B, pull request 1 of 3; Hafsah's people-and-setup.md, 17 October
 * 2026, and her brief of 18 October: "It has three views: the lead, a team member, and an admin who doesn't run it").
 *
 * WHO READS WHICH, DECIDED HERE AND NOWHERE ELSE:
 *  - the lead (the person who runs it, `initiatorId`): the whole page, ending included;
 *  - an admin of the organisation who does not run it (`readsAsAnAdmin`, the same rule the check-in's own read uses): the
 *    whole page, with no ending: "You can't end a check-in you don't run";
 *  - a team member (a person in it): ONLY the short page. One sentence on how it runs, their own role, their own status,
 *    their own sessions, who runs it, and one line on who can see what. No other person's details, no setting, no
 *    problem list, no join link: the keys below are the whole of it, and the tests read the keys;
 *  - anybody else who may open the check-in (a lead of the same department): how it runs and who runs it, nothing more.
 *
 * WHAT A LEAD WROTE ABOUT A PERSON STAYS THE LEAD'S (the-leads-words-about-someone.ts). The admin is told only that a role
 * has not been described, never the words of one that has; a team member's own role is their own job title, never the
 * lead's sentence about them.
 *
 * THIS ONLY READS. Nothing here writes, and opening it changes nothing. Every setting on the page is changed through the
 * routes that already exist, when the lead saves a change. With Release 1B's switch off for the organisation it serves
 * `{ on: false }` and the page reads exactly as it did.
 */

export type ASetupProblemFix = 'fix-the-address' | 'add-a-number' | 'add-their-role' | 'let-them-in' | 'view-plans';

export interface ASetupProblem {
  participantId: string;
  says: string;
  /** The one thing that fixes it, only when this reader may do it. */
  fix: ASetupProblemFix | null;
}

export type PeopleAndSetup =
  | { on: false }
  | {
      on: true;
      view: 'member';
      howItRuns: string;
      yourRole: string;
      status: string;
      yourSessionsDone: number;
      sessionsPlanned: number | null;
      runsIt: string | null;
      whoSeesWhat: string;
    }
  | { on: true; view: 'reader'; howItRuns: string; runsIt: string | null }
  | {
      on: true;
      view: 'lead' | 'admin';
      howItRuns: string;
      problems: ASetupProblem[];
      sessions: string;
      /** The sessions the team has finished, the number "sessions" says, so the lead's own count can be read beside it. */
      teamSessionsDone: number;
      yourSessionsDone: number;
      sessionsPlanned: number | null;
      joinedWithTheLink: string;
      kindOfWork: string | null;
      kindsOffered: string[];
      othersWithAccess: string;
      runsIt: string | null;
      organisationName: string;
      /** Whether each person's role here has been described: yes or no only, never the words, which are the lead's. */
      roleDescribed: Record<string, boolean>;
      /** Release 2 only, and only for a scenario with types of its own: the type to confirm in "What it is". Absent otherwise. */
      checkInType?: TheTypeInWhatItIs;
    };

/**
 * THE TYPE, IN "WHAT IT IS" (Release 2, the switchboard foundation). The types this scenario offers, in the B8 picture's words;
 * the one on record or read for the lead to confirm; whether she has; one sentence saying where it came from; and whether this
 * reader may confirm it (the lead only). Served only where the organisation's Release 2 switch is on.
 */
export interface TheTypeInWhatItIs {
  offered: { type: string; label: string }[];
  type: string | null;
  confirmed: boolean;
  says: string;
  mayConfirm: boolean;
}

/* With the year when it is not this one (board/a-day-said-in-full.ts). */
const aDay = (d: Date, timeZone: string, weekday = false) => aDayInItsZone(d, timeZone, weekday);

/** "5 people answer every weekday, until 30 October, on WhatsApp or here." The one sentence at the top, for every reader. */
export function howThisCheckInRuns(a: {
  answering: number;
  cadence?: string | null;
  workingDays?: number[] | null;
  cadenceAnchorDay?: number | null;
  cadenceDays?: number[] | null;
  endsOn: Date | null;
  noEnd: boolean;
  onWhatsApp: boolean;
  /** Who ends it, for a reader who does not: "until Grace ends it". */
  endedBy: 'you' | string;
  timeZone: string;
}): string {
  const who = a.answering === 1 ? '1 person answers' : `${a.answering} people answer`;
  const rhythm = howOftenItRuns(a);
  const until = a.cadence === 'ONE_TIME'
    ? (a.endsOn ? `, closing ${aDay(a.endsOn, a.timeZone, true)}` : '')
    : a.noEnd || !a.endsOn
      ? `, until ${a.endedBy === 'you' ? 'you end' : `${a.endedBy} ends`} it`
      : `, until ${aDay(a.endsOn, a.timeZone)}`;
  return `${who} ${rhythm}${until}, ${a.onWhatsApp ? 'on WhatsApp or here' : 'here'}.`;
}

const firstOf = (name: string) => name.trim().split(/\s+/)[0] || name;

interface Row {
  id: string;
  userId: string | null;
  email: string | null;
  nameGiven: string | null;
  partyType: string;
  managingOnly: boolean;
  roleAsDescribed: string | null;
  inviteDeliveryStatus: string | null;
  awaitingSeat: boolean;
  cameThroughTheLink: boolean;
  createdAt?: Date | null;
  user: { firstName: string | null; lastName: string | null; jobTitle: string | null; awaitingOrgApproval: boolean | null; phoneNumber: string | null } | null;
}

/** A person's name as this reader may read it: their name, else the address (only to whoever may read it), never a guess. */
function nameOf(p: Row, mayReadTheAddress: boolean): string {
  const full = [p.user?.firstName, p.user?.lastName].filter(Boolean).join(' ').trim() || (p.nameGiven ?? '').trim();
  if (full) return full;
  return mayReadTheAddress && p.email ? p.email : 'Somebody invited by email';
}

/** The setup problems under "How this check-in runs", each with the one fix this reader may use. */
export function theSetupProblems(a: {
  rows: Row[];
  leadUserId: string;
  reader: 'lead' | 'admin';
  organisationName: string;
  askedOnWhatsApp: boolean;
  /** Each participant's WhatsApp number, by participant id. */
  phones: Map<string, string | null>;
  mayReadTheAddress: boolean;
}): ASetupProblem[] {
  const out: ASetupProblem[] = [];
  const isLead = a.reader === 'lead';
  for (const p of a.rows) {
    if (p.managingOnly || p.userId === a.leadUserId) continue;
    const name = nameOf(p, a.mayReadTheAddress);
    const first = firstOf(name);
    const bounced = !p.userId && String(p.inviteDeliveryStatus ?? '').toUpperCase() === 'BOUNCED';
    if (bounced) {
      out.push({ participantId: p.id, says: `${name} can't start, because the invitation to ${first} bounced.`, fix: isLead ? 'fix-the-address' : null });
      continue;
    }
    if (p.awaitingSeat) {
      out.push({ participantId: p.id, says: `${name} is waiting for a seat on your plan, so ${first} has not been invited yet.`, fix: isLead ? null : 'view-plans' });
      continue;
    }
    if (p.userId && p.user?.awaitingOrgApproval) {
      out.push({ participantId: p.id, says: `${name} is from outside ${a.organisationName}, so an admin has to let ${first} in.`, fix: isLead ? null : 'let-them-in' });
      continue;
    }
    if (a.askedOnWhatsApp && !a.phones.get(p.id)) {
      out.push({ participantId: p.id, says: `${name} has no WhatsApp number, so ${first} answers here.`, fix: 'add-a-number' });
    }
    if (!(p.roleAsDescribed ?? '').trim()) {
      out.push({ participantId: p.id, says: `Nobody has described ${name}'s role here, so ${first} gets the general questions.`, fix: isLead ? 'add-their-role' : null });
    }
  }
  return out;
}

const OPEN_STATUSES = new Set(['AWAITING_APPROVAL', 'AWAITING_LEAD', 'OPEN', 'AWAITING_PARTIES']);

export async function readPeopleAndSetup(
  prisma: any,
  input: { groundId: string; organizationId: string; userId: string },
  now: Date = new Date(),
): Promise<PeopleAndSetup> {
  const ground = await prisma.ground.findFirst({
    /* By id alone: who may read it was asked first (assertMaySeeGround), and a guest from another organisation is a reader too. */
    where: { id: input.groundId },
    select: {
      id: true, organizationId: true, initiatorId: true, createdByUserId: true, scenario: true, status: true, approvedById: true,
      cadence: true, cadenceDays: true, workingDays: true, cadenceAnchorDay: true, timelineDays: true, runsUntilEnded: true, startsAt: true, endsAt: true,
      createdAt: true, overWhatsApp: true, kindOfWork: true, peersVisibleToEachOther: true, restrictExternalVisibility: true,
      /* The type, for "What it is" where Release 2 is on (the-switchboard.ts). The words are read here and never served. */
      kindOfWorkSetBy: true, checkInType: true, checkInTypeConfirmedAt: true, label: true, brief: true,
      initiator: { select: { firstName: true, lastName: true } },
      organization: { select: { name: true, timeZone: true, billWord: true, release2CollectionsOn: true, whatsappConnection: { select: { enabled: true } } } },
      participants: {
        select: {
          id: true, userId: true, email: true, nameGiven: true, partyType: true, managingOnly: true, roleAsDescribed: true,
          inviteDeliveryStatus: true, awaitingSeat: true, cameThroughTheLink: true, createdAt: true,
          user: { select: { firstName: true, lastName: true, jobTitle: true, awaitingOrgApproval: true, phoneNumber: true } },
        },
      },
      checkIns: { select: { participantId: true, status: true, isSetup: true, sessionNumber: true, closedReason: true, availableFrom: true, createdAt: true, turns: { where: { role: 'PERSON' as any }, take: 1, select: { id: true } } } },
    },
  });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');

  const viewer = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true, organizationId: true, email: true } });
  const rows: Row[] = (ground.participants ?? []) as Row[];
  const isLead = ground.initiatorId === input.userId;
  const isAdmin = !isLead && readsAsAnAdmin({ ...viewer, userId: input.userId }, ground);
  const mine = rows.find((p) => p.userId === input.userId) ?? null;

  /* The organisation's own zone, from the one owner (common/the-organisations-own-day), never a fixed fallback beside it (run 9). */
  const timeZone = ground.organization?.timeZone || (await theOrganisationsZone(prisma, ground.organizationId).catch(() => null)) || 'Africa/Lagos';
  const leadName = [ground.initiator?.firstName, ground.initiator?.lastName].filter(Boolean).join(' ').trim() || null;
  const orgHasWhatsApp = !!ground.organization?.whatsappConnection?.enabled;
  const askedOnWhatsApp = orgHasWhatsApp && ground.overWhatsApp !== false;
  const noEnd = !!ground.runsUntilEnded || !ground.timelineDays;
  const endsOn = noEnd ? null : theLastDayOf(ground);
  /* The people a session waits on, by the round's own rule (reports/how-many-have-answered.ts), so this and Today's "1 of 5" count the same people. */
  const answering = whoAnswersThisCheckIn(rows as any[], ground.scenario).length;
  const howItRuns = howThisCheckInRuns({
    answering, cadence: ground.cadence, workingDays: ground.workingDays, cadenceAnchorDay: ground.cadenceAnchorDay, cadenceDays: (ground as any).cadenceDays,
    endsOn, noEnd, onWhatsApp: askedOnWhatsApp, endedBy: isLead ? 'you' : (ground.initiator?.firstName || 'the person who runs it'), timeZone,
  });
  const planned = noEnd ? null : thePlannedSessionsOf(ground as any);

  if (!isLead && !isAdmin && mine) {
    /* A TEAM MEMBER: THE SHORT PAGE, AND NOTHING ELSE. */
    const done = theSessionsDoneBy(ground.checkIns ?? [], mine.id);
    const named = peersAreNamedOn(ground, { participantId: mine.id } as any);
    const leadFirst = ground.initiator?.firstName || 'The person who runs it';
    return {
      on: true,
      view: 'member',
      howItRuns,
      yourRole: (mine.user?.jobTitle ?? '').trim() || 'You have not described your role yet. You can add your job title on your profile.',
      status: ground.status,
      yourSessionsDone: planned != null ? Math.min(done, planned) : done,
      sessionsPlanned: planned,
      runsIt: leadName,
      whoSeesWhat: `${leadFirst} knows who is here. You see the team's report once it's shared, ${named ? 'with names' : 'without names'}.`,
    };
  }
  if (!isLead && !isAdmin) return { on: true, view: 'reader', howItRuns, runsIt: leadName };

  /* THE LEAD, OR AN ADMIN WHO DOES NOT RUN IT: THE WHOLE PAGE. */
  const phones = new Map<string, string | null>();
  if (askedOnWhatsApp) {
    const emails = rows.map((p) => p.email).filter(Boolean) as string[];
    const people: any[] = emails.length
      ? await prisma.person.findMany({ where: { organizationId: ground.organizationId, email: { in: emails, mode: 'insensitive' } }, select: { email: true, phone: true } }).catch(() => [])
      : [];
    for (const p of rows) {
      const entry = people.find((x) => String(x.email ?? '').toLowerCase() === String(p.email ?? '').toLowerCase());
      phones.set(p.id, entry?.phone ?? p.user?.phoneNumber ?? null);
    }
  }
  const mayReadTheAddress = isLead || !ground.restrictExternalVisibility;
  const problems = theSetupProblems({ rows, leadUserId: ground.initiatorId, reader: isLead ? 'lead' : 'admin', organisationName: ground.organization?.name ?? 'your organisation', askedOnWhatsApp, phones, mayReadTheAddress });

  const leave = await leaveOfThePeopleOn(prisma, [ground.id]).catch(() => undefined);
  /* Done by the same clock the board's header reads (theSessionAndItsCount), so "N of 12 sessions done" and "Check-in M of 12" agree. */
  const theClock = theSessionAndItsCount({ participants: rows as any[], checkIns: ground.checkIns ?? [], scenario: ground.scenario, timelineDays: ground.timelineDays, cadence: ground.cadence, cadenceDays: (ground as any).cadenceDays, runsUntilEnded: ground.runsUntilEnded }, { now, leave }).clock.currentSession;
  const rounds = theRoundsDone(theSessionRowsOf(ground.checkIns ?? [], rows), leave, now, theClock);
  /* The same function the member's page and the board read; a lead who is a party reads her own count here too. */
  const yourSessionsDone = mine ? theSessionsDoneBy(ground.checkIns ?? [], mine.id) : 0;
  const sessions = ground.cadence === 'ONE_TIME'
    ? (OPEN_STATUSES.has(ground.status) ? 'Open now. The report comes when it closes, or when everyone has answered.' : 'It has closed. The report is made from the answers given.')
    : planned == null
      ? `${rounds} ${rounds === 1 ? 'session' : 'sessions'} so far. It runs until ${isLead ? 'you end' : `${ground.initiator?.firstName || 'the person who runs it'} ends`} it.`
      : `${Math.min(rounds, planned)} of ${planned} sessions done. Sessions already done are never removed.`;

  const throughTheLink = rows.filter((p) => p.cameThroughTheLink).length;
  const joinedWithTheLink = throughTheLink === 0
    ? 'Nobody has answered with it yet.'
    : throughTheLink === 1 ? '1 person has answered with it.' : `${throughTheLink} people have answered with it.`;

  /* The kind the board draws, the one the board's own sentence names (board.service: the switchboard's, then the kind on record), so
     "Kind of work" here never says "Not known yet" beside a board about a sales team (release test, 21 November 2026, bug 18). */
  const drawnAs = await Promise.resolve(whatTheSwitchboardServes(prisma, ground as any)).catch(() => null);
  const theKind = oneOfTheKinds(drawnAs?.drawnAs) ?? oneOfTheKinds(ground.kindOfWork);
  const offered = await theBoardKindsOffered(prisma, (ground as any).organizationId ?? null).catch(() => [] as string[]);
  const kindsOffered = theKind && !offered.includes(theKind) ? [...offered, theKind] : [...offered];

  const orgName = ground.organization?.name ?? 'your organisation';
  const othersWithAccess = isEvaluationCheckIn(ground.scenario)
    ? 'Only the people above can see it. An admin reads it only if they set it up or approved it.'
    : `The people above and the admins of ${orgName} can see it. So can a lead in the same department, once the team's report is shared.`;

  const checkInType = await theTypeInWhatItIs(prisma, ground, isLead);

  return {
    on: true,
    view: isLead ? 'lead' : 'admin',
    howItRuns,
    problems,
    sessions,
    teamSessionsDone: planned != null ? Math.min(rounds, planned) : rounds,
    yourSessionsDone: planned != null ? Math.min(yourSessionsDone, planned) : yourSessionsDone,
    sessionsPlanned: planned,
    joinedWithTheLink,
    kindOfWork: theKind,
    kindsOffered,
    othersWithAccess,
    runsIt: leadName,
    organisationName: orgName,
    roleDescribed: Object.fromEntries(rows.map((p) => [p.id, !!(p.roleAsDescribed ?? '').trim()])),
    ...(checkInType ? { checkInType } : {}),
  };
}

/** The sentence under the type, for the lead and for an admin who does not run it. */
export function whereTheTypeCameFrom(readFrom: string | null, confirmed: boolean, isLead: boolean, leadFirst: string): string {
  if (confirmed) return isLead ? 'You confirmed this. The board, the reports and what each check-in asks about follow it.' : `${leadFirst} confirmed this. The board, the reports and what each check-in asks about follow it.`;
  const toConfirm = isLead ? 'Save changes to confirm it.' : `${leadFirst} has not confirmed it yet.`;
  if (readFrom === 'your words') return `Groundwork read this from what ${isLead ? 'you' : leadFirst} wrote when setting it up. ${toConfirm}`;
  if (readFrom === 'your organisation' || readFrom === 'its kind of work') return `Groundwork read this from ${isLead ? 'your' : 'the'} organisation's record. ${toConfirm}`;
  return isLead ? 'Choose the kind of work, so the board and the reports fit it.' : `${leadFirst} has not chosen the kind of work yet.`;
}

async function theTypeInWhatItIs(prisma: any, ground: any, isLead: boolean): Promise<TheTypeInWhatItIs | null> {
  const offered = TYPES_A_SCENARIO_OFFERS[ground.scenario as keyof typeof TYPES_A_SCENARIO_OFFERS];
  if (!offered) return null;
  const others: any[] = await Promise.resolve(prisma.ground?.findMany?.({
    where: { organizationId: ground.organizationId, scenario: ground.scenario, id: { not: ground.id }, checkInTypeConfirmedAt: { not: null } },
    select: { checkInType: true },
  })).catch(() => []) ?? [];
  const read = theTypeToOffer(ground, { billWord: ground.organization?.billWord ?? null, typesConfirmedHere: others.map((o) => o.checkInType).filter(Boolean) });
  return {
    offered: offered.map((t) => ({ type: t, label: CHECK_IN_TYPE_LABEL[t] })),
    type: read.type,
    confirmed: read.confirmed,
    says: whereTheTypeCameFrom(read.readFrom, read.confirmed, isLead, ground.initiator?.firstName || 'The person who runs it'),
    mayConfirm: isLead,
  };
}
