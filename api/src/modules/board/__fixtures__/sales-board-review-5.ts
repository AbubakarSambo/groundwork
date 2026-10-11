import { PartyType } from '@prisma/client';
import { person, type Setup } from '../the-switchboards-sections-harness';

/**
 * "SALES TEAM, Q3", AS THE FIFTH REVIEW OF THE SALES BOARD READ IT (screens request 117, 2 October 2026).
 *
 * Rukia Otieno runs it and checks in herself. Amani Wekesa, Baraka Mwangi and Neema Achieng check in, and
 * Faraji Odhiambo was let in but has not checked in, so session 1 is still open on the board's clock while
 * Rukia and Amani have done session 2. Every row here is the shape the screens workspace's database holds,
 * as the request quotes it, including the rows written before the fixes of requests 109 and 111:
 *  - the team's aim stored three times, one with no number and one counted 12 of 12 from the lead's own
 *    "I want us to sign 12 shops by 20 December";
 *  - Rukia's own "to approve a discount ... and to send a price list ..." stored as a wait on "themselves";
 *  - two deals added on the board with nobody's name, one at Won;
 *  - Neema's "I signed Karen Hardware on 22 September" with her 4 shops in Karen still at 0;
 *  - Amani's own aim stored as "3 shops in Kilimani by 20 December".
 * The words each person typed are in `turns`, word for word as the request quotes them.
 */
export const REVIEW_5_PEOPLE = [
  { ...person('p-rukia', 'u-rukia', 'Rukia', 'Otieno', PartyType.INITIATOR), managingOnly: false },
  person('p-amani', 'u-amani', 'Amani', 'Wekesa'),
  person('p-baraka', 'u-baraka', 'Baraka', 'Mwangi'),
  person('p-neema', 'u-neema', 'Neema', 'Achieng'),
  person('p-faraji', 'u-faraji', 'Faraji', 'Odhiambo'),
];

export const RUKIA_RUNS_IT = ['u-rukia', 'MEMBER'] as const;
export const AMANI = ['u-amani', 'MEMBER'] as const;
export const BARAKA_M = ['u-baraka', 'MEMBER'] as const;
export const NEEMA = ['u-neema', 'MEMBER'] as const;
export const JUMA_READS = ['u-juma', 'ADMIN'] as const;
export const GRACE_SET_IT_UP = ['u-grace', 'ADMIN'] as const;

const on = (d: string, t = '15:00:00') => new Date(`2026-09-${d}T${t}Z`);
const oct = (d: string, t = '15:00:00') => new Date(`2026-10-${d}T${t}Z`);

const row = (participantId: string, n: number, status: string, completedAt: Date | null, availableFrom: Date) => ({
  id: `c${n}-${participantId}`, participantId, sessionNumber: n, status, isSetup: false, completedAt,
  availableFrom, startedAt: status === 'NOT_STARTED' ? null : availableFrom,
  specificityLevel: completedAt ? 'specific' : null, specificityDimensions: completedAt ? { checkable: 'specific' } : null,
});

export const REVIEW_5_CHECK_INS = [
  row('p-rukia', 1, 'COMPLETED', on('26', '09:00:00'), on('22', '06:00:00')),
  row('p-amani', 1, 'COMPLETED', on('26', '10:00:00'), on('22', '06:00:00')),
  row('p-baraka', 1, 'COMPLETED', on('27', '10:00:00'), on('22', '06:00:00')),
  row('p-neema', 1, 'COMPLETED', on('27', '11:00:00'), on('22', '06:00:00')),
  row('p-faraji', 1, 'NOT_STARTED', null, on('22', '06:00:00')),
  row('p-rukia', 2, 'COMPLETED', on('30', '09:00:00'), on('29', '06:00:00')),
  row('p-amani', 2, 'COMPLETED', on('30', '10:00:00'), on('29', '06:00:00')),
  row('p-baraka', 2, 'NOT_STARTED', null, on('29', '06:00:00')),
  row('p-neema', 2, 'NOT_STARTED', null, on('29', '06:00:00')),
];

/** What each person typed, word for word, in the check-in it came from. */
export const REVIEW_5_TURNS = [
  { checkInId: 'c1-p-rukia', content: 'Success means twelve signed supply contracts with shops, and I want us to sign 12 shops by 20 December.' },
  { checkInId: 'c1-p-rukia', content: 'I have signed Tuskys Westgate already, on 18 September.' },
  { checkInId: 'c1-p-rukia', content: 'I still need to approve a discount for Baraka and send a price list to Amani.' },
  { checkInId: 'c2-p-rukia', content: 'I will visit Naivas Karen on Monday to show them the cookers.' },
  { checkInId: 'c1-p-amani', content: 'I am aiming for 3 shops in Kilimani by 20 December.' },
  { checkInId: 'c1-p-amani', content: 'I am waiting on Rukia for the price list.' },
  { checkInId: 'c2-p-amani', content: 'I will deliver the Tuskys cookers on 9 October.' },
  { checkInId: 'c1-p-baraka', content: 'I am waiting on Rukia to decide the discount before I can sell to Naivas.' },
  { checkInId: 'c1-p-neema', content: 'I signed Karen Hardware on 22 September.' },
  { checkInId: 'c1-p-neema', content: 'Naivas Karen still has not answered me about the order.' },
];

