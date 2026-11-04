/**
 * Is the MODEL returning nothing, or is the FILTER discarding it?
 *
 * Abubakar's session-1 transcript is specific and checkable - 22 tickets in three
 * weeks, nothing past its date, an explicit statement that nobody has told him he
 * owns a client. The engine praised it in conversation. Extraction still produced
 * zero record entries on the live run, and re-running it on the identical
 * transcript gave 1 entry, then 0, then 0.
 *
 * This prints what the model returns BEFORE any filtering, alongside what the
 * filter would keep, so the fix lands in the right place.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../src/app.module';
import { AnthropicService } from '../../src/modules/conversation/anthropic.service';
import { PrismaService } from '../../src/modules/prisma/prisma.service';
import { RECORD_EXTRACTION_PROMPT } from '../../src/modules/conversation/prompt-library';

const SCHEMA = {
  name: 'emit_record_entries',
  description: 'Emit the durable record entries from this session.',
  input_schema: {
    type: 'object' as const,
    properties: {
      entries: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            text: { type: 'string' },
            verifiability: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
          },
          required: ['type', 'text'],
        },
      },
    },
    required: ['entries'],
  },
};

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const anthropic = app.get(AnthropicService);

  const p = await prisma.groundParticipant.findFirst({ where: { email: 'abubakar@meridian.test' } });
  const ci = await prisma.checkIn.findFirst({ where: { participantId: p!.id, sessionNumber: 1 } });
  const turns = await prisma.conversationTurn.findMany({ where: { checkInId: ci!.id }, orderBy: { createdAt: 'asc' } });
  const transcript = turns.map((t: any) => `${t.role === 'AI' ? 'GROUNDWORK' : 'PERSON'}: ${t.content}`).join('\n');

  for (let i = 1; i <= 3; i++) {
    const res = await anthropic.extract<{ entries: any[] }>(
      RECORD_EXTRACTION_PROMPT, [{ role: 'user', content: transcript }], SCHEMA as any,
    );
    const raw = res?.entries ?? [];
    console.log(`\n--- RAW MODEL OUTPUT, attempt ${i}: ${raw.length} entries`);
    for (const e of raw) console.log(`   [${e.type}] (${e.verifiability}) ${String(e.text).slice(0, 110)}`);
  }
  await app.close(); process.exit(0);
}
main();
