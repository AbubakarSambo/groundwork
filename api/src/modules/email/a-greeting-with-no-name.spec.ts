/**
 * The emails that carry sign-in links were the ones opening "Hi ,". A greeting is not decoration
 * on those: a broken mail-merge is what a cautious reader treats as a forgery.
 */
import * as fs from 'fs';
import * as path from 'path';
import { greeting } from './a-greeting-with-no-name';

describe('a greeting with no name', () => {
  it('greets somebody by name when there is one', () => {
    expect(greeting('Ada')).toBe('Hi Ada,');
  });

  it.each([undefined, null, '', '   '])('greets without a comma-shaped hole for %p', (v) => {
    expect(greeting(v as any)).toBe('Hi,');
    expect(greeting(v as any)).not.toContain(' ,');
  });

  it('does not put an email address in the name slot', () => {
    expect(greeting('someone@example.com')).toBe('Hi,');
  });

  it('does not greet a person "Hi Someone," when the name chain had nothing for them (the absence reminder, review of 1678157c)', () => {
    expect(greeting('Someone')).toBe('Hi,');
  });

  it('trims, because a trailing space is how the hole appeared in the first place', () => {
    expect(greeting('  Ada  ')).toBe('Hi Ada,');
  });
});

describe('and no template writes its own greeting any more', () => {
  const src = fs
    .readFileSync(path.join(__dirname, 'email.service.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('interpolates a name into "Hi" nowhere', () => {
    /* The fault, in the shape it actually took: `Hi ${firstName},` with nothing checking it. */
    expect(src).not.toMatch(/Hi \$\{[A-Za-z.?]*(name|Name)[A-Za-z.?]*\}/);
  });

  it('and does reach the one function that decides', () => {
    expect(src).toContain("from './a-greeting-with-no-name'");
    expect((src.match(/greeting\(/g) ?? []).length).toBeGreaterThan(10);
  });
});
