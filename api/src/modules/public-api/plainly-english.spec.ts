import { plainlyEnglish } from './plainly-english';

describe('a message that is plainly English is read as English, without asking the model', () => {
  it.each([
    'This week I signed the Naivas order for 600,000 shillings, and the Quickmart one is still waiting for their buyer.',
    'The concrete floor was poured on Tuesday, two days later than the plan, because the cement delivery came late.',
    'I will send the corrected price list to Quickmart by Friday.',
  ])('reads "%s" as English', (t) => expect(plainlyEnglish(t)).toBe(true));

  it.each([
    'Wiki hii nimeuza bidhaa nyingi kwa wateja wa Naivas na Quickmart bado anasubiri.',
    'Na gama aikin a ranar Talata, amma kayan sun zo a makare.',
    'Mo ti pari iṣẹ naa ni ọjọ Tuesday.',
    'Habari yako',
    'START',
  ])('leaves "%s" to the model', (t) => expect(plainlyEnglish(t)).toBe(false));
});
