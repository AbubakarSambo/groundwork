import { withoutAPastedLine } from './a-pasted-line-is-never-read-back';
import { notAQuestionAlreadyAnswered } from './the-same-question-never-twice-in-a-row';

/** Drop Access (test), Kevin's WhatsApp check-in, Tuesday 13 October, the turns as they were sent (messages test, fourth run). */
const OPENING = 'Sales team, Q4, check-in 2. You can write "ask" at any time to talk to Ask Drop Access (test), "back" to come back to your check-in, and "switch" to choose another check-in.\n\nLast time you told us you were visiting two shops on Ngong Road. Today we are going to look specifically at what happens when a deal does not move forward. What is one thing you wish had gone differently with those two shops?';
const GARBLED = "They shut you down before you could offer a price. That means your entry from last session-Selling 120 units would mean you've successfully closed deals for that many water dispensers. The sales reports would show it.-no longer stands for this specific deal. Is that accurate?";

describe("Kevin's Tuesday check-in", () => {
  it('a line of his record pasted between hyphens is not sent, nor the question about it', () => {
    const r = withoutAPastedLine(GARBLED);
    expect(r.text).toBe('They shut you down before you could offer a price.');
    expect(r.cut).toHaveLength(4);
  });
  it('a hyphen in an ordinary word is left alone', () => {
    const plain = 'That is a follow-up for Thursday. Is that accurate?';
    expect(withoutAPastedLine(plain).text).toBe(plain);
  });
  it('the opening question he answered is not asked again, word for word', () => {
    const again = notAQuestionAlreadyAnswered('What is one thing you wish had gone differently with those two shops?', [OPENING, 'Kamau Electricals is a deal you were hoping to win. What specifically did you offer them that was close to Aqua Pure\'s price?']);
    expect(again).not.toContain('those two shops');
    expect(again).toMatch(/\?$/);
  });
  it('a short general question can be asked again', () => {
    expect(notAQuestionAlreadyAnswered('What else should I know?', ['Understood. What else should I know?'])).toBe('What else should I know?');
  });
});
