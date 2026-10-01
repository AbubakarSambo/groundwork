/**
 * RUN INDEPENDENT JOBS AT ONCE, NOT ONE AFTER THE OTHER, WITH A CAP (week 25).
 *
 * For nine people the report took five to six minutes after the last check-in, most of it one model
 * call waiting for the one before it when neither needed the other. This runs the jobs that do not
 * need each other together, at most `cap` at a time so the model's rate limit is not hit (decision
 * 44 was about exactly that), and hands the results back in the order the items were given, so what
 * is kept and served is the same as when they ran one by one.
 *
 * Only for jobs that are each given what they were always given. A job that needs another's result
 * does not belong here.
 */
export async function runAtOnce<T, R>(items: readonly T[], cap: number, job: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const at = next++;
      out[at] = await job(items[at], at);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(cap, items.length)) }, worker));
  return out;
}

/** How many readers are warmed together. Four keeps the model's rate limit out of reach on nine people. */
export const READERS_WARMED_TOGETHER = 4;
