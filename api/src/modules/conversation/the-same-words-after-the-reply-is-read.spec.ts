import { isThisTheSameAnswerAgain } from './a-second-press-is-not-a-second-answer';
import { notTheSameQuestionTwiceInARow } from './the-same-question-never-twice-in-a-row';

/**
 * DROP ACCESS RUN 1, ITEMS 26, 27 AND 28, from the run record's own turns (gw_sweep_drop10).
 *
 * Joseph, day 5: "I do not know." to "Who on your side would know?", and the same question handed back twelve times in a row,
 * because his same words inside two minutes were read as a second press. Joseph, day 9, and Mercy, day 8: the model's own
 * question asked again on the very next turn, after it was answered.
 */
const WHO_WOULD_KNOW = '"I do not know" is an honest answer, and it is a hard one to give. Who on your side would know?';
const at = (iso: string) => new Date(iso);
const josephDay5 = [
  { role: 'AI' as const, content: 'Last time you mentioned that Wanjiru was still deciding about the discount for Mama Pima. What happened with that?', createdAt: at('2026-10-16T11:06:58.143Z') },
  { role: 'PERSON' as const, content: 'Mama Pima has not replied since Monday.', createdAt: at('2026-10-16T11:06:58.964Z') },
  { role: 'AI' as const, content: "You are waiting on Mama Pima to reply regarding the discount. What happens if you don't hear back from them by the end of today?", createdAt: at('2026-10-16T11:07:06.674Z') },
  { role: 'PERSON' as const, content: 'I do not know.', createdAt: at('2026-10-16T11:07:07.382Z') },
  { role: 'AI' as const, content: WHO_WOULD_KNOW, createdAt: at('2026-10-16T11:07:15.363Z') },
];

describe('Joseph says "I do not know." again, to the question on his screen (item 26)', () => {
  it('is a new answer once the reply to the first is on his screen, so he is not handed the same question back', () => {
    expect(isThisTheSameAnswerAgain(josephDay5, 'I do not know.', at('2026-10-16T11:07:16.030Z'), WHO_WOULD_KNOW)).toEqual({ kind: 'a new answer' });
  });
  it('is still a second press while the reply has not reached his screen (the question he answered was the one before)', () => {
    const v = isThisTheSameAnswerAgain(josephDay5, 'I do not know.', at('2026-10-16T11:07:16.030Z'), josephDay5[2].content);
    expect(v).toEqual({ kind: 'the same answer, already answered', reply: WHO_WOULD_KNOW });
  });
  it('and with no screen said (WhatsApp, the API, an older app), it is read as it always was', () => {
    expect(isThisTheSameAnswerAgain(josephDay5, 'I do not know.', at('2026-10-16T11:07:16.030Z')).kind).toBe('the same answer, already answered');
  });
});

describe('the same question never goes out twice in a row (items 26 to 28)', () => {
  it('Joseph, day 9: the question he had just answered is not put to him again', () => {
    const asked = [
      'Grace needs to approve the KES 4,500 price for Juja Hardware. What is the date you will have an answer by?',
      'Understood. Grace expects 40 units sold by October 30, and you said your goal is 10 units from Mama Pima. Which one is it now?',
    ];
    const out = notTheSameQuestionTwiceInARow(asked[1], asked);
    expect(out).not.toMatch(/Which one is it now/);
    expect(out).toMatch(/\?$/);
    expect(out).toBe('Got it. What else should I know?');
  });
  it('Mercy, day 8: "Which is the goal now?" after she answered it is not asked a second time', () => {
    const q = 'Understood. Regarding Tuskys Westgate, you said signed orders and proof of payment for the 40 units would tell me they were sold and the 30 units from the quote I sent stands. Which is the goal now?';
    const asked = [
      'You said you will ask Peter Njoroge in Accounts to check for the M-Pesa deposit today.\n\nWhat else should I know?',
      'Please send it, and confirm that it matches the 25 units for Greenfield Supermarket.',
      q,
    ];
    const out = notTheSameQuestionTwiceInARow(q, asked);
    expect(out).not.toMatch(/Which is the goal now/);
    expect(out).not.toMatch(/What else should I know/);
    expect(out).toMatch(/\?$/);
  });
  it('the same question after a different lead-in is replaced, and what was said before it stays', () => {
    const asked = ['Okay, 30 units for Tuskys Westgate. What is the next action with Kawangware Fresh, and by when?'];
    const out = notTheSameQuestionTwiceInARow('Esther has no budget yet. What is the next action with Kawangware Fresh, and by when?', asked);
    expect(out).toBe('Esther has no budget yet. What else should I know?');
  });
  it('a different question goes out as written', () => {
    const asked = ['What happened with Mama Pima?'];
    expect(notTheSameQuestionTwiceInARow('Who decides at Juja Hardware?', asked)).toBe('Who decides at Juja Hardware?');
  });
});
