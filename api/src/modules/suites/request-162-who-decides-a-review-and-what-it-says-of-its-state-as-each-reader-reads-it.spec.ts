import { NOW, setup } from './__fixtures__/aisha-review';
import { whatTheMoneyIsFor, spendInWords } from './a-request-in-words';
import { daysOfLeaveLeftSaid } from '../assistant/your-own-requests-asked-about';
import { waitingForYouToApprove } from '../grounds/waiting-for-you-to-approve';

/**
 * REQUEST 162, THE ENGINE'S PART, AS EACH READER READS IT (screens workspace, 6 October 2026).
 *
 * Baridi Appliances. Wairimu is Aisha's manager and writes her review ("Their manager"). Juma is
 * another lead of Sales, who started the review in the seed that was walked, which the rule does not
 * let him write. Grace is an admin.
 *
 *   1. Who decides a review, in words, is who may decide it. Before, Juma read "Juma decides" and
 *      could not decide it, and everybody else read "Juma decides" about somebody who could not.
 *   2. Where a review stands says what has been written in THIS review, not the sentence of one
 *      just started.
 *   3. Spending lines read with the currency and a lower-case word after "for".
 *   4. The leave page does not say "I".
 *   6. The words are served with who wrote them, by sign-in.
 */

beforeEach(() => { jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] }); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

async function startedByJuma(writer: 'Their manager' | 'An admin' = 'Their manager') {
  const x = setup();
  (x.svc as any).prisma.organizationSuite.findUnique.mockImplementation(async () => ({ isOn: true, answers: { every: 'Every 6 months', writer } }));
  /* The seed's shape: the review was started by somebody the rule does not let write it. */
  await x.svc.start(x.as(writer === 'An admin' ? 'u-grace' : 'u-wairimu'), 'd-aisha');
  x.reviews[0].startedById = 'u-juma';
  return x;
}

describe('1. who decides a review is told the way the rights are', () => {
  it('Wairimu, whom the rule lets write it, reads that she decides, and may write it', async () => {
    const { svc, as, reviews } = await startedByJuma();
    const r: any = await svc.one(as('u-wairimu'), reviews[0].id);
    expect(r.mayWrite).toBe(true);
    expect(r.briefing.whoDecides).toBe('There are no scores. Groundwork gives you the evidence and the patterns, and you decide. Aisha sees your reasons.');
  });

  it('Juma, who started it and may not write it, is told Wairimu decides, not himself', async () => {
    const { svc, as, reviews } = await startedByJuma();
    const r: any = await svc.one(as('u-juma'), reviews[0].id);
    expect(r.mayWrite).toBe(false);
    expect(r.writtenWithFirstName).toBe('Wairimu');
    expect(r.briefing.whoDecides).toBe('There are no scores. Groundwork gives the evidence and the patterns, and Wairimu decides. Aisha sees the reasons.');
  });

  it('Grace, an admin, and Aisha, whom it is about, read the same name, and Aisha reads it in her list too', async () => {
    const { svc, as, reviews } = await startedByJuma();
    expect(((await svc.one(as('u-grace'), reviews[0].id)) as any).briefing.whoDecides).toContain('and Wairimu decides.');
    const aisha: any = await svc.one(as('u-aisha'), reviews[0].id);
    expect(aisha.writtenWithFirstName).toBe('Wairimu');
    expect((await svc.mine(as('u-aisha')))[0].says).toBe('Wairimu has started your review. You can read it and add your own view before you meet.');
  });

  it('where any admin may write it and an admin started it, the name is the admin who started it, and a lead is told an admin decides', async () => {
    const { svc, as, reviews } = await startedByJuma('An admin');
    /* Juma is not an admin, so he cannot write it; an admin can. */
    const juma: any = await svc.one(as('u-juma'), reviews[0].id);
    expect(juma.mayWrite).toBe(false);
    expect(juma.briefing.whoDecides).toBe('There are no scores. Groundwork gives the evidence and the patterns, and an admin decides. Aisha sees the reasons.');
    const grace: any = await svc.one(as('u-grace'), reviews[0].id);
    expect(grace.mayWrite).toBe(true);
    expect(grace.briefing.whoDecides).toContain('you decide.');
    expect(((await svc.one(as('u-aisha'), reviews[0].id)) as any).writtenWithFirstName).toBeNull();
  });
});

describe('6. the manager’s words say who wrote them, by sign-in', () => {
  it('Wairimu’s words are served to Wairimu, Grace and Aisha with Wairimu’s sign-in, and the heading names her', async () => {
    const { svc, as, reviews } = await startedByJuma();
    await svc.writeWords(as('u-wairimu'), reviews[0].id, 'Aisha has closed every account she was given this half.');
    expect(((await svc.one(as('u-wairimu'), reviews[0].id)) as any).managersWordsById).toBe('u-wairimu');
    expect(((await svc.one(as('u-grace'), reviews[0].id)) as any).managersWordsById).toBe('u-wairimu');
    const aisha: any = await svc.one(as('u-aisha'), reviews[0].id);
    expect(aisha.managersWordsById).toBe('u-wairimu');
    expect(aisha.managersWordsHeading).toBe('What Wairimu writes');
  });
});

