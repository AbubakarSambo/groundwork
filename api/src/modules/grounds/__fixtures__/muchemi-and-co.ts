/**
 * MUCHEMI & CO (TEST): HAND-WRITTEN TEST DATA FOR RELEASE 2 (release plan, Release 2, "Test organisations" and "People").
 *
 * Written by hand for the tests, with no real client data and no passwords: every name, address, client and amount is made up,
 * and every address is on the test domain. The firm, its people and its two check-ins:
 *  - Wanjiru Muchemi, the partner, who runs both check-ins (the lead);
 *  - Brian Otieno and Aisha Kamau, the two associates who follow up fee notes;
 *  - Njeri Wambui, who handles accounts;
 *  - David Mwangi, the paralegal, in the litigation check-in only.
 * The weekly collections check-in (COLLECTIONS, on Mondays) and the litigation daily (PULSE_CHECK, a law firm matter, on
 * weekdays). The fee notes cover what the release plan's test run asks for: due on a date and on an event, one paid with proof
 * and one on someone's word only, one promised and missed, one disputed, one where the client is not heard from, and one not
 * yet raised. Release 2's later pull requests read the fee notes; this one reads the firm, its people and its check-ins.
 */
export const MUCHEMI_ORG = {
  id: 'org-muchemi-test',
  name: 'Muchemi & Co (test)',
  billWord: 'fee note',
  release1SalesBoardOn: false,
  release1bTabsOn: true,
};

export const MUCHEMI_PEOPLE = {
  partner: { userId: 'u-wanjiru', participantId: 'p-wanjiru', firstName: 'Wanjiru', lastName: 'Muchemi', email: 'wanjiru@muchemi.test', jobTitle: 'Partner' },
  brian: { userId: 'u-brian', participantId: 'p-brian', firstName: 'Brian', lastName: 'Otieno', email: 'brian@muchemi.test', jobTitle: 'Associate' },
  aisha: { userId: 'u-aisha', participantId: 'p-aisha', firstName: 'Aisha', lastName: 'Kamau', email: 'aisha@muchemi.test', jobTitle: 'Associate' },
  njeri: { userId: 'u-njeri', participantId: 'p-njeri', firstName: 'Njeri', lastName: 'Wambui', email: 'njeri@muchemi.test', jobTitle: 'Accounts' },
  david: { userId: 'u-david', participantId: 'p-david', firstName: 'David', lastName: 'Mwangi', email: 'david@muchemi.test', jobTitle: 'Paralegal' },
} as const;

/** The weekly collections check-in, as the lead set it up: her words, and nobody has confirmed a type yet. */
export const MUCHEMI_FEE_NOTES = {
  id: 'g-muchemi-fee-notes',
  organizationId: MUCHEMI_ORG.id,
  initiatorId: MUCHEMI_PEOPLE.partner.userId,
  label: 'Fee notes',
  scenario: 'COLLECTIONS',
  cadence: 'WEEKLY',
  workingDays: [1],
  timelineDays: 90,
  brief: 'Every fee note goes out when it falls due, and clients pay within 30 days. Brian and Aisha follow up the clients, and Njeri raises the fee notes and records what is paid.',
  kindOfWork: null as string | null,
  kindOfWorkSetBy: null as string | null,
  checkInType: null as string | null,
  checkInTypeConfirmedAt: null as Date | null,
  people: ['partner', 'brian', 'aisha', 'njeri'] as const,
};

/** The litigation daily, as it is today: a regular read on live work, a law firm matter, read from its setup. */
export const MUCHEMI_LITIGATION = {
  id: 'g-muchemi-litigation',
  organizationId: MUCHEMI_ORG.id,
  initiatorId: MUCHEMI_PEOPLE.partner.userId,
  label: 'Litigation team daily',
  scenario: 'PULSE_CHECK',
  cadence: 'DAILY',
  workingDays: [1, 2, 3, 4, 5],
  timelineDays: 365,
  brief: 'The litigation team says each day what moved on each matter, and what is due in court.',
  kindOfWork: 'a law firm matter' as string | null,
  kindOfWorkSetBy: 'read' as string | null,
  checkInType: null as string | null,
  checkInTypeConfirmedAt: null as Date | null,
  people: ['partner', 'brian', 'aisha', 'david'] as const,
};

/**
 * THE FEE NOTES, BY WHAT EACH ONE SHOWS (Release 2, pull request 2 of 3). Amounts in Kenyan shillings. "Now" for every test that
 * reads them is MUCHEMI_NOW, Wednesday 21 October 2026, in the week that began on Monday 19 October. Each row says who follows it
 * up (whose it is), and the stages it was put at, with their days, as the record writer keeps them.
 */
