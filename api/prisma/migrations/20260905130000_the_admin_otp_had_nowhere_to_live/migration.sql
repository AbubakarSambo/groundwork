-- Every OTP-gated admin action threw a 500 and always had.
--
-- `generateOtpForAdmin` upserts an `adminOtp` object onto AdminProfile; the
-- column was never added, so `POST /admin/otp/request` failed on an invalid
-- Prisma invocation. Nothing behind an OTP - disabling a contributor code,
-- adding a platform admin - has ever run. Two `@ts-ignore` comments in the
-- service kept the compiler from saying so.
--
-- Nullable: a profile with no outstanding code is the normal state.
ALTER TABLE "admin_profiles" ADD COLUMN "admin_otp" JSONB;
