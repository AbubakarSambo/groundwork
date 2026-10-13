import { asksWhatTheCompanyIsWorkingOn } from './about-your-check-ins-and-the-company';

/**
 * B-134: "What is Msingi Foods working on this quarter?" and "What is the company working on?" were answered
 * "I cannot answer that one yet." They are the Company page's question. Only the company, we, or the
 * organisation's own name counts: a person's name stays a question about a person.
 */
describe('a question about what the company is working on', () => {
  it('is recognised by the organisation\'s own name, and by the company, we or us', () => {
    expect(asksWhatTheCompanyIsWorkingOn('What is Msingi Foods working on this quarter?', 'Msingi Foods')).toBe(true);
    expect(asksWhatTheCompanyIsWorkingOn('what is the company working on', 'Msingi Foods')).toBe(true);
    expect(asksWhatTheCompanyIsWorkingOn('What are we working on right now?', 'Msingi Foods')).toBe(true);
    expect(asksWhatTheCompanyIsWorkingOn('What is our organisation working on at the moment?', 'Msingi Foods')).toBe(true);
  });
  it('is not a question about a person or a team', () => {
    expect(asksWhatTheCompanyIsWorkingOn('What is Amani working on this quarter?', 'Msingi Foods')).toBe(false);
    expect(asksWhatTheCompanyIsWorkingOn('What is the sales team working on?', 'Msingi Foods')).toBe(false);
    expect(asksWhatTheCompanyIsWorkingOn('What are the company priorities?', 'Msingi Foods')).toBe(false);
    expect(asksWhatTheCompanyIsWorkingOn('What is Msingi Foods working on?', null)).toBe(false);
  });
});
