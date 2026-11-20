/**
 * BEING GUIDED THROUGH CONNECTING A PLATFORM (chat is king, section 8).
 *
 * Only an admin connects a platform, and it is done with an address that is a secret: anybody holding a Slack or Teams address can post
 * into that channel. So the guidance goes in chat, but the address is never typed into it, because what is typed into a chat is kept.
 * This says where each one stands, in words, and where to go to finish. It writes nothing.
 */
export const CONNECT_A_PLATFORM_PATTERNS: RegExp[] = [
  /\b(?:connect|link|hook\s+up|integrate|add)\s+(?:groundwork\s+)?(?:to\s+|with\s+)?(?:our\s+|my\s+|the\s+)?(?:slack|teams|microsoft\s+teams|whatsapp)\b/i,
  /\bhow\s+(?:do|can|would)\s+(?:i|we)\s+(?:connect|link|hook\s+up|integrate)\b/i,
  /\b(?:slack|teams|microsoft\s+teams|whatsapp)\s+(?:set\s*up|setup|connection|integration)\b/i,
  /\bconnect\s+(?:another|other|a|an|our)\s+(?:platform|tool|app|system)s?\b/i,
  /\bset\s*up\s+(?:slack|teams|microsoft\s+teams|whatsapp)\b/i,
];

export const ONLY_AN_ADMIN_CONNECTS = 'Only an admin connects Groundwork to another platform. Ask an admin in your organisation to do it, and they can ask me to take them through it. Nothing has changed.';

export interface AConnectionRow { kind: 'SLACK' | 'TEAMS'; enabled: boolean; lastError: string | null }

export function whichPlatform(message: string): 'slack' | 'teams' | 'whatsapp' | null {
  const t = (message ?? '').toLowerCase();
  if (/\bwhatsapp\b/.test(t)) return 'whatsapp';
  if (/\bslack\b/.test(t)) return 'slack';
  if (/\bteams\b/.test(t)) return 'teams';
  return null;
}

const NAME = { SLACK: 'Slack', TEAMS: 'Teams' } as const;

export function connectingSaid(rows: AConnectionRow[], which: 'slack' | 'teams' | 'whatsapp' | null): string {
  const out: string[] = [];
  const standing = (k: 'SLACK' | 'TEAMS') => {
    const r = rows.find((x) => x.kind === k);
    if (!r) return `${NAME[k]} is not connected.`;
    if (r.lastError) return `${NAME[k]} is connected, but the last notice did not arrive. Its address may have changed, so connect it again.`;
    return r.enabled ? `${NAME[k]} is connected and switched on.` : `${NAME[k]} is connected but switched off.`;
  };
  if (which === 'whatsapp') {
    out.push('WhatsApp is connected on the Connections page, where you give the number and the keys it needs. Once it is on, people check in by replying on WhatsApp, and they can ask me things there too.');
  } else if (which === 'slack' || which === 'teams') {
    out.push(standing(which === 'slack' ? 'SLACK' : 'TEAMS'));
    out.push(`To connect ${which === 'slack' ? 'Slack' : 'Teams'}, make an incoming webhook for the channel you want the notices in, then paste its address on the Integrations page. It arrives switched off, and you switch it on when you are ready.`);
  } else {
    out.push(`${standing('SLACK')} ${standing('TEAMS')}`);
    out.push('I can take you through Slack, Teams or WhatsApp. Say which one, for example "Connect Slack".');
  }
  out.push('Do not type the address or the keys into this chat, because what is typed here is kept. Paste them on the page, and I will tell you where it stands.');
  return out.join('\n\n');
}
