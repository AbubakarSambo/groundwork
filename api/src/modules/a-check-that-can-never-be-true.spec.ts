import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * THE BUG CLASS THAT COST G37 ITS ENTIRE PURPOSE.
 *
 * The context chat asks "how long should this run?" when `timelineDays` is absent. The column is
 * `NOT NULL`. So the question the feature exists to ask had never once been asked, and nothing
 * failed: no test broke, no error logged, no user complained, because the branch simply never ran.
 *
 * That is the shape worth guarding. A guard that can never be true is invisible in every way a
 * normal bug is visible - it has no failure mode, only an absence. The only way to catch it is to
 * compare what the code checks for against what the schema permits.
 *
 * WHAT THIS DOES. For every non-nullable, non-Boolean column, look for `if (!thing.column)` or
 * `if (thing.column === null)` in any file that reads that model. Booleans are excluded because
 * `!flag` is how a boolean is meant to be read.
 *
 * WHAT IT DELIBERATELY CANNOT DO. It matches on field NAME, not on what the object actually is, so a
 * DTO field or a local variable sharing a column's name looks the same to it. Every hit needs a human
 * read; the four below were all checked and are all fine. The point is that a NEW hit is a question
 * somebody has to answer, which is exactly the attention G37 never got.
 */
const SRC = join(__dirname, '..');
const SCHEMA = readFileSync(join(__dirname, '../../prisma/schema.prisma'), 'utf8');

/** column name -> per-model spec, so nullability is read from the schema rather than assumed. */
const perModel = new Map<string, Map<string, { type: string; optional: boolean }>>();
for (const block of SCHEMA.split('\nmodel ').slice(1)) {
  const model = block.split(/\s/)[0];
  const fields = new Map<string, { type: string; optional: boolean }>();
  for (const raw of block.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith('@@') || line.startsWith('}')) continue;
    const m = /^(\w+)\s+([A-Za-z]+)(\[\])?(\?)?\s*(.*)$/.exec(line);
    if (!m) continue;
    const [, field, type, arr, opt, rest] = m;
    if (arr || /relation/.test(rest)) continue;
    fields.set(field, { type, optional: !!opt });
  }
  perModel.set(model, fields);
}

const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.ts') && !p.includes('.spec.')) files.push(p);
  }
};
walk(SRC);
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Hits that have been read and are fine. Each is a name collision: the thing being checked is a
 * request body or a local, not the column the name matches.
 */
