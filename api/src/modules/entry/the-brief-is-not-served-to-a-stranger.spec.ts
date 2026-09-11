import { readFileSync } from 'fs';
import { join } from 'path';

/** A public route took a joinToken from the body and put the organiser's brief into the prompt for whoever supplied it. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const service = strip(readFileSync(join(__dirname, 'entry.service.ts'), 'utf8'));
const controller = strip(readFileSync(join(__dirname, 'entry.controller.ts'), 'utf8'));
const client = strip(readFileSync(join(__dirname, '..', '..', '..', '..', 'client', 'src', 'api', 'entry.ts'), 'utf8'));

describe('the chat route', () => {
  it('takes no join token and looks no ground up by one', () => {
    const chat = service.slice(service.indexOf('async chat('), service.indexOf('private async guardedReply('));
    expect(chat).not.toContain('joinToken');
    expect(chat).not.toContain('brief');
    expect(controller.slice(controller.indexOf('class EntryChatDto'), controller.indexOf('class EntryOnboardDto'))).not.toContain('joinToken');
  });
  it('and the client no longer has a typed door to reintroduce it', () => {
    const chatFns = client.slice(client.indexOf('chat: ('), client.indexOf('classifyIntent:'));
    expect(chatFns).not.toContain('joinToken');
  });
});
