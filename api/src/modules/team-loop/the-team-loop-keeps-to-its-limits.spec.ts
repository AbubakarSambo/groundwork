import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * WHAT THE TEAM LOOP MAY AND MAY NOT DO, HELD BY READING ITS SOURCE (plan 19; the product's rule that fixed rules own what is sent, approved or seen).
 * A test that only runs the code can pass while a path nobody ran does the opposite.
 *   1. a model is reached in one file, and only reads: it is never handed a way to send, write or approve;
 *   2. everything goes out through the one mail door and the one WhatsApp gate;
 *   3. the private help is only ever WRITTEN to the person's own history here, and read by nothing in this folder;
 *   4. what is read of what was sent is read for one person's batch or one person's messages, never her own material,
 *      except one named allowance (Hafsah, 21 November 2026: "Yes, allow it"): the files other team members sent are read
 *      in what-their-reply-says.ts, only to check whether one of them shows a result a person claims. Only the files
 *      team members sent, never what she forwarded herself, and the person is never told about them.
 *   5. a second named allowance (Hafsah, 22 November 2026: "great do you recommendation"): what she or the assistant who acts for her forwards is
 *      read by the team mind, in one read (readWhatIsOutstanding), only to put what is still to be done on her own list. Each item is kept only
 *      where code finds it in the file's own words; an instruction inside the file is never done, only told back to her. The read is handed the
 *      texts of one batch by the onboarding code, and itself reads, writes and sends nothing; only she and her assistant see the list.
 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const here = __dirname;
const own = readdirSync(here).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts') && f !== 'a-world-for-the-team-loop.ts');
const read = (f: string) => strip(readFileSync(join(here, f), 'utf8'));

describe('the team loop', () => {
  it('reaches a model in the model seam, and in the service that hands the claim probe its engine, and nowhere else', () => {
    const reaching = own.filter((f) => /anthropic|\.extract\(|\.respond\(|respondWith/i.test(read(f)));
    expect(reaching.sort()).toEqual(['team-loop.service.ts', 'the-team-mind.ts']);
  });

  it('goes out only through the one mail door and the one WhatsApp gate', () => {
    for (const f of own) expect(read(f)).not.toMatch(/\bresend\b|nodemailer|graph\.facebook|fetch\(|axios|createTransport/i);
    const service = read('team-loop.service.ts');
    expect(service).toMatch(/this\.email\.sendTheRoutineMessageByEmail/);
    expect(service).toMatch(/this\.email\.sendTheIntroduction/);
    expect(service).toMatch(/this\.whatsapp\.sendFor/);
  });

  it('only writes what a team member said to the coach, into their own private history, and reads it nowhere', () => {
    for (const f of own) {
      const src = read(f);
      if (f === 'help-the-team-member.ts') { expect(src).toMatch(/assistantTurn\.create/); expect(src).not.toMatch(/assistantTurn\.(?:find|count|aggregate|group)/); } else expect(src).not.toMatch(/assistantTurn/);
    }
  });

  it('reads a person\'s material only for that person or for one batch, never what she sent herself', () => {
    for (const f of own) {
      for (const call of read(f).match(/principalMaterial\.find\w*\(\{[^}]*\}[^)]*\)/g) ?? []) expect(call).toMatch(/contact:|batchId/);
    }
  });

  it('turns a team member\'s words into a record only through words they wrote', () => {
    const mind = read('the-team-mind.ts');
    expect(mind).toMatch(/isTheirOwnWords\(c\.text, text\)/);
    expect(mind).toMatch(/isTheirOwnWords\(o\.text, text\)/);
    expect(mind).toMatch(/isTheirOwnWords\(b\.text, text\)/);
  });

  it('reads other team members\' files in one place only, to check a claimed result, and only files team members sent (Hafsah, 21 November 2026)', () => {
    /* Every read of principal material that is not tied to one contact or one batch is the one named allowance. */
    const crossReads = own.filter((f) => /principalMaterial[\s\S]{0,80}findMany[\s\S]{0,200}startsWith:\s*'contact:'/.test(read(f)));
    expect(crossReads).toEqual(['what-their-reply-says.ts']);
    const reply = read('what-their-reply-says.ts');
    /* Only kept files that team members sent: never what she forwarded, never messages. */
    expect(reply).toMatch(/principalMaterial[\s\S]{0,80}findMany\?\.\(\{ where: \{ principalUserId: contact\.principalUserId, state: 'kept', kind: 'file', fromUserId: \{ startsWith: 'contact:' \} \}/);
  });

  it('reads what she forwarded only to put what is outstanding on her own list, in the file\'s own words, and does nothing it says (Hafsah, 22 November 2026)', () => {
    const service = read('team-loop.service.ts');
    const theRead = /async whatIsOutstandingIn\(texts: string\[\]\)[\s\S]*?\n  \}\n/.exec(service)?.[0] ?? '';
    expect(theRead).toMatch(/this\.mind\.readWhatIsOutstanding/);
    /* It is handed the texts; it reads no table, writes nothing and sends nothing itself. */
    expect(theRead).not.toMatch(/prisma|this\.db|\.create\(|\.update|\.upsert|email|whatsapp|send/i);
    const mind = read('the-team-mind.ts');
    /* What comes back is kept only where code finds it in what was forwarded. */
    expect(mind).toMatch(/!!i\.what && isTheirOwnWords\(i\.what, text\)/);
    expect(mind).toMatch(/!!x && isTheirOwnWords\(x, text\)/);
  });
});
