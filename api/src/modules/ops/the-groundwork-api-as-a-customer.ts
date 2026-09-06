/**
 * The Groundwork API, called the way any customer's system calls it.
 *
 * This file is the whole reason the ops system exists in the shape it does. It
 * talks HTTP to a URL, exchanges a client id and secret for a token, and sends
 * JSON — with no more access to Groundwork than a stranger's ERP would have.
 *
 * WHY OVER HTTP, WHEN THE PRODUCT IS IN THE SAME PROCESS. Because importing
 * the service would be faster, would work, and would prove nothing. Every
 * integration problem a customer hits — the token expiring mid-batch, a 403
 * from a scope nobody granted, a payload the validator rejects for a reason the
 * error does not explain — is invisible from inside the process. We would ship
 * an API we had never used.
 *
 * So: no import of any product module, and the boundary spec enforces it.
 */

export interface ApiCredentials {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export interface PushResult {
  ok: boolean;
  status: number;
  /** What the API said, kept verbatim: its refusals are the product's own words. */
  body: unknown;
}

interface Token {
  accessToken: string;
  /** When it stops working, as a timestamp rather than a duration. */
  expiresAt: number;
  scopes: string[];
}

/**
 * A token is reused until shortly before it expires.
 *
 * The margin is not politeness. A token fetched with one second left works for
 * the request that fetches it and fails for the next one in the same batch,
 * which produces a 401 halfway through a push and a half-written state that
 * looks like a bug in the payload.
 */
const REFRESH_MARGIN_MS = 30_000;

export class GroundworkApiClient {
  private token: Token | null = null;

  constructor(
    private readonly credentials: ApiCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** What this credential is actually allowed to do, once a token has been taken. */
  scopes(): string[] {
    return this.token?.scopes ?? [];
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - REFRESH_MARGIN_MS) {
      return this.token.accessToken;
    }

    const response = await this.fetchImpl(`${this.credentials.baseUrl}/api/org/v1/oauth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
      }),
    });

    const body = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      scope?: string;
      message?: string;
    };

    if (!response.ok || !body.access_token) {
      throw new Error(
        `Groundwork would not issue a token: ${response.status} ${body.message ?? 'no reason given'}`,
      );
    }

    this.token = {
      accessToken: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 0) * 1000,
      scopes: (body.scope ?? '').split(' ').filter(Boolean),
    };
    return this.token.accessToken;
  }

  private async send(path: string, method: 'POST' | 'PUT', payload: unknown, idempotencyKey?: string): Promise<PushResult> {
    const token = await this.accessToken();
    const response = await this.fetchImpl(`${this.credentials.baseUrl}/api/org/v1${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        ...(idempotencyKey ? { 'idempotency-key': idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    /**
     * A 401 mid-batch means the token went stale despite the margin. Retried
     * once with a fresh one, because the alternative is a partial push whose
     * failure looks like a bad payload.
     */
    if (response.status === 401 && this.token) {
      this.token = null;
      return this.send(path, method, payload, idempotencyKey);
    }

    return {
      ok: response.ok,
      status: response.status,
      body: await response.json().catch(() => null),
    };
  }

  /**
   * A person, in the shape an identity provider sends.
   *
   * `emails` rather than `userName`, and this is not a detail. Sent with only a
   * userName the call returns 201 and stores no email at all — and the failure
   * appears three calls later, opening a check-in, as "that person has no email
   * address here". Nothing points back at the push that caused it.
   */
  pushPerson(person: { externalId: string; displayName: string; email: string }) {
    return this.send('/scim/v2/Users', 'POST', {
      externalId: person.externalId,
      userName: person.email,
      displayName: person.displayName,
      emails: [{ value: person.email, primary: true }],
      active: true,
    });
  }

  /**
   * Our key results, as objectives ON a check-in.
   *
   * The step the first version of this adapter did not have, which is why every
   * evidence push it ever made matched nothing. `text` rather than `described`,
   * and `kind` is required — TARGET, because a key result is a number crossing
   * a line rather than something somebody promised.
   */
  seedObjectives(
    checkInId: string,
    personExternalId: string,
    objectives: Array<{ externalId: string; text: string; measure?: string; target?: string }>,
  ) {
    return this.send(`/grounds/${checkInId}/objectives`, 'POST', {
      personExternalId,
      objectives: objectives.map((o) => ({ ...o, kind: 'TARGET' })),
    });
  }

  pushSubject(subject: object, idempotencyKey?: string) {
    return this.send('/subjects', 'POST', subject, idempotencyKey);
  }

  /**
   * WHAT THE COMPANY DECIDED, AS CARDS.
   *
   * One at a time rather than in a batch: a decision that will not go through
   * should be named in the result, and a batch that half-succeeds tells you a
   * number. The volume is five or six, so there is nothing to save.
   */
  pushCard(cardIn: object) {
    return this.send('/knowledge/cards', 'POST', cardIn);
  }

  pushEvidence(evidence: object[]) {
    return this.send('/evidence', 'PUT', { evidence });
  }

  pushInteractions(sourceSystem: string, interactions: object[]) {
    return this.send('/interactions', 'PUT', { sourceSystem, interactions });
  }
}
