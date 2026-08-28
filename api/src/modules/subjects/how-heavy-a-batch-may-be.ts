/**
 * TWO NUMBERS THAT HAVE TO AGREE, KEPT WHERE BOTH READERS CAN SEE THEM.
 *
 * `MAX_BATCH` said five thousand subjects while Express refused anything over its 100kb default, so
 * a plain three-thousand-row import came back "request entity too large" - a documented cap the
 * server could not honour, found only by sending a big one.
 *
 * THIS FILE IMPORTS NOTHING, and that is the point rather than tidiness. The constant lived in
 * bulk-import.service.ts, and importing it into main.ts pulled an @Injectable and its module graph
 * into the entrypoint before Nest had built anything - which silently broke request body parsing
 * for EVERY route. Logging in stopped working, with a validation error saying the email was empty.
 * A leaf constant has no such reach.
 */

/**
 * THE WEIGHT IS THE REAL LIMIT AND THE COUNT FOLLOWS IT, not the other way round.
 *
 * The body limit applies to EVERY route - the attempt to scope a bigger one to the bulk path alone
 * broke request parsing across the whole API, because a body parser mounted with `app.use` stops
 * Nest registering its own. So the size that is safe on an unauthenticated endpoint is the size
 * everything gets, and the batch count is derived from it rather than asserted independently.
 *
 * Two megabytes is unremarkable for any endpoint here and is the ceiling this file exists to state.
 */
export const MAX_BATCH_BYTES = 2 * 1024 * 1024;

/**
 * A rich subject - a measure, a target, a dozen contributors - runs to about a kilobyte. So this is
 * what MAX_BATCH_BYTES actually holds, not a rounder number somebody would like it to be.
 *
 * It was 5,000, which the server refused at around 1,200. A cap the server will not honour is not a
 * cap; it is a promise made in documentation and broken in production.
 */
export const MAX_BATCH = 2_000;
