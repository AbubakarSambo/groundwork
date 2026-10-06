import * as fs from 'fs';
import * as path from 'path';
import {
  whetherToSend,
  whatThisMailIs,
  WHAT_EACH_MAIL_IS,
  WhatKindOfMail,
} from './nothing-goes-out-that-was-turned-off';

/**
 * THE SWITCH WAS HONOURED IN THREE SENDERS OUT OF NINE.
 *
 * The manual nudge, the scheduled nudge and the reveal reminder checked it. The session-ready
 * mail, the return nudge, the activation reminder, the feedback request and the report-ready mail
 * did not — and a comment above one of those claimed it used "the same opt-out as every other
 * reminder in this sweep", which was false about the two items directly above it.
 *
 * Nobody was going to find that by reading. Every one of those files looks right on its own, which
 * is what a rule enforced by remembering always comes to.
 */
const withoutComments = (file: string) =>
  fs
    .readFileSync(path.join(__dirname, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

describe('somebody who turned reminders off', () => {
  const off = { emailNotifications: false };

  it('stops getting the things nobody asked for', () => {
    expect(whetherToSend('we decided to send it', off)).toEqual({
      send: false,
      because: 'they turned off check-in reminders',
    });
  });

  it('still gets what they asked for', () => {
    expect(whetherToSend('asked for', off)).toEqual({ send: true });
  });

  it('and can always get back into their own account', () => {
    expect(whetherToSend('the way back in', off)).toEqual({ send: true });
  });
});

describe('somebody who used the unsubscribe link', () => {
  const gone = { emailNotifications: true, unsubscribedAt: new Date('2026-09-01') };

  it('said something stronger than a preference, and it outranks one', () => {
    expect(whetherToSend('we decided to send it', gone).send).toBe(false);
  });

  it('but still gets what they asked for: a report they took part in is not a digest they left', () => {
    /* Decided under fix plan D13 (NL-031): a consultant who unsubscribed from one customer's digest
       did not ask to stop hearing about work they did for another. */
    expect(whetherToSend('asked for', gone).send).toBe(true);
  });

  it('but is not locked out of their own account', () => {
    /* A forgotten password with the reset mail suppressed is an account nobody can get back into. */
    expect(whetherToSend('the way back in', gone)).toEqual({ send: true });
  });
});

describe('somebody with no account and no preference', () => {
  it('is written to, because otherwise nobody could ever be invited', () => {
    expect(whetherToSend('we decided to send it', null)).toEqual({ send: true });
    expect(whetherToSend('asked for', null)).toEqual({ send: true });
  });
});

describe('what each mail is', () => {
  it('a sender nobody classified is treated as one we chose to send', () => {
    /* The careful direction: forgetting suppresses a reminder for somebody who opted out, which is
       a complaint. The other way round, forgetting sends mail somebody switched off. */
    expect(whatThisMailIs('sendSomethingNobodyHasWrittenYet')).toBe('we decided to send it');
  });

  it('every sender in the service is on the list', () => {
    const service = withoutComments('email.service.ts');
    const senders = [...service.matchAll(/\n  async (send[A-Za-z]+)\(/g)].map((m) => m[1]);
    expect(senders.length).toBeGreaterThan(25);

    const missing = senders.filter((name) => !(name in WHAT_EACH_MAIL_IS));
    if (missing.length) {
      throw new Error(
        'These senders are not classified, so they are treated as reminders and will be suppressed '
          + `for anybody who opted out. Add them to WHAT_EACH_MAIL_IS with what they are:\n${missing.join('\n')}`,
      );
    }
    expect(missing).toEqual([]);
  });

  it('and the list names nothing that no longer exists', () => {
    const service = withoutComments('email.service.ts');
    const senders = new Set([...service.matchAll(/\n  async (send[A-Za-z]+)\(/g)].map((m) => m[1]));
    const stale = Object.keys(WHAT_EACH_MAIL_IS).filter((name) => !senders.has(name));
    /* A classification for a sender that is gone is a decision nobody can check. */
    expect(stale).toEqual([]);
  });

  it('nothing that brings somebody back into their account is stoppable', () => {
    for (const name of ['sendPasswordResetEmail', 'sendVerificationEmail', 'sendAddPasswordEmail', 'sendMagicLinkEmail']) {
      expect(WHAT_EACH_MAIL_IS[name]).toBe('the way back in');
    }
  });

  it('and every nudge, reminder and digest is', () => {
    for (const name of ['sendNudge', 'sendAbsenceReminder', 'sendSessionReady', 'sendActivationReminder', 'sendFeedbackRequest', 'sendRoundDigest']) {
      expect(WHAT_EACH_MAIL_IS[name]).toBe('we decided to send it' as WhatKindOfMail);
    }
  });
});

describe('the one door', () => {
  const service = withoutComments('email.service.ts');

  it('every sender tells the door which it is', () => {
    /* The whole point of moving the decision: a sender cannot forget, because it is not the
       sender's decision any more. */
    /* Each call read to its own closing paren, because a `}` at four or six spaces appears inside
       these bodies constantly and matching on one reads half a call. */
    const undeclared: string[] = [];
    let calls = 0;
    for (let at = service.indexOf('this.sendEmail('); at !== -1; at = service.indexOf('this.sendEmail(', at + 1)) {
      calls += 1;
      let depth = 0;
      let i = service.indexOf('(', at + 'this.sendEmail'.length - 1);
      const from = i;
      for (;; i += 1) {
        if (service[i] === '(') depth += 1;
        else if (service[i] === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      const args = service.slice(from, i);
      if (!/'send[A-Za-z]+'/.test(args)) undeclared.push(args.slice(0, 70).replace(/\s+/g, ' '));
    }

    expect(calls).toBeGreaterThan(25);
    if (undeclared.length) {
      throw new Error(`These calls do not say which sender they are:\n${undeclared.join('\n')}`);
    }
    expect(undeclared).toEqual([]);
  });

  /*
   * CHANGED 26 SEPTEMBER 2026, AND ONLY THE STRING CHANGED. This looked for the literal
   * `this.resend.emails.send`. The client is no longer built when the API starts - with the email
   * key empty, as `.env.example` tells people to leave it, Resend refused the empty key and the
   * whole API died before anything ran - so the call now reads `this.theResendClient().emails.send`
   * and this went red on the rename while the thing it guards was untouched.
   *
   * Matched on `.emails.send` instead, which is the send itself and survives whatever holds the
   * client. What is being checked is unchanged: the permission question comes first.
   */
  it('and the door asks before it sends, not after', () => {
    const fn = service.slice(service.indexOf('private async sendEmail('));
    const asks = fn.indexOf('wouldTheyRatherNot');
    const sends = fn.indexOf('.emails.send');
    expect(asks).toBeGreaterThan(-1);
    expect(sends).toBeGreaterThan(-1);
    expect(asks).toBeLessThan(sends);
  });

  it('and says so rather than dropping it silently', () => {
    /* An email that did not go out for a good reason is still a thing somebody may be waiting for. */
    /* From the door itself, not from the top of the file — `this.resend` is assigned in the
       constructor, so slicing to its first occurrence reads nothing at all. */
    const from = service.indexOf('private async sendEmail(');
    const fn = service.slice(from, service.indexOf('this.resend.emails.send', from));
    expect(fn).toContain('Not sending');
  });
});
