import { withoutBankDetails, passesTheCardCheck, passesTheIbanCheck, HIDDEN } from './bank-details-are-never-kept';

/**
 * "Bank account details, Page 4, Never kept, in any document." The prototype's upload screen, and
 * Hafsah on 27 September 2026: "before any document is stored or sent to the model, hide account
 * numbers, card numbers and similar." These are the cases, and the ordinary figures that must come
 * through untouched.
 */
describe('bank details are never kept', () => {
  describe('what is hidden', () => {
    it('a labelled account number, however it is labelled', () => {
      expect(withoutBankDetails('Account number: 0123456789')).toBe(`Account number: ${HIDDEN.account}`);
      expect(withoutBankDetails('Acct No. 0123456789')).toBe(`Acct No. ${HIDDEN.account}`);
      expect(withoutBankDetails('A/C: 2034 5678 91')).toBe(`A/C: ${HIDDEN.account}`);
      expect(withoutBankDetails('NUBAN 0123456789')).toBe(`NUBAN ${HIDDEN.account}`);
      expect(withoutBankDetails('Bank account is 12345678.')).toBe(`Bank account is ${HIDDEN.account}.`);
      expect(withoutBankDetails('M-Pesa account 0712345678')).toBe(`M-Pesa account ${HIDDEN.account}`);
      expect(withoutBankDetails('Wallet number: 08031234567')).toBe(`Wallet number: ${HIDDEN.account}`);
    });

    it('a ten-digit NUBAN on a line that names the bank first', () => {
      expect(withoutBankDetails('Pay to Zenith Bank, 1012345678, Harbor Foods Ltd'))
        .toBe(`Pay to Zenith Bank, ${HIDDEN.account}, Harbor Foods Ltd`);
      expect(withoutBankDetails('GTBank 0123456789')).toBe(`GTBank ${HIDDEN.account}`);
    });

    it('a sort code and the account beside it', () => {
      expect(withoutBankDetails('Sort code 12-34-56, account 12345678'))
        .toBe(`Sort code ${HIDDEN.sortCode}, account ${HIDDEN.account}`);
    });

    it('a routing number and a SWIFT code', () => {
      expect(withoutBankDetails('Routing number 021000021')).toBe(`Routing number ${HIDDEN.routing}`);
      expect(withoutBankDetails('SWIFT: GTBINGLA')).toBe(`SWIFT: ${HIDDEN.swift}`);
      expect(withoutBankDetails('BIC code DEUTDEFF500')).toBe(`BIC code ${HIDDEN.swift}`);
    });

    it('an IBAN, labelled or not, when its check digits are right', () => {
      expect(passesTheIbanCheck('GB82 WEST 1234 5698 7654 32')).toBe(true);
      expect(withoutBankDetails('Transfer to GB82 WEST 1234 5698 7654 32 by Friday'))
        .toBe(`Transfer to ${HIDDEN.iban} by Friday`);
      expect(withoutBankDetails('IBAN: DE89370400440532013000')).toBe(`IBAN: ${HIDDEN.iban}`);
    });

    it('a card number, in one run, in fours, or with dashes, when the check digit is right', () => {
      expect(passesTheCardCheck('4111111111111111')).toBe(true);
      expect(withoutBankDetails('Card 4111 1111 1111 1111 expires 09/28')).toBe(`Card ${HIDDEN.card} expires 09/28`);
      expect(withoutBankDetails('5500-0000-0000-0004')).toBe(HIDDEN.card);
      expect(withoutBankDetails('paid with 4012888888881881')).toBe(`paid with ${HIDDEN.card}`);
      expect(withoutBankDetails('Amex 3782 822463 10005')).toBe(`Amex ${HIDDEN.card}`);
      expect(withoutBankDetails('Card number: 1234 5678 9012 3456')).toBe(`Card number: ${HIDDEN.card}`);
    });

    it('everything in one invoice, and nothing else in it', () => {
      const invoice = [
        'HARBOR FOODS LTD, INVOICE No. 0447',
        'Date: 24 September 2026',
        'Amount due: 12,000 US dollars',
        'Pay to: Zenith Bank, account number 1012345678',
        'Or card 4111 1111 1111 1111',
        'Questions: phone 0803 123 4567',
      ].join('\n');
      expect(withoutBankDetails(invoice)).toBe([
        'HARBOR FOODS LTD, INVOICE No. 0447',
        'Date: 24 September 2026',
        'Amount due: 12,000 US dollars',
        `Pay to: Zenith Bank, account number ${HIDDEN.account}`,
        `Or card ${HIDDEN.card}`,
        'Questions: phone 0803 123 4567',
      ].join('\n'));
    });
  });

  describe('what is left exactly as it was', () => {
    const untouched = [
      'The approved budget for Atlas is 38,000, not to be passed.',
      'The second invoice is 12,000, by 10 November.',
      'Budget 38000 dollars, spent 12000.',
      'Meeting on 2026-09-27 at 10:00.',
      'Receipt No. 0447 and reference 1234567.',
      'Call Ngozi on 0803 123 4567 or 08031234567.',
      'Her WhatsApp is +234 803 123 4567.',
      'Phone: 2348031234567',
      'Kenya office: 0712 345 678.',
      '2 of 5 signed off, 40 teams migrated.',
      /* A sheet read as text: numbers one space apart, whose digits together happen to pass the card check. */
      '38000 12000 40000 5000 1200',
      'The account manager is Tunde, and the account was opened in 2019.',
      'Swift response from the credit committee.',
      'Order 1234567890123 shipped.',
      'Population 1500000000 people.',
    ];
    for (const line of untouched) {
      it(JSON.stringify(line), () => {
        expect(withoutBankDetails(line)).toBe(line);
      });
    }

    it('and a ten-digit number with no bank named before it on its line', () => {
      expect(withoutBankDetails('Tracking 1012345678 left Lagos.\nZenith Bank is our bank.')).toBe('Tracking 1012345678 left Lagos.\nZenith Bank is our bank.');
    });

    it('and nothing at all', () => {
      expect(withoutBankDetails('')).toBe('');
      expect(withoutBankDetails(null)).toBeNull();
      expect(withoutBankDetails(undefined)).toBeUndefined();
    });
  });
});
