/**
 * THE WEBHOOK ANSWERS 200 AT ONCE, AND THE WORK IS DONE AFTER (user journeys, F-25).
 *
 * One message ("Hi") took 65 seconds to be answered, because the reply waited on the model. Meta gives a webhook a few seconds and sends a message again
 * when it is not answered in time, so a slow answer meant the same message arriving again and again. The signature has been checked and the message is
 * known to be Meta's by the time this is called; the work then runs on its own. A message that comes again is not done twice, because the handler claims
 * each message id once (firstTimeWeSeeThis), and a failure after the 200 is told to the person by the same handler as before, never by the webhook.
 *
 * In the test suites the work is waited for, so the specs that read what a person was sent keep working; GW_WEBHOOK_ANSWERS_FIRST turns that off.
 */
const running = new Set<Promise<unknown>>();

export function answerFirst(work: () => Promise<unknown>, onError: (err: any) => void): Promise<void> {
  const job = Promise.resolve().then(work).catch(onError);
  running.add(job);
  void job.finally(() => running.delete(job));
  const waits = process.env.NODE_ENV === 'test' && !process.env.GW_WEBHOOK_ANSWERS_FIRST;
  return waits ? job.then(() => undefined) : Promise.resolve();
}

/** For a test or a shutdown: resolves when everything started by `answerFirst` has finished. */
export async function whenTheWebhookWorkIsDone(): Promise<void> {
  while (running.size) await Promise.allSettled([...running]);
}
