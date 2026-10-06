import { EntryService } from './entry.service';
import { EmailService } from '../email/email.service';
import { theLeadsReveal } from './the-anchor-reveal';
import { theChallengeIsDue, THE_SEVEN, whatHasBeenHeard, whatTheConversationHasHeard, THE_CLOSING_REMINDER } from './the-anchor-setup';

/**
 * REQUEST 166, READ AS EACH PERSON READS IT.
 *
 * The lead's first conversation, what the reveal says back to her, what her team's invitation says, and which situation the
 * saved check-in keeps. The model is a stand-in; what is checked is what the model is given and what each reader is served.
 */
const OPENING = "What's happening right now that makes you wish your team saw more of what you see?";
const HERS = {
  responsibleFor: 'You are responsible for the clinics we run and for the families they look after.',
  tryingToMove: 'You are trying to move the clinic managers.',
  howItContributes: 'The families who come to the clinics are what the grant pays for.',
  seeingToday: 'You are seeing managers close their own books and go home.',
  whyItBothersYou: 'It bothers you because nobody notices when a family stops coming.',
  whatTheyDontUnderstand: 'You think they do not see that the grant is renewed on how many families come back.',
  whatTheyWouldDoDifferently: 'They would phone the families who missed a visit. They would tell you early when a clinic is short of nurses.',
};
const turns = (n: number) => [
  { role: 'assistant' as const, content: OPENING },
  ...Array.from({ length: n }, (_, i) => [
    { role: 'user' as const, content: `Answer ${i + 1}` },
    { role: 'assistant' as const, content: `Question ${i + 2}` },
  ]).flat(),
  { role: 'user' as const, content: 'My latest answer.' },
];

/** A whole conversation: the hope question has been asked and she has answered it. */
const whole = () => [
  ...turns(5).slice(0, -1),
  { role: 'assistant' as const, content: 'Imagine a month from now and this is meaningfully better. What would you notice people doing without you having to ask?' },
  { role: 'user' as const, content: 'They would phone the families who missed a visit.' },
];

function world(switchOn: boolean, read: any, reply: string) {
  const prisma: any = { platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : null)) } };
  const extractSeen: string[] = [];
  const anthropic: any = {
    extract: jest.fn(async (system: string) => { extractSeen.push(system); return read; }),
    respond: jest.fn(async () => ''),
  };
  const prompts: any = { getActive: jest.fn(async () => { throw new Error('none'); }) };
  const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any, prompts);
  const seen: string[] = [];
  (service as any).guardedReply = jest.fn(async (system: string) => { seen.push(system); return reply; });
  return { service, seen, extractSeen };
}