const aim = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', name, target: null, count: 0, prevCount: 0, ownerParticipantId: null, setByParticipantId: 'p-rukia',
  sortOrder: 0, addedAtSession: null, assumes: [], direction: null, dueOn: null, isADecisionAboutAPerson: false,
  suggestedCount: null, suggestedSaid: null, suggestedAtSession: null,
  createdAt: on('26', '09:05:00'), updatedAt: on('26', '09:05:00'), ...more,
});

/** The targets as the screens workspace's database holds them, written before requests 109 and 111. */
export const REVIEW_5_OBJECTIVES = [
  aim('o-team', 'Sign 12 shops for kitchen appliances in Nairobi.', { sortOrder: 0 }),
  aim('o-said-again', 'They want us to sign 12 shops by 20 December.', {
    target: 12, count: 12, prevCount: 0, sortOrder: 1, direction: 'AIM',
    suggestedSaid: 'Success means twelve signed supply contracts with shops, and I want us to sign 12 shops by 20 December.', suggestedAtSession: 1,
    updatedAt: on('27', '11:05:00'),
  }),
  aim('o-onboarded', 'They want to get 12 shops onboarded.', { target: 12, sortOrder: 2 }),
  aim('o-amani', '3 shops in Kilimani by 20 December', {
    target: 3, ownerParticipantId: 'p-amani', setByParticipantId: 'p-amani', sortOrder: 3, direction: 'AIM', createdAt: on('26', '10:05:00'), updatedAt: on('26', '10:05:00'),
  }),
  aim('o-neema', 'shops in Karen', { target: 4, ownerParticipantId: 'p-neema', sortOrder: 4, direction: 'AIM' }),
];

const wait = (id: string, from: string, what: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', fromParticipantId: from, onParticipantId: null, onLabel: null, what, status: 'WAITING', then: null,
  triedSaid: null, escalatedAt: null, dueSaid: null, dueOn: null, clearedAt: null, namedTheThing: true, blockerKind: null,
  createdAt: on('26'), updatedAt: on('26'), ...more,
});

export const REVIEW_5_WAITS = [
  /* Rukia's own things to do, written as a wait on "themselves" before request 111 (e). */
  wait('d-rukia-self', 'p-rukia', 'to approve a discount for Baraka Mwangi and to send a price list to Amani Wekesa', {
    onLabel: 'themselves', sourceCheckInId: 'c1-p-rukia', createdAt: on('26', '09:10:00'), updatedAt: on('26', '09:10:00'),
  }),
  wait('d-amani', 'p-amani', 'the price list', { onParticipantId: 'p-rukia', sourceCheckInId: 'c1-p-amani', createdAt: on('28', '10:10:00'), updatedAt: on('28', '10:10:00') }),
  wait('d-baraka', 'p-baraka', 'the discount', { onParticipantId: 'p-rukia', sourceCheckInId: 'c1-p-baraka', createdAt: on('27', '10:10:00'), updatedAt: on('27', '10:10:00') }),
  /* The wait the request says Neema never spoke of: nothing she typed names the warehouse. */
  wait('d-neema', 'p-neema', 'a delivery to Naivas Karen', { onLabel: 'the warehouse', sourceCheckInId: 'c1-p-neema', createdAt: on('27', '11:10:00'), updatedAt: on('27', '11:10:00') }),
];

const deal = (id: string, name: string, more: Record<string, any> = {}) => ({
  id, groundId: 'g-1', kind: 'deal', name, stage: null, ownerParticipantId: null, dueAt: null, fields: null, sourceEntryId: null,
  addedByUserId: 'u-rukia', createdAt: on('25'), updatedAt: on('25'), ...more,
});

/** Both deals were added on the board by Rukia, with nobody's name on them. */
export const REVIEW_5_DEALS = [
  deal('w-tuskys', 'Tuskys Westgate', { stage: 'Won', updatedAt: on('27') }),
  deal('w-naivas', 'Naivas Karen', { stage: 'Contacted', updatedAt: on('30') }),
];

