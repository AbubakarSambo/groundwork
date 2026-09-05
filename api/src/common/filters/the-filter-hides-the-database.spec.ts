/**
 * The mapping is only worth anything if the filter uses it. Asserted through
 * the filter, on the real message, because the defect was in the wiring between
 * the two — the mapping did not exist and the filter had nothing to call.
 */
import { GlobalExceptionFilter } from './http-exception.filter';

const THE_REAL_MESSAGE = `Invalid \`this.prisma.opsRoadmapItem.create()\` invocation in
/Users/hafsahjumare/Documents/GitHub/groundwork/api/src/modules/ops/ops-build.service.ts:39:39
  proposedById: "74fdfefe-ef7a-4811-957b-c64a583927ee",
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
  const prisma = new Error(THE_REAL_MESSAGE);
  prisma.name = 'PrismaClientValidationError';
  const { status, body } = throwAtTheFilter(prisma);

  it('comes back as a 400, not a 500', () => {
    expect(status).toBe(400);
  });

  it('says which field was missing', () => {
    expect(body.message).toBe('itemType is required and was not sent.');
  });

  it('and the body carries no path, no id and no table name', () => {
    const whole = JSON.stringify(body);
    expect(whole).not.toMatch(/\/Users\//);
    expect(whole).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(whole).not.toMatch(/opsRoadmapItem/);
  });
});

describe('an ordinary failure reaching the filter', () => {
  it('is untouched, so nothing else about the filter changed', () => {
    const { status, body } = throwAtTheFilter(new Error('something ordinary broke'));
    expect(status).toBe(500);
    expect(body.message).toBe('something ordinary broke');
  });
});