const CHECKED_AND_FINE = new Set([
  /*
   * A NAME COLLISION, NOT A CHECK THAT CANNOT BE TRUE. This file reads both OpsPerson and
   * OpsPersonAccount, and both have a `userId`. The check is `if (!person.userId)` on OpsPerson,
   * where it is nullable and the whole point: a person on the team with no account connected.
   * The audit stops at the first model with a matching field name and picks the wrong one.
   */
  'modules/ops/the-door-into-the-ops-system.ts:userId',
  'modules/entry/entry.service.ts:email',           // the request body's email, before a user exists
  /*
   * The REQUEST BODY's join token in askToJoin, checked before anything is looked up. It collides on
   * the name with `PendingJoin.joinToken`, which is non-nullable precisely because a row is only ever
   * created once the caller supplied one - which is what this check enforces. (The chat route's
   * joinToken branch, which served the brief to a stranger, is gone: fix plan D10.)
   */
  'modules/entry/entry.service.ts:joinToken',
  'modules/entry/entry.service.ts:userId',          // GroundParticipant.userId, which IS nullable
  /*
   * The same column and the same collision, in the file that owns it. `if (!participant.userId)` in
   * `getParticipantCheckInUrl` - GroundParticipant.userId is `String?`, null until somebody accepts
   * their invite, and that branch is the whole point of the method: it is how a lead is sent to the
   * invite link instead. It matched `EmailVerificationToken.userId`, which is non-nullable, on the
   * name alone.
   */
  'modules/grounds/grounds.service.ts:userId',
  /*
   * The same kind of collision, one table along. `if (!c.participantId)` and `!same.participantId`
   * in the paste writer are `GroundCommitment.participantId`, which is `String?` on purpose: an
   * action nobody owns keeps no owner rather than being attached to the nearest name, and placing
   * an owner on one later is the branch this guards. The audit matched `CheckIn.participantId`,
   * which is non-nullable, on the name alone.
   */
  'modules/grounds/grounds.service.ts:participantId',
  /*
   * THE THIRD SITE OF THE SAME COLLISION. Counting how many check-ins each person on the People
   * page is on walks `GroundParticipant` rows, and `userId` there is `String?` - null for anybody
   * still holding an invitation, which is exactly who must not be counted as a member. Matched
   * `EmailVerificationToken.userId` on the name.
   */
  'modules/users/users.service.ts:userId',
  'modules/conversation/conversation.service.ts:text', // a chat message, not a stored note
  /*
   * Both of these validate the INCOMING HTTP PAYLOAD from a customer's system, not a row read back.
   * The column being non-nullable is what the check enforces rather than something it can lean on -
   * a push arriving with no title is exactly the case, and trusting the schema there would mean
   * trusting a stranger's request to have obeyed it.
   */
  'modules/subjects/subjects.service.ts:externalId',
  'modules/subjects/subjects.service.ts:title',
  /*
   * The same shape a third time, and for the same reason: `personExternalId` on an INCOMING push
   * from a customer's sales system. The column being non-nullable is what this check enforces, not
   * something it can lean on - a record arriving with no person is exactly the case, and trusting
   * the schema there would mean trusting a stranger's request to have obeyed it.
   */
  'modules/public-api/what-happened-with-a-customer.service.ts:personExternalId',
  /*
   * Same shape again: `occurredAt` is non-nullable on the row and entirely absent from a push that
   * forgot it. Defaulting a missing one to now would date every backfilled event to the day it was
   * uploaded, which is the whole reason the check refuses instead.
   */
  'modules/detectors/roles-and-their-action.service.ts:occurredAt',
  /*
   * `if (!dto.role)` in `update()`. `UpdateUserDto.role` is OPTIONAL - a caller changing somebody's
   * name sends no role at all - and the check is what stops an absent one being written as a
   * change. It matched `User.role`, which is non-nullable, because the same file writes that column
   * a few lines further down. The name-collision case this file's own header describes.
   */
  'modules/users/users.service.ts:role',
  /*
   * `!!role` in who-may-decide. `roleIn` returns `m?.role ?? null`: the column is non-nullable, but a
   * person with no membership in the organisation has no row at all, so the value really is null
   * and the check is what keeps such a person from deciding. The same name collision as above.
   */
  'modules/suites/who-may-decide.ts:role',
  /*
   * Three of the name-collision false positives this file's own header warns about, all in one
   * service because it reads Person, User and PersonObjective together.
   *
   * `email`  - the check is `!person.email`, and `Person.email` IS nullable. It matched
   *            `User.email`, which is not, because the same file also reads `prisma.user`.
   * `externalId` and `text` - both are fields on the INCOMING request body from a customer's system,
   *            validated before anything is written. The column being non-nullable is what the check
   *            enforces, not something it can lean on: trusting the schema there would mean trusting
   *            a stranger's request to have obeyed it.
   */
  'modules/public-api/grounds-by-api.service.ts:email',
  'modules/public-api/grounds-by-api.service.ts:externalId',
  'modules/public-api/grounds-by-api.service.ts:text',
  /*
   * `state` - a fourth of the same collision. The check is `!item.state` on the evidence payload
   * from a customer's system, a `Record<string, string | number>` that arrives from the wire. It
   * matched `ProposedChange.state`, an enum column this file also reads, because they share a name.
   */
  'modules/public-api/grounds-by-api.service.ts:state',
  /*
   * An argument that may legitimately be null, checked BEFORE deciding whether to write. A ground
   * participant with no identity-system id cannot be mirrored into the org layer, and the column
   * being non-nullable is exactly why the check is there - it is what stops the write, not
   * something the write can lean on.
   */
  'modules/assistant/a-commitment-carries-past-the-ground.ts:personExternalId',
  /*
   * The same shape again: an incoming payload from a customer's system, validated before anything
   * is written. The columns being non-nullable is what these checks ENFORCE, not something they can
   * lean on - a push arriving with no key is exactly the case.
   */
  'modules/knowledge/knowledge.service.ts:key',
  'modules/knowledge/knowledge.service.ts:title',
  /*
   * Request 76's work-item code. `if (!dto.kind || ...)` in `theWorkItemFields` checks
   * `WorkItemInput.kind`, an OPTIONAL field on the lead's own request body for adding or changing a
   * record (`kind?: string`), before anything is written - not a row read back. It matched
   * `WorkMention.kind`, a non-nullable enum column this file also reads, purely on the field name.
   */
  'modules/board/board.service.ts:kind',
  /*
   * `if (!status.roleName)` in `whereAmIUpTo`. `status` is what the onboarding service returns for
   * a person (`roleName: string | null`, null when no role is recorded for them, which is the
   * whole point of the branch: it says so instead of inventing a checklist). It matched the
   * non-nullable `roleName` on the role-interview and role-guide tables this file also reads,
   * purely on the field name. A name collision, not a check that can never be true.
   */
  'modules/assistant/assistant.service.ts:roleName',
  /*
   * A NAME COLLISION. `theSignInOf` takes a roster entry (`Person`), not a sign-in, and
   * `if (!person.email)` is the check that a roster entry with no address cannot be matched to a
   * sign-in by address. `Person.email` is `String?`; the audit matched `User.email`, which this file
   * also reads, purely on the field name.
   */
  'modules/whatsapp/one-number-for-a-person.ts:email',
  /*
   * A NAME COLLISION. `if (!ours.accessToken || !ours.phoneNumberId)` checks the platform's own
   * number, `OurNumber`, whose fields are optional because staff may not have saved them yet; that
   * is the check that says "not connected" instead of sending with an empty token. The audit matched
   * `WhatsAppConnection.accessToken`, a different, organisation-owned row that is always set.
   */
  'modules/whatsapp/whatsapp.service.ts:accessToken',
]);

