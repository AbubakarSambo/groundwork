import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { theDirectMorningIsOn } from '../organisation/the-direct-morning-switch';
import { thePersonJudgementsAreOn } from '../organisation/person-judgements';
import { readThePersonsRecord, type AStoredPersonsRecord } from './the-persons-record-store';
import { theRecordInWords, type TheRecordInWords } from './the-persons-record-in-words';
import { whatTheyDelivered, whereTheyStand, aPlanToHelpWith, type AKindOfCheckIn, type WhatTheyDelivered, type WhereTheyStand } from './what-the-lead-reads-about-each-person';
import { aLineToKeep } from '../grounds/references-and-resources';
import { whenItWas } from '../../common/a-date-reads-the-same-everywhere';
export { thePraiseFromYourLead } from './the-praise-from-your-lead';

/**
 * YOUR TEAM, PERSON BY PERSON, ON THE LEAD'S BOARD (Groundwork does the managing, part 2; Hafsah, 21 October 2026: "about once a month
 * looks properly at the board to make tough decisions about his team").
 *
 * One section for each person on the team, served to the lead who runs the check-in alone, where her organisation's direct morning is on
 * (board.service adds it inside `if (isInitiator)`, beside the direct morning, after every wall). Each section holds:
 *  - what they delivered, with proof (deals won, with what shows each one; on fee notes what was paid with proof, by their role);
 *  - their record (said against proved, promises, figures that changed, where the time went, blockers, check-ins) and the coaching
 *    Groundwork gave them, when, and whether it worked, as their own record says it to them with their name for "you";
 *  - one plain line on where they stand, with the evidence beside it. Never a score or a label, and never a plan or an exit: those are the
 *    lead's decisions. Built only where the organisation keeps judgements of a person on; off, neither the line nor the record is built;
 *  - what the lead already did about them from here, and the four things she can do in one tap, each saying exactly what it does.
 * Read only: opening the board rebuilds nothing.
 */

export interface AnAction {
  kind: 'praise' | 'plan' | 'deadline' | 'reassign';
  label: string;
  /** Exactly what the tap does, in a sentence the lead reads before she confirms. */
  does: string;
  /** The words offered to start from (praise, a plan), which she can change. */
  suggested?: string;
  /** The records it can be done on (a deadline, a reassignment). */
  items?: { id: string; name: string; due: string | null }[];
  /** Who a record can be given to (a reassignment). */
  to?: { participantId: string; name: string }[];
}

export interface APersonOnYourBoard {
  participantId: string;
  name: string;
  role: string | null;
  delivered: WhatTheyDelivered;
  record: TheRecordInWords | null;
  whereTheyStand: WhereTheyStand | null;
  /** What the lead did about them from her board, newest first: "On Wednesday 21 October you praised Mercy: ..." */
  fromYou: string[];
  actions: AnAction[];
}

export interface YourTeamServed {
  heading: string;
  note: string;
  people: APersonOnYourBoard[];
}

const firstOf = (n: string) => String(n ?? '').trim().split(/\s+/)[0] ?? '';
const fullNameOf = (p: any) => `${String(p.user?.firstName ?? p.nameGiven ?? '').trim()} ${String(p.user?.lastName ?? '').trim()}`.trim() || String(p.nameGiven ?? '').trim();
const OPEN = (i: any) => !/^(?:won|lost|paid|done|filed|closed|dropped)$/i.test(String(i.stage ?? '').trim()) && !(i.fields as any)?._dropped;

/** What the lead did, as she reads it on her board. */
export function whatYouDidSaid(a: { kind: string; says: string; createdAt: Date | string }, first: string, zone: string): string {
  const on = whenItWas(a.createdAt, 'weekdayAndDay', zone);
  switch (String(a.kind).toUpperCase()) {
    case 'PRAISE': return `On ${on} you praised ${first}, saying “${a.says}”`;
    case 'PLAN': return `On ${on} you started a plan for ${first}, saying “${a.says}”`;
    case 'DEADLINE': return `On ${on} you set a deadline. ${a.says}`;
    case 'REASSIGN': return `On ${on} you reassigned work. ${a.says}`;
    default: return `On ${on} you noted “${a.says}”`;
  }
}

