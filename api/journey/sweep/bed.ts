/**
 * THE TEST BED'S COMMAND LINE (user journey sweep, 7 October 2026).
 *
 *   cd api && SWEEP=a npx ts-node -T journey/sweep/bed.ts <command> ...      (SWEEP=b for the other copy; a is the default)
 *
 *   up [--no-api] [--real-scheduler]     start the mail catcher, the WhatsApp recorder and the API
 *   down [--api-only]                    stop them (the database is left as it is); --api-only keeps the mail and WhatsApp records
 *   status                               what is running, on which ports
 *
 *   whatsapp send <number> <text...>     write to Groundwork's number as that person, signed; prints what came back
 *        [--image file] [--document file] [--caption text] [--reply-to <message id>] [--org <id>] [--bad-signature] [--no-wait]
 *   whatsapp sent <number> [--since n]   what Groundwork sent that number (and `whatsapp mark` for a "since")
 *   whatsapp mark                        the position in the recorded sends now
 *
 *   mail <address> [--links]             the mail that reached that address, newest first
 *   mail link <address> [--match text]   the first link in the newest mail to that address
 *   mail clear                           forget all mail
 *
 *   clock                                what time the API thinks it is
 *   clock advance <1d|3h|30m> [--skip pattern ...] [--only pattern ...]   move on and run every job that falls in between
 *   clock advance <1d> --fast            the same, leaving out the jobs that write reports and patterns with the model (they take minutes each)
 *   clock advance --to <date and time>
 *   clock set --to <date and time> | --by <1d> | --reset                  move the clock only; no job runs
 *   clock jobs                           the scheduled jobs and their times
 *   clock run <Class.method>             run one job now, as the scheduler does
 *
 *   log mark                             remember where the API's log is now
 *   log warnings [--since <position>] [--all]    every line at warn or error level since the last mark
 */
import {
  bedDown, bedStatus, bedUp, clearMail, clockNow, linkFor, logMark, logWarnings, mailTo, moveTheClock, runJob, scheduledJobs, sendWhatsApp, sentToNumber, setTheClock, whatsAppMark,
} from './bed-lib';
import { theBed } from './the-test-bed';

function parse(argv: string[]) {
  const pos: string[] = []; const flags: Record<string, string[]> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2); const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) (flags[k] ??= []).push('true'); else { (flags[k] ??= []).push(next); i += 1; }
    } else pos.push(a);
  }
  return { pos, flags, flag: (k: string) => flags[k]?.[0], has: (k: string) => k in flags };
}

/** The jobs that write with the model for every check-in in every organisation (minutes each, tens of minutes on the big copy). --fast leaves them out, and the quiet minute-by-minute delivery job. */
const FAST_SKIPS = ['PatternsCron\\.sweep', 'CompanyPictureService\\.nightly', 'RoleGapNotesService\\.nightly', 'ReportsService\\.', 'GroundsCron\\.synthesisBackstop', 'WebhooksCron\\.deliverDue'];
const show = (v: unknown) => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2));

async function main() {
  const bed = theBed();
  const [cmd, ...rest] = process.argv.slice(2);
  const a = parse(rest);
  switch (cmd) {
    case 'up': { await bedUp(bed, { api: !a.has('no-api'), realScheduler: a.has('real-scheduler') }); return show(bedStatus(bed)); }
    case 'down': { const s = await bedDown(bed, { apiOnly: a.has('api-only') }); return show(`Stopped: ${s.join(', ') || 'nothing was running'}.`); }
    case 'status': return show(bedStatus(bed));

    case 'whatsapp': {
      const [sub, number, ...words] = a.pos;
      if (sub === 'mark') return show({ mark: await whatsAppMark(bed) });
      if (sub === 'sent') {
        if (!number) throw new Error('Usage: whatsapp sent <number> [--since n]');
        return show(await sentToNumber(bed, number, Number(a.flag('since') ?? 0)));
      }
      if (sub === 'send') {
        if (!number) throw new Error('Usage: whatsapp send <number> <text...>');
        const what = a.has('image') ? { type: 'image' as const, file: a.flag('image')!, caption: a.flag('caption') }
          : a.has('document') ? { type: 'document' as const, file: a.flag('document')!, caption: a.flag('caption') }
          : { type: 'text' as const, text: words.join(' ') };
        if (what.type === 'text' && !what.text) throw new Error('Say what to write: whatsapp send <number> <text...>');
        const r = await sendWhatsApp(bed, number, what, { organizationId: a.flag('org'), replyToMessageId: a.flag('reply-to'), badSignature: a.has('bad-signature'), wait: !a.has('no-wait') });
        return show({ webhookStatus: r.status, messageId: r.messageId, replies: r.replies });
      }
      throw new Error('whatsapp send | sent | mark');
    }

    case 'mail': {
      const [first, second] = a.pos;
      if (first === 'clear') return show(await clearMail(bed));
      if (first === 'link') { if (!second) throw new Error('Usage: mail link <address> [--match text]'); return show((await linkFor(bed, second, a.flag('match'))) ?? '(no link)'); }
      if (!first) throw new Error('Usage: mail <address>');
      const mails = await mailTo(bed, first);
      return show(mails.map((m) => ({ received: m.received, from: m.from, to: m.to, subject: m.subject, links: m.links, ...(a.has('links') ? {} : { text: m.text }) })));
    }

    case 'clock': {
      const [sub, arg] = a.pos;
      if (!sub) return show(await clockNow(bed));
      if (sub === 'jobs') return show(await scheduledJobs(bed));
      if (sub === 'run') { if (!arg) throw new Error('Usage: clock run <Class.method>'); return show(await runJob(bed, arg)); }
      if (sub === 'set') return show(await setTheClock(bed, { to: a.flag('to'), by: a.flag('by'), reset: a.has('reset') }));
      if (sub === 'advance') {
        let last = 0; let lastDone = -1;
        const r = await moveTheClock(bed, { to: a.flag('to'), by: arg, skip: [...(a.flags['skip'] ?? []), ...(a.has('fast') ? FAST_SKIPS : [])], only: a.flags['only'], onProgress: (p) => { if ((p.done !== lastDone && Date.now() - last > 15_000) || Date.now() - last > 120_000) { last = Date.now(); lastDone = p.done; console.error(`  ... ${p.done} of ${p.planned} jobs run${p.current ? `, now ${p.current}` : ''}`); } } });
        return show({ now: r.apiNow, from: r.from, jobsRun: r.ran, failed: r.failed, runs: a.has('runs') ? r.runs : undefined });
      }
      throw new Error('clock | clock advance | clock set | clock jobs | clock run');
    }

    case 'log': {
      const [sub] = a.pos;
      if (sub === 'mark') return show({ mark: logMark(bed), log: bed.logFile });
      if (sub === 'warnings') {
        const r = logWarnings(bed, { since: a.has('since') ? Number(a.flag('since')) : undefined, all: a.has('all') });
        for (const l of r.lines) console.log(l.line);
        console.log(`\n${r.lines.length} line(s) at warn or error level since position ${r.since} in ${bed.logFile}${r.devMailHidden ? ` (${r.devMailHidden} expected "[DEV EMAIL]" lines not listed; use --all to list them)` : ''}.`);
        return;
      }
      throw new Error('log mark | log warnings');
    }
    default:
      console.log(require('fs').readFileSync(__filename, 'utf8').split('*/')[0]);
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
