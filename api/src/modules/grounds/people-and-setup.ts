import { NotFoundException } from '@nestjs/common';
import { theRelease1bTabsAreOn } from './release-1b-tabs';
import { readsAsAnAdmin } from './who-may-read-this-check-in';
import { deadlineOf } from './when-the-clock-starts';
import { totalSessionsFor } from './session-count';
import { isEvaluationCheckIn } from '../reports/is-this-an-evaluation-check-in';
import { peersAreNamedOn } from '../reports/peers-are-named';
import { theBoardKindsOffered } from '../admin/what-is-hidden-at-release';

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
      joinedWithTheLink: string;
      kindOfWork: string | null;
      kindsOffered: string[];
      othersWithAccess: string;
      runsIt: string | null;
      organisationName: string;
      /** Whether each person's role here has been described: yes or no only, never the words, which are the lead's. */
      roleDescribed: Record<string, boolean>;
    };

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ordinal = (n: number) => (n % 10 === 1 && n !== 11 ? `${n}st` : n % 10 === 2 && n !== 12 ? `${n}nd` : n % 10 === 3 && n !== 13 ? `${n}rd` : `${n}th`);
const listed = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** "every weekday", "every Monday", "on the 5th of every month", "once": how often, as part of a sentence. */
export function theRhythmInWords(g: { cadence?: string | null; workingDays?: number[] | null; cadenceAnchorDay?: number | null }): string {
  const days = [...new Set((g.workingDays ?? []).filter((d) => d >= 0 && d <= 6))].sort();
  const anchor = g.cadenceAnchorDay;
  switch (g.cadence) {
    case 'DAILY':
      if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))) return 'every weekday';
      if (!days.length || days.length === 7) return 'every day';
      return `every ${listed(days.map((d) => WEEK[d]))}`;
    case 'WEEKLY':
      return anchor != null && anchor >= 0 && anchor <= 6 ? `every ${WEEK[anchor]}` : 'every week';
    case 'FORTNIGHTLY':
      return anchor != null && anchor >= 0 && anchor <= 6 ? `every other ${WEEK[anchor]}` : 'every 2 weeks';
    case 'MONTHLY':
      return anchor != null && anchor >= 1 && anchor <= 31 ? `on the ${ordinal(anchor)} of every month` : 'every month';
    case 'SEQUENTIAL':
      return 'each time a new round is opened';
    case 'ONE_TIME':
      return 'once';
    default:
      return 'when it opens';
  }
}

