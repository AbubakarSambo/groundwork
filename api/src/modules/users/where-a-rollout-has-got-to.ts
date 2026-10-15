/**
 * WHAT AN ADMIN HAS ACTUALLY DONE, so the screen they land on can say what is left.
 *
 * An org admin arriving for the first time is not here to check in. They are rolling something out
 * to a company, and a rollout has a shape: get the people in, try it, give somebody else the keys,
 * pay for it, connect it. Four of those five already existed as pages and the landing screen listed
 * them as four links with no idea which were done.
 *
 * EVERY STEP IS A FACT, not a flag we set when somebody visits a page. "Done" here means the thing
 * itself happened - people exist, a check-in exists, there are two admins - because a checklist that
 * ticks on arrival teaches people to click through steps rather than do them.
 */
export interface RolloutFacts {
  /** Everybody with an account, the admin included. */
  people: number;
  /** How many of them can run this when the first admin is away. */
  admins: number;
  /** Check-ins opened, ever. One is the whole point of the pilot step. */
  checkIns: number;
  /** Whether they are paying. Not which plan - the console does not need to know that. */
  paying: boolean;
  /** Whether any API key has been issued. Optional step, so it is never "not done". */
  connected: boolean;
  /**
   * U.3, "Get <organisation> going". Whether WhatsApp is switched on in Groundwork at all (our
   * credentials and the staff toggle, WhatsAppService.isEnabled). While it is off, nothing may
   * mention WhatsApp, so the checklist leaves its row out.
   */
  whatsappOn?: boolean;
  /** Whether this organisation has its own WhatsApp number connected and switched on. */
  whatsappConnected?: boolean;
  /** Whether the person reading pressed "Got it" on the welcome card. Per person, kept on the server. */
  welcomeCardSeen?: boolean;
}

export interface Step {
  key: string;
  title: string;
  /** What it is for, in one line. Not a paragraph - the word on the card already says it. */
  body: string;
  to: string;
  done: boolean;
  /** An optional step is shown, never counted, and never nags. */
  optional?: boolean;
}

/**
 * The rollout, in the order somebody actually does it.
 *
 * PEOPLE BEFORE THE PILOT, deliberately. A check-in with nobody in it is a form, and the pilot step
 * is the one that has to work.
 *
 * A SECOND ADMIN IS A STEP, not an afterthought. One admin means every approval, every invitation
 * and every billing question waits on one person being at their desk.
 */
export function theRollout(f: RolloutFacts): Step[] {
  return [
    {
      key: 'people',
      title: 'Get your people in',
      body: 'Paste your list. Nobody is emailed until you have seen what will happen.',
      to: '/org/members',
      /* More than the admin themselves. One person is an account, not a rollout. */
      done: f.people > 1,
    },
    {
      key: 'pilot',
      title: 'Run one with somebody',
      body: 'Pick something real and small. You see what it produces before your team does.',
      to: '/grounds/new',
      done: f.checkIns > 0,
    },
    {
      key: 'second-admin',
      title: 'Give somebody else the keys',
      body: 'A second admin approves check-ins and adds people when you are not there.',
      to: '/org/members',
      done: f.admins > 1,
    },
    {
      key: 'plan',
      title: 'Choose your plan',
      body: 'What it costs for the number of people you are putting on.',
      to: '/billing',
      done: f.paying,
    },
    {
      key: 'connect',
      title: 'Connect your systems',
      body: 'Your CRM, your HR system, your own product. Your engineers will want this page.',
      /* U.18: the Connect page's own address now; /org/integrations only redirects there. */
      to: '/settings/tools',
      done: f.connected,
      optional: true,
    },
  ];
}

/** Done out of the ones that count. Optional steps are not part of the finish line. */
export function howFarAlong(steps: Step[]): { done: number; of: number; finished: boolean } {
  const counted = steps.filter((s) => !s.optional);
  const done = counted.filter((s) => s.done).length;
  return { done, of: counted.length, finished: done === counted.length };
}
