import { eachSideGetsSomebody } from './party-labels';

/*
 * The corpus lists the labels and the schema says to use them, and neither can stop a model
 * writing a label that is not on the roster - the substitution at the read only replaces labels
 * it knows, so an invented one reaches the screen attached to nobody.
 *
 * Written after a three-person report read "Person" for two of the three. That turned out to be
 * their seeded first name rather than an invented label, so this has never fired in anger; it is
 * kept because the hole is real and holding it shut costs one pass over the positions.
 */
describe('a label the model invented is matched to somebody real', () => {
  const roster = ['the founder', 'sales A', 'sales B'];

  it('hands an invented label to a person nobody else on that difference has', () => {
    const out = eachSideGetsSomebody(
      [{ participantLabel: 'the founder' }, { participantLabel: 'Person' }, { participantLabel: 'Person' }],
      roster,
    );
    expect(out.map((s) => s.participantLabel)).toEqual(['the founder', 'sales A', 'sales B']);
  });

  it('leaves labels that are already real completely alone', () => {
    const sides = [{ participantLabel: 'sales B' }, { participantLabel: 'sales A' }];
    expect(eachSideGetsSomebody(sides, roster).map((s) => s.participantLabel)).toEqual(['sales B', 'sales A']);
  });

  it('never hands the same person to two sides of one difference', () => {
    const out = eachSideGetsSomebody(
      [{ participantLabel: 'sales A' }, { participantLabel: 'Person' }, { participantLabel: 'somebody' }],
      roster,
    );
    const labels = out.map((s) => s.participantLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('and leaves it alone rather than inventing when the roster is used up', () => {
    const out = eachSideGetsSomebody(
      [{ participantLabel: 'Person' }, { participantLabel: 'Person' }],
      ['only one'],
    );
    expect(out[0].participantLabel).toBe('only one');
    expect(out[1].participantLabel).toBe('Person');
  });
});

/**
 * AND THE ENDPOINT THAT ACTUALLY SERVES THE REPORT USES IT.
 *
 * The first wiring landed on board.service.ts alone. GET /grounds/:id/report builds its own names
 * through ReportsService.applyNames and never goes near the board, so the guard existed on a path
 * nobody takes. (The "Person" that started this was a seeded first name, not an invented label -
 * see the header of eachSideGetsSomebody. The guard is kept; it is pinned to both paths so it
 * cannot quietly become half-wired again.)
 */
describe('the report endpoint hands each side somebody too', () => {
  const src = require('fs')
    .readFileSync(require('path').join(__dirname, 'reports.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('maps invented labels before the names go back in', () => {
    expect(src).toMatch(/import \{[^}]*eachSideGetsSomebody[^}]*\} from '\.\/party-labels'/);
    const fix = src.indexOf('eachSideGetsSomebody(sides, allLabels)');
    const put = src.indexOf('namesVisibleTo(asWhom');
    expect(fix).toBeGreaterThan(-1);
    expect(fix).toBeGreaterThan(put);
  });

  it('on both shapes the model writes a difference in', () => {
    expect(src).toMatch(/positions: fix\(d\.positions\)/);
    expect(src).toMatch(/perspectives: fix\(d\.perspectives\)/);
  });
});
