/**
 * A ROSTER ROW IS NOT A LIFE SENTENCE.
 *
 * Hafsah, 23 September 2026: "someone is my account and created their own account and keep showing
 * up to my account. And they cannot switch to their."
 *
 * The cause is a deliberate rule doing its job in a case nobody had thought about. Somebody signs up
 * with their own address; at verification the product checks whether that exact address is on
 * anybody's roster, and where it is they are joined to THAT organisation as a member rather than
 * founding an empty one of their own. See they-are-already-on-somebodys-roster: the reasoning is
 * sound and the four rules around it are careful.
 *
 * It is right for an employee whose HR directory listed them. It is wrong for everybody else whose
 * address happens to be on somebody's roster - a respondent, a contact, an external coach, a
 * supplier - who signed up to use Groundwork for their own work. They arrive inside a company they
 * do not work for, as its member, with exactly one membership and therefore nothing to switch to.
 *
 * WHY NOT NARROW THE RULE INSTEAD. The obvious fix is to only join people who came from a real HR
 * roster. `Person.sourceSystem` is the field that would say so, and it is customer-supplied free
 * text: the values in use right now are "hr", "panel", "demo" and an API credential id. Deciding
 * whether somebody is an employee by pattern-matching a string a customer chose would put strangers
 * inside companies, which is the exact failure the four rules exist to prevent. So the rule stays.
 *
 * WHAT CHANGES IS THAT THERE IS A DOOR. Anybody can start their own workspace and switch to it,
 * whatever roster they are on. Nobody is taken out of an organisation and no stranger is put into
 * one: they gain a second membership, of a company they founded, where they are the admin.
 */

/** Their workspace's name, from their own name and never from the address domain. */
export function whatTheirWorkspaceIsCalled(firstName?: string | null, lastName?: string | null): string {
  const first = (firstName ?? '').trim();
  /*
   * The domain is deliberately not used. Naming an organisation after @coamana.com is how the
   * product used to hand somebody a workspace that looked like it belonged to a company - see the
   * note on `register`, where the same land-grab was fixed.
   */
  const who = [first, (lastName ?? '').trim()].filter(Boolean).join(' ').trim();
  return who ? `${first || who}'s workspace` : 'My workspace';
}

