import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aStrangerHearsNothing, NOT_ONE_OF_YOURS, ONLY_ON_OUR_OWN_NUMBER } from './their-number-stays-theirs';

/**
 * THEIR CUSTOMERS STAY THEIRS.
 *
 * Hafsah, relaying a customer: "we dont want their customer traffic. what we want is for their team
 * to be able to use their whatsapp for business to do checkin. They use it for their customers too."
 *
 * One WhatsApp number has one webhook, so either we hold it and receive every order and complaint
 * sent to their business, or they hold it and hand us the messages that are ours. This is the
 * second, and these are the two rules that make it honest rather than merely working.
 */
describe('a message from somebody who is not on their roster', () => {
  it('comes back as not ours, with no reply', () => {
    expect(NOT_ONE_OF_YOURS).toEqual({ mine: false });
    expect(NOT_ONE_OF_YOURS).not.toHaveProperty('reply');
  });

  /*
   * AND NOTHING WE WOULD SAY TO OUR OWN VISITOR IS SENT FROM THEIR BUSINESS.
   *
   * On our own number "you are not on your organisation's roster yet" is correct and useful: they
   * wrote to us. Relayed, it is a sentence sent to somebody's customer, from that customer's
   * supplier, about a roster they have never heard of.
   */
  it('and never hears a sentence meant for somebody who wrote to us', () => {
    const roster = 'Groundwork does not know this number yet. If you use Groundwork, add this number under Settings, or ask your admin to add it, then write again.';
    expect(aStrangerHearsNothing(roster, 'they do')).toBe(true);
    expect(aStrangerHearsNothing(roster, 'we do')).toBe(false);
    expect(ONLY_ON_OUR_OWN_NUMBER.length).toBeGreaterThan(1);
  });

  it('and a real answer is said whoever holds the number', () => {
    const answer = 'That is on your check-in. What moved on the Kano corridor since last week?';
    expect(aStrangerHearsNothing(answer, 'they do')).toBe(false);
  });
});

/**
 * AND THE ROUTING IS THE SAME ROUTING, WHOEVER HOLDS THE NUMBER.
 *
 * Everything a check-in over WhatsApp needs already existed for the case where we hold it - the
 * sender matched to the roster by phone, routed into whichever check-in is open, asked which where
 * there are several, photos landing as evidence, "finish" completing the session - and none of it
 * cared who the webhook belonged to. Two doors, one route, so the relayed arrangement cannot drift
 * into being a second, worse product.
 */