describe('the lead’s first conversation, with the anchor on', () => {
  it('serves the seven things under the seven keys, in her own words, as she goes', async () => {
    const some = { responsibleFor: HERS.responsibleFor, seeingToday: HERS.seeingToday };
    const { service } = world(true, some, 'Why does that bother you?');
    const out: any = await service.onboard(turns(1) as any, 'HELP_TEAM_UNDERSTAND');
    expect(Object.keys(out.extracted).filter((k) => (THE_SEVEN as readonly string[]).includes(k)).sort()).toEqual(['responsibleFor', 'seeingToday']);
    expect(out.extracted.responsibleFor).toBe(HERS.responsibleFor);
    expect(out.ready).toBe(false);
  });

  it('keeps what was heard before when this turn’s read finds nothing new', async () => {
    const { service } = world(true, {}, 'And who do you want to move?');
    const out: any = await service.onboard(turns(1) as any, 'HELP_TEAM_UNDERSTAND', undefined, undefined, { anchorItems: { responsibleFor: HERS.responsibleFor } } as any);
    expect(out.extracted.responsibleFor).toBe(HERS.responsibleFor);
  });

  it('tells the model what it has already heard, and that the opening question is done, so the second question is not the first again', async () => {
    const { service, seen } = world(true, { responsibleFor: HERS.responsibleFor }, 'Who are you trying to move?');
    await service.onboard(turns(1) as any, 'HELP_TEAM_UNDERSTAND');
    expect(seen[0]).toContain(`The very first thing the lead was asked was: "${OPENING}" It has been asked and answered. Never ask it again`);
    expect(seen[0]).toContain(`Do not ask for any of this again:\n- what the lead is responsible for (the outcome that sits with them, not only a job title): ${HERS.responsibleFor}`);
    expect(seen[0]).toContain('Not heard yet. Ask about only these, one question at a time');
    expect(seen[0]).toContain('who the lead is trying to move');
    expect(seen[0]).not.toContain('what the lead is responsible for (the outcome that sits with them, not only a job title)\n- who the lead');
  });

  it('is ready only when all seven are heard and the reply has stopped asking', async () => {
    const closing = 'You are carrying the clinics and the families. Next you add the people you want to move, and Groundwork checks in with each of them one to one.';
    const done = world(true, HERS, closing);
    const out: any = await done.service.onboard(whole() as any, 'HELP_TEAM_UNDERSTAND');
    expect(out.ready).toBe(true);
    expect(done.seen[0]).toContain(THE_CLOSING_REMINDER);
    expect(done.seen[0]).toContain('Do not ask a question in this turn.');
    /* Everything heard but the reply still asks something: she must be able to answer it, so it is not ready. */
    const asking = world(true, HERS, 'Is there anything you would add?');
    expect(((await asking.service.onboard(whole() as any, 'HELP_TEAM_UNDERSTAND')) as any).ready).toBe(false);
  });

  it('is not complete while she has not yet answered what better would look like, however much else is heard', async () => {
    const early = world(true, HERS, 'Anything else?');
    const out: any = await early.service.onboard(turns(6) as any, 'HELP_TEAM_UNDERSTAND');
    expect(out.ready).toBe(false);
    expect(early.seen[0]).not.toContain(THE_CLOSING_REMINDER);
  });

  it('gives the screen what its summary card and the next step already read, in the lead’s words', async () => {
    const { service } = world(true, { ...HERS, peopleNamed: ['Wanjiru'] }, 'x');
    const out: any = await service.onboard(whole() as any, 'HELP_TEAM_UNDERSTAND');
    expect(out.extracted.whoInvolved).toBe(HERS.tryingToMove);
    expect(out.extracted.decision).toBe(HERS.whyItBothersYou);
    expect(out.extracted.goals).toEqual([HERS.whatTheyWouldDoDifferently]);
    expect(out.extracted.brief).toBe(HERS.whatTheyDontUnderstand);
    expect(out.needsPeople).toBe(false);
  });

  it('with the switch off, the anchor’s key is ignored here exactly as it was: the ordinary setup runs, and no seven things are served', async () => {
    const { service, extractSeen } = world(false, { mode: 'recurring', initial: 'Something.' }, 'Tell me a little about it.');
    const out: any = await service.onboard(turns(1) as any, 'HELP_TEAM_UNDERSTAND');
    expect(extractSeen[0]).toContain('extracting structured data from an onboarding conversation');
    for (const k of THE_SEVEN) expect(out.extracted[k]).toBeUndefined();
  });
});

describe('what the model is told it has heard', () => {
  it('says plainly when nothing is heard yet', () => {
    expect(whatTheConversationHasHeard({}, OPENING)).toContain('You have not heard any of the seven things yet.');
  });
  it('never loses something heard before', () => {
    expect(whatHasBeenHeard({ seeingToday: 'a' }, { anchorItems: { responsibleFor: 'b', seeingToday: 'old' } })).toEqual({ responsibleFor: 'b', seeingToday: 'a' });
  });
});

