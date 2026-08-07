import { engineUnavailable } from '../conversation/anthropic.service';

/**
 * TWO LEAKS FOUND BY WALKING A PROBATION GROUND AS THE PERSON BEING ASSESSED.
 *
 * Both were found the same way: signing in as a clinic manager on a three-month
 * onboarding that doubled as his probation, and reading what the product actually
 * put in front of him.
 *
 * 1. THE BROADCAST JOIN TOKEN. Every party on the ground was handed it, and the
 *    ground page renders it with a Copy button under the heading "Broadcast
 *    link". So a person being evaluated could pass out a link that lets an
 *    unauthenticated stranger check in as a party to the ground deciding their
 *    job - most likely without realising that is what the link did.
 *
 * 2. THE PROVIDER'S OWN ERROR TEXT. When the engine was genuinely unreachable,
 *    the raw upstream 403 travelled to the browser, naming our internal cloud
 *    project and linking to a billing console. Our infrastructure, shown to a
 *    customer, at the moment they were being asked to trust the product with an
 *    account of their own work.
 *
 * The first is an authorisation bug. The second is what the product says when it
 * is broken, which is a product decision and not an afterthought.
 */

describe('who may be given the broadcast join link', () => {
  // The decision, extracted exactly as grounds.service applies it. Kept in step
  // with the service by the live check in the journey run; this pins the RULE.
  const mayShare = (args: {
    isInitiator: boolean;
    viewerRole?: 'ADMIN' | 'MEMBER' | null;
    viewerOrgId?: string | null;
    groundOrgId: string;
  }) =>
    args.isInitiator || (args.viewerRole === 'ADMIN' && args.viewerOrgId === args.groundOrgId);

  it('gives it to the lead who owns the ground', () => {
    expect(mayShare({ isInitiator: true, viewerRole: 'MEMBER', viewerOrgId: 'org1', groundOrgId: 'org1' })).toBe(true);
  });

  it('gives it to an admin of the same organisation, who may be the one handing it out', () => {
    expect(mayShare({ isInitiator: false, viewerRole: 'ADMIN', viewerOrgId: 'org1', groundOrgId: 'org1' })).toBe(true);
  });

  it('WITHHOLDS it from a participant - the person being assessed', () => {
    // The actual bug. He could forward a working link to his own probation.
    expect(mayShare({ isInitiator: false, viewerRole: 'MEMBER', viewerOrgId: 'org1', groundOrgId: 'org1' })).toBe(false);
  });

  it('withholds it from an admin of a DIFFERENT organisation', () => {
    // Same role, different company, is a stranger here - and this is precisely
    // the token not to hand a stranger.
    expect(mayShare({ isInitiator: false, viewerRole: 'ADMIN', viewerOrgId: 'org2', groundOrgId: 'org1' })).toBe(false);
  });

  it('withholds it when there is no signed-in viewer at all', () => {
    expect(mayShare({ isInitiator: false, viewerRole: null, viewerOrgId: null, groundOrgId: 'org1' })).toBe(false);
  });
});

describe('what a person is told when the engine cannot be reached', () => {
  const real = new Error(
    'got status: 403. {"error":{"code":403,"message":"This API method requires billing to be enabled. Please enable billing on project #groundwork-500011 by visiting https://console.developers.google.com/billing/enable?project=groundwork-500011 then retry."}}',
  );

  it('never repeats the provider\'s message, our project name, or a console link', () => {
    const shown = JSON.stringify(engineUnavailable(real).getResponse());
    for (const secret of ['groundwork-500011', 'console.developers', 'billing', 'API method', '403']) {
      expect(shown).not.toContain(secret);
    }
  });

  it('answers the thing the person will actually be worried about', () => {
    const msg = (engineUnavailable(real).getResponse() as any).message as string;
    // They have just typed an account of their own work. "Something went wrong"
    // does not tell them whether it survived.
    expect(msg).toMatch(/nothing you have already said has been lost/i);
    // And on a probation ground, whose fault it looks like is not a small thing.
    expect(msg).toMatch(/not anything you did/i);
  });

  it('is a 503, so it reads as an outage rather than as the person\'s mistake', () => {
    expect(engineUnavailable(real).getStatus()).toBe(503);
  });
});