describe('one route, two doors', () => {
  const SRC = readFileSync(join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const CONTROLLER = readFileSync(join(__dirname, 'whatsapp-for-an-organisation.controller.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('the webhook and the relay both go through it', () => {
    expect(SRC).toMatch(/private async route\(/);
    expect(SRC.match(/this\.route\(organizationId, from,/g)).toHaveLength(2);
    expect(SRC).toMatch(/who: 'we do',/);
    expect(SRC).toMatch(/who: 'they do',/);
  });

  /* The reply is returned, never sent: we hold no credential for their number and must not. */
  it('and the relay returns the words instead of sending them', () => {
    const fn = SRC.slice(SRC.indexOf('async relay('), SRC.indexOf('private async route('));
    expect(fn).toMatch(/return \{ mine: true, reply: said\.join/);
    expect(fn).not.toMatch(/this\.whatsapp\.sendFor/);
  });

  /*
   * AND A STRANGER LEAVES NO TRACE. On our own number the inbound stamp is written first, because
   * somebody wrote to us. Relayed, the first question is whether they are ours at all - a customer
   * asking about a price must not leave their number in our tables.
   */
  it('and nothing is written about a stranger', () => {
    const fn = SRC.slice(SRC.indexOf('async relay('), SRC.indexOf('private async route('));
    const asked = fn.indexOf('whoIsWritingTo');
    const stored = fn.indexOf('lastInboundAt');
    expect(asked).toBeGreaterThan(-1);
    expect(asked).toBeLessThan(stored);
    expect(fn).toMatch(/if \(!who\.personId && !who\.userId\) return NOT_ONE_OF_YOURS;/);
  });

  /* A redelivery is not a second answer, the same as on the webhook. */
  it('and a message we have already answered is not answered twice', () => {
    const fn = SRC.slice(SRC.indexOf('async relay('), SRC.indexOf('private async route('));
    /* Claimed with the number it came in on, their own (survey item 8). */
    expect(fn).toMatch(/firstTimeWeSeeThis\(organizationId, anInboundKey\('theirs', WhatsAppService\.normalize\(from\), String\(messageId\)\)\)/);
  });

  it('and the door is their own credential, scoped', () => {
    expect(CONTROLLER).toMatch(/@Post\('integrations\/whatsapp\/relay'\)/);
    expect(CONTROLLER).toMatch(/@UseGuards\(MachineTokenGuard\)/);
    expect(CONTROLLER).toMatch(/@RequiresScope\('checkins:write'\)/);
  });

  /* Their system already holds the file, so it arrives with the message rather than being fetched
     back from Meta with a credential we deliberately do not have. */
  it('and a photo comes with the message', () => {
    expect(CONTROLLER).toMatch(/Buffer\.from\(dto\.media\.base64, 'base64'\)/);
  });
});

/**
 * AND THE FIRST MESSAGE CARRIES ALL THREE PARTS, WHICH I REPORTED AS BROKEN WHEN IT WAS NOT.
 *
 * I wrote up a defect - "the first message into a check-in that has not started comes back as the
 * session header alone, the opener lost" - and it was never true. The first reply is three parts
 * joined by blank lines: the session header, the opener, then the answer to what they actually
 * said. I printed it raw and read it back through a grep anchored to the start of a line, so I saw
 * the header and nothing else. Instrumented, the call that "returned the header" had handed over
 * 312 characters.
 *
 * Pinned here rather than written up again, because the shape is the thing worth protecting: on
 * WhatsApp somebody's first message has to come back as a greeting AND a question AND an answer, or
 * it reads either as a robot or as having ignored them.
 */
describe('the first message into a check-in that has not started', () => {
  const SRC = readFileSync(join(__dirname, 'whatsapp-for-an-organisation.service.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const route = SRC.slice(SRC.indexOf('private async route('));

  it('says the header, the opener, and the answer to what they said', () => {
    expect(route).toMatch(/const first = await this\.conversation\.open\(current\.id, userId!\);/);
    /* The header, then the opener, in one string. Matched on fragments rather than on the
       whole template, because a template literal in a regex is how the last version of this
       assertion failed while the code was right. */
    expect(route).toContain('sessionHeader(current)');
    expect(route).toContain('${first.reply}');
    /* And the answer is appended to that rather than replacing it. */
    expect(route).toContain('${r.reply}');
  });

  /* A greeting on its own gets the opener and stops - there is nothing to answer yet. */
  it('and a greeting alone stops after the opener', () => {
    expect(route).toMatch(/if \((?:A_GREETING_ALONE\.test\(text\)|isAGreetingOrARequestToStart\(text\))( \|\| beginning)?\) \{ await say\(reply\); return; \}/);
  });
});

/**
 * THE RELAY CAN BE CALLED WITH THE CREDENTIAL IT IS FOR (piece 5, A). The global session guard refused a machine token on this route
 * ("Your sign-in is no longer active, so sign in again."), so a customer's own system could never pass a message to us. The route takes the session guard off
 * and puts the machine-token guard, with its scope, in its place; a route that only did the first would be open.
 */
import 'reflect-metadata';
import { WhatsAppForAnOrganisationController } from './whatsapp-for-an-organisation.controller';
import { MachineTokenGuard } from './machine-token.guard';
describe('the relay route', () => {
  const handler = WhatsAppForAnOrganisationController.prototype.relay;
  it('is not behind the session guard, and is behind the machine-token guard with the scope it needs', () => {
    expect(Reflect.getMetadata('isPublic', handler)).toBe(true);
    expect((Reflect.getMetadata('__guards__', handler) as unknown[]).includes(MachineTokenGuard)).toBe(true);
  });
});
