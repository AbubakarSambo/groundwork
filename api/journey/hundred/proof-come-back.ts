/** Is resuming an entry conversation broken, or was that 503 a model blip? */
import { call } from './harness';

(async () => {
  const history = [
    { role: 'assistant', content: 'What brings you here?' },
    { role: 'user', content: 'We have a new hire starting in two weeks and I want clear expectations.' },
  ];
  const first = await call('POST', '/entry/chat', { messages: history, scenario: 'NEW_HIRE' });
  console.log('first turn:', first.status, String(first.data?.reply ?? '').slice(0, 70));

  const withReply = [...history, { role: 'assistant', content: String(first.data?.reply ?? '') },
    { role: 'user', content: 'She is a delivery lead and reports to me.' }];

  /* Leave, come back: the client re-posts the whole transcript. Five times, to see whether a
     failure is the rule or a blip. */
  for (let i = 1; i <= 5; i++) {
    const again = await call('POST', '/entry/chat', { messages: withReply, scenario: 'NEW_HIRE' });
    console.log(`  resume ${i}: ${again.status} ${again.status !== 200 ? JSON.stringify(again.data?.message ?? '').slice(0, 90) : 'the conversation is still there'}`);
  }
})();