describe('the reveal says what the lead said', () => {
  const REPORT = {
    whatGroundworkSaw: 'x', alignmentStatus: 'Mixed', alignmentBasis: 'y', areasRequiringAlignment: [], alignmentReached: [],
    honestClose: { aligned: 'a', open: 'b', revisit: 'c', risk: 'd' }, mentionedPeople: [], suggestedParties: [],
  };
  const reveal = async (heardNow: any, serverHad?: any) => {
    const prisma: any = { platformSetting: { findUnique: jest.fn(async () => ({ value: { on: true } })) } };
    const anthropic: any = { extract: jest.fn(async (system: string) => (system.includes('first conversation between Groundwork and a lead') ? heardNow : JSON.parse(JSON.stringify(REPORT)))) };
    const service = new EntryService(anthropic, prisma, {} as any, {} as any, {} as any, {} as any, {} as any);
    const out: any = await service.report(turns(3) as any, 'HELP_TEAM_UNDERSTAND', 'Help my team understand', serverHad, []);
    return out.leadsReveal;
  };

  it('writes what she is carrying and what she is seeing today from her words, never "has not yet written down"', async () => {
    const r = await reveal(HERS);
    expect(r.carrying).toBe('You are responsible for the clinics we run and for the families they look after. It bothers you because nobody notices when a family stops coming.');
    expect(r.seeingToday).toBe('You are seeing managers close their own books and go home.');
    expect(r.whatTheTeamNeedsToUnderstand).toBe('You think they do not see that the grant is renewed on how many families come back.');
    expect(r.whoYouAreTryingToMove).toBe('You are trying to move the clinic managers.');
    expect(r.whatMeaningfulChangeWouldLookLike).toEqual(['They would phone the families who missed a visit.', 'They would tell you early when a clinic is short of nurses.']);
    expect(JSON.stringify(r)).not.toContain('has not yet written down');
  });

  it('uses what the screen already held from her first conversation when the check-in turns hold less', async () => {
    const r = await reveal({}, HERS);
    expect(r.carrying).toContain('You are responsible for the clinics');
    expect(r.seeingToday).toBe(HERS.seeingToday);
  });

  it('keeps the plain sentence for what she has not yet said', async () => {
    const r = await reveal({ seeingToday: 'you are seeing late reports' });
    expect(r.seeingToday).toBe('You are seeing late reports.');
    expect(r.carrying).toBe('Groundwork has not yet written down what you are carrying.');
  });
});

describe('the situation the saved check-in keeps', () => {
  function makeService(switchOn: boolean) {
    const prisma: any = {
      user: { findUnique: jest.fn(async () => ({ role: 'ADMIN', email: 'rukia@sokoni.test' })) },
      organization: { findUnique: jest.fn(async () => ({ whoMayOpenCheckIns: 'NAMED_LEADS', checkInsNeedApproval: true })), update: jest.fn(async () => ({})) },
      platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : null)) },
      entryDraft: { findUnique: jest.fn(async () => null), updateMany: jest.fn(async () => ({ count: 0 })) },
      groundParticipant: { findMany: jest.fn(async () => [{ id: 'p1' }]), findFirst: jest.fn(async () => ({ id: 'p1' })), update: jest.fn(async () => ({})) },
      roundCompletion: { create: jest.fn(async (a: any) => a.data) },
      checkIn: { count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 'ci1' })), update: jest.fn(async () => ({})) },
      conversationTurn: { createMany: jest.fn(async () => ({ count: 0 })) },
      leadContextNote: { create: jest.fn(async () => ({})) },
      ground: { update: jest.fn(async () => ({})), findUnique: jest.fn(async () => ({ joinToken: 'jt' })) },
    };
    const grounds: any = { create: jest.fn(async () => ({ id: 'g-self', joinToken: 'jt' })), createForLead: jest.fn(), addParticipant: jest.fn(async () => ({})) };
    const conversation: any = { extractRecordEntries: jest.fn(async () => undefined), extractExpectations: jest.fn(async () => undefined), ensureNextSession: jest.fn(async () => undefined), buildSoloArtifact: jest.fn(async () => undefined) };
    const service = new EntryService({} as any, prisma, grounds, {} as any, {} as any, conversation, { emit: jest.fn() } as any);
    return { service, grounds };
  }
  const save = (service: EntryService, contributors: any[] = []) =>
    service.commit('org1', 'user1', { groundLabel: 'Help my team understand', scenario: 'HELP_TEAM_UNDERSTAND', cadence: 'ONE_TIME', cadenceChosen: true, history: [{ role: 'user', content: 'hi' }] as any, report: null, contributors } as any);

  it('is the anchor’s own situation, with the switch on', async () => {
    const { service, grounds } = makeService(true);
    await save(service);
    expect(grounds.create.mock.calls[0][2].scenario).toBe('HELP_TEAM_UNDERSTAND');
  });

  it('is still a project with the switch off, as it was before the anchor had a situation', async () => {
    const { service, grounds } = makeService(false);
    await save(service);
    expect(grounds.create.mock.calls[0][2].scenario).toBe('NEW_PROJECT');
  });

  it('keeps the name the lead gave each person, beside their address', async () => {
    const { service, grounds } = makeService(true);
    await save(service, [{ email: 'amani@sokoni.test', displayName: '  Amani Wekesa ', context: 'Runs the warehouse' }, { email: 'baraka@sokoni.test' }]);
    expect(grounds.addParticipant.mock.calls[0][3]).toMatchObject({ email: 'amani@sokoni.test', displayName: 'Amani Wekesa', roleAsDescribed: 'Runs the warehouse' });
    expect(grounds.addParticipant.mock.calls[1][3].displayName).toBeUndefined();
  });
});

