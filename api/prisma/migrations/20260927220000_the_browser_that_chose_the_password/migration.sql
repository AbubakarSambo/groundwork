-- THE BROWSER THAT CHOSE THE PASSWORD (U.3 review, a security fix). A password chosen at sign-up is
-- put on the account only when the confirmation is opened in the browser that chose it. One new
-- empty column on the waiting sign-up. A waiting sign-up from before this change has no key, so its
-- password is not carried over: that person chooses one after confirming, as after a link sign-up.
ALTER TABLE "pending_signups" ADD COLUMN "password_key_hash" TEXT;
