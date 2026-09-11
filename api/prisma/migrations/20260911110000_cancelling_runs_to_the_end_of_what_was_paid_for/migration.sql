-- CANCELLING RUNS TO THE END OF WHAT WAS PAID FOR. Cancelling ended the subscription at that
-- moment and cleared the period end, so a customer who cancelled on day two of a paid month lost
-- twenty-eight days they had paid for, with no refund and no notice. A cancellation is scheduled
-- at the period end now, and this column says when access stops; the status stays active until
-- Stripe deletes the subscription. Anybody cancelled before today was ended immediately and the
-- data to make them whole is in Stripe, not here.
ALTER TABLE "organizations" ADD COLUMN "subscription_ends_at" TIMESTAMP(3);
