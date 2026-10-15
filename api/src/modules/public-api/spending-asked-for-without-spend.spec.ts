import { looksLikeARequest } from './a-whatsapp-message-is-routed';

/** Spending asked for in the person's own words, without the verb "spend"; and telling, which stays in the check-in. */
describe('a spending request said without "spend"', () => {
  it.each([
    'I need 15,000 shillings approved for fuel for the van this week.',
    'I need KES 15,000 for fuel for the van.',
    'I need 15k for the van service.',
    'Can I get 20,000 naira for transport to Kano?',
    'Can we have $300 for the trade fair stand?',
    'Please approve KES 8,000 for the printer toner.',
    'Requesting 12,000 shillings for airtime for the field team.',
    'Can you approve the 50k for the new tyres?',
  ])('"%s" is offered as a spending request', (t) => expect(looksLikeARequest(t)).toBe('spending'));

  it.each([
    'I spent 12,000 on fuel.',
    'We closed 15,000 shillings of orders this week.',
    'I need Wairimu to sign off the discount for Fresh Basket before the 15th.',
    'Fuel cost us 15,000 shillings last week.',
    'The client paid KES 40,000 for the order.',
    'I need two more days for the report.',
  ])('"%s" stays in the check-in', (t) => expect(looksLikeARequest(t)).toBeNull());
});
