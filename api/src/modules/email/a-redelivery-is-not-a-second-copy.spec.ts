import { readFileSync } from 'fs';
it('a redelivered webhook is not a second copy of somebody email', () => {
  const src = readFileSync('/Users/hafsahjumare/Documents/GitHub/groundwork/api/src/modules/email/delivery.service.ts', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
  expect(src).toContain('where: { providerId: arrived.providerId }');
  expect(src).toContain('update: {},');
});
