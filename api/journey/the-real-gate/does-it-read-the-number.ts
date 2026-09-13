/**
 * DOES THE MODEL ACTUALLY READ THE NUMBER? Run against the real lines from the gate run.
 *
 * The whole suggestion rests on this being a reading a model can do: which line reports the current
 * value of which target, and what the value is. The rule it replaces required every word of the
 * target's name plus a verb from a list of nine, and matched none of these fourteen lines.
 *
 *   npx ts-node -T journey/the-real-gate/does-it-read-the-number.ts
 */
import { GoogleGenAI } from '@google/genai';
import { WHAT_THE_RECORD_SAYS_PROMPT, WHAT_THE_RECORD_SAYS_SCHEMA, theQuestion, onlyWhatIsWorthOffering } from '../../src/modules/board/what-the-record-says-a-number-is';

const TARGETS = [
  { id: 'A', name: 'Teams through onboarding', target: 200, count: 0 },
  { id: 'B', name: 'Teams migrated', target: 40, count: 0 },
];
/*
 * ROUND BY ROUND, WHICH IS HOW IT RUNS. Fed all three at once it read "Teams migrated" as 9 - from
 * round two's "nine of the forty" - because both that and round three's "all forty" were in front
 * of it and it took the first. That is a fault in the test, not the read: this runs when a round
 * closes, so each round sees only its own lines and the suggestion moves 0 -> 9 -> 40 as the work
 * does. Testing it on the whole history was testing something the product never does.
 */
const ROUNDS: string[][] = [
  [
    'We are shipping the onboarding rewrite this quarter',
    'The build is on track for the 14th.',
    'Pricing page draft is done.',
    'I chased finance twice, last Thursday and again on Monday.',
  ],
  [
    'Pricing is live and migration has started, so the plan is holding.',
    'I want to know we will make 200 by the 31st.',
    'Migration started Monday.',
    'Nine of the forty teams are migrated.',
    'Build shipped on the 12th, two days early.',
    'Finance signed off on the 5th, so pricing went live on the 7th as planned.',
  ],
  [
    'We landed it. 200 teams through, and support contact stayed low.',
    'All forty migrated by Friday.',
    'Support had three tickets out of forty.',
    'Launch email went out.',
  ],
];

const clean = (o: any): any => JSON.parse(JSON.stringify(o, (k, v) => (k === 'additionalProperties' ? undefined : v)));

(async () => {
  const ai = new GoogleGenAI({ vertexai: true, project: process.env.GEMINI_PROJECT_ID, location: process.env.GEMINI_LOCATION });
  const t = WHAT_THE_RECORD_SAYS_SCHEMA as any;
  /* The board carries what the last round read, so the count walks forward as the rounds do. */
  const standing = TARGETS.map((x) => ({ ...x }));
  const WANT = [[null, null], [null, 9], [200, 40]] as (number | null)[][];
  for (let i = 0; i < ROUNDS.length; i += 1) {
    const said = ROUNDS[i].map((text) => ({ text, who: null }));
    const res: any = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: theQuestion(standing, said) }] }],
      config: {
        systemInstruction: WHAT_THE_RECORD_SAYS_PROMPT,
        maxOutputTokens: 4096,
        tools: [{ functionDeclarations: [{ name: t.name, description: t.description, parameters: clean(t.input_schema) }] }],
        toolConfig: { functionCallingConfig: { mode: 'ANY' as any, allowedFunctionNames: [t.name] } },
      },
    });
    const call = res.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    const raw = (call?.args?.numbers ?? []) as any[];
    console.log(`  [raw] ${JSON.stringify(raw)}`);
    const worth = onlyWhatIsWorthOffering(raw, standing);
    console.log(`\nROUND ${i + 1} - what the lead is offered:`);
    if (!worth.length) console.log('  (nothing, which is right where nobody reported a number)');
    for (const w of worth) {
      const tg = standing.find((x) => x.id === w.objectiveId)!;
      console.log(`  ${tg.name}: use ${w.count}   ("${w.said}")`);
      /* The lead accepts it, which is what the board's press does. */
      tg.count = w.count;
    }
    const want = WANT[i];
    ['A', 'B'].forEach((id, j) => {
      const tg = standing.find((x) => x.id === id)!;
      const expected = want[j];
      if (expected == null) return;
      console.log(`${tg.count === expected ? 'OK  ' : 'MISS'}  ${tg.name} after round ${i + 1}: wanted ${expected}, board now ${tg.count}`);
    });
  }
})();