function findHits() {
  const hits: string[] = [];
  for (const f of files) {
    const code = strip(readFileSync(f, 'utf8'));
    const rel = f.replace(SRC + '/', '');
    /** Only models this file actually reads, so an unrelated file's variables are not scanned. */
    const modelsHere = [...perModel.keys()].filter(m =>
      new RegExp(`prisma\\.${m[0].toLowerCase()}${m.slice(1)}\\.`).test(code),
    );
    if (!modelsHere.length) continue;

    const re = /if\s*\(\s*!(?:\w+(?:\??\.\w+)*)\.(\w+)\b|if\s*\(\s*(?:\w+(?:\??\.\w+)*)\.(\w+)\s*===?\s*null/g;
    for (const m of code.matchAll(re)) {
      const field = m[1] ?? m[2];
      for (const model of modelsHere) {
        const spec = perModel.get(model)!.get(field);
        if (!spec || spec.optional || spec.type === 'Boolean') continue;
        const key = `${rel}:${field}`;
        if (CHECKED_AND_FINE.has(key)) break;
        hits.push(`${key} (${model}.${field}: ${spec.type}, not nullable)`);
        break;
      }
    }
  }
  return [...new Set(hits)];
}

describe('nothing checks for an absence the schema forbids', () => {
  it('the audit finds no unexplained hits', () => {
    /**
     * If this fails, read the hit before changing it. Either the check is dead - the branch can never
     * run, and whatever it guards has never happened - or the column should be nullable, or it is
     * another name collision and belongs in CHECKED_AND_FINE with the reason.
     */
    expect(findHits()).toEqual([]);
  });

  it('and the audit itself still works', () => {
    /**
     * A guard that finds nothing because it is broken looks exactly like a guard that finds nothing
     * because the code is clean. This is the bite-check, permanently: `Ground.timelineDays` is Int and
     * not nullable, so the audit must recognise it as one.
     */
    const ground = perModel.get('Ground')!;
    expect(ground.get('timelineDays')).toEqual({ type: 'Int', optional: false });
    expect(ground.get('cadence')).toEqual({ type: 'Cadence', optional: false });
    /** And it must know a nullable one from a non-nullable one, or every check looks like a hit. */
    expect(ground.get('brief')?.optional).toBe(true);
    expect(perModel.get('GroundParticipant')!.get('userId')?.optional).toBe(true);
  });

  it('the two columns the original bug needed now exist', () => {
    // `timelineStated` / `cadenceStated` are what let the gap reader ask about a guess rather than
    // waiting for an absence that cannot happen.
    expect(perModel.get('Ground')!.get('timelineStated')).toEqual({ type: 'Boolean', optional: false });
    expect(perModel.get('Ground')!.get('cadenceStated')).toEqual({ type: 'Boolean', optional: false });
  });
});
