import { EmailService, whoSeesWhatYouSayIn } from './email.service';
import { askName } from '../assistant/ask-name';

/**
 * "Your questions to Ask Wanjiru's workspace stay private." came from an organisation created with no name, which Groundwork calls "Wanjiru's workspace".
 * That is a placeholder, not a name. Until a real name is given the sentence says Ask Groundwork; once one is given, it says that.
 */
describe('a name Groundwork made up is not said as the organisation', () => {
  it.each(["Wanjiru's workspace", 'Wanjiru’s workspace', 'My workspace', 'Wanjiru Kamau\'s workspace'])('%s reads "Ask Groundwork"', (made) => {
    expect(askName(made)).toBe('Ask Groundwork');
    expect(whoSeesWhatYouSayIn({ scenario: 'OKR_ALIGNMENT', peersVisibleToEachOther: null, organization: { name: made } })).toBe(
      'The people in this check-in, including your manager, can see what you say in it. Your questions to Ask Groundwork stay private.',
    );
  });
  it('a real name is used once one is given', () => {
    expect(askName('Baridi Appliances')).toBe('Ask Baridi Appliances');
    expect(askName('Workspace Studio')).toBe('Ask Workspace Studio');
  });
  it('the invitation to a team does not call the organisation by the made-up name', async () => {
    const sent: any[] = [];
    const svc = new EmailService({ get: () => undefined } as any, {} as any, { platformSetting: { findUnique: async () => null } } as any);
    (svc as any).sendEmail = jest.fn(async (o: any) => { sent.push(o); });
    await svc.sendUserInvite('a@x.test', 'Amani', 'tok', "Wanjiru's workspace");
    const read = sent[0].subject + ' ' + sent[0].html.replace(/<[^>]+>/g, ' ');
    expect(read).not.toMatch(/workspace/i);
    expect(sent[0].subject).toBe("You've been added to Groundwork");
    expect(read).toContain('Your team has added you to Groundwork.');
    expect(read).toContain('Your questions to Ask Groundwork stay private.');
  });
});
