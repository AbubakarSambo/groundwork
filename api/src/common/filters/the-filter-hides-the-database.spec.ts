/**
 * Synthetic path and id, never the real ones — see the note on the fixture in
 * `a-database-error-is-not-a-message.spec.ts`. What is asserted is the shape
 * being stripped, not the particular values.
 *
 * The mapping is only worth anything if the filter uses it. Asserted through
 * the filter, on the real message, because the defect was in the wiring between
 * the two — the mapping did not exist and the filter had nothing to call.
 */
import { GlobalExceptionFilter } from './http-exception.filter';

const THE_SHAPE_OF_A_REAL_ONE = `Invalid \`this.prisma.exampleRecord.create()\` invocation in
/srv/example/api/src/modules/example/example.service.ts:39:39
  proposedById: "11111111-2222-3333-4444-555555555555",
Argument \`itemType\` is missing.`;

function throwAtTheFilter(error: Error) {
  let body: Record<string, unknown> = {};
  let status = 0;
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({
        status: (s: number) => {
          status = s;
          return { json: (b: Record<string, unknown>) => (body = b) };
        },
      }),
      getRequest: () => ({ url: '/api/v1/ops/roadmap' }),
    }),
  } as never;
  new GlobalExceptionFilter().catch(error, host);
  return { status, body };
}

describe('a Prisma failure reaching the filter', () => {
  const prisma = new Error(THE_SHAPE_OF_A_REAL_ONE);
  prisma.name = 'PrismaClientValidationError';
  const { status, body } = throwAtTheFilter(prisma);

  it('comes back as a 400, not a 500', () => {
    expect(status).toBe(400);
  });

  it('says which field was missing', () => {
    expect(body.message).toBe('Part of what is needed was left out, so check what you filled in and try again.');
  });

  it('and the body carries no path, no id and no table name', () => {
    const whole = JSON.stringify(body);
    expect(whole).not.toMatch(/\/Users\//);
    expect(whole).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(whole).not.toMatch(/exampleRecord/);
  });
});

describe('an ordinary failure reaching the filter', () => {
  it('is a server error, and the person reads one plain sentence, never the crash\'s own words', () => {
    const { status, body } = throwAtTheFilter(new Error('something ordinary broke'));
    expect(status).toBe(500);
    expect(body.message).toBe('Something went wrong on my side. Please try again in a minute, and if it happens again, tell me.');
  });
});
