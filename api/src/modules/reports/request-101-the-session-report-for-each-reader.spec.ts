import { serviceFor, theSessionReportAs, everyString } from './__fixtures__/sales-team-q3-two-sessions';

/**
 * SCREENS REQUEST 101 (a), (b) AND (d), ON THE SESSION REPORT, AS EACH READER IS SENT IT.
 *
 * Read on "Sales team, Q3" by group 3's review, 1 October 2026. Amani, a participant, was sent in the
 * shared picture of `GET /grounds/:id/report/session/1`:
 *
 *   (a) "Rukia Otieno, Baraka Mwangi, You and Neema Achieng: the role was never clearly defined, so
 *       there is no boundary to measure work against. Define what this role owns before reading
 *       anything into where work is landing."  Advice to the lead and a reading about each person,
 *       sent to every participant, as pieces joined by a colon.
 *   (b) "Faraji Odhiambo: 0 check-ins on record, nothing specific named yet."  About a man an admin
 *       had not let in, reading as a label.
 *   (d) To Rukia, about herself: "Rukia Otieno makes a decision on the discount ...".
 *
 * Every reader is served the report of session 1 and session 2: Rukia who runs it (and checks in),
 * Amani and Baraka who check in, Juma an admin who only reads, Grace the admin who set it up, and on a
 * performance plan Amani, the person reviewed, and Baraka giving a view.
 */

const READERS: [string, string][] = [
  ['Rukia, who runs it', 'u-rukia'],
  ['Amani, a participant', 'u-amani'],
  ['Baraka, a participant', 'u-baraka'],
  ['Juma, an admin who only reads', 'u-juma'],
  ['Grace, the admin who set it up', 'u-grace'],
];

const A_READING_ABOUT_EACH_PERSON = /never clearly defined|Define what this role owns|no boundary to measure work|check-ins? on record|nothing specific named yet/i;
/* A name, or "You", then a colon: pieces joined by a colon instead of a sentence. */
const NAMES_THEN_A_COLON = /(?:^|\. )(?:You|[A-Z][a-z]+ [A-Z][a-z]+)(?:,? (?:and )?(?:you|You|[A-Z][a-z]+ [A-Z][a-z]+))*: /;

async function bothSessionsAs(kind: 'sales' | 'review', userId: string) {
  const { svc } = serviceFor(kind);
  const one = await theSessionReportAs(svc, userId, 1);
  const two = await theSessionReportAs(svc, userId, 2);
  return { one, two, strings: [...everyString(one), ...everyString(two)] };
}

describe('request 101 (a) and (b): the shared picture carries no reading about any person', () => {
  it.each(READERS)('%s is sent no coverage or contribution read of anybody, and no line joined by a colon', async (_who, userId) => {
    const read = await bothSessionsAs('sales', userId);
    expect(read.one.refused).toBeUndefined();
    for (const r of [read.one, read.two]) {
      for (const line of [...(r.pictureLines ?? []), ...(r.picture ?? []).map((p: any) => p.text), r.sharedPicture ?? '', r.finding?.text ?? '']) {
        expect(line).not.toMatch(A_READING_ABOUT_EACH_PERSON);
        expect(line).not.toMatch(NAMES_THEN_A_COLON);
      }
    }
    expect(read.strings.filter((s) => A_READING_ABOUT_EACH_PERSON.test(s))).toEqual([]);
  });

  it.each(READERS)('%s reads nothing in the picture about Faraji, whom an admin has not let in', async (_who, userId) => {
    const read = await bothSessionsAs('sales', userId);
    for (const r of [read.one, read.two]) {
      expect(JSON.stringify(r.pictureLines ?? [])).not.toMatch(/Faraji/);
      expect(JSON.stringify(r.picture ?? [])).not.toMatch(/Faraji/);
      expect(r.sharedPicture ?? '').not.toMatch(/Faraji/);
    }
  });

  it('Amani reads the picture of session 1 as plain sentences', async () => {
    const read = await bothSessionsAs('sales', 'u-amani');
    /* Changed 24 November (page audit, row 6): the count and how much it can rely on are said once each, in their own places, not
       as the picture's first line. */
    expect(read.one.pictureLines.join(' ')).not.toMatch(/people have answered this session|There is enough here to talk about/);
    for (const line of read.one.pictureLines) expect(line).toMatch(/^[A-Z0-9].*[.?]$/);
  });

  it.each([['Amani, the person reviewed', 'u-amani'], ['Baraka, a colleague giving a view', 'u-baraka'], ['Rukia, who runs it', 'u-rukia'], ['Grace, the admin who set it up', 'u-grace']])(
    'on a performance plan, %s is sent no reading about any person',
    async (_who, userId) => {
      const read = await bothSessionsAs('review', userId);
      expect(read.strings.filter((s) => A_READING_ABOUT_EACH_PERSON.test(s))).toEqual([]);
      for (const r of [read.one, read.two]) for (const line of r.pictureLines ?? []) expect(line).not.toMatch(NAMES_THEN_A_COLON);
    },
  );
});

describe('request 101 (d): the reader is "you" about themselves', () => {
  it('Rukia reads "You make a decision on the discount." and never her own name doing it', async () => {
    const read = await bothSessionsAs('sales', 'u-rukia');
    /* Changed 24 November (page audit, row 6): a difference is said once, where things stand, never again as the question. */
    expect(read.one.theConversationWorthHaving).toBeNull()
    expect(read.strings.join(' ')).toMatch(/You make a decision on the discount/);
    expect(read.strings.filter((s) => /Rukia Otieno (?:makes|is waiting|has not said)/.test(s))).toEqual([]);
    expect(read.strings.join(' ')).toMatch(/Amani Wekesa is waiting on you for/);
  });

  it.each([['Amani, a participant', 'u-amani'], ['Juma, an admin who only reads', 'u-juma'], ['Grace, the admin who set it up', 'u-grace']])(
    '%s reads Rukia by her name, since it is not about them',
    async (_who, userId) => {
      const read = await bothSessionsAs('sales', userId);
      expect(read.one.theConversationWorthHaving).toBeNull()
      expect(read.strings.join(' ')).toMatch(/Rukia Otieno makes a decision on the discount/);
      expect(read.strings.join(' ')).not.toMatch(/\byou make a decision\b/i);
    },
  );
});
