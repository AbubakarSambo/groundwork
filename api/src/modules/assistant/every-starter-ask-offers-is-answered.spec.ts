import { askStartersFor, askStarters } from './ask-name';
import { askGroundwork, textOf } from './request-92-harness';

/**
 * EVERY QUESTION ASK SUGGESTS CAN BE ANSWERED (requests 179 and 180 item 1, 7 October 2026).
 *
 * Four of the five starters, and the Company page's "Is the strategy moving?", answered "I cannot answer that one yet." People who use Ask got worse.
 * This sends every starter the engine serves, for each kind of reader, and the Company page's own question, through the same answering path a
 * typed message takes, and fails on the shrug. An option the shrug offers must send its key, not its label.
 */
const THE_COMPANY_PAGES_OWN = ['Is the strategy moving?'];

function everyStarterServed(): string[] {
  const all = new Set<string>(THE_COMPANY_PAGES_OWN);
  for (const has of [true, false]) for (const ctx of [true, false]) askStarters(has, ctx).forEach((s) => all.add(s));
  for (const isAGuest of [true, false]) for (const takesPartInOne of [true, false]) for (const runsOne of [true, false])
    for (const leaveIsOn of [true, false]) for (const spendingIsOn of [true, false]) for (const contextIsHere of [true, false]) {
      askStartersFor({ isAGuest, takesPartInOne, hasOneToUse: takesPartInOne || runsOne, runsOne, leaveIsOn, spendingIsOn, contextIsHere }).forEach((s) => all.add(s));
    }
  return [...all];
}

describe('what Ask offers is answered', () => {
  it('serves the starters this spec knows about', () => {
    expect(everyStarterServed()).toEqual(expect.arrayContaining([
      'What did I say I would do?', 'What is my check-in for, and who reads it?', 'When is my next check-in?',
      "What are the company's priorities right now?", 'Ask for leave, or to spend money.', 'Ask for leave.', 'Ask to spend money.', 'Is the strategy moving?',
    ]));
  });

  const readers = [
    ['a member who takes part in a check-in', { userId: 'u-miriam', role: 'MEMBER' }],
    ['a lead', { userId: 'lead-1', role: 'MEMBER' }],
    ['an admin', { userId: 'u-admin', role: 'ADMIN' }],
  ] as const;

  for (const starter of everyStarterServed()) {
    if (starter === 'Add a document or some context to my check-in.') continue; // answered by the context lane, which has its own specs
    for (const [who, o] of readers) {
      it(`"${starter}" is answered for ${who}`, async () => {
        const { service } = askGroundwork({ userId: o.userId, role: o.role, participants: [{ id: 'pp1', groundId: 'g1', userId: 'u-miriam', partyType: 'PARTICIPANT', managingOnly: false }] });
        const reply: any = await service.respond('org-a', 'p1', starter);
        expect(reply.lane).not.toBe('unplaced');
        expect(textOf(reply)).not.toMatch(/I cannot answer that one yet/);
      });
    }
  }

  it('an option the shrug offers sends its key, so it never loops back to the same reply', async () => {
    const { service } = askGroundwork();
    const reply: any = await service.respond('org-a', 'p1', 'zxqv wibble');
    const picker = reply.blocks.find((b: any) => b.type === 'picker' || b.options);
    expect(picker).toBeTruthy();
    for (const o of picker.options) expect(o.key).toMatch(/^[a-z_]+$/);
  });
});

