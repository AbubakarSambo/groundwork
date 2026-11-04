import { EmailService } from './email.service';

/**
 * THE "YOUR NEXT CHECK-IN IS OPEN" EMAIL, WITH AND WITHOUT THE DIRECT MORNING'S PERSONAL OPENING (20 October 2026). Without an opening
 * it is exactly as before; with one, the subject and the first paragraph are the personal line, and the missed lines, the link and
 * the WhatsApp line stay.
 */
function aSender() {
  const sent: any[] = [];
  const svc: any = new EmailService({ get: () => undefined } as any, {} as any, {} as any);
  svc.sendEmail = jest.fn(async (mail: any, _ctx: any, sender: string) => { sent.push({ ...mail, sender }); return 'id'; });
  svc.theWhatsAppLine = jest.fn(async () => '<p>WA</p>');
  return { svc, sent };
}

describe('the session-ready email', () => {
  it('without an opening is the email it always was', async () => {
    const a = aSender();
    await a.svc.sendSessionReady('joseph@drop.test', 'Sales team, Q4', 'http://x/c', false, ['You missed Friday.'], 'g1');
    const b = aSender();
    await b.svc.sendSessionReady('joseph@drop.test', 'Sales team, Q4', 'http://x/c', false, ['You missed Friday.'], 'g1', null);
    expect(a.sent[0].subject).toBe('Your next check-in is open: Sales team, Q4');
    expect(b.sent[0]).toEqual(a.sent[0]);
    expect(a.sent[0].html).toContain('<strong>Sales team, Q4</strong>');
  });
  it('with an opening says the personal line, and keeps the missed lines, the link and the WhatsApp line', async () => {
    const { svc, sent } = aSender();
    await svc.sendSessionReady('joseph@drop.test', 'Sales team, Q4', 'http://x/c', false, ['You missed Friday.'], 'g1', { subject: 'Joseph, Juja Hardware is waiting on a price', line: "Joseph, Juja Hardware is waiting on a price. What's happening with it, and what's next?" });
    expect(sent[0].subject).toBe('Joseph, Juja Hardware is waiting on a price');
    expect(sent[0].sender).toBe('sendSessionReady');
    expect(sent[0].html).toContain("<p>Joseph, Juja Hardware is waiting on a price. What's happening with it, and what's next?</p>");
    expect(sent[0].html).not.toContain('<strong>Sales team, Q4</strong>');
    expect(sent[0].html).toContain('<p>You missed Friday.</p>');
    expect(sent[0].html).toContain('<a href="http://x/c">Check in</a>');
    expect(sent[0].html).toContain('<p>WA</p>');
  });
});
