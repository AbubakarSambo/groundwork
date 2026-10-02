/**
 * `CheckIn.closedReason` when the sweep, not the person, ended a session.
 *
 * This file imports nothing, on purpose. The constant used to live in conversation.service.ts, and
 * the prompts module imported it from there; conversation.service imports the prompts module, so
 * the two formed an import loop and Nest could not resolve ConversationService at start-up. The
 * product and the ops system both read the value from here.
 */
export const CLOSED_BY_THE_CLOCK = 'auto_closed';
