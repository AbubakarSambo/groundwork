import { whatTheTeamGets, whatTheLeadGets, theSubjectTheTeamSees, THE_TEAM_BUTTON, THE_LEAD_BUTTON } from './one-line-one-link-one-report';

/**
 * ONE LINE, ONE LINK, ONE REPORT.
 *
 * The two emails are the whole of "Get updates from your team": a two-minute setup is only worth
 * anybody's time because of what arrives in the same week. So both are held to the words Hafsah
 * wrote them in on 18 September 2026, and the thing they must never do is lead with the machinery.
 */
const THE_LINE = 'What are your three priorities this quarter, and what is blocking you?';

describe('what the team gets', () => {
  it('says who asked, quotes their line, and says how long it takes', () => {
    const { subject, lines } = whatTheTeamGets({ leadName: 'Hafsah', theOneLine: THE_LINE, by: 'Friday' });
    expect(subject).toBe('Hafsah asked you for a quick update');
    expect(lines[0]).toBe('Hafsah asked you for a quick update.');
    expect(lines[1]).toBe(THE_LINE);
    /* Five, not two: across a hundred real conversations the median was six answers. And the mail
       now says what arrives at the end, which is the reason to spend them. */
    expect(lines[2]).toBe('It takes about ten minutes. Reply by Friday.');
    expect(lines[3]).toBe('You will get the consolidated report at the end.');
  });

  /* The lead's question is quoted, never paraphrased: it is what they are being asked, and the
     product has no better version of it than the one a person wrote. */
  it('never rewrites the line it was given', () => {
    const odd = 'whats up with the numbers';
    expect(whatTheTeamGets({ leadName: 'Ada', theOneLine: odd, by: null }).lines).toContain(odd);
  });

  it('drops the deadline rather than inventing one', () => {
    const { lines } = whatTheTeamGets({ leadName: 'Ada', theOneLine: THE_LINE, by: null });
    expect(lines).toContain('It takes about ten minutes.');
    expect(lines.join(' ')).not.toMatch(/Friday|by \w+day/);
  });

  /**
   * BEING STRAIGHT ABOUT A TRIAL. Her call, and the reasoning is worth keeping: saying so raises
   * replies, and it makes the team a participant in the evaluation instead of a test subject.
   */
  it('says so when it is a trial, in the lead\'s voice rather than ours', () => {
    const { lines } = whatTheTeamGets({ leadName: 'Ada', theOneLine: THE_LINE, by: 'Friday', aTrial: true });
    const said = lines.join(' ');
    expect(said).toContain('We are trying this out');
    expect(said).toContain('help us be aligned');
    expect(said).toContain('one summary that gives us a shared picture');
    expect(said).not.toMatch(/Groundwork|the product|beta/i);
  });

  it('and says nothing about a trial when it is not one', () => {
    expect(whatTheTeamGets({ leadName: 'Ada', theOneLine: THE_LINE, by: 'Friday' }).lines.join(' '))
      .not.toContain('trying this out');
  });

  it('with a subject that is the same sentence, so the inbox says it too', () => {
    expect(theSubjectTheTeamSees('Hafsah')).toBe('Hafsah asked you for a quick update');
  });
});

describe('what the lead gets', () => {
  /*
   * THE MOMENT OF VALUE, TREATED AS THE PROMISE RATHER THAN A NOTIFICATION. It leads with the fact
   * everybody answered, not with the product's name for the artefact.
   */
  it('leads with everybody having answered', () => {
    const { subject, lines } = whatTheLeadGets({ theOneLine: THE_LINE, howMany: 6 });
    expect(subject).toBe('Your team has all checked in');
    expect(lines[0]).toBe('All 6 of them have answered. Here is one report.');
  });

  it('names all four things the report holds, including the one nothing else says', () => {
    const said = whatTheLeadGets({ theOneLine: THE_LINE, howMany: 6 }).lines.join(' ');
    for (const part of ['what each person said', 'where they line up', 'where they do not', 'what nobody is holding']) {
      expect(said).toContain(part);
    }
  });

  it('and says what it is for, which is the next team meeting', () => {
    expect(whatTheLeadGets({ theOneLine: THE_LINE, howMany: 3 }).lines.join(' '))
      .toContain('take into your next team meeting');
  });
});

describe('the buttons', () => {
  /* Each says what is on the other side of it, in the fewest words that can. */
  it('say what pressing them does and nothing else', () => {
    expect(THE_TEAM_BUTTON).toBe('Your link');
    expect(THE_LEAD_BUTTON).toBe('Read the report');
  });
});
