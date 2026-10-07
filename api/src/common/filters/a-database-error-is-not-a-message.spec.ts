/**
 * THE RESPONSE BODY CARRIED A FILE PATH ON OUR SERVER.
 *
 * Posting a roadmap item without `itemType` returned Prisma's own message
 * straight to the caller — the whole invocation: a path on our own server with
 * the line number, the model, every field with its value, and a person's UUID.
 * As a 500, so it also read as our fault rather than a missing field.
 *
 * Found by driving the ops system to seed sample data, not by reading it.
 */
import { HttpStatus } from '@nestjs/common';
import { whatToSayAboutADatabaseError } from './a-database-error-is-not-a-message';

/**
 * THE SHAPE OF A REAL ONE, WITH NOTHING REAL IN IT.
 *
 * The first version of this fixture was the actual message, pasted verbatim —
 * a real home directory, a real internal id, the real model name. In a public
 * repository, in a file whose whole subject is not publishing those. The test
 * is exactly as strong against a synthetic path and a synthetic id, because
 * what it asserts is the SHAPE being stripped, not the particular values.
 */
const THE_SHAPE_OF_A_REAL_ONE = `
Invalid \`this.prisma.exampleRecord.create()\` invocation in
/srv/example/api/src/modules/example/example.service.ts:39:39

  39 return this.prisma.exampleRecord.create({
       data: {
         title: "Cross-team roll-up",
         proposedById: "11111111-2222-3333-4444-555555555555",
     +   itemType: String
       }
     })

Argument \`itemType\` is missing.
`;

const prismaError = (name: string, message: string, code?: string) => {
  const e = new Error(message);
  e.name = name;
  if (code) (e as { code?: string }).code = code;
  return e;
};

describe('a missing field', () => {
  const answer = whatToSayAboutADatabaseError(
    prismaError('PrismaClientValidationError', THE_SHAPE_OF_A_REAL_ONE),
  )!;

  it('is a 400, because the caller sent the wrong thing', () => {
    expect(answer.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('names the field, which is the one useful fact in the whole message', () => {
    expect(answer.message).toBe('itemType is required and was not sent.');
  });

  it('leaks no path from our server', () => {
    expect(answer.message).not.toMatch(/\/Users\//);
    expect(answer.message).not.toMatch(/\.ts:/);
  });

  it('leaks no internal id', () => {
    expect(answer.message).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it('leaks no table or column beyond the field the caller named', () => {
    expect(answer.message).not.toMatch(/prisma|exampleRecord|invocation/i);
  });

  it('and still says something when the field cannot be picked out', () => {
    const vague = whatToSayAboutADatabaseError(
      prismaError('PrismaClientValidationError', 'Something is off somewhere'),
    )!;
    expect(vague.status).toBe(HttpStatus.BAD_REQUEST);
    expect(vague.message).toMatch(/wrong shape/);
  });
});

describe('the constraints', () => {
  const known = (code: string) =>
    whatToSayAboutADatabaseError(prismaError('PrismaClientKnownRequestError', 'x', code))!;

  it('treats a duplicate as a conflict the caller can fix', () => {
    expect(known('P2002')).toEqual({
      status: HttpStatus.CONFLICT,
      message: 'Something with that name or key already exists.',
    });
  });

  it('treats a missing record as a 404', () => {
    expect(known('P2025').status).toBe(HttpStatus.NOT_FOUND);
  });

  it('treats a dangling reference as a 400', () => {
    expect(known('P2003').status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('and an unrecognised code as a 400 that says nothing about itself', () => {
    const other = known('P2099');
    expect(other.status).toBe(HttpStatus.BAD_REQUEST);
    expect(other.message).toBe('The database refused that request.');
  });
});

describe('everything else Prisma throws', () => {
  it('stays ours, and says nothing about itself', () => {
    /* A lost connection or a panic is not the caller's problem to read about. */
    const answer = whatToSayAboutADatabaseError(
      prismaError('PrismaClientInitializationError', 'Cannot reach database at 10.0.0.4:5432'),
    )!;
    /* B-151: an unreachable database is a temporary 503, said as a moment to wait. */
    expect(answer.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(answer.message).not.toMatch(/10\.0\.0\.4/);
    expect(answer.message).toMatch(/Nothing was changed/);
  });
});

describe('anything that is not a database error', () => {
  it('is left completely alone, so nothing else changes', () => {
    expect(whatToSayAboutADatabaseError(new Error('a normal failure'))).toBeNull();
    const named = new Error('x');
    named.name = 'TypeError';
    expect(whatToSayAboutADatabaseError(named)).toBeNull();
  });
});
