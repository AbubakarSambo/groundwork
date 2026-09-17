/*
 * EXTENSIVE RUNS, INSTEAD OF A WEEK OF REAL USE.
 *
 * Drives the real setup conversation over HTTP against a build of today's code, with a model
 * playing the person. Nothing here is committed to the product: it lives in the scratchpad and
 * exists to produce numbers about the things changed today.
 */
import { ConfigService } from '@nestjs/config';
import { AnthropicService } from '/Users/hafsahjumare/Documents/GitHub/groundwork/api/src/modules/conversation/anthropic.service';
import { wordsWeDoNotUse } from '/Users/hafsahjumare/Documents/GitHub/groundwork/api/src/modules/conversation/words-we-do-not-use';
import { opensByRepeatingThem } from '/Users/hafsahjumare/Documents/GitHub/groundwork/api/src/modules/conversation/asked-twice-and-told-no-twice';
import { stillAsking } from '/Users/hafsahjumare/Documents/GitHub/groundwork/api/src/modules/conversation/one-question-per-turn';
import { sentencesIn } from '/Users/hafsahjumare/Documents/GitHub/groundwork/api/src/modules/presentation/where-a-sentence-actually-ends';
import * as fs from 'fs';

const API = 'http://localhost:3101/api/v1';
const OUT = '/private/tmp/claude-501/-Users-hafsahjumare-Documents-GitHub-groundwork/8335e812-3060-4e9f-89ce-5e576b6cc70a/scratchpad/runs';

type Msg = { role: 'user' | 'assistant'; content: string };

const PEOPLE = [
  { who: 'a founder who types in a hurry, half sentences, no punctuation, mildly impatient', scenario: 'OKR_ALIGNMENT', opening: 'setting objectives and okrs for my team and tracking progress' },
  { who: 'a careful ops manager who gives long precise answers and asks clarifying questions back', scenario: 'NEW_HIRE', opening: 'new person starting next month, want to get the first 90 days right' },
  { who: 'a sceptical engineer who thinks tools like this are surveillance and says so', scenario: 'DRIFT', opening: 'a project that has gone off track and I need to know why' },
  { who: 'a warm but vague team lead who answers with feelings rather than facts', scenario: 'PERFORMANCE_CONCERN', opening: 'someone on my team is not delivering and I have been avoiding it' },
  { who: 'a cofounder in a tense situation who is guarded and gives short answers', scenario: 'COFOUNDER_ALIGNMENT', opening: 'my cofounder and I are not aligned on what we each own' },
  { who: 'an HR lead running a promotion case, organised, brings numbers', scenario: 'RECOGNITION', opening: 'building the case for a promotion for one of my team' },
];

const personaPrompt = (who: string) => `You are a real person using a product called Groundwork for the first time. You are ${who}.

Answer the question you are asked, in character, as a real person types. Never be an assistant, never be helpful about the product, never explain yourself. One to three sentences. Invent concrete specifics - names, numbers, dates - when asked for them, and be evasive or vague when the character would be. If you are asked something you have already answered, say so the way an irritated person would.`;

const measure = (reply: string, theirLast: string) => ({
  words: reply.trim().split(/\s+/).length,
  sentences: sentencesIn(reply).filter((s) => s.trim()).length,
  questions: (reply.match(/\?/g) ?? []).length,
  asking: stillAsking(reply),
  banned: wordsWeDoNotUse(reply, theirLast ? [theirLast] : []),
  restating: theirLast ? opensByRepeatingThem(theirLast, reply) : false,
});

(async () => {
  const ai = new AnthropicService(new ConfigService());
  const rows: any[] = [];
  const transcripts: string[] = [];

  for (const person of PEOPLE) {
    const messages: Msg[] = [{ role: 'user', content: person.opening }];
    const said: string[] = [person.opening];
    let log = `\n\n========== ${person.scenario} :: ${person.who}\nPERSON: ${person.opening}\n`;

    for (let turn = 1; turn <= 8; turn += 1) {
      const res = await fetch(`${API}/entry/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, scenario: person.scenario }),
      }).then((r) => r.json() as any).catch((e) => ({ error: String(e) }));

      const reply: string = res?.data?.reply ?? res?.reply ?? '';
      if (!reply) { log += `\n[no reply: ${JSON.stringify(res).slice(0, 200)}]\n`; break; }

      const m = measure(reply, said[said.length - 1]);
      rows.push({ scenario: person.scenario, turn, ...m });
      log += `\nGROUNDWORK (${m.words}w ${m.sentences}s q=${m.questions}${m.banned.length ? ' BANNED:' + m.banned.join(',') : ''}${m.restating ? ' RESTATING' : ''}): ${reply}\n`;
      messages.push({ role: 'assistant', content: reply });

      if (res?.data?.ready || res?.ready) { log += '\n[setup says it is ready]\n'; break; }

      const answer = await ai.respond(personaPrompt(person.who), [
        ...messages.map((x) => ({ role: x.role === 'user' ? ('user' as const) : ('assistant' as const), content: x.content })),
      ].reverse().slice(0, 1).concat([{ role: 'user' as const, content: reply }])).catch(() => 'not sure');
      const theirs = (answer || 'not sure').trim().slice(0, 400);
      messages.push({ role: 'user', content: theirs });
      said.push(theirs);
      log += `PERSON: ${theirs}\n`;
    }
    transcripts.push(log);
    process.stdout.write(`. ${person.scenario}\n`);
  }

  fs.writeFileSync(`${OUT}/setup-transcripts.txt`, transcripts.join(''));
  fs.writeFileSync(`${OUT}/setup-rows.json`, JSON.stringify(rows, null, 2));
  console.log(`\n${rows.length} replies measured. Transcripts written.`);
})();
