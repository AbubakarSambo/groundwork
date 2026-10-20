/**
 * THE SCREEN IS TOLD THE DIRECT MORNING (Hafsah, 20 October 2026; the-direct-morning-switch.ts).
 *
 * The screens a lead or a team member reads (the board, My work, the weekly report, You, Today, People and setup, References and
 * resources) do not all hold the check-in, so they cannot read `directMorningOn` off `GET /grounds/:id`. Each payload carries one
 * yes or no instead, `directMorning`, read once per request through the switch reader and said beside what the screen already reads.
 *
 * It says nothing else, and it decides nothing about who may read what: the payload is the same payload, with one more field.
 * A payload that is not an object (a refusal, null) is passed on as it is.
 */
export function withTheDirectMorningSaid<T>(served: T, on: boolean): T {
  if (!served || typeof served !== 'object' || Array.isArray(served)) return served;
  return { ...(served as any), directMorning: on === true } as T;
}
