import { A_WISH_TO_CARRY_ON_THE_CHECK_IN as wish } from './a-whatsapp-message-is-routed';

/** B-143: 'Hi', 'I want to do my check-in' and 'START' were answered "I cannot answer that one yet" while in Ask. */
describe('words that mean "take me to my check-in"', () => {
  it.each(['Hi', 'hello!', 'START', 'start', 'Hi, I want to do my check-in', 'I want to do my check-in', 'continue my check-in', 'let me finish my check-in please'])('%s', (t) => expect(wish.test(t)).toBe(true));
  it.each(['When is my next check-in?', 'what did I say in my check-in', 'How many leave days do I have left?', 'approve', 'who needs me this week'])('%s stays with Ask', (t) => expect(wish.test(t)).toBe(false));
});