export const MUCHEMI_NOW = new Date('2026-10-21T15:00:00.000Z');

export const MUCHEMI_FEE_NOTE_ROWS = [
  { id: 'w-fn004', number: 'FN-004', client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', amount: 250000, followedUpBy: 'brian', dueOn: '2026-10-05', dueWhen: null, stage: 'Paid',
    stages: [['Invoiced', '2026-09-05'], ['Reminded', '2026-09-28'], ['Promised', '2026-10-12'], ['Paid', '2026-10-20']], promises: [['2026-10-20', '2026-10-12']], lastContact: '2026-10-12',
    paid: { amount: 250000, proof: 'a bank slip' }, shows: 'due on a date, paid with proof' },
  { id: 'w-fn005', number: 'FN-005', client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', amount: 250000, followedUpBy: 'brian', dueOn: null, dueWhen: 'the reply is filed', stage: 'Invoiced',
    stages: [['Invoiced', '2026-10-01']], nextStep: 'Tell accounts the day the reply is filed', nextStepBy: '2026-10-23', paid: null, shows: 'due on an event' },
  { id: 'w-fn006', number: 'FN-006', client: 'Baraka Hardware', matter: 'Baraka Hardware lease', amount: 120000, followedUpBy: 'aisha', dueOn: '2026-09-30', dueWhen: null, stage: 'Paid',
    stages: [['Invoiced', '2026-09-01'], ['Paid', '2026-10-13']], paid: { amount: 120000, proof: null }, shows: 'paid on someone’s word only' },
  { id: 'w-fn007', number: 'FN-007', client: 'Jamii Clinics', matter: 'Jamii Clinics employment claim', amount: 180000, followedUpBy: 'aisha', dueOn: '2026-09-15', dueWhen: null, stage: 'Promised',
    stages: [['Invoiced', '2026-08-15'], ['Chased', '2026-09-28'], ['Promised', '2026-10-05']], promises: [['2026-10-10', '2026-10-05']], lastContact: '2026-10-05',
    inTheWay: 'They say the money is held up at their head office', nextStep: 'Call their finance office', nextStepBy: '2026-10-22', paid: null, shows: 'promised, and the date missed' },
  { id: 'w-fn008', number: 'FN-008', client: 'Nyota Logistics', matter: 'Nyota Logistics contract review', amount: 90000, followedUpBy: 'brian', dueOn: '2026-09-20', dueWhen: null, stage: 'Chased',
    stages: [['Invoiced', '2026-08-20'], ['Chased', '2026-10-14']], lastContact: '2026-10-14', disputed: 'The client says the review was billed twice',
    nextStep: 'Send them the engagement letter', nextStepBy: '2026-10-23', paid: null, shows: 'disputed' },
  { id: 'w-fn009', number: 'FN-009', client: 'Upendo Schools', matter: 'Upendo Schools land matter', amount: 300000, followedUpBy: 'aisha', dueOn: '2026-09-01', dueWhen: null, stage: 'Reminded',
    stages: [['Invoiced', '2026-08-01'], ['Reminded', '2026-09-20']], paid: null, lastHeardFrom: null, shows: 'the client not heard from' },
  { id: 'w-fn010', number: 'FN-010', client: 'Baraka Hardware', matter: 'Baraka Hardware lease', amount: 60000, followedUpBy: 'aisha', dueOn: '2026-10-30', dueWhen: null, stage: 'Invoiced',
    stages: [['Invoiced', '2026-10-16']], paid: null, shows: 'due on a date, and on track' },
  { id: 'w-kasarani-3', number: null, client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', amount: 250000, followedUpBy: 'brian', dueOn: null, dueWhen: 'the hearing date is set', stage: 'Not yet raised',
    stages: [['Not yet raised', '2026-10-05']], paid: null, shows: 'not yet raised' },
] as const;

/** Who each fixture name is, as a participant id. */
export const MUCHEMI_PID: Record<string, string> = Object.fromEntries(Object.values(MUCHEMI_PEOPLE).map((p) => [p.firstName.toLowerCase(), p.participantId]));