/**
 * THE PRAISE GROUNDWORK SUGGESTS, ONLY WHERE THE RECORD EARNS IT (final real-model check, item 19). "Well done on your work this month."
 * was offered for Joseph, who said four sales were made with nothing on file, for Peter, who missed every day after Monday, and for Aisha.
 * Praise is suggested only where the person is doing well or improving, and it names what the record shows; otherwise none is suggested
 * and the lead writes her own, if she wants to.
 */
export function thePraiseToSuggest(kind: AKindOfCheckIn, delivered: WhatTheyDelivered, stand: WhereTheyStand | null, stored: AStoredPersonsRecord | null): string | null {
  if (!stand || (stand.standing !== 'doing well' && stand.standing !== 'improving')) return null;
  const n = delivered.proven.length;
  if (n && kind === 'sales') return `Well done on the ${n === 1 ? 'deal' : `${n} deals`} you won with proof.`;
  const s = stored?.record.summary;
  if (n || (s && s.claims && s.proven === s.claims)) return 'Well done on backing what you said with proof.';
  if (s && s.keptOnTime + s.keptLate >= 2 && !s.late && !s.notDone) return 'Well done on keeping the promises you made.';
  if (s && s.checkInsDue >= 3 && s.checkInsDone === s.checkInsDue && s.checkInsOnTime === s.checkInsDone) return 'Well done on doing every check-in, and on time.';
  return null;
}

function theActionsFor(first: string, kind: AKindOfCheckIn, items: { id: string; name: string; due: string | null }[], others: { participantId: string; name: string }[], delivered: WhatTheyDelivered, stand: WhereTheyStand | null, stored: AStoredPersonsRecord | null = null): AnAction[] {
  const praiseFor = thePraiseToSuggest(kind, delivered, stand, stored);
  const planFor = stand?.about ? aPlanToHelpWith(first, stand.about) : '';
  return [
    { kind: 'praise', label: `Praise ${first}`, does: `Keeps your words in ${first}’s record, where ${first} reads them on My work and in ${first}’s own report. No message is sent.`, ...(praiseFor ? { suggested: praiseFor } : {}) },
    /* The lead and her organisation's admins read a plan: admins read the check-in's lines as the lead does (browser test, finding 26). */
    { kind: 'plan', label: 'Start a plan', does: `Keeps what you want to help ${first} with, here and under People on References and resources. Only you and your organisation’s admins read it, and nothing is sent to ${first}.`, ...(planFor ? { suggested: planFor } : {}) },
    { kind: 'deadline', label: 'Set a deadline', does: `Puts a due day on one of ${first}’s records. It shows on that record on your board, and nothing is sent to ${first}.`, items },
    { kind: 'reassign', label: kind === 'sales' ? 'Reassign leads' : 'Reassign work', does: `Gives one of ${first}’s records to somebody else on the team. From then on it is theirs on the board and in their check-ins. Nothing is sent to either of them.`, items, to: others },
  ];
}

/**
 * EACH PERSON'S SECTION, for the lead who runs the check-in. Null where the reader does not run it or the direct morning is off.
 */
