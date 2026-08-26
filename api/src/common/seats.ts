/**
 * WHAT COUNTS AS A PERSON ON AN ACCOUNT. ONE DEFINITION, USED EVERYWHERE.
 *
 * Every plan is priced by team size ("Up to 20 people"), so this number decides whether somebody
 * can be invited and it is printed on the billing page they read afterwards. Those were two
 * different queries:
 *
 *   the gate      billing.service.ts  `_count: { select: { users: true } }`   every User row
 *   the display   billing.service.ts  `user.count({ isActive: true })`        active rows only
 *
 * Each was defensible alone. Together, an organisation with two deactivated members was refused an
 * invitation it had room for by its own billing page - a support ticket nobody can resolve, because
 * both screens are telling the truth about different questions.
 *
 * A seat is a person who can currently use the product. Deactivated and soft-deleted people are
 * not billed for and do not hold a seat. Anything that asks a DIFFERENT question must not use this:
 *
 *   - the team list total (users.service.ts) counts `deletedAt: null` INCLUDING deactivated people,
 *     because the list renders them with an "inactive" flag and the total has to match the rows.
 *   - the org-delete predicate (unverified-sweep.ts) counts every row including deleted ones,
 *     because destroying an org destroys a deactivated person's data too.
 */
export const SEAT_WHERE = { isActive: true, deletedAt: null } as const;

/** The same predicate as a filtered relation count, for queries that read many organisations. */
export const SEAT_RELATION_COUNT = { users: { where: SEAT_WHERE } } as const;