/** The fee notes as the record writer keeps them: one WorkItem each, its details in `fields`, its stages kept with their days. */
export function muchemiFeeNoteItems(): any[] {
  return MUCHEMI_FEE_NOTE_ROWS.map((r: any) => ({
    id: r.id, groundId: MUCHEMI_FEE_NOTES.id, kind: 'bill', name: r.number ?? r.client, stage: r.stage,
    ownerParticipantId: MUCHEMI_PID[r.followedUpBy], dueAt: r.dueOn ? new Date(`${r.dueOn}T00:00:00.000Z`) : null,
    createdAt: new Date(`${r.stages[0][1]}T09:00:00.000Z`), updatedAt: new Date(`${r.stages[r.stages.length - 1][1]}T09:00:00.000Z`), sourceEntryId: null,
    fields: {
      Client: r.client, Matter: r.matter, Amount: `KES ${r.amount.toLocaleString('en-US')}`,
      ...(r.number ? { Number: r.number } : {}),
      ...(r.dueOn ? { 'Falls due': r.dueOn } : {}),
      ...(r.dueWhen ? { 'Due when': r.dueWhen } : {}),
      ...(r.paid ? { Paid: `KES ${r.paid.amount.toLocaleString('en-US')}` } : {}),
      ...(r.paid?.proof ? { 'Proof said': r.paid.proof } : {}),
      ...(r.promises ? { 'Promised by': r.promises[r.promises.length - 1][0] } : {}),
      ...(r.lastContact ? { 'Last contact': r.lastContact } : {}),
      ...(r.inTheWay ? { 'In the way': r.inTheWay } : {}),
      ...(r.disputed ? { Disputed: r.disputed } : {}),
      ...(r.nextStep ? { 'Next step': r.nextStep, 'Next step by': r.nextStepBy } : {}),
      _stages: r.stages.map(([stage, on]: [string, string]) => ({ stage, on: `${on}T09:00:00.000Z`, by: 'check-in' })),
      ...(r.promises ? { _promises: r.promises.map(([by, said]: [string, string]) => ({ by, said: `${said}T09:00:00.000Z` })) } : {}),
    },
  }));
}

/** The bank slip Njeri added for FN-004, filed on it as a payment (proof-filed-on-its-item). FN-006 has none: paid on Aisha's word only. */
export const MUCHEMI_EVIDENCE = [
  { id: 'ev-fn004', groundId: 'g-muchemi-fee-notes', documentId: 'd-slip-fn004', participantId: 'p-njeri', workItemId: 'w-fn004', itemName: 'FN-004',
    readAs: 'A payment', countsAsProof: true, shows: 'Equity Bank remittance advice: KES 250,000 received from Kasarani Foods for FN-004.', createdAt: new Date('2026-10-20T10:00:00.000Z') },
];

/** The three Mondays the collections check-in has run, and who checked in on each. Wanjiru, the partner, runs it and does not. */
export const MUCHEMI_SESSIONS = [['2026-10-05', 1], ['2026-10-12', 2], ['2026-10-19', 3]] as const;
export function muchemiCheckIns(): any[] {
  return MUCHEMI_SESSIONS.flatMap(([day, n]) => (['brian', 'aisha', 'njeri'] as const).map((who) => ({
    id: `c-${who}-${n}`, groundId: MUCHEMI_FEE_NOTES.id, participantId: MUCHEMI_PID[who], sessionNumber: n, status: 'COMPLETED', isSetup: false,
    completedAt: new Date(`${day}T10:00:00.000Z`), availableFrom: new Date(`${day}T06:00:00.000Z`),
  })));
}

/** What people said, line by line, in their own words (the lines the board reads which check-ins named each fee note). */
export function muchemiLines(): any[] {
  const said: [string, number, string][] = [
    ['brian', 1, 'FN-005 for Kasarani waits for the reply to be filed, and the third Kasarani Foods fee note waits for the hearing date.'],
    ['brian', 2, 'FN-005 still waits for the reply. Kasarani Foods promised to pay FN-004 by 20 October.'],
    ['brian', 3, 'FN-004 is paid. Kasarani Foods still has a fee note waiting for the hearing date, and FN-005 waits for the reply.'],
    ['brian', 2, 'Nyota Logistics says the review was billed twice, so FN-008 is disputed.'],
    ['aisha', 1, 'Jamii Clinics promised to pay FN-007 by 10 October.'],
    ['aisha', 2, 'Baraka Hardware paid FN-006, they told me on the phone.'],
    ['aisha', 3, 'Nothing from Jamii Clinics on FN-007. Upendo Schools has not answered about FN-009.'],
    ['njeri', 3, 'The bank slip for FN-004 came in, KES 250,000 from Kasarani Foods.'],
  ];
  return said.map(([who, n, text], i) => ({
    id: `e-${who}-${n}-${i}`, participantId: MUCHEMI_PID[who], checkInId: `c-${who}-${n}`, text, type: 'PROGRESS', anchoredDocumentId: who === 'njeri' ? 'd-slip-fn004' : null,
    createdAt: new Date(`${MUCHEMI_SESSIONS[n - 1][0]}T09:${String(10 + i).padStart(2, '0')}:00.000Z`),
  }));
}

