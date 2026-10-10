/*
 * A MODEL INSTRUCTION, AND NOTHING ELSE. Moved here word for word from pattern-library.ts on
 * 1 October 2026, so that the copy guard (client/src/lib/copy-does-not-sound-like-yoda.spec.ts) can
 * leave it alone the way it leaves prompt-library.ts alone: every line below is read by the pattern
 * detector and by nobody else. The prompt the detector is given is unchanged by the move.
 */
/**
 * WHAT COUNTS AND WHAT DOES NOT, for the codes that came and went most when the same check-in was
 * read fourteen times (30 September 2026, decisions 55 and 68). It is read by the detector only, in
 * PATTERN_DETECTION_PROMPT, after the code's signal. The signal itself, the name, the family, the
 * three-period rule and who reads the code are all unchanged, and no code is removed or merged.
 * The ones that can only be judged across time say so and point at the person's own earlier record.
 */
export const WHAT_COUNTS_BY_CODE: Record<string, string> = {
  B11: 'Counts when failures or delays are put down to other people or outside causes, and the person names nothing within their own control, in this check-in and in the earlier record. One outside cause named fairly, or a cause named alongside their own part, does not count.',
  E2: 'Counts when a promise about the future is made again that the earlier record shows was promised before and not done. A first promise, or one that was kept, does not count.',
  K3: 'Counts when the same problem has been raised before and is still not fixed. The earlier record shows that, or this period\'s check-in says it has been raised before or is still open. A problem raised for the first time does not count, and neither does one that was raised and then fixed.',
  K5: 'Counts when the work is described as tasks and the person does not say what goal or result they serve, even when it would be easy to. It does not count when they say what the work is for.',
  F2: 'Counts when the person describes direction-setting with confidence and the record also shows, in their own words or the team\'s, that the team works to its own priorities or shows no trace of it. Confident direction-setting alone does not count.',
  B9: 'Counts when the record shows team members working on different priorities from each other or from the leader, including when the person says so. A leader only saying the team is busy does not count.',
  K2: 'Counts when spend or cost is reported and left unchallenged, and the earlier record or this check-in shows it has been reported before with no intervention. Tracking a cost once, or challenging it, does not count.',
  C1: 'Counts when the record names something that was unclear for others and is now clear because of this person, and says what changed. Being clear about their own work, or explaining something once, does not count.',
  B5: 'Counts when there is a lot of communication or coordination and the record shows the same blockers still standing afterwards. A lot of messages alone does not count, and neither does a blocker that was cleared.',
  B2: 'Counts when confident reporting sits beside what was promised still not delivered, and the earlier record or this check-in shows it has happened in more than one period. One period of confident talk, or one missed deliverable, does not count.',
  B6: 'Counts when research, comparing or options are still open, and the earlier record or this check-in shows no decision has come from them across more than one period. Research that ended in a decision does not count.',
  K4: 'Counts when nearly all of this period\'s work is inbox, admin and small tasks, and the person names nothing that moved what they are measured on. One busy stretch, or a period that still moved a main goal, does not count.',
  D4: 'Counts when planning and discussion are described across more than one period and nothing has been produced from them that can be pointed to. It does not count when they can point to a plan, document or output.',
  A2: 'Counts when the person stepped in to fix a failure that should have been caught earlier by someone or something else. Ordinary help, or fixing their own work, does not count.',
  R2: 'Counts when others are named as coming back to ask, or as confused, because of this person\'s work or messages. The person being unclear about their own plans, with nobody affected, does not count.',
  B1: 'Counts when upbeat reporting upward sits beside a different picture from the team or the record. Good news that the record backs up does not count.',
  D6: 'Counts when the person says that only they, or only one named person, can run, explain or fix something, or that nobody else could step in. Owning a task, or being busy, does not count, and neither does a handover they describe as working.',
  K1: 'Counts when the person describes decks, proposals or sales material and names no decision-maker with the power to say yes. It does not count when a named decision-maker has been spoken to, whatever else was made.',
  D3: 'Counts when the person describes a goal, target or measure of done that differs from the one they stated earlier, and does not say that it changed. A change they name and explain does not count, and neither does the first time a goal is stated.',
  F1: 'Counts when the person talks mostly about ideas, thinking and plans, and names nothing that now exists because of them. It does not count when they name something produced.',
  A1: 'Counts when the person says they did the coordinating, chasing or joining-up that other people were meant to do. Coordinating their own work does not count.',
  D1: 'Counts when the person says something is finished and, in this check-in or the earlier record, somebody else says it does not work for them. A completion nobody has contradicted does not count.',
  M1: 'Counts when the person names a specific output that was delivered. It needs a goal they stated and something anybody could check, such as a number, a date or a document. General progress does not count.',
};
