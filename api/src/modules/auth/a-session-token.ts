/**
 * ONE SHAPE FOR A SESSION TOKEN, MINTED IN THREE PLACES.
 *
 * `generateToken` in AuthService was one of three mint sites; the participant-invite sign-in and the
 * entry handover called `jwt.sign` themselves with a hand-copied payload. Anything added to the
 * token - the epoch that lets a password reset end other sessions, the `via` the back-office door
 * reads - had to be added three times or two of the three doors would 401 on deploy (planaudit_b
 * C16). So the claims are built here and the three sites sign what this returns.
 */
export type SignedInVia = 'password' | 'link' | 'google';

export interface ASessionHolder {
  id: string;
  email: string;
  organizationId: string;
  role: string;
  /** Compared on every request. Absent only on a row read with a `select` that forgot it; treated as 0. */
  tokenEpoch?: number | null;
}

export interface SessionClaims {
  sub: string;
  email: string;
  organizationId: string;
  role: string;
  via: SignedInVia;
  epoch: number;
}

export function sessionClaims(user: ASessionHolder, via: SignedInVia): SessionClaims {
  return {
    sub: user.id,
    email: user.email,
    organizationId: user.organizationId,
    role: user.role,
    via,
    epoch: user.tokenEpoch ?? 0,
  };
}