describe('2. where a review stands is true of this review', () => {
  const stands = async (reader: string, edit: (r: any) => void = () => undefined) => {
    const { svc, as, reviews } = await startedByJuma();
    edit(reviews[0]);
    return ((await svc.board(as(reader), NOW)) as any).next[0].standsSays;
  };
  const wrote = (r: any) => Object.assign(r, { managersWords: 'The record is steady.', managersWordsById: 'u-wairimu' });
  const theirView = (r: any) => Object.assign(r, { theirView: 'I agree.' });

  it('just started: the person can read it and add a view', async () => {
    expect(await stands('u-wairimu')).toBe('Started on 1 October 2026. Aisha can read it and add a view of their own.');
  });
  it('the words are written: Wairimu reads "You have written", Grace reads her name, and the person is still to add a view', async () => {
    expect(await stands('u-wairimu', wrote)).toBe('Started on 1 October 2026. You have written the review, and Aisha can read it and add a view of their own.');
    expect(await stands('u-grace', wrote)).toBe('Started on 1 October 2026. Wairimu has written the review, and Aisha can read it and add a view of their own.');
  });
  it('only her view is in: it says so, and that the words are still to be written', async () => {
    expect(await stands('u-grace', theirView)).toBe('Started on 1 October 2026. Aisha has added a view of their own. Wairimu has not written the review yet.');
  });
  it('only her view is in, and the one who writes is the reader: "You have not written the review yet."', async () => {
    expect(await stands('u-wairimu', theirView)).toBe('Started on 1 October 2026. Aisha has added a view of their own. You have not written the review yet.');
  });
  it('both are in: it waits for a decision', async () => {
    expect(await stands('u-wairimu', (r) => { wrote(r); theirView(r); })).toBe('Started on 1 October 2026. You have written the review, and Aisha has added a view of their own. It now waits for your decision.');
    expect(await stands('u-grace', (r) => { wrote(r); theirView(r); })).toBe('Started on 1 October 2026. Wairimu has written the review, and Aisha has added a view of their own. It now waits for Wairimu to decide.');
  });
});

describe('3. a spending line reads with its currency and a lower-case word after "for"', () => {
  it('keeps a capital where it is somebody’s own, and lowers an ordinary word', () => {
    expect(['Two tablets for the field team', 'Fuel for the Karen route', 'KRA fees for October', 'I need a laptop', 'Q4 fuel', 'fuel', 'A second scanner', 'An iron roof', 'A4 paper'].map((x) => whatTheMoneyIsFor(x))).toEqual([
      'two tablets for the field team', 'fuel for the Karen route', 'KRA fees for October', 'I need a laptop', 'Q4 fuel', 'fuel', 'a second scanner', 'an iron roof', 'A4 paper',
    ]);
    expect(spendInWords(120000, 'KES', 'Two tablets for the field team')).toBe('KES 120,000 for two tablets for the field team');
    expect(spendInWords(18000, null, 'Fuel for the Karen route')).toBe('18,000 for fuel for the Karen route');
  });
  it('keeps the capital on a name the organisation knows (a customer, a person, a team) or that the text repeats, and lowers anything else', () => {
    const known = ['Naivas', 'Kamau Njenga', 'Operations'];
    expect(whatTheMoneyIsFor('Naivas deposit', known)).toBe('Naivas deposit');
    expect(whatTheMoneyIsFor('Operations offsite', known)).toBe('Operations offsite');
    expect(whatTheMoneyIsFor('Kamau travel', known)).toBe('Kamau travel');
    expect(whatTheMoneyIsFor('Quickmart deposit for Quickmart', [])).toBe('Quickmart deposit for Quickmart');
    expect(whatTheMoneyIsFor('Two tablets for the field team', known)).toBe('two tablets for the field team');
    expect(spendInWords(40000, 'KES', 'Naivas deposit', known)).toBe('KES 40,000 for Naivas deposit');
    expect(spendInWords(120000, 'KES', 'Two tablets for the field team', known)).toBe('KES 120,000 for two tablets for the field team');
  });
  it('Today says it the same way to the approver', () => {
    const items = waitingForYouToApprove({ leave: [], hours: [], spend: [{ firstName: 'Grace', amount: 120000, what: 'Two tablets for the field team', mayDecide: true } as any], currency: 'KES' }, 'org');
    expect(items[0].title).toBe('Grace asked to spend KES 120,000 on two tablets for the field team.');
  });
});

describe('4. the leave page does not speak in the first person', () => {
  it('says Groundwork on the page, and keeps "I" in Ask Groundwork’s own chat', () => {
    const none = { perYear: null, daysLeft: null, kinds: [] };
    expect(daysOfLeaveLeftSaid(none, 'Groundwork')).toBe('Your organisation has not set how many days of leave each person has in a year, so Groundwork cannot say how many you have left.');
    expect(daysOfLeaveLeftSaid(none)).toBe('Your organisation has not set how many days of leave each person has in a year, so I cannot say how many you have left.');
  });
});
