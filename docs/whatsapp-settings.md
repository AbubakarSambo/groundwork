# The settings WhatsApp needs on Groundwork's own number

For the first client, who starts on Groundwork's own WhatsApp number (decision 82). Every value below goes into the hosted API's settings (its environment variables), set by whoever runs the hosting. None of them goes in the code, on a screen, in a document, or in a chat. This file names each setting and says where to find its value; it never holds a value.

The secret ones are marked **secret**. Anyone who has a secret can send messages as Groundwork or pretend to be WhatsApp, so treat each like a password: copy it straight from Meta into the server's settings, and nowhere else.

## The settings

| Setting | What it holds | Secret? | Where to find it in Meta's tools |
| --- | --- | --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta's own id for Groundwork's WhatsApp number (a long number, not the phone number itself). Messages are sent from this number. | No, but keep it with the others. | **developers.facebook.com** → My Apps → Groundwork's app → **WhatsApp** → **API Setup**. Under "From", choose the number; its "Phone number ID" is shown beside it. |
| `WHATSAPP_ACCESS_TOKEN` | The permanent token that lets Groundwork send messages from that number. | **Secret.** | **business.facebook.com** → Business settings → Users → **System users** → add (or choose) a system user with the Admin role → **Add assets**: give it Groundwork's app and the WhatsApp account → **Generate new token** for the app, with the permissions `whatsapp_business_messaging` and `whatsapp_business_management`, and no expiry. Copy it once; Meta does not show it again. Do not use the temporary token on the API Setup page: it stops working after 24 hours. |
| `WHATSAPP_APP_SECRET` | The secret Meta signs every incoming message with. Groundwork checks the signature on each one and refuses anything that does not match. | **Secret.** | **developers.facebook.com** → Groundwork's app → **App settings** → **Basic** → **App secret** → Show (Meta asks for the password). |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | A word or phrase Groundwork's side chooses. Meta sends it back once, when the webhook is first connected, to prove it is talking to the right server. | **Secret.** | Not found in Meta: whoever runs the hosting makes it up (a long random string), puts it in the server's settings, and types the same string into **developers.facebook.com** → Groundwork's app → **WhatsApp** → **Configuration** → **Webhook** → Edit → **Verify token**. |
| `WHATSAPP_APPROVED_TEMPLATES` | The names of the message templates Meta has approved, separated by commas. Groundwork can only send the first message to someone (a session opening, a reminder, a report, the lead's daily summary) through an approved template; it records anything else as not sent. | No. | **business.facebook.com** → **WhatsApp Manager** → **Message templates**. Copy the name of each template whose status is **Active**, exactly as written. The wording to submit is in `docs/whatsapp-templates.md`. |
| `WHATSAPP_DISPLAY_NUMBER` | Groundwork's WhatsApp number as people should read it, for example "+44 7700 900123", shown on the Connections page. | No. | **WhatsApp Manager** → **Phone numbers**: the number as listed. |
| `PUBLIC_API_URL` | The hosted API's public address, for example "https://api.example.com", used to build the webhook address shown to admins. | No. | Not in Meta: it is wherever the API is hosted. |

## The webhook, once hosted

In **developers.facebook.com** → Groundwork's app → **WhatsApp** → **Configuration** → **Webhook** → Edit:

- **Callback URL:** `<PUBLIC_API_URL>/api/v1/webhooks/whatsapp`
- **Verify token:** the same string as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- Then, under **Webhook fields**, subscribe to **messages**.

Meta checks the address straight away by calling it with the verify token, so the API must already be running with the settings above before this step.

## Then, in Groundwork

The platform admin turns WhatsApp on in Groundwork's admin area (the WhatsApp switch). It is off until then, whatever the settings say. Nothing is sent by WhatsApp until both the settings are present and the switch is on.

## Not needed for the first client

An organisation's own WhatsApp number (its admin connects it on the Connect page, and its details are kept in the database, never in the server's settings) waits until later (decision 82).
