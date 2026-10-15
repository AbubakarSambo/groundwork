/**
 * THE CHECK-IN AN EMAIL IS ABOUT, read for the lines the email adds.
 *
 * The table is still called `ground` in the database and in the code, which is the standing rule, so the read lives
 * here and not in email.service.ts, where every line is held to the rule that copy somebody reads says "check-in".
 * Optional all the way down: a test double with no such table, or a row that is gone, gives nothing and the email
 * simply leaves the line out.
 */
export async function theCheckInForAnEmail(prisma: unknown, id: string, select: Record<string, unknown>): Promise<any> {
  return (prisma as any).ground?.findUnique?.({ where: { id }, select });
}
