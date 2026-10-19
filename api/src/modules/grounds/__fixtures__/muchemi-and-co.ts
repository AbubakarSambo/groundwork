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

/** The fee notes, by what each one shows. Amounts in Kenyan shillings. */
export const MUCHEMI_FEE_NOTE_ROWS = [
  { number: 'FN-004', client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', amount: 250000, followedUpBy: 'brian', dueOn: '2026-10-05', dueWhen: null, stage: 'Paid', paid: { amount: 250000, proof: 'a bank slip' }, shows: 'due on a date, paid with proof' },
  { number: 'FN-005', client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', amount: 250000, followedUpBy: 'brian', dueOn: null, dueWhen: 'The reply is filed.', stage: 'Due', paid: null, shows: 'due on an event' },
  { number: 'FN-006', client: 'Baraka Hardware', matter: 'Baraka Hardware lease', amount: 120000, followedUpBy: 'aisha', dueOn: '2026-09-30', dueWhen: null, stage: 'Paid', paid: { amount: 120000, proof: null }, shows: 'paid on someone’s word only' },
  { number: 'FN-007', client: 'Jamii Clinics', matter: 'Jamii Clinics employment claim', amount: 180000, followedUpBy: 'aisha', dueOn: '2026-09-15', dueWhen: null, stage: 'Promised', promisedFor: '2026-10-10', paid: null, shows: 'promised, and the date missed' },
  { number: 'FN-008', client: 'Nyota Logistics', matter: 'Nyota Logistics contract review', amount: 90000, followedUpBy: 'brian', dueOn: '2026-09-20', dueWhen: null, stage: 'Chased', paid: null, disputed: 'The client says the review was billed twice.', shows: 'disputed' },
  { number: 'FN-009', client: 'Upendo Schools', matter: 'Upendo Schools land matter', amount: 300000, followedUpBy: 'aisha', dueOn: '2026-09-01', dueWhen: null, stage: 'Reminded', paid: null, lastHeardFrom: null, shows: 'the client not heard from' },
  { number: null, client: 'Kasarani Foods', matter: 'Kasarani Foods v. Tumaini Traders', amount: 250000, followedUpBy: 'brian', dueOn: null, dueWhen: 'The hearing date is set.', stage: null, paid: null, shows: 'not yet raised' },
] as const;