/** The record's lines, with the check-in each came from. */
export const REVIEW_5_LINES = [
  { id: 'e-rukia-success', participantId: 'p-rukia', checkInId: 'c1-p-rukia', type: 'SUCCESS_DEFINITION', text: 'Success means twelve signed supply contracts with shops, and I want us to sign 12 shops by 20 December.', saidWordForWord: true, recallBased: false, verifiability: 'MEDIUM', checkIn: { sessionNumber: 1 }, disputedAt: null, createdAt: on('26', '09:05:00') },
  { id: 'e-rukia-tuskys', participantId: 'p-rukia', checkInId: 'c1-p-rukia', type: 'PROGRESS', text: 'I have signed Tuskys Westgate already, on 18 September.', saidWordForWord: true, recallBased: false, verifiability: 'HIGH', checkIn: { sessionNumber: 1 }, disputedAt: null, createdAt: on('26', '09:06:00') },
  { id: 'e-rukia-naivas', participantId: 'p-rukia', checkInId: 'c2-p-rukia', type: 'COMMITMENT', text: 'I will visit Naivas Karen on Monday to show them the cookers.', saidWordForWord: true, recallBased: false, verifiability: 'HIGH', checkIn: { sessionNumber: 2 }, disputedAt: null, createdAt: on('30', '09:06:00') },
  { id: 'e-amani-aim', participantId: 'p-amani', checkInId: 'c1-p-amani', type: 'INTENT', text: 'I am aiming for 3 shops in Kilimani by 20 December.', saidWordForWord: true, recallBased: false, verifiability: 'MEDIUM', checkIn: { sessionNumber: 1 }, disputedAt: null, createdAt: on('26', '10:05:00') },
  { id: 'e-amani-deliver', participantId: 'p-amani', checkInId: 'c2-p-amani', type: 'COMMITMENT', text: 'I will deliver the Tuskys cookers on 9 October.', saidWordForWord: true, recallBased: false, verifiability: 'HIGH', checkIn: { sessionNumber: 2 }, disputedAt: null, createdAt: on('30', '10:06:00') },
  { id: 'e-neema-karen', participantId: 'p-neema', checkInId: 'c1-p-neema', type: 'PROGRESS', text: 'I signed Karen Hardware on 22 September.', saidWordForWord: true, recallBased: false, verifiability: 'HIGH', checkIn: { sessionNumber: 1 }, disputedAt: null, createdAt: on('27', '11:06:00') },
];

export const REVIEW_5_COMMITMENTS = [
  {
    id: 'k-amani', groundId: 'g-1', participantId: 'p-amani', text: 'I will deliver the Tuskys cookers on 9 October.', outcome: null, whenSaid: 'on 9 October', explicit: true,
    status: 'UNKNOWN', source: 'CHECK_IN', authorUserId: null, statedInSession: 2, saidWordForWord: true, whenSaidWordForWord: true, saidAgainIn: [],
    settledAt: null, settledInCheckInId: null, settledBy: null, createdAt: on('30', '10:06:00'), updatedAt: on('30', '10:06:00'),
  },
  {
    id: 'k-rukia', groundId: 'g-1', participantId: 'p-rukia', text: 'I will visit Naivas Karen on Monday to show them the cookers.', outcome: null, whenSaid: 'on Monday', explicit: true,
    status: 'UNKNOWN', source: 'CHECK_IN', authorUserId: null, statedInSession: 2, saidWordForWord: true, whenSaidWordForWord: true, saidAgainIn: [],
    settledAt: null, settledInCheckInId: null, settledBy: null, createdAt: on('30', '09:06:00'), updatedAt: on('30', '09:06:00'),
  },
];

/** The board read at 20:46 and again at 20:51 on 2 October, Nairobi time, with nothing new in between. */
export const READ_AT_20_46 = oct('02', '17:46:00');
export const READ_AT_20_51 = oct('02', '17:51:00');
/** And the next evening, a day later, still with nothing new. */
export const READ_NEXT_EVENING = oct('03', '19:00:00');

export function review5(more: Partial<Setup> = {}): Setup {
  return {
    people: REVIEW_5_PEOPLE,
    initiatorId: 'u-rukia',
    createdByUserId: 'u-grace',
    label: 'Sales team, Q3',
    kindOfWork: 'sales org',
    whoSeesTargets: 'EVERYBODY',
    checkIns: REVIEW_5_CHECK_INS,
    turns: REVIEW_5_TURNS,
    objectives: REVIEW_5_OBJECTIVES,
    dependencies: REVIEW_5_WAITS,
    items: REVIEW_5_DEALS,
    lines: REVIEW_5_LINES,
    recordLines: REVIEW_5_LINES,
    commitments: REVIEW_5_COMMITMENTS,
    clock: { now: READ_AT_20_46, createdAt: on('22', '05:00:00'), startsAt: on('22', '05:00:00'), timelineDays: 84, cadence: 'WEEKLY' },
    ...more,
  };
}
