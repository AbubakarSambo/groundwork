# The settings WhatsApp needs on Groundwork's own number

For the first client, who starts on Groundwork's own WhatsApp number (decision 82). Every value below goes into the hosted API's settings (its environment variables), set by whoever runs the hosting. None of them goes in the code, in a document or in a chat. They are typed only into the server's settings, or into the staff-only back-office page, which stores the secrets encrypted. This file names each setting and says where to find its value; it never holds a value.

Since 5 October, Groundwork staff can also type the number, its IDs and its secrets into the back office instead (see "How to set up WhatsApp in the back office" below). A value saved there is used first. When nothing is saved there, the server's settings below are used, exactly as before.

The secret ones are marked **secret**. Anyone who has a secret can send messages as Groundwork or pretend to be WhatsApp, so treat each like a password: copy it straight from Meta into the server's settings or the back-office page, and nowhere else.

## The settings

| Setting | What it holds | Secret? | Where to find it in Meta's tools |
| --- | --- | --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta's own id for Groundwork's WhatsApp number (a long number, not the phone number itself). Messages are sent from this number. | No, but keep it with the others. | **developers.facebook.com** → My Apps → Groundwork's app → **WhatsApp** → **API Setup**. Under "From", choose the number; its "Phone number ID" is shown beside it. |
| `WHATSAPP_ACCESS_TOKEN` | The permanent token that lets Groundwork send messages from that number. | **Secret.** | **business.facebook.com** → Business settings → Users → **System users** → add (or choose) a system user with the Admin role → **Add assets**: give it Groundwork's app and the WhatsApp account → **Generate new token** for the app, with the permissions `whatsapp_business_messaging` and `whatsapp_business_management`, and no expiry. Copy it once; Meta does not show it again. Do not use the temporary token on the API Setup page: it stops working after 24 hours. |
| `WHATSAPP_APP_SECRET` | The secret Meta signs every incoming message with. Groundwork checks the signature on each one and refuses anything that does not match. | **Secret.** | **developers.facebook.com** → Groundwork's app → **App settings** → **Basic** → **App secret** → Show (Meta asks for the password). |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | A word or phrase Groundwork's side chooses. Meta sends it back once, when the webhook is first connected, to prove it is talking to the right server. | **Secret.** | Not found in Meta: whoever runs the hosting makes it up (a long random string), puts it in the server's settings, and types the same string into **developers.facebook.com** → Groundwork's app → **WhatsApp** → **Configuration** → **Webhook** → Edit → **Verify token**. |
| `WHATSAPP_APPROVED_TEMPLATES` | The names of the message templates Meta has approved, separated by commas. Groundwork can only write first to someone, or write more than 24 hours after they last wrote, through an approved template; it records anything else as not sent. The 13 names the code expects are listed under "The templates" below. | No. | **business.facebook.com** → **WhatsApp Manager** → **Message templates**. Copy the name of each template whose status is **Active**, exactly as written. The wording to submit is in `docs/whatsapp-templates.md`. |
| `WHATSAPP_DISPLAY_NUMBER` | Groundwork's WhatsApp number as people should read it, for example "+44 7700 900123", shown on the Connections page. | No. | **WhatsApp Manager** → **Phone numbers**: the number as listed. |
| `SETTINGS_ENCRYPTION_KEY` | The key the back office uses to encrypt the secrets typed into it before they are stored. Without it, the back office can save the number and its IDs, but not the secrets. If it changes, every secret saved in the back office has to be typed in again. It must be 32 bytes written in base64 or hex, or at least 32 characters. A shorter key is refused, and the back-office page says it is too short. | **Secret.** | Not in Meta: whoever runs the hosting makes it, with `openssl rand -base64 32` (which gives 32 bytes in base64), and keeps it the same from then on. |
| `PUBLIC_API_URL` | The hosted API's public address, for example "https://api.example.com", used to build the webhook address shown to admins. | No. | Not in Meta: it is wherever the API is hosted. |

## The templates

`WHATSAPP_APPROVED_TEMPLATES` should end up holding these 13 names, which are the ones the code can send (`THE_NAMES_TO_SUBMIT` in `api/src/modules/whatsapp/a-message-outside-the-window.ts`). The wording of each, to submit in Meta's WhatsApp Manager, is in `docs/whatsapp-templates.md`. Add a name to the setting only when Meta shows it as Active.

| Name | What it is for |
| --- | --- |
| `checkin_open` | A check-in has opened. |
| `checkin_due_tomorrow` | A check-in closes tomorrow. |
| `checkin_opens_soon` | A check-in opens soon. |
| `checkin_closes_soon` | A check-in is about to close. |
| `checkin_overdue` | A check-in is still open and the person has not answered. |
| `checkin_team_almost_in` | At least half the team has checked in. |
| `checkin_your_view_matters` | Fewer than half the team has checked in. |
| `lead_daily_summary` | The lead's daily summary. See the note in `docs/whatsapp-templates.md`: as written, Meta will refuse it, because it ends with a blank. |
| `groundwork_report_ready` | A report is ready. |
| `groundwork_request_waiting` | A leave, hours or spending request is waiting for an approver, or a person has answered a question about one. |
| `groundwork_request_decided` | A person is told their request was approved, declined or asked about. |
| `groundwork_review_started` | A review waits for the person. |
| `groundwork_review_decided` | The person is told their review is decided. |

