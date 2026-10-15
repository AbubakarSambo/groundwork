import { makeService, theCohort, LEADS_LINE_ABOUT_LOLA, LEADS_LINE_ABOUT_THE_PLAN, LOLAS_OWN_WORDS, LOLAS_DEFINITION_OF_SUCCESS, KWAMES_OWN_DEFINITION_OF_SUCCESS, KWAMES_OWN_WORDS } from './__fixtures__/a-cohort-for-the-session-report';
import { reportAsText } from '../public-api/a-whatsapp-message-is-routed';

/**
 * DECISION 75 ITEM 14 ON EVERY REPORT READ (privacy sweep, 5 October 2026, finding 1).
 *
 * "In a check-in where people do not see each other, one person's circumstances never reach another."
 * Only GET /report applied that wall. The session report, the rounds and the against-success read served a
 * colleague, in a cohort, the lead's lines about named colleagues and each colleague's own circumstances, and
 * the phone report is built from the session report. These tests read all four through the real service, as the
 * people the sweep named, and check what each person actually reads.
 */

const read = (x: unknown) => JSON.stringify(x);

describe('a colleague in a cohort where people do not see each other, on every report read', () => {
  it('the session report holds no sentence about one colleague, from the lead or from a colleague', async () => {
    const served = await makeService(theCohort()).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const text = read(served);
    expect(text).not.toContain('Lola');
    expect(text).not.toContain('Seyi');
    expect(text).not.toContain('instalments behind');
    expect(text).not.toContain('220 birds');
    expect(text).not.toContain('behind on outbound');
  });

  it('the session report keeps what the lead says of the plan, and the reader\'s own words, word for word', async () => {
    const served: any = await makeService(theCohort()).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const lines = (served.whatEachPersonSaid ?? []).flatMap((r: any) => r.lines ?? []);
    expect(lines).toContain(LEADS_LINE_ABOUT_THE_PLAN);
    expect(lines).toContain(KWAMES_OWN_WORDS);
  });

  it('the lead reads every line whole, as before', async () => {
    const served: any = await makeService(theCohort()).sessionReport('g1', 1, 'user-lead', 'org-1');
    const lines = (served.whatEachPersonSaid ?? []).flatMap((r: any) => r.lines ?? []);
    expect(lines).toContain(LEADS_LINE_ABOUT_LOLA);
    expect(lines).toContain(LOLAS_OWN_WORDS);
  });

  it('the phone report, built from the session report, holds none of it either', async () => {
    const served = await makeService(theCohort()).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const phone = reportAsText(served as any, 'Sales cohort, first quarter');
    expect(phone).not.toContain('Lola');
    expect(phone).not.toContain('Seyi');
    expect(phone).not.toContain('instalments behind');
    expect(phone).not.toContain('behind on outbound');
  });

  it('the against-success read holds no colleague\'s circumstances', async () => {
    const served = await makeService(theCohort()).whereAgainstSuccess('g1', 'user-kwame', 'org-1');
    const text = read(served);
    expect(text).not.toContain('Lola');
    expect(text).not.toContain('instalments');
    expect(text).toContain(KWAMES_OWN_DEFINITION_OF_SUCCESS);
  });

  it('the rounds hold no sentence about one colleague, in the picture or its lists', async () => {
    const rounds = [{
      sessionNumber: 1,
      sharedPicture: 'Five of the six people said the weather slowed them. Lola is two instalments behind. Seyi tells me partnerships are close.',
      agreements: ['Lola lost 220 birds in month two.', 'Most people want a later due date.'],
      divergences: [], centralQuestion: null, takenAt: new Date('2026-09-23T17:00:00Z'), amendedAt: null, amendedNote: null,
    }];
    const served: any = await makeService(theCohort(), { rounds }).rounds('g1', 'user-kwame', 'org-1');
    const text = read(served);
    expect(text).not.toContain('Lola');
    expect(text).not.toContain('Seyi');
    expect(text).not.toContain('instalments');
    expect(text).not.toContain('220 birds');
    expect(text).not.toContain('partnerships are close');
    expect(text).toContain('Five of the six people said the weather slowed them.');
    expect(text).toContain('Most people want a later due date.');
  });

  it('the lead reads the rounds whole', async () => {
    const rounds = [{
      sessionNumber: 1, sharedPicture: 'Lola is two instalments behind.', agreements: [], divergences: [], centralQuestion: null,
      takenAt: new Date('2026-09-23T17:00:00Z'), amendedAt: null, amendedNote: null,
    }];
    const served: any = await makeService(theCohort(), { rounds }).rounds('g1', 'user-lead', 'org-1');
    expect(read(served)).toContain('Lola is two instalments behind.');
  });
});

describe('control: a check-in where people do see each other is unchanged', () => {
  it('a colleague still reads the lead\'s line about Lola', async () => {
    const ground = theCohort('OKR_ALIGNMENT');
    ground.peersVisibleToEachOther = true;
    const served: any = await makeService(ground).sessionReport('g1', 1, 'user-kwame', 'org-1');
    const lines = (served.whatEachPersonSaid ?? []).flatMap((r: any) => r.lines ?? []);
    expect(lines).toContain(LEADS_LINE_ABOUT_LOLA);
  });
});
