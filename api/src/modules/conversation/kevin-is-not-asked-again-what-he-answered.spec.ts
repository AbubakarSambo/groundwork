import { notAQuestionAlreadyAnswered, notTheSameQuestionTwiceInARow } from './the-same-question-never-twice-in-a-row';

/**
 * "WHICH OF THOSE STANDS NOW?", ASKED AGAIN AFTER KEVIN HAD ANSWERED IT (Hafsah, 19 October, point 3; messages test after the fixes,
 * finding 2). Drop Access (test), Kevin Omondi's WhatsApp check-in on Wednesday 14 October, the AI's turns in order, as the run holds them.
 */
const ASKED = [
  'Last time you said you sent Savannah Cafe the price list this morning. What has happened with Savannah Cafe since then?',
  "Six units is movement. Does Jane's commitment to those six units mean you will hit the 40 units Grace set for you?",
  'That is 46 units toward the 40 Grace set for you. You also said you were aiming for another 80 units by October 30th. Which of those stands now?',
  'You have 46 units toward the 120-unit team target. Kilele Hotel\'s 40 units and Savannah Cafe\'s 6 units are both significant. For Kilele Hotel, what is the signed order or payment record for the 40 units?',
  'What would show this deal is settled, even before the deposit lands on Friday?',
  'Is there anything you can do to move Ali toward a decision, or a clear yes or no?',
  'What has happened with Kamau Electricals since you visited them?',
  'Kamau Electricals is not moving forward as they already source from Aqua Pure. What will you do about Ali from Ngong Road Minimart, and by when?',
];
/* 14:03, after he had said at 14:01 "The 120 units by Oct 30th is the team target. I've got 46 units towards that." */
const AGAIN = 'Understood. Grace set a target of 40 units for you by October 30th, and you said you were aiming for another 80 units by then. Which of those stands now?';

describe('Kevin is not asked again what he has answered', () => {
  it('before: the turn-before check lets it by, because it was asked further back', () => {
    expect(notTheSameQuestionTwiceInARow(AGAIN, ASKED)).toBe(AGAIN);
  });
  it('now: the question, and the sentence that only said it again, give way to a plain question not yet asked', () => {
    expect(notAQuestionAlreadyAnswered(AGAIN, ASKED)).toBe('Understood. What else should I know?');
  });
  it('a short question asked again about something else is asked', () => {
    const other = 'Ali said he would decide on the quote for 4 units next week. Which of those stands now?';
    expect(notAQuestionAlreadyAnswered(other, ASKED)).toBe(other);
  });
  it('a question never asked here is left as it is', () => {
    const fresh = 'When does Jane pay the KES 15,000 deposit?';
    expect(notAQuestionAlreadyAnswered(fresh, ASKED)).toBe(fresh);
  });
});
