import { anOrganisationForAnExecutive, ORG } from './an-organisation-for-an-executive';
import { forThePrincipal, grantADelegate, readWhoItIsAbout, revokeADelegate, whatMyDelegatesDid, whoIsTheReader } from './a-delegate-acts-for-a-principal';
import { buildTheRegister } from './the-outstanding-register';
import { whatIsOutstandingSaid } from './the-register-in-plain-words';
import { route } from '../assistant/the-router-is-deterministic';

const NOW = new Date('2026-11-10T09:00:00Z');
beforeEach(() => {
  /* Only the date is held still: the conversation itself runs on real promises. */
  jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'] });
});
afterEach(() => jest.useRealTimers());

const QUESTIONS = ['What is outstanding?', 'What needs my decision?', 'Which items can the team close this week?'];

describe('naming somebody to act for you is done by talking, said back first, and written only on a yes', () => {
  it('the whole conversation, as Fatima reads it', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    const back = await o.says('u-fatima', 'My EA is Amina Yusuf, Amina can do things for me.');
    expect(back).toBe('I will let Amina Yusuf act for you. Amina Yusuf will be able to read what is outstanding and what needs your decision, and nothing that you could not read yourself. Everything Amina Yusuf does will be written down as "Amina Yusuf for Fatima". You never have to sign in, and you can end this by telling me. Shall I do that?');
    expect(o.tables.delegate.rows).toHaveLength(0);

    expect(await o.says('u-fatima', 'yes')).toBe('Done. Amina Yusuf can now act for you. To end it, tell me that Amina Yusuf can no longer act for you.');
    expect(o.tables.delegate.rows).toHaveLength(1);
    expect(o.tables.delegate.rows[0]).toMatchObject({ principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', createdVia: 'chat', revokedAt: null });
    /* Changed 22 November 2026 (release test of 21 November, Ask #71): asking Ask, or letting somebody act for you, never makes the two standing jobs. Only an admin adding a senior person does (executive-onboarding/onboard-an-executive.ts), so a lead who names an assistant is never sent a year-end report. */
    expect(o.tables.persistentJob.rows).toEqual([]);
  });

  it('a no leaves everything as it was', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await o.says('u-fatima', 'my executive assistant is Amina Yusuf');
    expect(await o.says('u-fatima', 'no')).toBe('I have left it as it was. Nobody was given the right to act for you.');
    expect(o.tables.delegate.rows).toHaveLength(0);
  });

  it('taking it back is the same: said back, and written only on a yes', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await o.says('u-fatima', 'my EA is Amina Yusuf');
    await o.says('u-fatima', 'yes');
    expect(await o.says('u-fatima', 'Amina can no longer act for me')).toBe('I will stop Amina Yusuf acting for you. From then on Amina Yusuf cannot read or do anything for you. What Amina Yusuf did before stays on the record. Shall I do that?');
    expect(o.tables.delegate.rows[0].revokedAt).toBeNull();
    expect(await o.says('u-fatima', 'yes')).toBe('Done. Amina Yusuf can no longer act for you. What Amina Yusuf did before is still on the record.');
    expect(o.tables.delegate.rows[0].revokedAt).toBeInstanceOf(Date);
  });

  it('only somebody with a standing of their own can give it, and a delegate cannot pass it on', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    const notYours = 'Only a lead or an administrator can name somebody to act for them. Ask the person you work for to tell me who should act for them.';
    expect(await o.says('u-ibrahim', 'my EA is Amina Yusuf')).toBe(notYours);
    await o.says('u-fatima', 'my EA is Amina Yusuf');
    await o.says('u-fatima', 'yes');
    expect(await o.says('u-amina', 'my EA is Ibrahim Sule')).toBe(notYours);
    expect(o.tables.delegate.rows).toHaveLength(1);
  });

  it('asks who, when the name is not on the list, and which, when two match', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    expect(await o.says('u-fatima', 'my EA is Zainab Lawal')).toBe('I cannot find Zainab Lawal on your People list. If you give me their email address I will use that.');
    expect(await o.says('u-fatima', 'my EA is amina@example.com')).toContain('I will let Amina Yusuf act for you.');
    expect(readWhoItIsAbout('my EA is Amina Yusuf, Amina can do things for me.')).toEqual({ name: 'Amina Yusuf', email: null });
    expect(readWhoItIsAbout('Amina can no longer act for me')).toEqual({ name: 'Amina', email: null });
  });

  it('is routed ahead of the to-do and commitment lanes, stopping before starting', () => {
    expect(route('My EA is Amina Yusuf, Amina can do things for me.').lane).toBe('set_up_a_delegate');
    expect(route('Amina can no longer act for me').lane).toBe('stop_a_delegate');
    expect(route('remind me to call my assistant').lane).toBe('add_a_to_do');
  });
});

