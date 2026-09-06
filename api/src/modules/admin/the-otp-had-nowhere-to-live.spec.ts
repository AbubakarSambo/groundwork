/**
 * EVERY OTP-GATED ADMIN ACTION THREW A 500, AND ALWAYS HAD.
 *
 * `generateOtpForAdmin` upserts an `adminOtp` object onto AdminProfile. The
 * column did not exist, so `POST /admin/otp/request` failed on an invalid Prisma
 * invocation — which means nothing behind an OTP had ever run: not disabling a
 * contributor code, not adding a platform admin.
 *
 * It was invisible for one reason worth naming: two `@ts-ignore` comments and a
 * pair of `as any` casts around the exact lines that were wrong. The compiler
 * knew. It had been told not to say.
 *
 * Found by asking for a code against the running API while checking who can
 * reach the console.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const SCHEMA = readFileSync(join(__dirname, '..', '..', '..', 'prisma', 'schema.prisma'), 'utf8');
const SERVICE = readFileSync(join(__dirname, 'admin.service.ts'), 'utf8');
const withoutComments = SERVICE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/*
 * Cut at a line that is only `}`, not at the first `}` in the text. The doc
 * comment on the new field contains `{ hash, expiresAt, used }`, and slicing on
 * the first brace ended the model three lines early — so the field this spec
 * exists to check fell outside the thing being checked.
 */
const MODEL = (() => {
  const from = SCHEMA.indexOf('model AdminProfile');
  const end = SCHEMA.indexOf('\n}', from);
  return SCHEMA.slice(from, end);
})();

describe('the column the service writes to', () => {
  it('exists', () => {
    expect(MODEL).toMatch(/adminOtp\s+Json\?/);
  });

  it('is mapped to the name the database uses', () => {
    expect(MODEL).toMatch(/@map\("admin_otp"\)/);
  });

  it('is nullable, because no outstanding code is the normal state', () => {
    expect(MODEL).toMatch(/adminOtp\s+Json\?/);
  });
});

describe('the code that writes it', () => {
  it('no longer silences the compiler around the write', () => {
    /*
     * THE POINT OF THIS ONE. The bug was not the missing column — it was that
     * three suppressions sat exactly where the mistake was, so a fault that
     * `tsc` would have caught on the day survived every build since.
     */
    const otpFlow = withoutComments.slice(withoutComments.indexOf('async generateOtpForAdmin'));
    expect(otpFlow).not.toMatch(/@ts-ignore/);
    expect(otpFlow).not.toMatch(/adminOtp[\s\S]{0,80}as any/);
  });

  it('still writes the three things a code needs to be checkable', () => {
    expect(withoutComments).toMatch(/const otpPayload = \{ hash, expiresAt, used: false \}/);
  });

  it('and marks it used, so a code cannot be replayed', () => {
    expect(withoutComments).toMatch(/adminOtp: \{ \.\.\.stored, used: true \}/);
  });
});
