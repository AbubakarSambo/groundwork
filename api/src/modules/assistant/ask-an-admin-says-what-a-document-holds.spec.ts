import { whatTheDocumentSays } from './a-document-for-the-whole-organisation';

/* An admin's document for the whole organisation is said back with what is in it, not only how many parts (26 October 2026). */
describe('what is in the document, said back', () => {
  it('Grace reads what the receipt holds, then the yes or no', () => {
    const { body } = whatTheDocumentSays('mama-rose-receipt', 'CASH RECEIPT 0193 ...', 'Drop Access (test)', 'This is a cash receipt from Drop Access Ltd. Mama Rose Kiosk paid KES 4,800 for one water dispenser on 14 October 2026.');
    expect(body).toMatch(/^I have read mama-rose-receipt\. This is a cash receipt from Drop Access Ltd\. Mama Rose Kiosk paid KES 4,800 for one water dispenser on 14 October 2026\. It is short/);
    expect(body).toContain('Nothing is added yet.');
  });
  it('with no summary it reads as before', () => {
    expect(whatTheDocumentSays('Staff handbook', 'Some words', 'Msingi Foods').body).toMatch(/^I have read Staff handbook\. It is short/);
  });
});
