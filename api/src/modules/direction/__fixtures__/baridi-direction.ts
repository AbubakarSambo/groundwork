/**
 * RELEASE 6'S TEST DIRECTION, WRITTEN BY HAND: Baridi Appliances (test), modelled on the Check-in Reports file's "Direction: the company"
 * and "Direction: a team's brief, and recommitting". Set by Amani on 15 September 2026; read on Thursday 1 October.
 */
import type { ADirectionVersion, ALiveGoal } from '../the-direction';

export const TODAY = '2026-10-01';
export const BARIDI: ADirectionVersion = {
  version: 2,
  setAt: '2026-09-15T08:00:00.000Z',
  setBy: 'Amani Njoroge',
  now: {
    achieve: 'Keep the customers we have, and get paid on time',
    why: 'Late payments are costing us more than lost orders. Cash, not sales, is what is holding us back',
    believe: 'Customers pay late mostly when something went wrong after the sale. This is a belief we are testing',
    learned: 'Of 14 late payers, 9 had a problem with delivery or installation first',
    mattersMost: 'Hearing about unhappy customers before payment is due',
    whoOwns: 'Amani owns the direction. Wairimu owns sales, Lucy delivery, Grace collections',
  },
  whatChanged: {
    assumed: 'More sales would fix our cash',
    showedNotTrue: 'Sales grew 12% in August, but cash in the bank fell',
    learned: 'Late payments, not too few sales, are the problem. Most late payers had a problem after the sale',
    decided: 'Move from winning new customers to keeping and getting paid by the ones we have',
    newDirection: 'Keep the customers we have, and get paid on time',
  },
  teams: [
    { groundId: 'g-sales', team: 'Sales', means: 'Ask about payment history before promising terms. Fewer new small accounts this quarter', leadUserId: 'u-wairimu', leadName: 'Wairimu Kamau', approvedAt: '2026-09-16T09:00:00.000Z',
      brief: {
        items: [
          { verb: 'Stop', what: 'Chasing 20 new small shops a month', who: 'Miriam Wanjiku', whoParticipantId: 'p-miriam' },
          { verb: 'Continue', what: 'Supermarket renewals', who: 'Wairimu Kamau', whoParticipantId: 'p-wairimu' },
          { verb: 'Continue, changed', what: 'Corporate accounts, with payment checked first', who: 'Daniel Otieno', whoParticipantId: 'p-daniel' },
          { verb: 'Reassign', what: 'Kisumu follow-ups, from Brian to Miriam, since Brian is overloaded', who: null },
        ],
        unclear: 'Who calls a customer after installation is not clear',
        questionsNow: [{ asks: 'Which of your customers are at risk of paying late, and what are you doing about it?', replaces: 'How many new shops did you visit?' }],
        approvedAt: '2026-09-16T09:00:00.000Z',
      } },
    { groundId: 'g-delivery', team: 'Delivery', means: 'Tell finance the same day when a customer is unhappy', leadName: 'Lucy Achieng', approvedAt: '2026-09-17T09:00:00.000Z' },
    { groundId: 'g-finance', team: 'Finance', means: 'Call about the fridge before calling about the money', leadName: 'Grace Achieng', approvedAt: '2026-09-17T10:00:00.000Z' },
    { groundId: 'g-ops', team: 'Operations', means: 'Check stock before sales promises a date. This depends on sales sharing orders a day earlier', leadName: 'Njeri Mwangi', approvedAt: null },
  ],
};

export const LIVE: ALiveGoal[] = [
  { id: 'o-miriam', groundId: 'g-sales', name: '20 new small shops a month', ownerParticipantId: 'p-miriam', ownerName: 'Miriam Wanjiku', target: 20 },
  { id: 'o-wairimu', groundId: 'g-sales', name: 'Supermarket renewals this quarter', ownerParticipantId: 'p-wairimu', ownerName: 'Wairimu Kamau', target: 12 },
  { id: 'o-team', groundId: 'g-sales', name: 'Customers paid on time', ownerParticipantId: null, ownerName: null, target: 90 },
];