describe('what a delegate reads is what the principal could read, and never more', () => {
  async function withAmina() {
    const o = anOrganisationForAnExecutive(NOW);
    await o.says('u-fatima', 'my EA is Amina Yusuf');
    await o.says('u-fatima', 'yes');
    return o;
  }

  it('Amina reads Fatima’s register, with her name where "you" would be', async () => {
    const o = await withAmina();
    const said = await o.says('u-amina', 'What is outstanding?');
    expect(said).toBe([
      '4 matters are outstanding for Fatima.',
      'Circulate the committee minutes. Ibrahim Sule has it, and it is due Friday 13 November, a day I worked out from "by Friday".',
      'Chase the audit letter. Nobody has confirmed who owns it.',
      'Get the ministry’s reply on the budget. Amina Yusuf has it, and it is waiting on the ministry.',
      'File the quarterly assembly summary. Ibrahim Sule said it was done, but nothing shows it yet, so I have not counted it as finished.',
    ].join('\n'));
    expect(await o.says('u-amina', 'What needs my decision?')).toBe('Nothing needs Fatima\'s decision right now.');
  });

  it('never reads Fatima’s private to-do list, nor another lead’s check-in, in any of the three answers', async () => {
    const o = await withAmina();
    for (const q of QUESTIONS) {
      const forFatima = await o.says('u-fatima', q);
      const forAmina = await o.says('u-amina', q);
      expect(forAmina).not.toMatch(/retirement/i);
      expect(forAmina).not.toMatch(/severance/i);
      expect(forFatima).not.toMatch(/severance/i);
    }
    /* Her own list is hers to read. */
    expect(await o.says('u-fatima', 'What is outstanding?')).toContain('Think about my own retirement date. You have it.');
  });

  it('the register is built for a delegate without the list at all, not with it taken out afterwards', async () => {
    const o = await withAmina();
    const spy = jest.spyOn(o.prisma.todo, 'findMany');
    await buildTheRegister(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW, forADelegate: true });
    expect(spy).not.toHaveBeenCalled();
    const reg = await buildTheRegister(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', now: NOW, forADelegate: true });
    expect(reg.rows.flatMap((r) => r.sources.map((s) => s.kind))).not.toContain('todo');
    expect(whatIsOutstandingSaid(reg, { forName: 'Fatima', now: NOW })).not.toContain('retirement');
  });

  it('a delegate of Fatima reads nothing of what Tunde runs, even when asking by his name', async () => {
    const o = await withAmina();
    const said = await o.says('u-amina', 'What is outstanding for Tunde?');
    expect(said).not.toMatch(/severance/i);
    expect(said).toBe('You act for Fatima only, so I can only read what is outstanding for Fatima.');
  });

  it('a person who was never named reads nothing of the register', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    expect(await o.says('u-ibrahim', 'Which items can the team close this week?')).toBe('I do not keep an outstanding list for you. It is kept for people who run check-ins, and for the people they let act for them.');
    expect(await whoIsTheReader(o.prisma, ORG, 'u-ibrahim')).toEqual({ kind: 'nobody' });
  });

  it('a revoked delegate loses everything on the next question', async () => {
    const o = await withAmina();
    expect(await o.says('u-amina', 'Which items can the team close this week?')).toContain('could be closed this week');
    await o.says('u-fatima', 'Amina can no longer act for me');
    await o.says('u-fatima', 'yes');
    expect(await whoIsTheReader(o.prisma, ORG, 'u-amina')).toEqual({ kind: 'nobody' });
    expect(await o.says('u-amina', 'Which items can the team close this week?')).toBe('I do not keep an outstanding list for you. It is kept for people who run check-ins, and for the people they let act for them.');
    const said = await o.says('u-amina', 'What is outstanding?');
    expect(said).not.toMatch(/committee minutes|audit letter|ministry/i);
  });

  it('a grant by an administrator works the same, and is marked as the administrator’s', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await grantADelegate(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'AMINA@example.com', delegateName: 'Amina Yusuf', via: 'admin' });
    expect(o.tables.delegate.rows[0]).toMatchObject({ createdVia: 'admin', delegateEmail: 'amina@example.com' });
    expect(await whoIsTheReader(o.prisma, ORG, 'u-amina')).toMatchObject({ kind: 'delegate', principalUserId: 'u-fatima', principalFirstName: 'Fatima' });
    expect(await revokeADelegate(o.prisma, { organizationId: ORG, principalUserId: 'u-fatima', delegateEmail: 'amina@example.com', via: 'admin' })).toBe(1);
    expect(await whoIsTheReader(o.prisma, ORG, 'u-amina')).toEqual({ kind: 'nobody' });
  });

  it('the principal never has to sign in for anything to be kept: the grant stands without her', async () => {
    const o = await withAmina();
    /* Amina alone asks, three times; Fatima asks nothing. */
    for (const q of QUESTIONS) expect(await o.says('u-amina', q)).not.toBe('');
    expect(o.tables.delegateAction.rows).toHaveLength(3);
  });
});

describe('everything a delegate does is written down as "Amina Yusuf for Fatima", and stays', () => {
  it('records each question, none for Fatima herself, and keeps them after the grant ends', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    await o.says('u-fatima', 'my EA is Amina Yusuf');
    await o.says('u-fatima', 'yes');
    await o.says('u-fatima', 'What is outstanding?');
    await o.says('u-amina', 'What is outstanding?');
    await o.says('u-amina', 'What needs my decision?');
    await o.says('u-amina', 'Which items can the team close this week?');
    const lines = (await whatMyDelegatesDid(o.prisma, ORG, 'u-fatima')).map((l) => l.summary).sort();
    expect(lines).toEqual([
      'Amina Yusuf for Fatima: asked what is outstanding.',
      'Amina Yusuf for Fatima: asked what needs a decision.',
      'Amina Yusuf for Fatima: asked which items the team can close this week.',
    ].sort());
    expect(forThePrincipal('Amina Yusuf', 'Fatima')).toBe('Amina Yusuf for Fatima');
    await o.says('u-fatima', 'Amina can no longer act for me');
    await o.says('u-fatima', 'yes');
    expect(await whatMyDelegatesDid(o.prisma, ORG, 'u-fatima')).toHaveLength(3);
  });
});

describe('somebody with no register keeps the answers they had', () => {
  it('"what is outstanding" is still the onboarding checklist for an ordinary member', async () => {
    const o = anOrganisationForAnExecutive(NOW);
    expect(await o.says('u-ibrahim', 'What is outstanding?')).toBe('No role is recorded for you here, so there is nothing set up for you to work through.');
  });
});
