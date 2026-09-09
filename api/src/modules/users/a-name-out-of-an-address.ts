/**
 * THE PART OF AN ADDRESS THAT IS SOMEBODY'S NAME.
 *
 * Somebody added by email and nothing else has to be called something, and the only thing to hand is
 * the local part. `jane.okafor@` is Jane; `t_bakare@` is T.
 *
 * WHAT THIS EXISTS FOR IS THE PLUS. `anna+chidi@gmail.com` is one real mailbox addressed twice, and
 * it is how anybody tests a product where the whole point is several people answering separately -
 * one inbox, as many participants as you like. Sign-up already handled it: `auth.service` turns the
 * separators into spaces and takes the first word, so that person is Anna. The invite path did not,
 * and put "Anna+chidi" on the roster, in the report, and in every sentence the check-in wrote about
 * them.
 *
 * Not only a testing concern - plus-addressing is ordinary mail routing and people use it at work -
 * but testing is where it shows up twenty times in an afternoon.
 *
 * SAME RULE AS SIGN-UP, DELIBERATELY. Two places deriving a name from an address by different rules
 * is how the same person ends up with two names depending on which door they came through.
 */
export function aNameOutOfAnAddress(email: string): string {
  const local = (email.split('@')[0] ?? '').replace(/[._\-+]/g, ' ').trim();
  const first = local.split(/\s+/)[0] ?? '';
  if (!first) return 'there';
  return (first.charAt(0).toUpperCase() + first.slice(1)).slice(0, 40);
}