const aDay = (d: Date, timeZone: string, weekday = false) =>
  new Intl.DateTimeFormat('en-GB', { ...(weekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', timeZone }).format(d);

/** "5 people answer every weekday, until 30 October, on WhatsApp or here." The one sentence at the top, for every reader. */
export function howThisCheckInRuns(a: {
  answering: number;
  cadence?: string | null;
  workingDays?: number[] | null;
  cadenceAnchorDay?: number | null;
  endsOn: Date | null;
  noEnd: boolean;
  onWhatsApp: boolean;
  /** Who ends it, for a reader who does not: "until Grace ends it". */
  endedBy: 'you' | string;
  timeZone: string;
}): string {
  const who = a.answering === 1 ? '1 person answers' : `${a.answering} people answer`;
  const rhythm = theRhythmInWords(a);
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
      cadence: true, workingDays: true, cadenceAnchorDay: true, timelineDays: true, runsUntilEnded: true, startsAt: true, endsAt: true,
      createdAt: true, overWhatsApp: true, kindOfWork: true, peersVisibleToEachOther: true, restrictExternalVisibility: true,
      initiator: { select: { firstName: true, lastName: true } },
      organization: { select: { name: true, timeZone: true, whatsappConnection: { select: { enabled: true } } } },
      participants: {
        select: {
          id: true, userId: true, email: true, nameGiven: true, partyType: true, managingOnly: true, roleAsDescribed: true,
          inviteDeliveryStatus: true, awaitingSeat: true, cameThroughTheLink: true, createdAt: true,
          user: { select: { firstName: true, lastName: true, jobTitle: true, awaitingOrgApproval: true, phoneNumber: true } },
        },
      },
      checkIns: { select: { participantId: true, status: true, isSetup: true, sessionNumber: true, closedReason: true } },
      roundCompletions: { select: { sessionNumber: true } },
    },
  });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  if (!(await theRelease1bTabsAreOn(prisma, ground.organizationId))) return { on: false };

  const viewer = await prisma.user.findUnique({ where: { id: input.userId }, select: { role: true, organizationId: true, email: true } });
  const rows: Row[] = (ground.participants ?? []) as Row[];
  const isLead = ground.initiatorId === input.userId;
  const isAdmin = !isLead && readsAsAnAdmin({ ...viewer, userId: input.userId }, ground);
  const mine = rows.find((p) => p.userId === input.userId) ?? null;

  const timeZone = ground.organization?.timeZone || 'Africa/Lagos';
  const leadName = [ground.initiator?.firstName, ground.initiator?.lastName].filter(Boolean).join(' ').trim() || null;
  const orgHasWhatsApp = !!ground.organization?.whatsappConnection?.enabled;
  const askedOnWhatsApp = orgHasWhatsApp && ground.overWhatsApp !== false;
  const noEnd = !!ground.runsUntilEnded || !ground.timelineDays;
  const endsOn = noEnd ? null : deadlineOf(ground);
  const answering = rows.filter((p) => !p.managingOnly).length;
  const howItRuns = howThisCheckInRuns({
    answering, cadence: ground.cadence, workingDays: ground.workingDays, cadenceAnchorDay: ground.cadenceAnchorDay,
    endsOn, noEnd, onWhatsApp: askedOnWhatsApp, endedBy: isLead ? 'you' : (ground.initiator?.firstName || 'the person who runs it'), timeZone,
  });
  const planned = noEnd ? null : totalSessionsFor(ground.timelineDays, ground.cadence);

  if (!isLead && !isAdmin && mine) {
    /* A TEAM MEMBER: THE SHORT PAGE, AND NOTHING ELSE. */
    const done = new Set(
      (ground.checkIns ?? [])
        .filter((c: any) => c.participantId === mine.id && c.status === 'COMPLETED' && !c.isSetup && c.closedReason !== 'auto_closed')
        .map((c: any) => c.sessionNumber ?? 0),
    ).size;
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

  const rounds = (ground.roundCompletions ?? []).length;
  const sessions = ground.cadence === 'ONE_TIME'
    ? (OPEN_STATUSES.has(ground.status) ? 'Open now. The report comes when it closes, or when everyone has answered.' : 'It has closed. The report is made from the answers given.')
    : planned == null
      ? `${rounds} ${rounds === 1 ? 'session' : 'sessions'} so far. It runs until ${isLead ? 'you end' : `${ground.initiator?.firstName || 'the person who runs it'} ends`} it.`
      : `${Math.min(rounds, planned)} of ${planned} sessions done. Sessions already done are never removed.`;

  const throughTheLink = rows.filter((p) => p.cameThroughTheLink).length;
  const joinedWithTheLink = throughTheLink === 0
    ? 'Nobody has answered with it yet.'
    : throughTheLink === 1 ? '1 person has answered with it.' : `${throughTheLink} people have answered with it.`;

  const offered = await theBoardKindsOffered(prisma).catch(() => [] as string[]);
  const kindsOffered = ground.kindOfWork && !offered.includes(ground.kindOfWork) ? [...offered, ground.kindOfWork] : [...offered];

  const orgName = ground.organization?.name ?? 'your organisation';
  const othersWithAccess = isEvaluationCheckIn(ground.scenario)
    ? 'Only the people above can see it. An admin reads it only if they set it up or approved it.'
    : `The people above and the admins of ${orgName} can see it. So can a lead in the same department, once the team's report is shared.`;

  return {
    on: true,
    view: isLead ? 'lead' : 'admin',
    howItRuns,
    problems,
    sessions,
    joinedWithTheLink,
    kindOfWork: ground.kindOfWork ?? null,
    kindsOffered,
    othersWithAccess,
    runsIt: leadName,
    organisationName: orgName,
    roleDescribed: Object.fromEntries(rows.map((p) => [p.id, !!(p.roleAsDescribed ?? '').trim()])),
  };
}
