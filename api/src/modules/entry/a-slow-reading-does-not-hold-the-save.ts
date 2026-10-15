/**
 * A SLOW READING OF WHAT THE LEAD SAID MUST NOT HOLD THE SAVE (known issue B4; screens request 174 item 2).
 *
 * Saving a check-in reads the setup conversation for its aims and targets with a model, after the people are on it, and the save
 * waited for the whole reading. A model that is slow (20 to 50 seconds on a local run) kept the page on "Saving..." past the point
 * where the screen gave up and opened the check-in a second time, which is how a lead came to read three opening questions and a
 * check-in with none of her set-up on it. The reading is still started at the same moment and still writes the same rows; the save now
 * waits for it for up to twenty seconds (it used to wait for as long as the model took, and every other step of the save is quick), and answers either way. A reading that has not finished by then finishes in the background.
 */
export const HOW_LONG_THE_SAVE_WAITS_FOR_THE_READING_MS = 20_000;

/** Waits for the work, or for the time to pass, whichever comes first. Never throws, and never stops the work. */
export async function waitNoLongerThan(work: Promise<unknown>, ms: number): Promise<{ finished: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeUp = new Promise<{ finished: boolean }>((resolve) => { timer = setTimeout(() => resolve({ finished: false }), ms); });
  const done = work.then(() => ({ finished: true }), () => ({ finished: true }));
  try { return await Promise.race([done, timeUp]); } finally { if (timer) clearTimeout(timer); }
}
