import { theBoardForThisKind } from './each-kind-gets-its-own-board';

/** gov-board.jpg: "The three counties". How many counties there are is said in words, up to ten; one county keeps the plain heading. */
describe('the counties of a government programme', () => {
  const county = (id: string, name: string) => ({ id, kind: 'county', name, fields: {} });
  const board = (rows: any[]) => ({ workRecords: [{ section: 'Deal grid', state: 'filled', rows }] });
  const read = (rows: any[]) => theBoardForThisKind({ kind: 'a government programme', board: board(rows), people: [], readerRunsIt: true, readerIsTheLead: true, metrics: [], documentSaysOf: new Map() } as any).theCounties;

  it('says "The three counties" for three', () => {
    expect(read([county('a', 'Kiambu'), county('b', 'Nakuru'), county('c', 'Machakos')]).heading).toBe('The three counties');
  });
  it('keeps "The counties" for one', () => {
    expect(read([county('a', 'Kiambu')]).heading).toBe('The counties');
  });
});
