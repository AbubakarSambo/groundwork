import { theShortNameOf, theFirstNameFrom, isATitle } from './a-title-is-not-a-first-name';
import { fullNameOnce } from './a-sentence-from-the-readers-side';
import { ReportsService } from './reports.service';
import { GroundScenario, PartyType } from '@prisma/client';

/**
 * "Dr Amina Bello says that you were hired to manage the relationships with the five biggest
 * clients. Success for Dr means you ..." (seniorhire, run 10). The short name was the first word,
 * and the first word was her title.
 */
describe('a title is not a first name', () => {
  it('a title and two names: the short name is the first name', () => {
    expect(theShortNameOf('Dr Amina Bello')).toBe('Amina');
    expect(theShortNameOf('Eng. Musa Ibrahim')).toBe('Musa');
    expect(theShortNameOf('Engr Musa Ibrahim')).toBe('Musa');
    expect(theShortNameOf('Prof. Ngozi Okonjo')).toBe('Ngozi');
    expect(theShortNameOf('Alhaji Bello Musa')).toBe('Bello');
    expect(theShortNameOf('Barr. Chika Obi')).toBe('Chika');
    expect(theShortNameOf('Rt. Hon. Femi Gbaja')).toBe('Femi');
    expect(theShortNameOf('Chief Dr Ade Bakare')).toBe('Ade');
  });

  it('a title and one name: the whole thing, which is how people say it', () => {
    expect(theShortNameOf('Dr Bello')).toBe('Dr Bello');
    expect(theShortNameOf('Mrs Okafor')).toBe('Mrs Okafor');
    expect(theShortNameOf('Ms. Adeyemi')).toBe('Ms. Adeyemi');
    expect(theShortNameOf('Madam Okoye')).toBe('Madam Okoye');
  });

  it('Madam is a title too', () => {
    expect(theShortNameOf('Madam Grace Okoye')).toBe('Grace');
    expect(isATitle('Madam')).toBe(true);
  });

  it('a person actually named Hon, or Justice, is not broken by being alone', () => {
    expect(theShortNameOf('Hon')).toBe('Hon');
    expect(theShortNameOf('Justice')).toBe('Justice');
    expect(theShortNameOf('Justice Mensah')).toBe('Justice Mensah');
    expect(theFirstNameFrom('Hon', null)).toBe('Hon');
  });

  it('a name with no title is cut at the first word, as before', () => {
    expect(theShortNameOf('Tobi Adewale')).toBe('Tobi');
    /* Given names that are also titles somewhere are left alone. */
    expect(theShortNameOf('Prince Adewale Okoye')).toBe('Prince');
    expect(isATitle('Prince')).toBe(false);
  });

  it('from the two fields a person fills in', () => {
    expect(theFirstNameFrom('Dr', 'Amina Bello')).toBe('Amina');
    expect(theFirstNameFrom('Dr.', 'Bello')).toBe('Dr. Bello');
    expect(theFirstNameFrom('Eng. Musa', 'Ibrahim')).toBe('Musa');
    expect(theFirstNameFrom('Mrs', 'Okafor')).toBe('Mrs Okafor');
    expect(theFirstNameFrom('Amina', 'Bello')).toBe('Amina');
    expect(theFirstNameFrom('', 'Bello')).toBeNull();
  });

  it('a full name once, then the first name that is not a title', () => {
    expect(fullNameOnce('Dr Amina Bello says it. Success for Dr Amina Bello means renewals.', ['Dr Amina Bello']))
      .toBe('Dr Amina Bello says it. Success for Amina means renewals.');
    expect(fullNameOnce('Dr Bello says it. Dr Bello agrees.', ['Dr Bello'])).toBe('Dr Bello says it. Dr Bello agrees.');
    expect(fullNameOnce('Mrs Okafor says it. Mrs Okafor agrees.', ['Mrs Okafor'])).toBe('Mrs Okafor says it. Mrs Okafor agrees.');
  });

  it('and what the person the report is about actually reads', () => {
    const at = (d: number) => new Date(`2026-09-0${d}T09:00:00Z`);
    const AMINA = { id: 'p-lead', partyType: PartyType.INITIATOR, roleAsDescribed: null, email: 'amina@firm.test', createdAt: at(1), user: { firstName: 'Dr', lastName: 'Amina Bello' } };
    const TOBI = { id: 'p-tobi', partyType: PartyType.PARTICIPANT, roleAsDescribed: null, email: 'tobi@firm.test', createdAt: at(2), user: { firstName: 'Tobi', lastName: 'Adewale' } };
    const ground: any = {
      scenario: GroundScenario.NEW_HIRE, peersVisibleToEachOther: null, participants: [AMINA, TOBI],
      report: { sharedPicture: 'The initiator says Participant A was hired to own the five biggest clients. Success for the initiator means Participant A "fully owns those client relationships".' },
    };
    const served = (Object.create(ReportsService.prototype) as ReportsService).theReportAsItWasShared(ground, 'p-tobi', false) as any;
    expect(served.sharedPicture).toBe('Dr Amina Bello says you were hired to own the five biggest clients. Success for Amina means you "fully owns those client relationships".');
    expect(served.sharedPicture).not.toMatch(/\bDr (?!Amina)/);
  });
});
