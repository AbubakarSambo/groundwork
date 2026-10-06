import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * A TURN STORED BEFORE A RULE EXISTED KEEPS WHATEVER IT WAS SAVED WITH.
 *
 * `forHumans` runs when a reply is generated. So the strip that removes "That Zainab has not been
 * told is now on the record" - added after that sentence was photographed - had never seen the row
 * it was written for, and scrolling back through the finished session still showed it.
 *
 * CLEANED AT THE READ, NOT MIGRATED. What is stored is what a person was actually told, and editing
 * it changes the record of a conversation to say something that was not said - on a product whose
 * whole claim is that it keeps what people said. Cleaning on the way out changes only what is
 * shown, and it covers every old session at once rather than every one a migration remembered.
 *
 * AND ONLY OUR OWN TURNS. `forHumans` strips OUR ceremony and house style. Running it over
 * somebody's account would be the product editing them, which is the one thing it must never do.
 */
/*
 * COMMENTS OUT BEFORE ANYTHING IS MATCHED. The note beside the change quotes every phrase asserted
 * below, so without this the guard would pass on the explanation alone - which is the failure the
 * repository has a rule about, and it caught this file.
 */
const SRC = readFileSync(join(__dirname, 'conversation.service.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

describe('what was stored is read through today’s rules', () => {
  it('cleans the AI’s turns when a session is opened', () => {
    /* The row is spread as `turn` since the end card: its unwritten record lines are taken off first. */
    expect(SRC).toMatch(/t\.role === TurnRole\.AI \? \{ \.\.\.turn, content: forHumans\(t\.content\) \} : turn/);
    expect(SRC).toMatch(/turns: turns\.map\(asRead\)/);
  });

  it('and the prior session shown alongside a correction', () => {
    /* A correction session renders the earlier turns read-only beside the new ones. Cleaning one
       and not the other would put the ceremony back on the half being corrected. */
    expect(SRC).toMatch(/priorTurns: priorTurns\.map\(asRead\)/);
  });

  it('and everywhere else a stored transcript is handed out', () => {
    expect(SRC).toMatch(/content: t\.role === TurnRole\.AI \? forHumans\(t\.content\) : t\.content/);
  });

  it('never touches what a person wrote', () => {
    /*
     * THE LINE THIS FILE EXISTS TO HOLD. Every clean is conditional on the turn being the AI's.
     * A `forHumans` applied to a PERSON turn anywhere here would be the product rewriting somebody's
     * own account of their work.
     */
    const cleans = SRC.match(/forHumans\(t\.content\)/g) ?? [];
    expect(cleans.length).toBeGreaterThan(0);
    /* Each one sits behind an AI check on the same line or the line above. */
    for (const line of SRC.split('\n')) {
      if (line.includes('forHumans(t.content)')) {
        expect(line).toContain('TurnRole.AI');
      }
    }
  });
});
