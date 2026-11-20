import { aScriptedMind, aTeamLoopWorld } from './a-world-for-the-team-loop';
import { forgetTheConversation } from './the-conversation-so-far';

beforeEach(() => forgetTheConversation());

/**
 * FATIMA ROUND 3. Musa wrote "I met Mr Danladi and he signed. I need a new letter for the second office. Can you help me with it?" and was asked what was discussed with
 * Mr Danladi: the request for help inside an update was lost. Tunde asked for a reminder, was asked for the guests' names, gave them, and was asked what the guests had
 * decided: the answer to help's own question was read as news. Both are the same conversation as the request.
 */
describe('help asked inside an update, and the answer to help\'s question', () => {
  it('a request for help inside an update is answered with help', async () => {
    const mind = aScriptedMind({ readings: [['second office', { kind: 'update', asksForHelp: true }]], help: 'Dear Mr Danladi, please send the letter for the second office. Thank you, Amina.' });
    const x = await aTeamLoopWorld({ mind });
    const reply = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'I met Mr Danladi and he signed. I need a new letter for the second office. Can you help me with it?' });
    expect(reply).toMatch(/^Dear Mr Danladi/);
  });
  it('what they say next, after help just spoke, and the model says it goes on from it, goes back to help with the conversation beside it', async () => {
    const mind = aScriptedMind({ readings: [['reminder', { kind: 'help' }], ['Director of Trade', { kind: 'update', continuesTheLast: true }]], help: 'Which two guests, and when is it for?' });
    const x = await aTeamLoopWorld({ mind });
    const first = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'Please help me write a reminder to two guests.' });
    expect(first).toMatch(/\?$/);
    const second = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'The Director of Trade Promotion and two of his officers.' });
    expect(second).toBe('Which two guests, and when is it for?');
    expect((mind as any).helped).toHaveLength(2);
    expect((mind as any).helped[1]).toContain('Which two guests, and when is it for?');
    expect((mind as any).helped[1]).toContain('The Director of Trade Promotion');
  });
  it('help that asks in a plain request ("Please tell me their names") also waits for the answer', async () => {
    const mind = aScriptedMind({ readings: [['reminder', { kind: 'help' }], ['Director of Trade', { kind: 'update', continuesTheLast: true }]], help: 'Please tell me their names to write the reminder.' });
    const x = await aTeamLoopWorld({ mind });
    await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'Please help me write a reminder to two guests.' });
    await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'The Director of Trade Promotion and two of his officers.' });
    expect((mind as any).helped).toHaveLength(2);
    expect((mind as any).helped[1]).toContain('Please tell me their names');
  });
  it('an ordinary update after help that asked nothing is not taken for help', async () => {
    const mind = aScriptedMind({ readings: [['reminder', { kind: 'help' }], ['I will send', { kind: 'update' }]], help: 'Dear all, a reminder. Thank you.' });
    const x = await aTeamLoopWorld({ mind });
    await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'Please help me write a reminder.' });
    const second = await x.service.hearATeamMember({ organizationId: 'org-1', contact: x.contact('Amina Yusuf'), text: 'I will send the permit letter on Friday.' });
    expect(second).toBeNull();
  });
});
