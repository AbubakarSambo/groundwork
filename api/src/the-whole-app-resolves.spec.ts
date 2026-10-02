/**
 * THE WHOLE APPLICATION RESOLVES EVERY DEPENDENCY, OR THE API DOES NOT START.
 *
 * On 2 October 2026 `node dist/main` exited with "Nest can't resolve dependencies of the
 * ConversationService (PrismaService, ?, ...)". A constant had been imported from
 * conversation.service.ts into a file the prompts module loads, and conversation.service imports
 * the prompts module, so the two files formed an import loop. In a loop, one side reads the other
 * before it has finished loading, so the PromptsService class was still undefined when Nest read
 * ConversationService's constructor. Every unit spec passed, because each one builds its service
 * by hand. Only building the whole application finds it.
 *
 * So this spec builds AppModule, the module main.ts starts, and asks Nest to resolve every
 * provider. Nothing connects to a database: compile() resolves and constructs providers but runs
 * no start-up hooks, and Prisma is only reached when a query runs.
 */
import { Test } from '@nestjs/testing';

jest.setTimeout(120_000);

describe('the whole application', () => {
  it('builds, with every dependency of every service resolved', async () => {
    process.env.EMAIL_SENDS_FOR_REAL = 'false';
    process.env.DATABASE_URL ??= 'postgresql://nobody@localhost:5432/never_connected';
    const { AppModule } = await import('./app.module');
    const app = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(app).toBeDefined();
    await app.close();
  });
});