describe('the invitation a person on the team reads', () => {
  function anEmail(startedFrom: string | null, switchOn = true) {
    const prisma: any = {
      ground: { findUnique: jest.fn(async () => ({ startedFrom, scenario: 'HELP_TEAM_UNDERSTAND', peersVisibleToEachOther: null, organization: { name: 'Sokoni Fresh' }, organizationId: 'org-1', overWhatsApp: null })) },
      groundParticipant: { findUnique: jest.fn(async () => null) },
      platformSetting: { findUnique: jest.fn(async () => (switchOn ? { value: { on: true } } : null)) },
    };
    const svc = new EmailService({ get: () => undefined } as any, {} as any, prisma);
    const sent: any[] = [];
    (svc as any).sendEmail = jest.fn(async (o: any) => { sent.push(o); return undefined; });
    return { svc, sent };
  }
  const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();
  const theCheckIn = { scenario: 'HELP_TEAM_UNDERSTAND', brief: null, label: 'Help my team understand' };

  it('is the anchor’s own invitation, in the spec’s words, with its button', async () => {
    const { svc, sent } = anEmail('anchor');
    await svc.sendTheInviteThisGroundSends(theCheckIn, 'amani@sokoni.test', 'Rukia Otieno', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', groundId: 'g1' });
    expect(sent[0].subject).toBe('Rukia is trying a different way to help the team get on the same page.');
    const read = plain(sent[0].html);
    expect(read).toContain('Rukia is trying a different way to help the team get on the same page.');
    expect(read).toContain('For the next month, Groundwork will check in with each person one to one about the work you’re doing, what you’re seeing, what’s getting in the way and how it connects to the bigger picture.');
    expect(read).toContain('Rukia wants to hear your side.');
    expect(read).toContain('There aren’t right answers. The point is to help the team understand one another better and make the work move.');
    expect(read).toContain('Start your first check-in →');
    expect(read).toContain('The people in this check-in');
    expect(read).not.toMatch(/Say what I am seeing|would like your take on|ten minutes/);
  });

  it('carries no developer comment, anchor or not', async () => {
    for (const from of ['anchor', null]) {
      const { svc, sent } = anEmail(from);
      await svc.sendTheInviteThisGroundSends(theCheckIn, 'amani@sokoni.test', 'Rukia', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', groundId: 'g1' });
      expect(sent[0].html).not.toContain('<!--');
      expect(sent[0].html).not.toContain('THE BUTTON SAYS WHAT HAPPENS');
    }
    const { svc, sent } = anEmail(null);
    await svc.sendLeadInvite('lead@sokoni.test', 'Grace', 'Sales', 'https://x.test', { kind: 'LEAD_INVITE' });
    expect(sent[0].html).not.toContain('<!--');
  });

  it('is the ordinary invitation for any other check-in, and for an anchor one while the switch is off', async () => {
    for (const [from, on] of [[null, true], ['anchor', false]] as const) {
      const { svc, sent } = anEmail(from, on);
      await svc.sendTheInviteThisGroundSends(theCheckIn, 'amani@sokoni.test', 'Rukia', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', groundId: 'g1' });
      expect(plain(sent[0].html)).toContain('would like to know what you are seeing in');
    }
  });

  it('does not call the lead "Your" when the caller did not know her name', async () => {
    const { svc, sent } = anEmail('anchor');
    await svc.sendTheInviteThisGroundSends(theCheckIn, 'amani@sokoni.test', 'Your lead', 'tok', undefined, { kind: 'PARTICIPANT_INVITE', groundId: 'g1' });
    expect(sent[0].subject).toBe('Your lead is trying a different way to help the team get on the same page.');
  });
});

describe('what the reveal says about who she is moving, and what better would look like', () => {
  it('says it in her words even when the read of the turns also listed a group as if it were a person', () => {
    const r = theLeadsReveal({
      messages: [],
      peopleNamed: ['The operations team'],
      heard: { tryingToMove: 'you are trying to move the operations team, fifteen people in warehouse and dispatch', whatTheyWouldDoDifferently: 'You would notice people telling you before a truck is late. You would notice dispatch phoning the shop themselves.' },
    });
    expect(r.whoYouAreTryingToMove).toBe('You are trying to move the operations team, fifteen people in warehouse and dispatch.');
    expect(r.whatMeaningfulChangeWouldLookLike).toEqual(['You would notice people telling you before a truck is late.', 'You would notice dispatch phoning the shop themselves.']);
  });
});

describe('the challenge comes before the hope question, once', () => {
  it('is due once the lead has said what the group does not understand, and not before', () => {
    expect(theChallengeIsDue({ seeingToday: 'a' }, false, false)).toBe('');
    expect(theChallengeIsDue({ whatTheyDontUnderstand: 'b' }, false, false)).toContain('Your one challenge comes now');
  });
  it('is not due again once it has been used, or once the hope question has been asked', () => {
    expect(theChallengeIsDue({ whatTheyDontUnderstand: 'b' }, true, false)).toBe('');
    expect(theChallengeIsDue({ whatTheyDontUnderstand: 'b' }, false, true)).toBe('');
  });
  it('reaches the model for a lead who has just said what her group does not understand, and not after a challenge was asked', async () => {
    const said = turns(2);
    const due = world(true, { whatTheyDontUnderstand: HERS.whatTheyDontUnderstand }, 'Have you told them this?');
    await due.service.onboard(said as any, 'HELP_TEAM_UNDERSTAND');
    expect(due.seen[0]).toContain('Your one challenge comes now');
    const asked = [...said.slice(0, -1), { role: 'assistant' as const, content: 'Have you actually told them this?' }, { role: 'user' as const, content: 'Not really.' }];
    const after = world(true, { whatTheyDontUnderstand: HERS.whatTheyDontUnderstand }, 'Imagine a month from now.');
    await after.service.onboard(asked as any, 'HELP_TEAM_UNDERSTAND');
    expect(after.seen[0]).not.toContain('Your one challenge comes now');
  });
});

describe('who she is trying to move reads as a sentence whichever way the read wrote it', () => {
  it('puts a group she named into one, and leaves a sentence alone', () => {
    expect(theLeadsReveal({ messages: [], heard: { tryingToMove: 'The sales team and the account managers' } }).whoYouAreTryingToMove).toBe('You are trying to move the sales team and the account managers with you.');
    expect(theLeadsReveal({ messages: [], heard: { tryingToMove: 'you are trying to move the clinic managers.' } }).whoYouAreTryingToMove).toBe('You are trying to move the clinic managers.');
  });
});
