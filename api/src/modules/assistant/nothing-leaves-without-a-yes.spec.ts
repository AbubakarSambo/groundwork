/**
 * MAIL LEAVES THE BUILDING AND CANNOT BE RECALLED.
 *
 * Forty kinds of it were built and the assistant could reach none, so everything
 * it produced went back into the chat and died there. Now it can send — which
 * makes it the first capability whose failure mode is not a wrong answer but an
 * irreversible act, so the rules around it matter more than the feature.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  askBeforeSending,
  theMail,
  whyThisCannotBeSent,
} from './anything-it-can-say-it-can-send';
import { CAPABILITY_BY_KEY } from './what-the-assistant-can-do';
import { route } from './the-router-is-deterministic';

const latest = {
  body: 'You own 2: Ten companies lined up for the sprint (target: 10).',
  about: 'what am I on?',
  lane: 'what_am_i_on',
};
const me = { displayName: 'Hafsah', email: 'hafsah@example.test' };

describe('before anything is sent', () => {
  it('it asks, and says exactly where it is going', () => {
    /* Never inferred from a sentence that merely sounded like a request —
       "can you send me that" is a question in some rooms. */
    const asked = askBeforeSending(latest, me);
    expect(asked).toContain('hafsah@example.test');
    expect(asked).toContain('Nobody else is copied');
    expect(asked.trimEnd().endsWith('?')).toBe(true);
  });

  it('and the capability declares that it writes only after a yes', () => {
    expect(CAPABILITY_BY_KEY.get('send_me_that')!.writes).toBe('after you confirm it');
  });
});

describe('what it refuses, in words that name the fix', () => {
  it('nothing said yet', () => {
    expect(whyThisCannotBeSent(null, me)).toContain('ask me something first');
  });

  it('and no address to send to', () => {
    const said = whyThisCannotBeSent(latest, { displayName: 'Sam', email: null })!;
    expect(said).toContain('has not given us an email address');
    expect(said).toContain('can add one');
  });

  it('and nothing else, because the other cases are not the person\'s problem', () => {
    expect(whyThisCannotBeSent(latest, me)).toBeNull();
  });
});

describe('the mail itself', () => {
  it('carries what was actually said, not a summary of it', () => {
    /* A summary means the mail and the conversation disagree, and only one of
       them is in front of them. */
    expect(theMail(latest, me).text).toContain(latest.body);
  });

  it('and says what it is about, so an inbox is not full of one subject line', () => {
    expect(theMail(latest, me).subject).toContain('what am I on');
  });

  it('and says nobody else was sent it', () => {
    expect(theMail(latest, me).text).toContain('Nobody else was sent it');
  });
});

describe('it goes to them and nobody else', () => {
  const source = fs
    .readFileSync(path.join(__dirname, 'assistant.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('the address is read from their own record at the moment of sending', () => {
    /**
     * RE-READ AT EXECUTION. Between the offer and the yes their address may have
     * changed or been removed, and a parked action carries the address it was
     * offered under. Mail to a stale address is the one mistake here that cannot
     * be taken back.
     */
    /* From the DEFINITION, not the call site — the first occurrence of the name
       is where it is invoked, and slicing from there ran backwards and produced
       an empty string that passed nothing. */
    const branch = source.slice(
      source.indexOf('private async resolveParkedDelivery'),
      source.indexOf('private async resolveParkedScenario'),
    );
    expect(branch.length).toBeGreaterThan(200);
    expect(branch).toMatch(/person\.findFirst/);
    expect(branch).toMatch(/sendMeThat\(me\.email/);
  });

  it('and there is no way to name a different recipient', () => {
    /* Sending to a colleague is publishing, which is a different act with
       different consequences. Wanting it is reasonable; it is not this. */
    const branch = source.slice(
      source.indexOf('private async sendMeThat'),
      source.indexOf('private async startACheckIn'),
    );
    expect(branch.length).toBeGreaterThan(200);
    expect(branch).not.toMatch(/\bto:\s|recipient|cc\b/i);
  });

  it('and a failure to send says so rather than claiming it went', () => {
    /* Somebody who asked for an email and got a cheerful "sent" that never
       arrived stops trusting everything else this says. */
    expect(source).toMatch(/treat it as not sent/);
  });
});

describe('asking for it', () => {
  it.each(['email me that', 'can you send me this', 'send it to me'])('routes "%s"', (m) => {
    expect(route(m).lane).toBe('send_me_that');
  });

  it('but a question about work is still a question about work', () => {
    expect(route('what am I on').lane).toBe('what_am_i_on');
  });
});
