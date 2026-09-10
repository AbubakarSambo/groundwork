# Reported immediately, not held for the synthesis

Two routes are registered directly on the raw Express adapter in `api/src/main.ts`, outside every
Nest guard, outside the global `JwtAuthGuard`, and outside the throttler. Both were found by the
Pass 0 inventory and both are verified here against the running server.

```
ID: P0-001
Severity: Blocker
Axis: Security
Location: api/src/main.ts:192-218
Observed: GET /health/email?to=<any address> sends a real email through Resend, from the
  production sender, to any address the caller names. There is no authentication, no throttle,
  no environment gate and no allow-list. The only guard is that the Resend key must not be the
  placeholder, which on production it is not. Verified against the running server: the route
  answers unauthenticated, returning 400 only because I deliberately omitted the ?to= parameter,
  which proves the request reached the handler with no auth challenge.
Expected: a diagnostic that sends real mail is authenticated, or restricted to an address the
  product already owns, or absent from production.
Impact: anyone on the internet can make api.myground.work send mail from noreply@myground.work to
  any recipient, as fast as they can issue GET requests. Three consequences, in order of cost:
  the domain becomes a spam source and its sending reputation is destroyed, which breaks every
  transactional email the product depends on, including invitations, magic sign-in links and
  report notifications; the Resend quota and bill are consumed by a stranger; and the product's
  own name is attached to whatever the abuse looks like.
Evidence: `httpAdapter.get('/health/email', ...)` at main.ts:192, calling `resend.emails.send`
  at main.ts:204 with `to: [String(req.query.to)]`. No guard is applied to httpAdapter routes.
  Live: `curl http://localhost:3000/health/email` returns `{"error":"Pass ?to=your@email.com"}`
  with no auth header supplied.
  The comment above the route reads "Safe to leave in: no auth bypass, no data exposure, just a
  test send to an explicit address." The comment is wrong on the point that matters.
Confidence: High
```

```
ID: P0-002
Severity: Major
Axis: Security
Location: api/src/main.ts:178-188
Observed: GET /health/ai is unauthenticated and calls `AnthropicService.healthCheck()`, which
  makes a real generation request to Gemini on every call. Verified live: returns 200 with no
  auth header.
Expected: a health check that costs money per call is authenticated, or cached, or does not
  touch the model.
Impact: anyone can make the product spend on model calls at the rate they can issue requests.
  It also returns the configured model names, which is minor information disclosure.
Evidence: `httpAdapter.get('/health/ai', ...)` at main.ts:178, calling `svc.healthCheck()` at
  main.ts:182, which the service documents as deliberately making a real call.
  Live: `curl http://localhost:3000/health/ai` returns 200 with no auth header.
Confidence: High
```

Neither route was introduced today. Both predate this session.