/** What each reader reads, in full, for the starters that answer from the record. */
describe('what each reader reads in answer', () => {
  const ground = { id: 'g1', label: 'Sales team, Q4', initiatorId: 'lead-1', organizationId: 'org-a', brief: 'Get the Q4 target back on track.', toldToParticipants: 'This check-in is about how the Q4 sales target is going.', initiator: { firstName: 'Wanjiku' } };
  const opens = new Date(Date.now() + 3 * 86_400_000);
  const as = (userId: string, extra: any = {}) => {
    const h = askGroundwork({ userId, grounds: [ground] as any, checkIns: [{ groundId: 'g1', status: 'NOT_STARTED', availableFrom: opens, sessionNumber: 2 }], ...extra });
    h.prisma.ground.findMany = jest.fn(async () => [ground]);
    return h;
  };

  it('Amina is told when her next check-in opens, in a full sentence', async () => {
    const reply: any = await as('u-amina').service.respond('org-a', 'p1', 'When is my next check-in?');
    expect(reply.lane).toBe('when_is_my_next_check_in');
    expect(textOf(reply)).toMatch(/^Your next check-in in "Sales team, Q4" opens on \d{1,2} \w+ \d{4}\.$/);
  });

  it('Amina is told what it is for, and that Wanjiku, who runs it, reads its report', async () => {
    const reply: any = await as('u-amina').service.respond('org-a', 'p1', 'What is my check-in for, and who reads it?');
    expect(textOf(reply)).toBe('This is what "Sales team, Q4" is for. This check-in is about how the Q4 sales target is going. Wanjiku runs it and reads its report. Your own report is yours alone.');
  });

  it('Amina never reads what the lead wrote as a brief', async () => {
    const reply: any = await as('u-amina').service.respond('org-a', 'p1', 'What is my check-in for, and who reads it?');
    expect(textOf(reply)).not.toContain('back on track');
  });

  it('Wanjiku, who runs it, reads her own brief and that she reads the report', async () => {
    const reply: any = await as('lead-1').service.respond('org-a', 'p1', 'What is my check-in for, and who reads it?');
    expect(textOf(reply)).toBe('This is what "Sales team, Q4" is for. Get the Q4 target back on track. You run it, so you read its report.');
  });

  it('somebody in no check-in is told so plainly', async () => {
    const h = as('u-nia');
    h.prisma.ground.findMany = jest.fn(async () => []);
    expect(textOf(await h.service.respond('org-a', 'p1', 'When is my next check-in?'))).toBe('You have no check-in waiting for you right now. When one is coming up for you, I will tell you when it opens.');
  });

  it('the company priorities are listed for a member, from the company page', async () => {
    const subjects = [{ id: 's1', externalId: 'o1', type: 'OBJECTIVE', title: 'Open two new regions', measure: null, target: null, ownerExternalId: null, parentExternalId: null, syncedAt: new Date(), sourceDeletedAt: null, createdAt: new Date() }];
    const reply: any = await as('u-amina', { subjects }).service.respond('org-a', 'p1', "What are the company's priorities right now?");
    expect(textOf(reply)).toBe("The company's priorities right now are:\n1. Open two new regions");
  });

  it('and with none set, Ask says so, and Is the strategy moving? says there is nothing to say yet', async () => {
    expect(textOf(await as('u-amina').service.respond('org-a', 'p1', "What are the company's priorities right now?"))).toBe('The company has not set any priorities here yet. When it does, they will be on the Company page and I will tell you them.');
    expect(textOf(await as('u-amina').service.respond('org-a', 'p1', 'Is the strategy moving?'))).toBe('The company has not set any priorities here yet, so there is no strategy to say anything about.');
  });

  it('leave and spending are told how, for what is switched on', async () => {
    const h = as('u-amina');
    h.prisma.organizationSuite = { findMany: jest.fn(async () => [{ suite: 'leave' }]) };
    expect(textOf(await h.service.respond('org-a', 'p1', 'Ask for leave.'))).toBe('For leave, tell me which days you want off, for example "I would like leave on 20 and 21 October". I will say it back to you first, and it goes to the person who approves it only once you say yes.');
    h.prisma.organizationSuite = { findMany: jest.fn(async () => []) };
    expect(textOf(await h.service.respond('org-a', 'p1', 'Ask for leave, or to spend money.'))).toBe('Leave and spending requests are not switched on for your organisation yet. An admin can switch them on.');
  });
});

/** REQUEST 180 ITEM 2, AS EACH PERSON READS IT. Baraka has two promises written down in "Sales team, Q3"; Esther has none. */
describe('"What did I say I would do?"', () => {
  const asBaraka = (userId: string) => {
    const h = askGroundwork({ userId });
    h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: `ext-${userId}`, displayName: 'X', active: true, linkedUserId: userId }));
    h.prisma.commitment.findMany = jest.fn(async () => []);
    h.prisma.groundCommitment = {
      findMany: jest.fn(async ({ where }: any) => (where.participant.userId === 'u-baraka'
        ? [{ text: 'Send the Kisumu price list', whenSaid: 'by Friday', ground: { label: 'Sales team, Q3' } }, { text: 'Ask Juma about the discount.', whenSaid: null, ground: { label: 'Sales team, Q3' } }]
        : [])),
    };
    return h;
  };

  it('Baraka reads both promises, in plain words, and never "open actions"', async () => {
    const reply: any = await asBaraka('u-baraka').service.respond('org-a', 'p1', 'What did I say I would do?');
    expect(textOf(reply)).toContain('You said you would do 2 things that are still waiting.\n- Send the Kisumu price list (you said by Friday, in "Sales team, Q3")\n- Ask Juma about the discount (in "Sales team, Q3")');
    expect(textOf(reply)).not.toMatch(/open actions|You have no/i);
  });

  it('Esther reads none of Baraka\'s, and is told plainly she has said nothing is waiting', async () => {
    const reply: any = await asBaraka('u-esther').service.respond('org-a', 'p1', 'What did I say I would do?');
    expect(textOf(reply)).toContain('You have not said you will do anything that is still waiting.');
    expect(textOf(reply)).not.toContain('Kisumu');
  });
});

