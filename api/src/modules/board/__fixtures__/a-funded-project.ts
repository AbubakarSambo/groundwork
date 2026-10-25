/**
 * RELEASE 5'S TEST PROJECT, WRITTEN BY HAND: Mastercard market study (test), modelled on the Check-in Reports file's "A project". The
 * plan from the contract (three milestones), money in and out by month, two stakeholders. The leader is Wanjiku, the project lead Mercy,
 * finance Brian, the stakeholder owners Mercy and Brian, two team members Joseph and Amina. Read on Sunday 1 November 2026.
 */
export const TODAY = '2026-11-01';
export const MASTERCARD_RECORDS = [
  { id: 'm1', kind: 'milestone', name: 'The inception report', stage: 'Started', due: '2026-11-30', fields: { Share: '30%', Amount: 'KES 1,800,000', Client: 'Mastercard Foundation' } },
  { id: 'm2', kind: 'milestone', name: 'Field data from 6 markets', stage: 'Planned', due: '2027-01-31', fields: { Share: '40%', Amount: 'KES 2,400,000' } },
  { id: 'm3', kind: 'milestone', name: 'The final report and workshop', stage: 'Planned', due: '2027-03-15', fields: { Share: '30%', Amount: 'KES 1,800,000' } },
  { id: 'k1', kind: 'money', name: 'November', stage: null, fields: { Month: '2026-11', 'In for': 'What is left of the start-up grant', In: 'KES 1,000,000', 'Out for': 'Hiring the field team', Out: 'KES 650,000' } },
  { id: 'k2', kind: 'money', name: 'December', stage: null, fields: { Month: '2026-12', 'Out for': 'Travel to 6 markets', Out: 'KES 560,000' } },
  { id: 'k3', kind: 'money', name: 'January', stage: null, fields: { Month: '2027-01', 'In for': '40% of the contract on approval', In: 'KES 2,400,000' } },
  { id: 's1', kind: 'stakeholder', name: 'The Mastercard programme lead', stage: null, owner: 'Mercy Wanjiru', fields: { Needs: 'Monthly updates, evidence over opinion', 'Next update': '2026-11-11', 'Asked last time': 'How many traders have you spoken to, and in which markets?' } },
  { id: 's2', kind: 'stakeholder', name: 'County trade officers in 6 counties', stage: null, owner: 'Brian Otieno', fields: {} },
];
