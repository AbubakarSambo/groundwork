/**
 * THE PROMPTS THE EBELE BUILD LEFT UNSEEDED (round 2, E1). Each of these had its words in the code and read a stored version if one existed, but nothing
 * seeded the first one, so a clean install had no row for /prompts to show or an admin to override. Seeded here, once, from the same constants the code uses
 * when no version is stored, so the file and the first stored version cannot differ. The version that is stored and active is the one that runs.
 */
import { HELP_PROMPT, INSTRUCTION_PROMPT, NARRATE_PROMPT, PEOPLE_PROMPT, READ_PROMPT, REPLY_PROMPT, THE_TEAM_PROMPT_KEYS } from '../team-loop/the-team-mind';
import { SHOWS_IT_PROMPT } from '../team-loop/which-document-shows-it';
import { ANSWER_PROMPT, ANSWER_PROMPT_KEY } from '../executive-onboarding/her-answer';
import { THE_DRAFT_REQUEST_PROMPT, THE_DRAFT_REQUEST_PROMPT_KEY } from '../year-end/the-draft-request';
import { YEAR_END_NARRATIVE_PROMPT, YEAR_END_NARRATIVE_PROMPT_KEY } from '../year-end/the-year-end-narrative';
import { READ_THE_RECORD_WHOLE_PROMPT, READ_THE_RECORD_WHOLE_PROMPT_KEY } from '../outstanding/the-record-read-whole';

export const THE_EBELE_PROMPT_SEEDS: { key: string; content: string }[] = [
  { key: THE_TEAM_PROMPT_KEYS.read, content: READ_PROMPT },
  { key: THE_TEAM_PROMPT_KEYS.instruction, content: INSTRUCTION_PROMPT },
  { key: THE_TEAM_PROMPT_KEYS.help, content: HELP_PROMPT },
  { key: THE_TEAM_PROMPT_KEYS.narrate, content: NARRATE_PROMPT },
  { key: THE_TEAM_PROMPT_KEYS.people, content: PEOPLE_PROMPT },
  { key: THE_TEAM_PROMPT_KEYS.reply, content: REPLY_PROMPT },
  { key: THE_TEAM_PROMPT_KEYS.shows, content: SHOWS_IT_PROMPT },
  { key: ANSWER_PROMPT_KEY, content: ANSWER_PROMPT },
  { key: THE_DRAFT_REQUEST_PROMPT_KEY, content: THE_DRAFT_REQUEST_PROMPT },
  { key: YEAR_END_NARRATIVE_PROMPT_KEY, content: YEAR_END_NARRATIVE_PROMPT },
  { key: READ_THE_RECORD_WHOLE_PROMPT_KEY, content: READ_THE_RECORD_WHOLE_PROMPT },
];