/** F-5 OF THE USER JOURNEYS. Wairimu's You page lists the promise she made while setting the check-in up; Ask told her she had said she would do nothing. */
describe('"What did I say I would do?" for a promise written down while setting a check-in up', () => {
  const asWairimu = (userId: string) => {
    const h = askGroundwork({ userId });
    h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: `ext-${userId}`, displayName: 'X', active: true, linkedUserId: userId }));
    h.prisma.commitment.findMany = jest.fn(async () => []);
    h.prisma.groundCommitment = { findMany: jest.fn(async () => []) };
    h.prisma.groundParticipant.findMany = jest.fn(async ({ where }: any) => (where.userId === 'u-wairimu' ? [{ id: 'pp-w', ground: { label: 'Sales team, last quarter' } }] : []));
    h.prisma.personObjective = {
      findMany: jest.fn(async ({ where }: any) => (where.participantId.in.includes('pp-w') && where.authoredBy === 'self' && where.status === 'OPEN'
        ? [{ text: 'I will settle the 21 day credit rule with finance by the end of October.', dueSaid: 'by the end of October', participantId: 'pp-w' }]
        : [])),
    };
    return h;
  };

  it('Wairimu reads her own promise, once, in the same words her You page holds', async () => {
    const reply: any = await asWairimu('u-wairimu').service.respond('org-a', 'p1', 'What did I say I would do?');
    expect(textOf(reply)).toContain('You said you would do one thing that is still waiting.');
    expect(textOf(reply)).toContain('settle the 21 day credit rule with finance by the end of October');
    expect(textOf(reply)).not.toContain('You have not said you will do anything');
  });

  it('somebody else in the organisation reads none of it', async () => {
    const reply: any = await asWairimu('u-other').service.respond('org-a', 'p1', 'What did I say I would do?');
    expect(textOf(reply)).toContain('You have not said you will do anything that is still waiting.');
    expect(textOf(reply)).not.toContain('credit rule');
  });
});

/** F-15 OF THE USER JOURNEYS. A promise that already says its day is not followed by "(you said ...)" with the same day again. */
describe('"What did I say I would do?" says each promise whole, once', () => {
  it('"I will send it by Friday now that I have the new name." is not followed by "(you said by Friday)"', async () => {
    const h = askGroundwork({ userId: 'u-amani' });
    h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: 'ext-a', displayName: 'X', active: true, linkedUserId: 'u-amani' }));
    h.prisma.commitment.findMany = jest.fn(async () => []);
    h.prisma.groundCommitment = { findMany: jest.fn(async () => [
      { text: 'I will send it by Friday now that I have the new name.', whenSaid: 'by Friday', ground: { label: 'Sales team, Q3' } },
      { text: 'I will send the Kisumu list.', whenSaid: 'by Friday', ground: { label: 'Sales team, Q3' } },
    ]) };
    const t = textOf(await h.service.respond('org-a', 'p1', 'What did I say I would do?'));
    expect(t).toContain('- I will send it by Friday now that I have the new name (in "Sales team, Q3")');
    expect(t).toContain('- I will send the Kisumu list (you said by Friday, in "Sales team, Q3")');
    expect(t).not.toMatch(/by Friday[^\n]*you said by Friday/);
  });
});

/** F-13 OF THE USER JOURNEYS. Amani said it in her own check-in; Ask told her she had never mentioned it. */
describe('"What did I say about ...?" finds what she said in her own check-ins', () => {
  const asAmani = (userId: string) => {
    const h = askGroundwork({ userId });
    h.prisma.person.findFirst = jest.fn(async () => ({ id: 'p1', externalId: `ext-${userId}`, displayName: 'X', active: true, linkedUserId: userId }));
    h.prisma.groundParticipant.findMany = jest.fn(async ({ where }: any) => (where.userId === 'u-amani' ? [{ id: 'pp-a', ground: { label: 'Sales team, Q3' } }] : []));
    h.prisma.$queryRaw = jest.fn(async (q: any) => {
      const sql = String(q?.sql ?? q?.strings?.join('?') ?? '');
      if (sql.includes('assistant_turns')) return [];
      return q.values.flat().includes('pp-a')
        ? [{ content: 'The Green Mart proposal is ready and I will send it on Wednesday.', createdAt: new Date(Date.now() - 3 * 86_400_000), participantId: 'pp-a' }]
        : [];
    });
    return h;
  };

  it('Amani is told what she said, with the check-in it was said in, and not that she never mentioned it', async () => {
    const t = textOf(await asAmani('u-amani').service.respond('org-a', 'p1', 'What did I say about the Green Mart proposal?'));
    expect(t).toContain('The Green Mart proposal is ready and I will send it on Wednesday.');
    expect(t).toContain('in "Sales team, Q3"');
    expect(t).not.toContain('You have not mentioned');
  });

  it('somebody else in the organisation is told she has not mentioned it, and reads none of Amani\'s words', async () => {
    const t = textOf(await asAmani('u-other').service.respond('org-a', 'p1', 'What did I say about the Green Mart proposal?'));
    expect(t).toContain('You have not mentioned');
    expect(t).not.toContain('ready and I will send it');
  });
});
