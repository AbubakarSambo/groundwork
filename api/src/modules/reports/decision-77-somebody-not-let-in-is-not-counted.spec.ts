import { serviceFor, theSessionReportAs, everyString } from './__fixtures__/sales-team-q3-two-sessions';

/**
 * DECISION 77, ON THE SESSION REPORT (2 October 2026). In Hafsah's words: "A person an admin hasn't let
 * in yet is left out of both the 'N of M have answered' count and the count that decides when a
 * session closes. They are shown separately as waiting to be let in."
 *
 * "Sales team, Q3": Rukia runs it and checks in; Amani, Baraka and Neema check in; Faraji Odhiambo was
 * added and an admin has not let him in. Juma is an admin who only reads; Grace set it up.
 *
 * Before this, every reader read "4 of 5 people have answered this session." and the `counting` list
 * carried { who: "Faraji Odhiambo", answered: false }.
 */

const READERS: [string, string][] = [
  ['Rukia, who runs it', 'u-rukia'],
  ['Amani, a participant', 'u-amani'],
  ['Baraka, a participant', 'u-baraka'],
  ['Juma, an admin who only reads', 'u-juma'],
  ['Grace, the admin who set it up', 'u-grace'],
];

function letFarajiIn(svc: any, w: any) {
  const faraji = w.ground.participants.find((p: any) => p.id === 'p-faraji');
  if (faraji) faraji.user.awaitingOrgApproval = false;
  svc.prisma.user.findMany = async () => [];
}

function anAdminSaidNo(svc: any) {
  svc.prisma.membershipRequest = {
    findMany: async () => [{ userId: 'u-faraji', status: 'DECLINED', decidedByUserId: 'u-juma', decidedAt: new Date('2026-09-29T10:00:00Z') }],
  };
}

describe('decision 77: the session report does not count somebody an admin has not let in', () => {
  it.each(READERS)('%s reads "4 of 4 people have answered this session.", not "4 of 5"', async (_who, userId) => {
    const { svc } = serviceFor('sales');
    const r = await theSessionReportAs(svc, userId, 1);
    expect(r.refused).toBeUndefined();
    expect(r.pictureLines[0]).toBe('4 of 4 people have answered this session. There is enough here to talk about, and not enough to settle anything.');
    expect(everyString(r).filter((s) => /\b4 of 5\b/.test(s))).toEqual([]);
  });

  it.each(READERS)('%s is sent a `counting` list without Faraji in it', async (_who, userId) => {
    const { svc } = serviceFor('sales');
    const r = await theSessionReportAs(svc, userId, 1);
    expect(r.counting).toHaveLength(4);
    expect(r.counting.every((c: any) => c.answered)).toBe(true);
    expect(JSON.stringify(r.counting)).not.toMatch(/Faraji/);
  });
});

describe('decision 77: who is waiting to be let in is said apart from the count, to whoever may read the roster', () => {
  it.each([['Rukia, who runs it', 'u-rukia'], ['Juma, an admin who only reads', 'u-juma'], ['Grace, the admin who set it up', 'u-grace']])(
    '%s reads "Faraji Odhiambo is waiting to be let in."',
    async (_who, userId) => {
      const { svc } = serviceFor('sales');
      const r = await theSessionReportAs(svc, userId, 1);
      expect(r.waitingToBeLetIn).toBe('Faraji Odhiambo is waiting to be let in.');
    },
  );

  /* Changed by decision 93, row 4. This pinned "reads nothing about who is waiting to be let in", the restriction Hafsah removed. A decline is still not told to a participant. */
  it.each([['Amani, a participant', 'u-amani'], ['Baraka, a participant', 'u-baraka']])(
    '%s reads "Faraji Odhiambo is waiting to be let in." too, since people see each other here',
    async (_who, userId) => {
      const { svc } = serviceFor('sales');
      const r = await theSessionReportAs(svc, userId, 1);
      expect(r.waitingToBeLetIn).toBe('Faraji Odhiambo is waiting to be let in.');
    },
  );

  it('where an admin said no, the lead and the admins read "Faraji Odhiambo was not let in.", and a participant reads nothing about him', async () => {
    for (const [userId, expected] of [['u-rukia', 'Faraji Odhiambo was not let in.'], ['u-juma', 'Faraji Odhiambo was not let in.'], ['u-grace', 'Faraji Odhiambo was not let in.'], ['u-amani', null], ['u-baraka', null]] as const) {
      const { svc } = serviceFor('sales');
      anAdminSaidNo(svc);
      const r = await theSessionReportAs(svc, userId, 1);
      expect([userId, r.waitingToBeLetIn]).toEqual([userId, expected]);
      expect(r.pictureLines[0]).toMatch(/^4 of 4 people have answered this session\./);
      if (!expected) expect(everyString(r).filter((s) => /let in/.test(s))).toEqual([]);
    }
  });

  it('on a check-in with nobody held at the door, nobody is sent the line', async () => {
    for (const [, userId] of READERS) {
      const { svc, w } = serviceFor('sales');
      letFarajiIn(svc, w);
      const r = await theSessionReportAs(svc, userId, 1);
      expect(r.waitingToBeLetIn).toBeNull();
    }
  });
});

describe('decision 77: once an admin lets him in, he is counted again', () => {
  it.each(READERS)('%s reads "4 of 5 people have answered this session." and Faraji in the counting list', async (_who, userId) => {
    const { svc, w } = serviceFor('sales');
    letFarajiIn(svc, w);
    const r = await theSessionReportAs(svc, userId, 1);
    expect(r.pictureLines[0]).toBe('4 of 5 people have answered this session. There is enough here to talk about, and not enough to settle anything.');
    expect(r.counting).toHaveLength(5);
    expect(r.counting.filter((c: any) => !c.answered)).toHaveLength(1);
  });
});
