import * as fs from 'fs';
import * as path from 'path';

/**
 * THE LINK IN THE EMAIL HAS TO OPEN THE REPORT.
 *
 * "Your shared record is ready" is the one email in this product whose entire job
 * is to bring somebody back to read the thing they have been waiting weeks for.
 * It pointed at
 *
 *     /report/<groundId>
 *
 * and the client has no such route. Every one of those emails, for as long as the
 * feature has existed, opened the not-found page. The route is
 * /grounds/:id/report.
 *
 * FOUND BY FOLLOWING THE LINK OUT OF A REAL INBOX, on ground 2 of the eighteen,
 * and it cannot be found any other way. Nothing in the API knows what the client's
 * routes are, so the string looks perfectly reasonable where it is written, every
 * unit test that mocks the email service passes, and the URL is never resolved
 * against anything until a person clicks it.
 *
 * Which is why this test reads BOTH SIDES: the routes the client actually
 * registers, and the paths the API puts in emails. A test that only checked the
 * API string against another string in the test would be the same mistake wearing
 * a different hat.
 */

const CLIENT_ROUTES = path.join(__dirname, '../../../../client/src/App.tsx');
const API = path.join(__dirname, '../..');

/** Every path the client will actually render something for. */
function clientRoutes(): string[] {
  const source = fs.readFileSync(CLIENT_ROUTES, 'utf8');
  return [...source.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
}

/** A route pattern with its params blanked, for comparing shapes. */
const shape = (p: string) => p.replace(/:[^/?]+\??/g, '*').replace(/\/$/, '');

describe('the routes the client actually has', () => {
  it('has /grounds/:id/report and does NOT have /report/:id', () => {
    const shapes = clientRoutes().map(shape);
    expect(shapes).toContain('/grounds/*/report');
    // The regression, stated as plainly as it can be: the path the emails used
    // is not a route and never was.
    expect(shapes).not.toContain('/report/*');
  });
});

describe('every report link the API sends', () => {
  const filesThatLink = [
    'reports/reports.service.ts',
    'grounds/grounds.cron.ts',
  ];

  it.each(filesThatLink)('%s builds a path the client can open', (file) => {
    const source = fs.readFileSync(path.join(API, 'modules', file), 'utf8');

    // Template literals that look like a frontend URL being assembled.
    const built = [...source.matchAll(/\$\{frontend[^}]*\}([^`]*)`/g)].map((m) => m[1]);
    const reportLinks = built.filter((p) => p.includes('report'));

    // If this is zero, either the list above is stale or the link moved - both
    // worth failing on, because the check would otherwise pass by testing nothing.
    expect({ file, found: reportLinks.length > 0 }).toMatchObject({ found: true });

    const shapes = clientRoutes().map(shape);
    for (const link of reportLinks) {
      const sentTo = shape(link.replace(/\$\{[^}]+\}/g, ':id'));
      expect({ file, sentTo, isARoute: shapes.includes(sentTo) })
        .toMatchObject({ isARoute: true });
    }
  });
});

describe('this test can fail', () => {
  it('would catch the exact string that shipped', () => {
    // Proves the comparison bites, rather than passing because nothing matched.
    const shipped = '/report/${groundId}';
    const shapes = clientRoutes().map(shape);
    expect(shapes).not.toContain(shape(shipped.replace(/\$\{[^}]+\}/g, ':id')));
  });
});
