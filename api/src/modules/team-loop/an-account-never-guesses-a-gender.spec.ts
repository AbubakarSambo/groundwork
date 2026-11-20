import { theAccountMadeSafe } from './the-team-mind';

/** FATIMA ROUND 3: the model wrote "Hauwa said she would", "Grace said she approved", "nothing in his reply". Nobody's gender is worked out from a first name. */
describe('what the model writes about people never guesses their gender', () => {
  const facts = [{ id: 'f1', says: 'Hauwa said they will pay by Friday.' }, { id: 'f2', says: 'Tunde replied, and nothing in it adds a promise.' }, { id: 'f3', says: 'Grace said “I will pay as soon as she says yes”.' }];
  it('drops a sentence that says he, she, his or her, and keeps the others', () => {
    const kept = theAccountMadeSafe({ sentences: [
      { says: 'Hauwa said she would pay by Friday.', from: ['f1'] },
      { says: 'Tunde replied, and nothing in his reply adds a promise.', from: ['f2'] },
      { says: 'Hauwa said they will pay by Friday.', from: ['f1'] },
    ] }, facts);
    expect(kept?.map((k) => k.says)).toEqual(['Hauwa said they will pay by Friday.']);
  });
  it('leaves a person\'s own quoted words alone', () => {
    const kept = theAccountMadeSafe({ sentences: [{ says: 'Grace said “I will pay as soon as she says yes”.', from: ['f3'] }] }, facts);
    expect(kept).toHaveLength(1);
  });
});

describe('a reply to a team member never says something is attached or sent (Fatima round 7)', () => {
  it('is not used when it does', () => {
    const { aReplyToThemMadeSafe } = require('./the-team-mind');
    expect(aReplyToThemMadeSafe("Ifeoma's year-end report is attached.")).toBeNull();
    expect(aReplyToThemMadeSafe("I have attached the report for you.")).toBeNull();
    expect(aReplyToThemMadeSafe('Thank you, Halima. I do not tell anybody what somebody else has sent me.')).not.toBeNull();
  });
});