export async function yourTeamPersonByPerson(
  prisma: any,
  o: { groundId: string; leadUserId: string; board: any; kind: AKindOfCheckIn; now?: Date },
): Promise<YourTeamServed | null> {
  const ground: any = await Promise.resolve(prisma?.ground?.findUnique?.({
    where: { id: o.groundId },
    select: { id: true, label: true, initiatorId: true, organizationId: true, participants: { select: { id: true, userId: true, partyType: true, nameGiven: true, managingOnly: true, leftAt: true, roleAsDescribed: true, user: { select: { firstName: true, lastName: true, jobTitle: true } } } } },
  })).catch(() => null);
  if (!ground || ground.initiatorId !== o.leadUserId) return null;
  if (!(await theDirectMorningIsOn(prisma, ground.organizationId))) return null;
  const judgements = await thePersonJudgementsAreOn(prisma, ground.organizationId);
  const zone = String((await Promise.resolve(prisma?.organization?.findUnique?.({ where: { id: ground.organizationId }, select: { timeZone: true } })).catch(() => null))?.timeZone ?? '') || 'Africa/Nairobi';
  const team = ((ground.participants ?? []) as any[]).filter((p) => p.userId !== ground.initiatorId && p.partyType !== 'INITIATOR' && !p.managingOnly && !p.leftAt);
  if (!team.length) return null;
  const items: any[] = (await Promise.resolve(prisma?.workItem?.findMany?.({ where: { groundId: ground.id }, select: { id: true, name: true, stage: true, ownerParticipantId: true, dueAt: true, fields: true } })).catch(() => [])) ?? [];
  const done: any[] = (await Promise.resolve(prisma?.personLeadAction?.findMany?.({ where: { groundId: ground.id }, orderBy: { createdAt: 'desc' } })).catch(() => [])) ?? [];
  const label = ground.label || 'this check-in';
  const people: APersonOnYourBoard[] = [];
  for (const p of team) {
    const name = fullNameOf(p);
    const first = firstOf(name);
    if (!first) continue;
    const stored: AStoredPersonsRecord | null = judgements ? await readThePersonsRecord(prisma, p.id) : null;
    const theirs = stored && stored.groundId === ground.id ? stored : null;
    const role = String(p.user?.jobTitle ?? '').trim() || String(p.roleAsDescribed ?? '').trim() || null;
    const delivered = whatTheyDelivered({ participantId: p.id, name: first, role, kind: o.kind, board: o.board, stored: theirs });
    const stand = judgements ? whereTheyStand(theirs, first, label) : null;
    const openItems = items.filter((i) => i.ownerParticipantId === p.id && OPEN(i)).map((i) => ({ id: i.id, name: String(i.name ?? ''), due: i.dueAt ? new Date(i.dueAt).toISOString().slice(0, 10) : null }));
    const others = team.filter((x) => x.id !== p.id).map((x) => ({ participantId: x.id, name: firstOf(fullNameOf(x)) })).filter((x) => x.name);
    people.push({
      participantId: p.id,
      name,
      role,
      delivered,
      record: theirs ? theRecordForTheBoard(theirs, first, label, o.kind, stand) : null,
      whereTheyStand: stand,
      fromYou: done.filter((d) => d.participantId === p.id).map((d) => whatYouDidSaid(d, first, zone)),
      actions: theActionsFor(first, o.kind, openItems, others, delivered, stand, theirs),
    });
  }
  return {
    heading: 'Your team, person by person',
    note: 'Each person’s part is read from what they said in their check-ins and what is on file. It changes only when something new comes in. Only you see this.',
    people,
  };
}

/**
 * Their record as their part of the board shows it. Off a sales check-in, what they said was paid or done is already what they delivered
 * (each line with what shows it, or that nothing does), so it is said once, there, and not again in the record.
 */
function theRecordForTheBoard(stored: AStoredPersonsRecord, first: string, label: string, kind: AKindOfCheckIn, stand: WhereTheyStand | null = null): TheRecordInWords {
  const said = theRecordInWords(stored.record, stored.coaching, { self: false, firstName: first }, label);
  /* "Mercy needs coaching on ..." is coaching served: "Groundwork has not coached Mercy on anything yet." is never beside it (item 20). */
  const words = stand && (stand.standing === 'needs coaching' || stand.standing === 'needs a hard conversation') ? { ...said, coachingEmpty: null } : said;
  return kind === 'sales' ? words : { ...words, parts: words.parts.filter((p) => !/^What .+ said and what shows it$/.test(p.heading)) };
}

/* ------------------------------------------------------------------------------------------------ the lead's one-tap actions */

export interface AnActionAsked {
  kind?: string;
  text?: string;
  itemId?: string;
  due?: string;
  toParticipantId?: string;
}

/**
 * ONE TAP OF THE LEAD ON ONE PERSON'S PART OF HER BOARD. Refused for anybody but the lead who runs the check-in, and where her
 * organisation's direct morning is off. Each is kept as a row of what she did (PersonLeadAction); no message is sent for any of them.
 *  - praise: her words, kept in the person's record, which the person reads on My work and in their own report;
 *  - plan: a line on References and resources under People, what she wants to help them with, hers alone (the existing People line);
 *  - deadline: a due day on one of their records, through the board's own record writer (`updateWorkItem`);
 *  - reassign: one of their records given to somebody else on the team, through the same writer.
 */
