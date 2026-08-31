import { whoSentIt, readableBody, whatArrived, isSomethingSentToUs } from './a-message-sent-to-us';

describe('reading a message somebody sent us', () => {
  it('takes the address out of a display name', () => {
    expect(whoSentIt('Sahar Jamal <sahar@example.com>')).toEqual({ address: 'sahar@example.com', name: 'Sahar Jamal' });
    expect(whoSentIt('"Jumare, Hafsah" <h@x.co>')).toEqual({ address: 'h@x.co', name: 'Jumare, Hafsah' });
  });

  it('copes with a bare address', () => {
    expect(whoSentIt('SAHAR@example.com')).toEqual({ address: 'sahar@example.com', name: null });
  });

  it('refuses a message it cannot attribute to anybody', () => {
    /* A message from nobody is not something a person can act on, and a row for it is a row that
       will sit unread forever. */
    expect(whatArrived({ type: 'email.received', data: { from: 'not-an-address', to: ['hello@myground.work'] } })).toBeNull();
    expect(whatArrived({ type: 'email.received', data: { from: 'a@b.co' } })).toBeNull();
  });

  it('keeps which of our addresses it was sent to', () => {
    /* More than one exists and they may not always land in the same place. */
    const out = whatArrived({ type: 'email.received', data: { from: 'a@b.co', to: ['Hello@MyGround.work'], subject: 'hi' } })!;
    expect(out.toAddress).toBe('hello@myground.work');
  });

  it('records when the sender sent it, not when we processed it', () => {
    const out = whatArrived({ type: 'email.received', data: { from: 'a@b.co', to: ['hello@myground.work'], created_at: '2026-08-01T09:00:00Z' } })!;
    expect(out.receivedAt.toISOString()).toBe('2026-08-01T09:00:00.000Z');
  });

  it('falls back to now rather than storing an invalid date', () => {
    const out = whatArrived({ type: 'email.received', data: { from: 'a@b.co', to: ['x@y.co'], created_at: 'not a date' } })!;
    expect(Number.isNaN(out.receivedAt.getTime())).toBe(false);
  });
});

describe('a stranger\'s HTML never reaches our admin panel', () => {
  it('prefers the plain text the sender sent', () => {
    expect(readableBody('just words', '<b>markup</b>')).toBe('just words');
  });

  it('strips tags when only HTML arrived, so a person can still read it', () => {
    expect(readableBody(null, '<p>Hello <b>there</b></p>')).toBe('Hello there');
  });

  it('drops scripts and styles wholesale rather than escaping them', () => {
    /*
     * Rendering somebody else's markup inside our own admin panel is the most direct way to hand a
     * stranger our session, and no amount of sanitising makes that a good trade for a message
     * somebody is going to read as words anyway.
     */
    const out = readableBody(null, '<script>steal()</script><style>x{}</style><p>real words</p>')!;
    expect(out).toBe('real words');
    expect(out).not.toContain('steal');
  });

  it('caps a message rather than letting one send fill the table', () => {
    expect(readableBody('x'.repeat(50_000), null)!.length).toBeLessThanOrEqual(20_000);
  });

  it('says nothing when there was nothing to say', () => {
    expect(readableBody('   ', '  ')).toBeNull();
  });
});

describe('which events are mail arriving', () => {
  it('knows the arriving kinds and nothing else', () => {
    expect(isSomethingSentToUs('email.received')).toBe(true);
    expect(isSomethingSentToUs('inbound.email.received')).toBe(true);
    /* Delivery events go to the delivery path, which has nothing to do with this. */
    for (const sending of ['email.delivered', 'email.bounced', 'email.complained', '', undefined]) {
      expect(isSomethingSentToUs(sending)).toBe(false);
    }
  });
});
