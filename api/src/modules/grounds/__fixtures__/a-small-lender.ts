/**
 * A SMALL LENDER (TEST): HAND-WRITTEN TEST DATA FOR RELEASE 2, PULL REQUEST 2 (release plan, Release 2, "Test organisations": "A
 * lender (test): a credit lead and three borrowers checking in on WhatsApp").
 *
 * Every name, number and amount is made up; every address is on the test domain; no passwords. A freezer-loans check-in run by
 * Halima Abdi, the credit lead, with three borrowers who check in for themselves each Monday:
 *  - Achieng Otieno repays on time, and a repayment record (an M-Pesa message she added) shows it;
 *  - Musa Kibet is behind: his repayment falls due before market day, and he promised to pay by Friday 23 October;
 *  - Peter Kiprop has stopped checking in: his last check-in was on 21 September, and nothing has been repaid since.
 * "Now" is LENDER_NOW, Wednesday 21 October 2026.
 */
export const LENDER_NOW = new Date('2026-10-21T15:00:00.000Z');

export const LENDER_ORG = {
  id: 'org-lender-test',
  name: 'Pesa Ndogo Lenders (test)',
  billWord: null as string | null,
  release1SalesBoardOn: false,
  release1bTabsOn: true,
  release2CollectionsOn: true,
};

export const LENDER_PEOPLE = {
  halima: { userId: 'u-halima', participantId: 'p-halima', firstName: 'Halima', lastName: 'Abdi', email: 'halima@pesandogo.test', jobTitle: 'Credit lead', partyType: 'INITIATOR' },
  achieng: { userId: 'u-achieng', participantId: 'p-achieng', firstName: 'Achieng', lastName: 'Otieno', email: 'achieng@pesandogo.test', jobTitle: 'Borrower', partyType: 'PARTICIPANT' },
  musa: { userId: 'u-musa', participantId: 'p-musa', firstName: 'Musa', lastName: 'Kibet', email: 'musa@pesandogo.test', jobTitle: 'Borrower', partyType: 'PARTICIPANT' },
  peter: { userId: 'u-peter', participantId: 'p-peter', firstName: 'Peter', lastName: 'Kiprop', email: 'peter@pesandogo.test', jobTitle: 'Borrower', partyType: 'PARTICIPANT' },
} as const;

export const LENDER_LOANS = {
  id: 'g-lender-loans',
  organizationId: LENDER_ORG.id,
  initiatorId: LENDER_PEOPLE.halima.userId,
  label: 'Freezer loans, cohort 1',
  scenario: 'COLLECTIONS',
  cadence: 'WEEKLY',
  workingDays: [1],
  timelineDays: 182,
  brief: 'Three traders repaying freezer loans each week. Each borrower checks in on WhatsApp and says what they repaid.',
  kindOfWork: null as string | null,
  kindOfWorkSetBy: null as string | null,
  checkInType: 'loans' as string | null,
  checkInTypeConfirmedAt: new Date('2026-09-14T09:00:00.000Z') as Date | null,
};

/** One loan per borrower, as the record writer keeps it: owned by the borrower, who said it. */
export function lenderLoanItems(): any[] {
  const loan = (id: string, who: keyof typeof LENDER_PEOPLE, stage: string, due: string, fields: Record<string, unknown>, stages: [string, string][]) => ({
    id, groundId: LENDER_LOANS.id, kind: 'loan-owed', name: 'loan', stage, ownerParticipantId: LENDER_PEOPLE[who].participantId,
    dueAt: new Date(`${due}T00:00:00.000Z`), createdAt: new Date(`${stages[0][1]}T09:00:00.000Z`), updatedAt: new Date(`${stages[stages.length - 1][1]}T09:00:00.000Z`), sourceEntryId: null,
    fields: { Amount: 'KES 12,000', 'Falls due': due, ...fields, _stages: stages.map(([s, on]) => ({ stage: s, on: `${on}T09:00:00.000Z`, by: 'check-in' })) },
  });
  return [
    loan('w-loan-achieng', 'achieng', 'Paid', '2026-10-19', { Paid: 'KES 12,000', Business: 'trading', Sales: 'KES 38,000 in four weeks' }, [['Disbursed', '2026-09-14'], ['Paid', '2026-10-19']]),
    loan('w-loan-musa', 'musa', 'Promised', '2026-10-12', {
      Business: 'trading', 'In the way': 'Repayment is due before market day', 'Promised by': '2026-10-23',
      'Next step': 'Pay after market day', 'Next step by': '2026-10-23',
      _promises: [{ by: '2026-10-23', said: '2026-10-19T09:00:00.000Z' }],
    }, [['Disbursed', '2026-09-14'], ['Due', '2026-10-12'], ['Promised', '2026-10-19']]),
    loan('w-loan-peter', 'peter', 'Due', '2026-09-28', {}, [['Disbursed', '2026-09-14'], ['Due', '2026-09-28']]),
  ];
}

export const LENDER_EVIDENCE = [
  { id: 'ev-achieng', groundId: LENDER_LOANS.id, documentId: 'd-mpesa-achieng', participantId: 'p-achieng', workItemId: 'w-loan-achieng', itemName: 'loan',
    readAs: 'A payment', countsAsProof: true, shows: 'M-Pesa confirmed. KES 12,000 sent to Pesa Ndogo Lenders.', createdAt: new Date('2026-10-19T08:00:00.000Z') },
];

export function lenderCheckIns(): any[] {
  const days = ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19'];
  return days.flatMap((day, i) => (['achieng', 'musa', 'peter'] as const)
    /* Peter stops checking in after 21 September. */
    .filter((who) => who !== 'peter' || i === 0)
    .map((who) => ({
      id: `c-${who}-${i + 1}`, groundId: LENDER_LOANS.id, participantId: LENDER_PEOPLE[who].participantId, sessionNumber: i + 1, status: 'COMPLETED', isSetup: false,
      completedAt: new Date(`${day}T10:00:00.000Z`), availableFrom: new Date(`${day}T06:00:00.000Z`),
    })));
}

export function lenderLines(): any[] {
  return [
    { id: 'l-achieng-5', participantId: 'p-achieng', checkInId: 'c-achieng-5', text: 'I paid the KES 12,000 on M-Pesa this morning. The shop is trading well.', createdAt: new Date('2026-10-19T08:30:00.000Z') },
    { id: 'l-musa-5', participantId: 'p-musa', checkInId: 'c-musa-5', text: 'I will pay on Friday after market day. The repayment is due before market day, so I am always late.', createdAt: new Date('2026-10-19T09:30:00.000Z') },
    { id: 'l-peter-1', participantId: 'p-peter', checkInId: 'c-peter-1', text: 'The freezer is working.', createdAt: new Date('2026-09-21T09:30:00.000Z') },
  ].map((l) => ({ ...l, type: 'PROGRESS', anchoredDocumentId: null }));
}
