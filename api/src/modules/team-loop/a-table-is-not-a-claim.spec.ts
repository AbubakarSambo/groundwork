import { isATable } from './a-table-is-not-a-claim';

describe('a spreadsheet is not somebody\'s sentence', () => {
  it('knows a table by its name or its type', () => {
    expect(isATable({ fileName: 'payments-tracker-hauwa-v2.xlsx', mimeType: 'application/octet-stream' })).toBe(true);
    expect(isATable({ fileName: 'payments-export-q3.csv', mimeType: 'text/plain' })).toBe(true);
    expect(isATable({ fileName: 'x', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })).toBe(true);
  });
  it('leaves notes, letters and pictures of words alone', () => {
    expect(isATable({ fileName: 'activity-2026-05-May.txt', mimeType: 'text/plain' })).toBe(false);
    expect(isATable({ fileName: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe(false);
  });
});