export async function theLeadActsOnAPerson(
  prisma: any,
  write: { updateWorkItem: (groundId: string, itemId: string, userId: string, dto: { due?: string | null; ownerParticipantId?: string | null }) => Promise<any> },
  groundId: string, participantId: string, userId: string, asked: AnActionAsked,
): Promise<{ says: string }> {
  const ground: any = await prisma.ground.findUnique({
    where: { id: groundId },
    select: { id: true, initiatorId: true, organizationId: true, participants: { select: { id: true, userId: true, partyType: true, nameGiven: true, managingOnly: true, leftAt: true, user: { select: { firstName: true, lastName: true } } } } },
  });
  if (!ground) throw new NotFoundException('That check-in could not be found, so go back to your check-ins and open it from the list.');
  if (ground.initiatorId !== userId) throw new ForbiddenException('Only the person who runs this check-in can do this.');
  if (!(await theDirectMorningIsOn(prisma, ground.organizationId))) throw new ForbiddenException('This is not turned on for your organisation yet.');
  const person = (ground.participants as any[]).find((p) => p.id === participantId && p.userId !== ground.initiatorId);
  if (!person) throw new BadRequestException('That person is not on your team in this check-in.');
  const first = firstOf(fullNameOf(person));
  const kind = String(asked.kind ?? '').toLowerCase();
  const keep = (k: string, says: string, more: Record<string, any> = {}) =>
    prisma.personLeadAction.create({ data: { groundId, participantId, byUserId: userId, kind: k, says, ...more } });

  if (kind === 'praise') {
    const text = String(asked.text ?? '').trim();
    if (!text) throw new BadRequestException(`Write what you want to praise ${first} for first.`);
    if (text.length > 400) throw new BadRequestException('That is too long. Say it in a sentence or two.');
    await keep('PRAISE', text);
    return { says: `Your words are kept in ${first}’s record. ${first} reads them on My work and in ${first}’s own report.` };
  }
  if (kind === 'plan') {
    const line = aLineToKeep({ kind: 'HELP_WITH', text: asked.text, aboutParticipantId: participantId }, ground.participants, ground.initiatorId);
    const made = await prisma.groundContextItem.create({ data: { groundId, kind: line.kind as any, text: line.text, audience: line.audience as any, aboutParticipantId: line.aboutParticipantId, source: 'TYPED', authorUserId: userId }, select: { id: true } });
    await keep('PLAN', line.text, { itemId: made.id });
    return { says: `Your plan for ${first} is kept here and under People on References and resources. Only you and your organisation’s admins read it.` };
  }
  if (kind === 'deadline' || kind === 'reassign') {
    const item = await prisma.workItem.findFirst({ where: { id: String(asked.itemId ?? ''), groundId }, select: { id: true, name: true, ownerParticipantId: true } });
    if (!item || item.ownerParticipantId !== participantId) throw new BadRequestException(`Choose one of ${first}’s records.`);
    if (kind === 'deadline') {
      const due = String(asked.due ?? '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) throw new BadRequestException('Give the date as year, month and day, like 2026-10-30.');
      await write.updateWorkItem(groundId, item.id, userId, { due });
      const day = whenItWas(new Date(`${due}T12:00:00Z`), 'weekdayAndDay', 'UTC');
      await keep('DEADLINE', `${item.name}, which ${first} has, is due on ${day}.`, { itemId: item.id, dueOn: new Date(`${due}T00:00:00Z`) });
      return { says: `${item.name} is due on ${day}. It shows on that record on your board.` };
    }
    const to = (ground.participants as any[]).find((p) => p.id === asked.toParticipantId && p.id !== participantId && p.userId !== ground.initiatorId && !p.managingOnly && !p.leftAt);
    if (!to) throw new BadRequestException('Choose somebody else on the team to give it to.');
    const toFirst = firstOf(fullNameOf(to));
    await write.updateWorkItem(groundId, item.id, userId, { ownerParticipantId: to.id });
    await keep('REASSIGN', `${item.name} went from ${first} to ${toFirst}.`, { itemId: item.id, toParticipantId: to.id });
    return { says: `${item.name} is ${toFirst}’s now, on the board and in ${toFirst}’s check-ins.` };
  }
  throw new BadRequestException('Choose praise, start a plan, set a deadline or reassign.');
}
