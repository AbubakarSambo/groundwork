import { reportAsText } from '../public-api/a-whatsapp-message-is-routed';

/**
 * The report sent to a phone was "Differences: Nothing to compare yet (3 people have still to answer.)",
 * "Movement: Not tracked (Somebody named a number, ...)" and "Worth having: ..." - pieces joined with
 * colons and brackets. Found by driving a full check-in through the signed webhook. Each read is its own
 * sentence now.
 */
const REPORT = {
  whereThingsStand: { saying: 'Not everyone has answered yet, so there is nothing to agree or differ with.' },
  atAGlance: [
    { label: 'Differences', value: 'Nothing to compare yet', sub: '3 people have still to answer.' },
    { label: 'Movement', value: 'Not tracked', sub: 'Somebody named a number, and nothing is tracking it.' },
    { label: 'Blockers', value: '4 worries', sub: '4 worries are on record, and no wait has been recorded against a named person.' },
    { label: 'How much was said', value: 'All from memory', sub: 'Nothing said this session has a document behind it.' },
  ],
  theConversationWorthHaving: 'Which of those conversations was with someone who can actually decide, with the budget and the authority?',
};

describe('what Chidi reads on his phone when his report arrives', () => {
  it('plain sentences, with no label, colon or bracket joining pieces', () => {
    expect(reportAsText(REPORT, 'Sales team, Q4')).toBe([
      'Your report for Sales team, Q4 is ready.',
      'Not everyone has answered yet, so there is nothing to agree or differ with.',
      '3 people have still to answer. Somebody named a number, and nothing is tracking it. 4 worries are on record, and no wait has been recorded against a named person. Nothing said this session has a document behind it.',
      'Which of those conversations was with someone who can actually decide, with the budget and the authority?',
    ].join('\n\n'));
  });
  it('a read with no note is the label and the value in one sentence', () => {
    expect(reportAsText({ atAGlance: [{ label: 'Scope', value: 'clear' }] }, 'New project')).toBe('Your report for New project is ready.\n\nScope is clear.');
  });
});
