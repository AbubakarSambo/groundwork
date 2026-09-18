import * as fs from 'fs';
import * as path from 'path';
import { EmailService } from './email.service';

/**
 * THE ASK SHE WROTE HAS TO BE THE ASK THAT GOES OUT.
 *
 * "Get updates from your team" has its own invite - one line, one link, two minutes - and it was
 * written, tested, and reached by nothing: every invite in the product went through
 * sendParticipantInvite, which explains what a check-in is and says it takes about ten minutes.
 * A person being asked one question by their own manager should never read that.
 *
 * So the choice lives in one method, and this holds both halves: the method picks the right mail,
 * and no invite site goes around it.
 */
describe('the invite a team update sends', () => {
  const svc = Object.create(EmailService.prototype) as any;
  svc.buildInviteUrl = (t: string) => `https://myground.work/invite?token=${t}`;

  function spying() {
    const calls: { which: string; args: any[] }[] = [];
    svc.sendParticipantInvite = (...args: any[]) => { calls.push({ which: 'ordinary', args }); return Promise.resolve({}); };
    svc.sendTeamUpdateAsk = (...args: any[]) => { calls.push({ which: 'team update', args }); return Promise.resolve({}); };
    return calls;
  }

  it('sends her ask when the ground is a team update, with the one line and the link', async () => {
    const calls = spying();
    await svc.sendTheInviteThisGroundSends(
      { scenario: 'TEAM_UPDATES', brief: 'How is sales going, and what is blocking you?', label: 'How is sales going' },
      'sahar@tea.demo', 'Hafsah', 'tok123',
    );
    expect(calls[0].which).toBe('team update');
    expect(calls[0].args[2]).toBe('How is sales going, and what is blocking you?');
    expect(calls[0].args[3]).toBe('https://myground.work/invite?token=tok123');
  });

  /* The trial sentence travels on the person's note, which is the only place the commit carries it. */
  it('and says it is a trial only when the note says so', async () => {
    const g = { scenario: 'TEAM_UPDATES', brief: 'How is sales going?', label: 'x' };
    let calls = spying();
    await svc.sendTheInviteThisGroundSends(g, 'a@x.com', 'Hafsah', 't', 'We are trying this out to see if this new tool can help us be aligned.');
    expect(calls[0].args[5]).toBe(true);
    calls = spying();
    await svc.sendTheInviteThisGroundSends(g, 'a@x.com', 'Hafsah', 't');
    expect(calls[0].args[5]).toBe(false);
  });

  it('leaves every other situation on the ordinary invite', async () => {
    const calls = spying();
    await svc.sendTheInviteThisGroundSends({ scenario: 'GOAL_ALIGNMENT', brief: 'something', label: 'Q4' }, 'a@x.com', 'Hafsah', 't');
    expect(calls[0].which).toBe('ordinary');
  });

  /* A team update with no line to ask is not one, and the ordinary invite is the safe answer. */
  it('and on the ordinary invite when there is no line to ask', async () => {
    const calls = spying();
    await svc.sendTheInviteThisGroundSends({ scenario: 'TEAM_UPDATES', brief: '  ', label: 'x' }, 'a@x.com', 'Hafsah', 't');
    expect(calls[0].which).toBe('ordinary');
  });

  /**
   * AND NOTHING INVITES ANYBODY AROUND IT. The bug was not that the branch was wrong; it was that
   * the branch did not exist at the five places an invitation is actually sent.
   */
  it('is the only thing that sends a first invitation', () => {
    const src = (p: string) => fs.readFileSync(path.join(__dirname, '..', 'grounds', p), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const f of ['grounds.service.ts', 'grounds.cron.ts']) {
      expect(src(f)).not.toContain('email.sendParticipantInvite(');
    }
  });
});
