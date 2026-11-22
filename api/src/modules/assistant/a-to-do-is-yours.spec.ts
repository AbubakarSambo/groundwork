import { readToDo, whichToDo, listToDos } from './a-to-do-is-yours';
import { route } from './the-router-is-deterministic';

describe('a to-do is read from what they said', () => {
  it('keeps their words for when', () => {
    expect(readToDo('chase the invoice by Friday')).toEqual({ text: 'chase the invoice by Friday', dueSaid: 'by Friday' });
    expect(readToDo('renew the domain')).toEqual({ text: 'renew the domain', dueSaid: null });
    expect(readToDo('ok')).toBeNull();
  });

  it('routes the shapes that name a list, and leaves documents and commitments alone', () => {
    expect(route('add the rota to my to-do list')).toEqual({ lane: 'add_a_to_do', subject: 'the rota' });
    expect(route('add the rota to my to-do list by Friday')).toEqual({ lane: 'add_a_to_do', subject: 'the rota' });
    expect(readToDo('the rota', 'add the rota to my to-do list by Friday')).toEqual({ text: 'the rota', dueSaid: 'by Friday' });
    expect(route('remind me to book the room').lane).toBe('add_a_to_do');
    expect(route('what is on my list?').lane).toBe('my_to_dos');
    expect(route('done: send the rota')).toEqual({ lane: 'tick_off_a_to_do', subject: 'send the rota' });
    expect(route('add the handbook').lane).not.toBe('add_a_to_do');
    expect(route("I'll send the rota by Friday").lane).toBe('unplaced');
    expect(route('my commitments').lane).toBe('what_did_i_commit_to');
  });
});

describe('ticking off never closes on a guess', () => {
  const open = [{ id: '1', text: 'send the rota to Priya' }, { id: '2', text: 'book the meeting room' }, { id: '3', text: 'send the invoice' }];
  it('one clear winner closes', () => {
    expect(whichToDo('the rota', open)).toEqual({ one: open[0] });
  });
  it('a tie asks', () => {
    const r = whichToDo('send', open);
    expect('several' in r && r.several.length).toBe(2);
  });
  it('no overlap says so, and "the" is not an overlap', () => {
    expect(whichToDo('zebra', open)).toEqual({ none: true });
    expect(whichToDo('the zebra', open)).toEqual({ none: true });
  });
  it('an empty list says how to add to it', () => {
    /* Changed 21 November 2026 (Batch E, N13): no privacy note in a message. Nobody else is served the list: that is the backend's rule. */
    expect(listToDos([])).toBe('Nothing on your list. Say "add X to my to-do list" and it goes here.');
  });
});