/* ------------------------------------------------------------------------------------------------------------------------------
 * THE LITIGATION DAILY, AS THE MATTER BOARD AND DUE ON AN EVENT READ IT (Release 2, pull request 3 of 3). Hand-written, made up.
 * Wanjiru runs it; Brian, Aisha and David, the paralegal, check in each weekday. Their places in this check-in are their own rows,
 * apart from their places in the fee notes check-in, as in the product: a person is a different participant in each check-in.
 * ---------------------------------------------------------------------------------------------------------------------------- */

/** Each person's place in the litigation daily. */
export const MUCHEMI_LITIGATION_PID: Record<string, string> = { wanjiru: 'l-wanjiru', brian: 'l-brian', aisha: 'l-aisha', david: 'l-david' };

/** The three weekdays it has run this week, Monday 19 to Wednesday 21 October. */
export const MUCHEMI_LITIGATION_SESSIONS = [['2026-10-19', 1], ['2026-10-20', 2], ['2026-10-21', 3]] as const;

export function muchemiLitigationCheckIns(): any[] {
  return MUCHEMI_LITIGATION_SESSIONS.flatMap(([day, n]) => (['brian', 'aisha', 'david'] as const).map((who) => ({
    id: `c-lit-${who}-${n}`, groundId: MUCHEMI_LITIGATION.id, participantId: MUCHEMI_LITIGATION_PID[who], sessionNumber: n, status: 'COMPLETED', isSetup: false,
    completedAt: new Date(`${day}T10:00:00.000Z`), availableFrom: new Date(`${day}T06:00:00.000Z`),
  })));
}

/**
 * WHAT WAS SAID IN THE LITIGATION DAILY, IN THEIR OWN WORDS. Two lines report the events two Kasarani Foods fee notes wait for:
 * Brian's "the reply was filed on 20 October" (FN-005 waits for "the reply is filed") and David's "the hearing date is set" (the
 * third Kasarani Foods fee note, not raised yet, waits for "the hearing date is set"). One line comes close and must not match:
 * David's "the mention date is set", which is a date being set in the same matter, and not the hearing date. Brian's "the reply is
 * drafted" is about the reply and is not its filing.
 */
export const MUCHEMI_THE_REPLY_WAS_FILED = 'In Kasarani Foods v. Tumaini Traders, the reply was filed on 20 October.';
export const MUCHEMI_THE_HEARING_DATE_IS_SET = 'In Kasarani Foods v. Tumaini Traders, the hearing date is set, for 12 November.';
export const MUCHEMI_THE_NEAR_MISS = 'Kasarani Foods: the mention date is set for 3 November.';

export function muchemiLitigationLines(): any[] {
  const said: [string, number, string, string][] = [
    ['brian', 1, 'In Kasarani Foods v. Tumaini Traders, the reply is drafted and goes to Wanjiru for review tomorrow.', '09:10'],
    ['aisha', 1, 'Jamii Clinics employment claim: the witness statements are still with the client.', '09:20'],
    ['david', 1, 'The bundle for the Jamii Clinics employment claim is indexed.', '09:30'],
    ['brian', 2, MUCHEMI_THE_REPLY_WAS_FILED, '09:10'],
    ['david', 2, MUCHEMI_THE_NEAR_MISS, '09:30'],
    ['david', 3, MUCHEMI_THE_HEARING_DATE_IS_SET, '09:30'],
    ['aisha', 3, 'Jamii Clinics employment claim: the client sent two of the three witness statements.', '09:40'],
  ];
  return said.map(([who, n, text, time]) => ({
    id: `e-lit-${who}-${n}`, participantId: MUCHEMI_LITIGATION_PID[who], checkInId: `c-lit-${who}-${n}`, groundId: MUCHEMI_LITIGATION.id, text, type: 'PROGRESS',
    anchoredDocumentId: null, recallBased: true, anchoredOrigin: null, confirmedAt: null, disputedAt: null,
    createdAt: new Date(`${MUCHEMI_LITIGATION_SESSIONS[n - 1][0]}T${time}:00.000Z`),
  }));
}

