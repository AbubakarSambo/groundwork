import { theOutboxKey } from './the-one-outbox';

/**
 * Fatima round 1, I-03 and I-16: a key made from the subject or the words dropped a different mail with the same subject, and an identical reply
 * to a second message, and left the person in silence. A key is the purpose, the person and the identity of what is sent.
 */
describe('the one outbox keys on what a thing is', () => {
  const at = new Date('2026-11-11T10:00:30Z');
  it('the same words in reply to two different messages are two replies', () => {
    const w = 'I could not tell whose number that is. Please tell me the name, and the number once more.';
    const a = theOutboxKey({ channel: 'whatsapp', to: '+2348031112222', text: w, answering: 'wamid.1', at });
    const b = theOutboxKey({ channel: 'whatsapp', to: '+2348031112222', text: w, answering: 'wamid.2', at });
    expect(a).not.toEqual(b);
    expect(theOutboxKey({ channel: 'whatsapp', to: '+2348031112222', text: w, answering: 'wamid.1', at })).toEqual(a);
  });
  it('a different mail with the same subject has a different key', () => {
    const one = theOutboxKey({ channel: 'email', to: 'a@x.test', kind: 'reply', text: 'What I have found so far\nA short picture' , at });
    const two = theOutboxKey({ channel: 'email', to: 'a@x.test', kind: 'reply', text: 'What I have found so far\nThe picture of her forward', at });
    expect(one).not.toEqual(two);
  });
});
