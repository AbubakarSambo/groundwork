import { HttpStatus } from '@nestjs/common';

/**
 * WHAT TO SAY WHEN THE DATABASE REFUSES, WITHOUT SAYING WHAT PRISMA SAID.
 *
 * Prisma's own message is a debugging artefact. For a validation failure it
 * carries the file path on our server, the line number, the model, every field
 * with its value, and any internal id that happened to be in the arguments —
 * and the global filter used to pass it into the response body untouched.
 *
 * Found by posting a roadmap item without `itemType` and reading back
 * `/Users/.../ops-build.service.ts:39:39` and a person's UUID.
 *
 * Kept apart from the filter so the mapping can be read and tested as the small
 * table it is. Returns null for anything that is not a database error, so the
 * filter's existing behaviour is untouched for everything else.
 */
export function whatToSayAboutADatabaseError(
  error: Error,
  /** The developer API names the field in its own vocabulary; the screens' routes never do. */
  forADeveloper = false,
): { status: number; message: string } | null {
  const name = error.name ?? '';
  const message = error.message ?? '';

  /*
   * Matched on the name, not on `instanceof`. The Prisma error classes live on
   * the generated client, and importing them here would tie the product's
   * exception handling to a generated artefact for no gain — the names are part
   * of Prisma's public surface and are what appear in logs.
   */
  const isPrisma = name.startsWith('PrismaClient');
  if (!isPrisma) return null;

  /* The database cannot be reached, or took too long (B-151): ours, not the caller's, and temporary. Said as that, not as "the database refused that request". */
  const code0 = (error as { code?: string }).code;
  if (name === 'PrismaClientInitializationError' || (name === 'PrismaClientKnownRequestError' && ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(code0 ?? ''))) {
    return { status: HttpStatus.SERVICE_UNAVAILABLE, message: 'Groundwork cannot reach its records for a moment. Nothing was changed. Please try again in a minute.' };
  }

  if (name === 'PrismaClientValidationError') {
    /*
     * The one useful fact in the whole message is which argument was missing,
     * and it is the only part safe to repeat: a field name is the caller's own
     * vocabulary, not ours.
     */
    const missing = message.match(/Argument `(\w+)` is missing/)?.[1];
    return {
      status: HttpStatus.BAD_REQUEST,
      message: forADeveloper
        ? missing
          ? `${missing} is required and was not sent.`
          : 'Something in that request was the wrong shape. Check the fields you sent against the API docs.'
        : 'Part of what is needed was left out, so check what you filled in and try again.',
    };
  }

  if (name === 'PrismaClientKnownRequestError') {
    const code = (error as { code?: string }).code;

    /* Unique constraint. A conflict, not a server fault — the caller can fix it. */
    if (code === 'P2002') {
      return {
        status: HttpStatus.CONFLICT,
        message: forADeveloper ? 'Something with that name or key already exists.' : 'That is already taken, so choose a different one.',
      };
    }
    /* Record not found for an update or delete. */
    if (code === 'P2025') {
      return {
        status: HttpStatus.NOT_FOUND,
        message: forADeveloper ? 'That record does not exist, or no longer does.' : 'That is not there any more, so refresh the page and look again.',
      };
    }
    /* Foreign key: pointed at something that is not there. */
    if (code === 'P2003') {
      return {
        status: HttpStatus.BAD_REQUEST,
        message: forADeveloper ? 'That request points at a record that does not exist.' : 'Part of what you chose is not there any more, so refresh the page and choose again.',
      };
    }
    return {
      status: HttpStatus.BAD_REQUEST,
      message: forADeveloper ? 'The database refused that request.' : 'That could not be saved, so check what you typed and try again.',
    };
  }

  /*
   * Anything else Prisma throws — a lost connection, a timeout, a panic — is
   * ours, not the caller's. It stays a 500 and says nothing about itself.
   */
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Something went wrong on my side. Nothing was changed, so please try again in a minute.',
  };
}
