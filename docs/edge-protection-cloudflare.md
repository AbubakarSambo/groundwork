# Putting Cloudflare in front of Groundwork

Status, 10 September 2026: not done. DNS for myground.work is at GoDaddy (ns49/ns50.domaincontrol.com)
and app.myground.work points straight at Vercel. Nothing sits between the internet and the app, so
the only defences against automated copying are the ones in the code (the API behind a request,
the per-credential pace, the watch, robots.txt). These steps put an edge in front. About a day.

## 1. Move DNS to Cloudflare (free plan is enough to start)
1. Create a Cloudflare account, add `myground.work`, pick the Free plan.
2. Cloudflare reads the existing records. Check `app`, `api` (if separate), the marketing root and
   `www` are all there and proxied (orange cloud). Vercel needs the CNAME to stay as it is.
3. At GoDaddy, change the nameservers to the two Cloudflare gives. Propagation takes up to a day;
   the site keeps working throughout.
4. SSL/TLS mode: Full (strict). Vercel already serves HTTPS.

## 2. Bots
Security → Bots:
- Turn on **Bot Fight Mode** (Free) or **Super Bot Fight Mode** (Pro, $20/month, worth it: it
  challenges "likely automated" traffic rather than only "definitely automated").
- Turn on **Block AI bots** (the "AI Scrapers and Crawlers" toggle). This blocks GPTBot, ClaudeBot,
  CCBot, PerplexityBot, Bytespider and the rest at the edge, where robots.txt is only advice.
- Leave **AI Labyrinth** on if offered: it feeds crawlers that ignore robots.txt nonsense pages.

## 3. Rate limiting rules (Security → WAF → Rate limiting rules)
The API already refuses a credential above 300 calls a minute and Setup above 30 turns a minute per
IP. These add an outer layer that costs nothing on the server.
| Rule | Match | Limit | Action |
|---|---|---|---|
| Setup and entry | URI path starts with `/api/v1/entry/` | 60 requests / 1 min per IP | Block for 10 min |
| Auth | URI path starts with `/api/v1/auth/` | 20 requests / 1 min per IP | Managed challenge |
| Integration API | URI path starts with `/api/org/v1/` | 600 requests / 1 min per IP | Block for 1 min |
| Everything else | Host is `app.myground.work` | 1000 requests / 1 min per IP | Managed challenge |

## 4. WAF custom rules
- Block requests to `/api/docs*` unless the query string contains `key=` (the reference now needs a
  signed key; this saves the server the request).
- Challenge requests whose User-Agent is empty or is a known HTTP library (`python-requests`, `curl`,
  `Go-http-client`, `axios`, `node-fetch`) on `app.myground.work` **except** paths under
  `/api/org/v1/`, `/api/v1/webhooks/` and `/api/v1/whatsapp/` (machines are supposed to call those).

## 5. Turn off what leaks
- Speed → Optimization: leave Rocket Loader off (it rewrites scripts and breaks the panel loader).
- Caching: bypass cache for `/api/*`.
- Scrape Shield → Email obfuscation on; Hotlink protection on for `/connect/*.png`.

## 6. Watch it
Security → Events shows what was challenged and blocked. After a week, read it once and tighten or
loosen the rate limits from what real customers actually do.

## What this does not do
It does not stop a person with a browser reading the product and rebuilding it. That defence is in
the code and the contract: the engines never leave the server, the API is behind a request whose
terms forbid building a competitor from it, every machine call is recorded and watched, and the
brand is (to be) trademarked.
