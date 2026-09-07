/** What somebody holding the wrong kind of dead link is told. */
import { call, mailMark, mailSince, tokenIn, anAddress } from './harness';
(async () => {
  const email = anAddress('dead');
  const mark = mailMark();
  await call('POST', '/auth/entry-save', { email });
  await new Promise((r) => setTimeout(r, 800));
  const mail = mailSince(mark).filter((m) => m.to === email);
  const token = tokenIn(mail[mail.length - 1]?.link ?? null);
  await call('POST', '/auth/verify-email', { token });

  /* The same verification token, now used, taken to the SET-PASSWORD door. */
  const atTheWrongDoor = await call('POST', '/auth/set-password', { token, password: 'Str0ng-enough-pw!' });
  console.log('a used verification token at the password door:');
  console.log('  ', atTheWrongDoor.status, JSON.stringify(atTheWrongDoor.data?.message));

  const nonsense = await call('POST', '/auth/set-password', { token: 'no-such-token', password: 'Str0ng-enough-pw!' });
  console.log('a link we have never seen:');
  console.log('  ', nonsense.status, JSON.stringify(nonsense.data?.message));
})();
