import { asATextMessage, whereThisGoes } from './a-reply-reads-as-a-text-message';

describe('a reply reads as one text message', () => {
  it('keeps the words, lists the choices, names a step that needs the app, drops nothing silently', () => {
    const text = asATextMessage({
      lane: 'unplaced', composedBy: 'rules',
      blocks: [
        { type: 'text', body: 'I cannot answer that one yet.' },
        { type: 'picker', options: [{ key: 'a', label: 'What am I on?' }, { key: 'b', label: 'What is on my list?' }] },
        { type: 'next_step', label: 'Read it and start', href: '/grounds', kind: 'confirm_a_check_in', id: 'g1' },
      ],
    } as any);
    expect(text).toBe('I cannot answer that one yet.\n\n- What am I on?\n- What is on my list?\n\nRead it and start: open Groundwork to do this.');
  });
});

describe('where a WhatsApp message goes', () => {
  it('an open check-in takes it; a waiting one is opened first; nothing open goes to the assistant', () => {
    expect(whereThisGoes({ id: 'c', status: 'IN_PROGRESS' })).toBe('answer-in-the-check-in');
    expect(whereThisGoes({ id: 'c', status: 'NOT_STARTED' })).toBe('open-the-check-in');
    expect(whereThisGoes(null)).toBe('the-assistant');
  });
});
