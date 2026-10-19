import { thePromisesSaidDone, theAnswersIn } from '../conversation/a-promise-said-done-is-kept';

/**
 * JOSEPH'S "YOUR WEEK", THURSDAY 15 OCTOBER (Drop Access, messages test, fourth run), from the run's own record. It said:
 *   "On Monday 12 October, in "Sales team, Q4", you said "Follow up on Mama Pima"."
 *   "Mercy Wairimu says the work is waiting for "the sample units he promised" from you in "Sales team, Q4". That is what Mercy Wairimu
 *    said, and you have not said it yourself."
 * On Wednesday he said "I wish I had remembered the samples for Mercy. I've had them ready since Monday.", and, asked about Mama Pima,
 * "Wanjiru said to call her next week. It's still pending."
 */
const at = (s: string) => new Date(s);
const t = (role: 'AI' | 'PERSON', content: string, createdAt: string) => ({ role, content, createdAt: at(createdAt) });

describe('"Follow up on Mama Pima"', () => {
  const promise = { id: 'joseph-follow-up-mama-pima', participantId: 'gp-joseph', owedToParticipantId: null, text: "I'll follow up on Mama Pima.", createdAt: at('2026-10-12T11:09:30.000Z') };
  const people: Record<string, string[]> = { 'gp-joseph': ['Joseph', 'Kariuki'], 'gp-grace': ['Grace', 'Achieng'] };
  const monday = { id: 'c-joseph-1', participantId: 'gp-joseph', turns: [
    t('AI', 'Grace set a target for you of 40 units by 30 October; how do you plan to achieve those 40 units?', '2026-10-12T11:07:10.000Z'),
    t('PERSON', "I'll follow up on Mama Pima. I also have a new lead from Juja Hardware.", '2026-10-12T11:07:11.000Z'),
  ] };
  const wednesday = (said: string) => ({ id: 'c-joseph-2', participantId: 'gp-joseph', turns: [
    t('AI', 'You have two deals in progress, and one of them is Juja Hardware. Last time you mentioned you would follow up on Mama Pima. What is the stage of that deal right now?', '2026-10-14T11:08:40.000Z'),
    t('PERSON', said, '2026-10-14T11:08:41.000Z'),
  ] });
  const kept = (said: string) => thePromisesSaidDone([promise], [], [], (id) => people[id] ?? [], Object.keys(people), theAnswersIn([monday, wednesday(said)])).map((k) => k.id);
  it('is kept by "Wanjiru said to call her next week. It\'s still pending."', () => {
    expect(kept("Wanjiru said to call her next week. It's still pending.")).toEqual(['joseph-follow-up-mama-pima']);
  });
  it('is not kept by "I haven\'t called her yet." or "She hasn\'t answered."', () => {
    expect(kept("I haven't called her yet.")).toEqual([]);
    expect(kept("She hasn't answered my calls.")).toEqual([]);
  });
});
