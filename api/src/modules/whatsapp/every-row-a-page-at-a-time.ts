/**
 * EVERY ROW A SWEEP IS MEANT TO CONSIDER, A PAGE AT A TIME.
 *
 * The WhatsApp sweeps (the morning reminders, the reminder an hour before a session opens, and the
 * lead's daily summary) each read "take 500", "take 200" or "take 2000" rows with no order and went on
 * from there. Once more rows than that were waiting, the same first few hundred were read every day, in
 * whatever order the database happened to return them, and the rest were never reminded: no error, no
 * log line, and a morning that looked like it had run. Found by driving the journeys against a database
 * with 1,300 check-ins waiting, where three people who should have had a reminder had none.
 *
 * `find` is given a page to read, ordered by id so the pages do not overlap, and returns its rows.
 */
export async function everyRowAPageAtATime<T extends { id: string }>(
  find: (page: { take: number; skip?: number; cursor?: { id: string }; orderBy: { id: 'asc' } }) => Promise<T[]>,
  size = 500,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const rows = await find({ take: size, orderBy: { id: 'asc' }, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
    all.push(...rows);
    if (rows.length < size) return all;
    cursor = rows[rows.length - 1].id;
  }
}
