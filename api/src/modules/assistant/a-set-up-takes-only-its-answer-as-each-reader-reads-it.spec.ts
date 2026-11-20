import { anOrganisationToSetUp, theOpening, theSaidBack } from './an-organisation-to-set-up-for-specs';
import { THE_POLICY, THE_POLICY_ASKED, THE_POLICY_RULES } from './the-leave-policy-asked-for-specs';

/**
 * A SET-UP TAKES ONLY ITS ANSWER, AND UNDERSTANDS WHAT IT IS TOLD (Hafsah, 20 November 2026).
 *
 * With a model, whether a message answers the question waiting is read by the model beside that question (who-a-message-is-for.ts),
 * and the set-up's answers are read by the model into the set-up's own words (a-policy-read-into-the-set-up.ts). Proved as what
 * Grace, the admin, and Miriam, a member, read, over the same organisation as the other set-up specs. The model here is pretend:
 * it says "ask" only for the messages a spec names, and it reads a pasted policy only when given one.
 */

const POLICY = 'Our leave policy. Everyone gets 21 days a year. A request goes to their manager, and nobody else approves it. HR does not need to see requests. If the manager does not answer, it waits.';

function aModel(opts: { ask?: RegExp; policy?: Record<string, string>; wantsLeave?: string } = {}) {
  const shown: string[] = [];
  const engine = {
    respond: jest.fn(async () => { throw new Error('no composing here'); }),
    extract: jest.fn(async (prompt: string, h: any[]) => {
      const content = String(h[0]?.content ?? '');
      if (/^You read one message/.test(prompt)) return opts.wantsLeave && content.split('\n')[0] === opts.wantsLeave ? { kind: 'wants', guide: 'ask_for_leave' } : { kind: 'other' };
      if (/is waiting on an answer from them/.test(prompt)) {
        shown.push(content);
        const message = /Their message: (.*)$/m.exec(content)?.[1] ?? '';
        return { for: opts.ask?.test(message) ? 'ask' : 'the_check_in' };
      }
      if (/^You help an admin set up how/.test(prompt) && opts.policy && content.includes(POLICY)) {
        return { answers: Object.entries(opts.policy).map(([key, answer]) => ({ key, answer })) };
      }
      return null;
    }),
  };
  return { engine, shown };
}

describe('a message that is not the answer lets the set-up go', () => {
  it('Grace asks something else in the middle: the model reads it as something else, the set-up is let go, and nothing is written', async () => {
    const m = aModel({ ask: /what can you help me with/i });
    const o = anOrganisationToSetUp({ engine: m.engine });
    expect(await o.says('u-grace', 'Set up our employee leave process')).toBe(theOpening('leave requests', 'How many days of leave does each person have in a year?'));
    const said = await o.says('u-grace', 'what can you help me with?');
    expect(said).not.toContain('How many days of leave');
    expect(said).toContain('Here is what I can help you with.');
    expect(o.proposals.every((p) => p.state !== 'PARKED')).toBe(true);
    expect(o.writes).toEqual([]);
    /* The model was shown the question itself, which comes after the opening's paragraphs, not the opening cut short. */
    expect(m.shown[0]).toContain('How many days of leave does each person have in a year?');
  });

  it('an answer the model reads as the answer carries the set-up on', async () => {
    const m = aModel({ ask: /what can you help me with/i });
    const o = anOrganisationToSetUp({ engine: m.engine });
    await o.says('u-grace', 'Set up our employee leave process');
    expect(await o.says('u-grace', '21')).toBe('Who approves annual leave?');
    expect(o.proposals.filter((p) => p.state === 'PARKED')).toHaveLength(1);
  });
});

describe('a written policy pasted into the set-up', () => {
  it('Grace pastes her policy: every answer in it is taken, nothing in it is asked, and nothing is written before her yes', async () => {
    const m = aModel({ policy: { days: '21', approver: 'their manager', after: 'no', tellHr: 'no', escalate: 'it waits' } });
    const o = anOrganisationToSetUp({ engine: m.engine });
    await o.says('u-grace', 'Set up our employee leave process');
    /* Changed 21 November 2026: the leave set-up also asks the leave policy (Hafsah, 20 November). This policy says nothing of it, so its first question is all that is asked; nothing the policy said is asked again. */
    expect(await o.says('u-grace', POLICY)).toBe(THE_POLICY_ASKED[0]);
    expect(o.writes).toEqual([]);
    const said = await o.talk('u-grace', THE_POLICY);
    expect(said.slice(0, -1)).toEqual(THE_POLICY_ASKED.slice(1));
    expect(said[said.length - 1]).toBe(theSaidBack('Here is how leave requests will work. Leave requests will be switched on.', [
      'Each person has 21 days of leave a year.',
      ...THE_POLICY_RULES,
      'A leave request goes to the person’s manager.',
      'If the person has no manager in Groundwork, it goes to an admin instead.',
      'HR is not shown leave requests.',
      'If somebody does not answer, it waits for them. Groundwork does not pass it on by itself.',
    ]));
    expect(o.writes).toEqual([]);
  });
});

describe('leave asked for while Leave requests are off', () => {
  it('Grace, who may switch them on, is told so and taken into setting them up', async () => {
    const o = anOrganisationToSetUp({ engine: aModel({ wantsLeave: 'I want to apply for leave' }).engine });
    expect(await o.says('u-grace', 'I want to apply for leave')).toBe(
      `Leave requests are not switched on yet, so I cannot send one for you. You can set them up now, and I will take you through it.\n\n${theOpening('leave requests', 'How many days of leave does each person have in a year?')}`,
    );
    expect(o.writes).toEqual([]);
  });

  it('Miriam, a member, is told an admin switches them on, and nothing is parked', async () => {
    const o = anOrganisationToSetUp({ engine: aModel({ wantsLeave: 'I want to apply for leave' }).engine });
    expect(await o.says('u-miriam', 'I want to apply for leave')).toBe('Leave requests are not switched on in your organisation, so I cannot send one for you. An admin can switch them on under Suites.');
    expect(o.proposals).toEqual([]);
  });
});
