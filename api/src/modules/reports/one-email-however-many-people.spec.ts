/**
 * ONE EMAIL, WHETHER IT IS ONE PERSON OR NINE.
 *
 * The report is unchanged and says nothing about why it arrived. A report that
 * announced itself as arriving for a probation decision would be read as a
 * recommendation, and whoever read it would go looking for one.
 */
import {
  theEmailForOneManager,
  whichAreDueSoon,
  saidAsAList,
} from './one-email-however-many-people';

const due = (displayName: string, personExternalId = displayName.toLowerCase(), kind = 'Probation') => ({
  personExternalId,
  displayName,
  dueOn: new Date('2026-10-01'),
  kind,
});

const linkTo = (groundId: string) => `https://app.test/grounds/${groundId}/report`;

describe('the email', () => {
  it('is one email with a link for each person', () => {
    const email = theEmailForOneManager({
      managerName: 'Hafsah',
      due: [due('Adam'), due('Kemi')],
      readable: [
        { groundId: 'g1', label: 'Adam joining', about: ['Adam'] },
        { groundId: 'g2', label: 'Kemi joining', about: ['Kemi'] },
      ],
      linkTo,
    })!;
    expect(email.text).toContain('grounds/g1/report');
    expect(email.text).toContain('grounds/g2/report');
    expect(email.subject).toContain('2 people');
  });

  it('and says nothing about why it arrived beyond the date', () => {
    /* No "for your probation decision", no framing, no recommendation language.
       It is the same record it always is. */
    const email = theEmailForOneManager({
      managerName: 'Hafsah',
      due: [due('Adam')],
      readable: [{ groundId: 'g1', label: 'Adam joining', about: ['Adam'] }],
      linkTo,
    })!;
    expect(email.text).not.toMatch(/recommend|decision|assess|rating|verdict|performance/i);
    expect(email.text).toContain('unchanged');
  });

  it('and names who has nothing released yet', () => {
    /* A manager who receives four of five and is told nothing about the fifth
       assumes there was nothing to say about them. */
    const email = theEmailForOneManager({
      managerName: 'Hafsah',
      due: [due('Adam'), due('Kemi')],
      readable: [{ groundId: 'g1', label: 'Adam joining', about: ['Adam'] }],
      linkTo,
    })!;
    expect(email.text).toContain('Nothing has been released yet for Kemi');
  });

  it('and is not sent at all when nobody has anything to read', () => {
    /* An email saying "no reports yet" trains somebody to stop opening them, and
       then the one that matters is the one they skip. */
    expect(
      theEmailForOneManager({ managerName: 'Hafsah', due: [due('Adam')], readable: [], linkTo }),
    ).toBeNull();
  });

  it('and is not sent when nothing is due', () => {
    expect(theEmailForOneManager({ managerName: 'Hafsah', due: [], readable: [], linkTo })).toBeNull();
  });

  it('and covers everybody it mentions, including the ones with nothing', () => {
    /* They were told. Telling them again next week helps nobody. */
    const email = theEmailForOneManager({
      managerName: 'Hafsah',
      due: [due('Adam'), due('Kemi')],
      readable: [{ groundId: 'g1', label: 'Adam joining', about: ['Adam'] }],
      linkTo,
    })!;
    expect(email.covers.sort()).toEqual(['adam', 'kemi']);
  });

  it('and builds no link of its own', () => {
    /* The one place a report URL is constructed stays the one place. A second
       construction is how a link ends up pointing at a transcript. */
    const source = require('fs')
      .readFileSync(require('path').join(__dirname, 'one-email-however-many-people.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/https?:|\/grounds\//);
  });
});

describe('which reviews are worth an email', () => {
  const today = new Date('2026-09-06');
  const soon = { ...due('Adam'), notifiedAt: null };
  const already = { ...due('Kemi'), notifiedAt: new Date('2026-09-01') };
  const far = { ...due('Sam'), dueOn: new Date('2027-01-01'), notifiedAt: null };
  const past = { ...due('Old'), dueOn: new Date('2026-08-01'), notifiedAt: null };

  it('the ones coming up and not yet sent', () => {
    expect(whichAreDueSoon([soon, already, far, past], today, 30).map((d) => d.displayName)).toEqual(['Adam']);
  });

  it('and nobody is told twice about one review', () => {
    expect(whichAreDueSoon([already], today, 30)).toEqual([]);
  });
});

describe('the list', () => {
  it('reads as a sentence however many there are', () => {
    expect(saidAsAList(['Adam'])).toBe('Adam');
    expect(saidAsAList(['Adam', 'Kemi', 'Sam'])).toBe('Adam, Kemi and Sam');
  });
});
