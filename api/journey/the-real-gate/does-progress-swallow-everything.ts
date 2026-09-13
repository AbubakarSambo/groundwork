/**
 * DOES THE NEW TYPE SWALLOW EVERYTHING? Run on the real lines from the gate run.
 *
 * Adding PROGRESS made 39 of 42 entries PROGRESS on the first run with it - no worries, no asks, no
 * commitments at all. "I cannot put it live because finance have not signed off" came back as
 * progress. A new category with a wide definition takes everything, and the definition said "a
 * thing that has HAPPENED", which almost every sentence is.
 *
 *   npx ts-node -T journey/the-real-gate/does-progress-swallow-everything.ts
 */
import { GoogleGenAI } from '@google/genai';
import { RECORD_EXTRACTION_PROMPT } from '../../src/modules/conversation/prompt-library';
import { RecordEntryType } from '@prisma/client';

/** One person's round, as they actually said it, with what each line should come back as. */
const TRANSCRIPT = `PERSON: Pricing page draft is done. I cannot put it live because finance have not signed off the price points.
PERSON: I chased finance twice, last Thursday and again on Monday.
PERSON: The build is on track for the 14th.
PERSON: All forty migrated by Friday. Support had three tickets out of forty.
PERSON: We are at 180 teams through onboarding.
PERSON: I will chase it on Monday.
PERSON: Nobody else is waiting on me as far as I know.`;

const SHOULD_BE_PROGRESS = ['forty migrated', '180 teams'];
const SHOULD_NOT_BE_PROGRESS = ['cannot put it live', 'chased finance', 'on track for the 14th', 'waiting on me'];

const clean = (o: any): any => JSON.parse(JSON.stringify(o, (k, v) => (k === 'additionalProperties' ? undefined : v)));

(async () => {
  const ai = new GoogleGenAI({ vertexai: true, project: process.env.GEMINI_PROJECT_ID, location: process.env.GEMINI_LOCATION });
  const tool = {
    name: 'emit_record_entries',
    description: "Emit the structured record entries extracted from this party's transcript.",
    parameters: clean({
      type: 'object',
      properties: {
        entries: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: Object.values(RecordEntryType), description: 'The kind of entry.' },
              text: { type: 'string', description: "The entry in the person's own words." },
              verifiability: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'], description: 'How verifiable.' },
            },
            required: ['type', 'text', 'verifiability'],
          },
        },
      },
      required: ['entries'],
    }),
  };
  const res: any = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: TRANSCRIPT }] }],
    config: {
      systemInstruction: RECORD_EXTRACTION_PROMPT,
      maxOutputTokens: 8192,
      tools: [{ functionDeclarations: [tool] }],
      toolConfig: { functionCallingConfig: { mode: 'ANY' as any, allowedFunctionNames: [tool.name] } },
    },
  });
  const call = res.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
  const entries = (call?.args?.entries ?? []) as { type: string; text: string }[];

  const byType = entries.reduce((m: Record<string, number>, e) => ({ ...m, [e.type]: (m[e.type] ?? 0) + 1 }), {});
  console.log('what came back:');
  for (const e of entries) console.log(`  ${e.type.padEnd(20)} ${e.text.slice(0, 72)}`);
  console.log('\ncounts:', JSON.stringify(byType));

  const progress = entries.filter((e) => e.type === 'PROGRESS');
  console.log('');
  for (const want of SHOULD_BE_PROGRESS) {
    const ok = progress.some((e) => e.text.toLowerCase().includes(want));
    console.log(`${ok ? 'OK  ' : 'MISS'}  "${want}" should be PROGRESS`);
  }
  for (const nope of SHOULD_NOT_BE_PROGRESS) {
    const bad = progress.some((e) => e.text.toLowerCase().includes(nope));
    console.log(`${bad ? 'MISS' : 'OK  '}  "${nope}" should NOT be PROGRESS`);
  }
  const share = entries.length ? progress.length / entries.length : 0;
  console.log(`\nPROGRESS is ${(share * 100).toFixed(0)}% of entries (it was 93% before this).`);
})();
