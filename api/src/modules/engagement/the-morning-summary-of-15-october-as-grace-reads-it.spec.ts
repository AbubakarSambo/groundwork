import { whatIsOutstandingFor, theTemplateParagraph, withPlacesWhereTheyTellApart, theseForAPhone, theBoardTheMessageIsAbout, theWindowForm } from './the-leads-daily-nudge';
import { theFirstContactLine } from '../whatsapp/the-first-message-to-a-number';
import { TEMPLATES } from '../whatsapp/a-message-outside-the-window';
import { theShortRunsDatabase, G, R } from '../reports/the-short-run-reports-bed';

/**
 * HAFSAH'S QUALITY PASS OF 18 OCTOBER, SECTION 7: GRACE'S MORNING SUMMARY ON THURSDAY 15 OCTOBER, 11am NAIROBI TIME.
 *
 * Built on the short run's record exactly as it stood (gw_sweep_drop3, `__fixtures__/drop-access-short-run.json`). Grace read
 * "These need you. Joseph is waiting on you for an answer on the KES 4,500 price since Wednesday 14 October." The template
 * lead_daily_summary stays exactly as approved-to-be; only what fills it changes. It went as groundwork_first_contact, carrying the
 * summary's own words, and its link must open her board.
 */
const NOW = new Date('2026-10-15T08:00:00Z');
const BASE = 'http://localhost:5195';
const LEAD = { userId: R.ground.initiatorId, organizationId: R.ground.organizationId, grounds: [{ id: G, label: 'Sales team, Q4', scenario: 'OKR_ALIGNMENT', overWhatsApp: null, timelineDays: 15, cadence: 'DAILY' }] };

describe('Grace’s morning summary on Thursday 15 October', () => {
  let paragraph: string; let params: string[]; let facts: any; let off: string;
  beforeAll(async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const o = await whatIsOutstandingFor(theShortRunsDatabase() as any, LEAD, { boards: {} as any, release: null }, NOW);
    facts = withPlacesWhereTheyTellApart(theseForAPhone(o));
    const t = theTemplateParagraph('Grace', facts, theBoardTheMessageIsAbout(BASE, LEAD.grounds, facts));
    params = t.params;
    paragraph = t.params[1];
    const before = await whatIsOutstandingFor(theShortRunsDatabase({ switchOn: false }) as any, LEAD, { boards: {} as any, release: null }, NOW);
    off = theTemplateParagraph('Grace', withPlacesWhereTheyTellApart(theseForAPhone(before)), `${BASE}/today`).params[1];
  });
  afterAll(() => jest.useRealTimers());

  it('M-1, M-2: {{2}} opens with how many things need her, and the answer Joseph waits for names the deal and the price it is against', () => {
    expect(paragraph.startsWith('Two things need you today. ')).toBe(true);
    expect(paragraph).toContain('Joseph has been waiting since Wednesday for your answer on Juja Hardware, which wants 5 units at KES 4,500 each instead of KES 5,000.');
    expect(paragraph).toContain('You said on 12 October that you would decide on KES 12,000 off 10 units for Mama Pima Stores, and Wanjiru is still waiting.');
  });

  it('M-3: what is due today and tomorrow follows', () => {
    expect(paragraph).toContain('Joseph has promised Mercy the samples for Tuskys Westgate three check-ins running, for today.');
    expect(paragraph).toContain('Tomorrow, Savannah Cafe pays a KES 15,000 deposit, and Greenfield Supermarket takes delivery and pays.');
    expect(paragraph).not.toContain('There is more');
  });

  it('M-4: the template is unchanged, and the first-contact form carries it whole with the link to her board', () => {
    expect(TEMPLATES['lead-summary'].body).toBe('Good morning {{1}}. Here is today\'s summary of your check-ins. {{2}} You can open your board for the full picture here {{3}} If you would rather not hear from us here again today, reply "not now".');
    const line = theFirstContactLine('lead-summary', params, '');
    expect(line).toBe(`Good morning Grace. Here is today's summary of your check-ins. ${paragraph} You can open your board for the full picture here ${BASE}/grounds/${G}/board If you would rather not hear from us here again today, reply "not now".`);
    expect(line.length).toBeLessThanOrEqual(800);
  });

  it('inside the 24 hours, the same things, with what is due under its own heading', () => {
    const w = theWindowForm('Grace', facts, `${BASE}/today`);
    expect(w).toContain('Due today and tomorrow\nJoseph has promised Mercy the samples for Tuskys Westgate three check-ins running, for today.');
  });

  /* Release 1, pull request 5: an answer she owes with no day of its own reaches "Needs you" only with the switch on, so with it off the
     short run's record holds nothing for her that morning, as before. */
  it('with Release 1’s switch off, the summary reads as before', () => {
    expect(off).not.toMatch(/Two things need you today|Tomorrow|Juja Hardware, which wants/);
    expect(off).toBe('');
  });
});
