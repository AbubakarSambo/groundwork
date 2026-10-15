import { AMINA, RUKIA, JUMA, SETUP_ADMIN, A_RELEASED_REPORT, boardAs } from './the-switchboards-sections-harness';

/**
 * ITEM 18 (THE PROJECT BOARD): A NAME IS SAID ONCE, NOT TWICE IN A ROW.
 *
 * "Atlas delivery" (a new project, served from the local test database on 2 October 2026). The stored
 * judgement is written in labels, and the model put the person's name after the label as well:
 * "Put Participant B, Kwabena Mensah, and Participant D, Samuel Aryee, in a room together". When the
 * label became the name, the lead read:
 *
 *   "Put Kwabena Mensah, Kwabena, and Samuel Aryee, Samuel, in a room together and ask them ..."
 *   "Yemi Adeyinka, Yemi, delivered the design work ..."
 *
 * Now each person is named once: "Put Kwabena Mensah and Samuel Aryee in a room together ...".
 */
const REPORT = {
  ...A_RELEASED_REPORT,
  theJudgement: {
    theGap: 'Participant A and Participant B are each waiting for information from the other.',
    whatToDo: [
      { move: 'Put Participant B, Rukia Mwangi, and Participant A, Baraka Otieno, in a room together and ask them to define the data request.', because: 'They are each waiting on the other.' },
      { move: 'Agree with Participant B, Rukia, whether her authority covers the whole project.', because: 'The initiator and Participant B see it differently.' },
    ],
    whatTheNumbersSay: [
      { says: 'Participant A, Baraka Otieno, delivered the design work with only 48 hours notice.', soWhat: 'The process was not followed.' },
    ],
  },
};

const allText = (b: any) => JSON.stringify(b.theJudgement ?? null);

describe('item 18: a name in the judgement is said once', () => {
  it('Amina, who runs it, reads each person named once', async () => {
    const b = await boardAs({ report: REPORT }, ...AMINA);
    expect(b.theJudgement.whatToDo[0].move).toBe('Put Rukia Mwangi and Baraka Otieno in a room together and ask them to define the data request.');
    expect(b.theJudgement.whatToDo[1].move).toBe('Agree with Rukia Mwangi whether her authority covers the whole project.');
    expect(b.theJudgement.whatTheNumbersSay[0].says).toBe('Baraka Otieno delivered the design work with only 48 hours notice.');
    expect(allText(b)).not.toMatch(/Rukia Mwangi, Rukia|Baraka Otieno, Baraka/);
  });

  it.each([
    ['the admin who set it up', SETUP_ADMIN],
    ['Rukia, who checks in', RUKIA],
    ['Juma, an admin who only reads', JUMA],
  ])('%s is not served the judgement, as before, and reads no name twice anywhere', async (_who, [user, role]) => {
    const b = await boardAs({ report: REPORT, createdByUserId: 'u-setup' }, user, role);
    expect(b.theJudgement ?? null).toBeNull();
    expect(JSON.stringify(b)).not.toMatch(/Rukia Mwangi, Rukia|Baraka Otieno, Baraka/);
  });
});