/** The deadlines the litigation daily keeps, each with whose it is. */
export function muchemiLitigationDeadlines(): any[] {
  return [
    { id: 'w-lit-hearing', groundId: MUCHEMI_LITIGATION.id, kind: 'deadline', name: 'The hearing in Kasarani Foods v. Tumaini Traders', stage: null,
      ownerParticipantId: MUCHEMI_LITIGATION_PID.david, dueAt: new Date('2026-11-12T00:00:00.000Z'), fields: {}, createdAt: new Date('2026-10-21T09:30:00.000Z'), sourceEntryId: 'e-lit-david-3' },
    { id: 'w-lit-statements', groundId: MUCHEMI_LITIGATION.id, kind: 'deadline', name: 'The witness statements for the Jamii Clinics employment claim', stage: null,
      ownerParticipantId: MUCHEMI_LITIGATION_PID.aisha, dueAt: new Date('2026-10-30T00:00:00.000Z'), fields: {}, createdAt: new Date('2026-10-19T09:20:00.000Z'), sourceEntryId: 'e-lit-aisha-1' },
  ];
}

/** What is in the way in the litigation daily, and not cleared. */
export function muchemiLitigationWaits(): any[] {
  return [
    { id: 'dep-lit-statement', groundId: MUCHEMI_LITIGATION.id, fromParticipantId: MUCHEMI_LITIGATION_PID.aisha, onParticipantId: null, onLabel: 'Jamii Clinics',
      what: 'the last witness statement', status: 'WAITING', clearedAt: null, createdAt: new Date('2026-10-19T09:20:00.000Z') },
  ];
}

/**
 * THE FEE NOTES CHECK-IN'S DOCUMENTS AND THE PROOF FILED ON ITS BILLS, AS REFERENCES AND RESOURCES SHOWS THEM (the B6 fee-notes
 * pictures). The engagement letter is the partner's, closed to the people in the check-in; the fee schedule and the billing
 * guidelines are open to everyone. The bank slip for FN-004 is filed as evidence (MUCHEMI_EVIDENCE), and so is a client's email on
 * FN-007, which is not proof of payment.
 */
export const MUCHEMI_DOCUMENTS = [
  { id: 'd-engagement-kasarani', groundId: 'g-muchemi-fee-notes', fileName: 'Engagement letter, Kasarani Foods.pdf', mimeType: 'application/pdf', createdAt: new Date('2026-09-03T08:00:00.000Z'),
    visibility: 'CLOSED', participantId: 'p-wanjiru', uploaderNote: null, isConversation: false, assessment: { suggests: ['Three fee notes of KES 250,000: on instruction, on filing the reply, on the hearing date.'] } },
  { id: 'd-fee-schedule', groundId: 'g-muchemi-fee-notes', fileName: 'Fee schedule 2026.pdf', mimeType: 'application/pdf', createdAt: new Date('2026-09-01T08:00:00.000Z'),
    visibility: 'OPEN', participantId: 'p-wanjiru', uploaderNote: null, isConversation: false, assessment: { suggests: ['Rates and terms: payment within 30 days.'] } },
  { id: 'd-billing-guidelines', groundId: 'g-muchemi-fee-notes', fileName: 'Billing guidelines.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', createdAt: new Date('2026-09-01T09:00:00.000Z'),
    visibility: 'OPEN', participantId: 'p-njeri', uploaderNote: null, isConversation: false, assessment: { suggests: ['When to raise, remind, call and escalate.'] } },
  { id: 'd-slip-fn004', groundId: 'g-muchemi-fee-notes', fileName: 'Equity slip FN-004.jpg', mimeType: 'image/jpeg', createdAt: new Date('2026-10-20T10:00:00.000Z'),
    visibility: 'OPEN', participantId: 'p-njeri', uploaderNote: null, isConversation: false, assessment: null },
  { id: 'd-email-fn007', groundId: 'g-muchemi-fee-notes', fileName: 'Jamii Clinics email.pdf', mimeType: 'application/pdf', createdAt: new Date('2026-10-12T10:00:00.000Z'),
    visibility: 'OPEN', participantId: 'p-aisha', uploaderNote: null, isConversation: false, assessment: null },
];

export const MUCHEMI_MORE_EVIDENCE = [
  { id: 'ev-fn007-email', groundId: 'g-muchemi-fee-notes', documentId: 'd-email-fn007', participantId: 'p-aisha', workItemId: 'w-fn007', itemName: 'FN-007',
    readAs: 'A client email', countsAsProof: false, shows: 'Will pay once head office releases the funds.', createdAt: new Date('2026-10-12T10:00:00.000Z') },
];
