import { readToDo, addedToYourToDos } from './a-to-do-is-yours';

/**
 * REQUEST 27: AFTER A YES, THE REPLY IS THE PROTOTYPE'S (suite-todos.txt):
 * "Added to your to-dos for Tuesday: call Lakeside’s buyer." The confirmation before it is unchanged.
 */
describe('Added to your to-dos', () => {
  it('says the day it is for, where one was said, and their words as they said them', () => {
    expect(addedToYourToDos(readToDo('call Lakeside’s buyer on Tuesday')!)).toBe('Added to your to-dos for Tuesday: call Lakeside’s buyer.');
    expect(addedToYourToDos({ text: 'call Lakeside’s buyer', dueSaid: 'on Tuesday' })).toBe('Added to your to-dos for Tuesday: call Lakeside’s buyer.');
    expect(addedToYourToDos({ text: 'book the room', dueSaid: 'tomorrow' })).toBe('Added to your to-dos for tomorrow: book the room.');
  });

  it('a deadline stays a deadline', () => {
    expect(addedToYourToDos({ text: 'send the rota', dueSaid: 'by Friday' })).toBe('Added to your to-dos: send the rota by Friday.');
  });

  it('no day, no day', () => {
    expect(addedToYourToDos({ text: 'book the room.', dueSaid: null })).toBe('Added to your to-dos: book the room.');
  });
});