Two more are written in `docs/whatsapp-templates.md` as proposed and are **not** in the code yet, so they are not in the list above and are not needed for the first release: `groundwork_request_question` (a question about a request) and `groundwork_leave_told_to_hr` (leave told to the person who holds the HR duty). Until they exist, a question outside the 24 hours goes through `groundwork_request_decided`, and HR reads leave on the leave board only. Do not add either name to the setting until the code sends it.

## The webhook, once hosted

In **developers.facebook.com** → Groundwork's app → **WhatsApp** → **Configuration** → **Webhook** → Edit:

- **Callback URL:** `<PUBLIC_API_URL>/api/v1/webhooks/whatsapp` (the controller that receives Groundwork's own number is `whatsapp.controller.ts`)
- **Verify token:** the same string as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Then, under **Webhook fields**, subscribe to **messages**.

Meta checks the address straight away by calling it with the verify token, so the API must already be running with the settings above before this step.

## How to set up WhatsApp in the back office

You need to be Groundwork staff (a platform admin). Nobody else can open this page, and the server refuses everyone else too.

1. Ask whoever runs the hosting to make sure `SETTINGS_ENCRYPTION_KEY` and `PUBLIC_API_URL` are set on the server. The key must be 32 bytes written in base64 or hex, or at least 32 characters. The easiest way to make one is `openssl rand -base64 32`. You only need to do this once.
2. Open the back office at `/admin`. On the System tab, under the WhatsApp switch, choose "Set Groundwork's WhatsApp number, its keys and the webhook". This opens `/admin/whatsapp`.
3. Type in the WhatsApp number as people should read it, for example +44 7700 900123.
4. Type in the phone number ID and the business account ID. Both are on the WhatsApp API Setup page in Meta (see the table above for where).
5. Type in the access token, the app secret and the verify token. The verify token is a long word you make up. Then press Save. The secrets are stored encrypted and are never shown again. The page only says "Set" or "Not set" beside each one. To change one, type the new one and press Save again.
6. To remove a secret saved here, press "Remove the saved access token" (or the app secret, or the verify token) beside it. The page then says what Groundwork uses instead. That is the server's own setting, if there is one. If there is none, that secret is not set.
7. Look at "Is it connected?". It should say "Connected" and show the number Meta has. If it says "Not connected", check the access token and the phone number ID, then press "Check again".
8. Copy the webhook address from the page. In Meta, open the app's WhatsApp settings, then Configuration, then Webhook, and choose Edit. Paste the address as the callback address, type the same verify token you saved, and subscribe to **messages**.
9. Type your own number, with its country code, under "Send a test message", and press the button. The message goes only to that number, even while WhatsApp is switched off. Check that it arrives. If it does not, and your number has not written to Groundwork's number in the last 24 hours, write to it first and try again, because Meta may refuse a message that is not a template.
10. When the test message arrives, go back to the System tab and switch WhatsApp on.

If nothing is saved on this page, Groundwork uses the server's `WHATSAPP_*` settings, as it always did. If nothing is set in either place, WhatsApp stays off.

## Then, in Groundwork

Two switches decide whether a client's WhatsApp works, and both must be on.

1. **The platform's switch.** The platform admin turns WhatsApp on in Groundwork's admin area. It is kept in the settings row `whatsapp_enabled` and is off until somebody switches it on, whatever the server's settings say. Nothing is sent by WhatsApp until `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are present and this switch is on.
2. **The organisation's add-on.** Each organisation turns WhatsApp on for itself (`organizations.whatsapp_add_on_on`, set by its admin through `PATCH /billing/whatsapp`). Every message Groundwork starts (the opening notice, the morning reminder, the reminder before a session, the lead's daily summary, an approval waiting, a question, a decision told and a review) goes only to an organisation that has turned it on, or that already had a WhatsApp number of its own connected, and only while the platform's switch is on (`api/src/modules/whatsapp/only-where-whatsapp-is-turned-on.ts`, and the sender, `whatsapp.service.ts`). The report after a session closes went before this release and is not held by it. A reply to something a person wrote always goes. An organisation that has not turned it on is told plainly that its check-ins stay in the app. Existing clients and the paid client are treated the same way (decision 90).

While the free trial's switch (`pricing.freeTrial`) is off, nothing is charged or held for the add-on, but each plan's monthly message limit still applies (decision 78). Charging starts only when the trial is switched on, after Stripe is tested.

## Not needed for the first client

An organisation's own WhatsApp number (its admin connects it on the Connect page, and its details are kept in the database, never in the server's settings) waits until later (decision 82).
