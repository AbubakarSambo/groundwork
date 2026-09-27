import { Injectable, Logger } from '@nestjs/common';
import * as dns from 'dns';
import {
  whatToFetch,
  isOutThere,
  isReadableType,
  textOutOf,
  looksLikeASignInPage,
  MOST_WE_WILL_READ,
  GIVE_UP_AFTER_MS,
  MOST_REDIRECTS,
} from './whether-we-can-read-it';
import { withoutBankDetails } from './bank-details-are-never-kept';

export type WhatCameBack =
  | { read: true; text: string; from: string }
  | { read: false; because: string };

/**
 * FETCHING SOMETHING SOMEBODY PASTED.
 *
 * The rules and the reasons are in `whether-we-can-read-it.ts`; this is the part
 * that touches the network, and it is deliberately the only part that does.
 *
 * FAILING IS A NORMAL OUTCOME HERE, not an error. Most links are private, and a
 * private link is the product working — the person is told we could not read it
 * and the link is recorded instead. Nothing here throws.
 */
@Injectable()
export class ReadItIfWeCanService {
  private readonly logger = new Logger(ReadItIfWeCanService.name);

  async read(pastedUrl: string): Promise<WhatCameBack> {
    const plan = whatToFetch(pastedUrl);
    if (!plan.fetchable) return { read: false, because: plan.because };

    let url = plan.url;

    for (let hop = 0; hop <= MOST_REDIRECTS; hop++) {
      /* EVERY hop is checked, not just the first. A public host that redirects to
         a private one is the standard way past a check done once. */
      const safe = await this.resolvesSomewherePublic(new URL(url).hostname);
      if (!safe) return { read: false, because: 'that address is not on the public internet' };

      let response: Response;
      try {
        response = await fetch(url, {
          redirect: 'manual',
          signal: AbortSignal.timeout(GIVE_UP_AFTER_MS),
          headers: { accept: 'text/plain, text/html, text/markdown, application/json' },
        });
      } catch (err: any) {
        return { read: false, because: 'nothing answered at that address' };
      }

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const next = response.headers.get('location');
        if (!next) return { read: false, because: 'that address redirected to nowhere' };
        url = new URL(next, url).toString();
        continue;
      }

      if (!response.ok) return { read: false, because: 'it is not readable without signing in' };

      const contentType = response.headers.get('content-type');
      if (!isReadableType(contentType)) {
        return { read: false, because: 'it is not a kind of file I can read as text' };
      }

      /* The header is a claim; the body is the fact. Both are capped, because a
         server that lies about its length is the one worth capping. */
      const claimed = Number(response.headers.get('content-length') ?? 0);
      if (claimed > MOST_WE_WILL_READ) return { read: false, because: 'it is too big to read here' };

      const body = await this.atMost(response, MOST_WE_WILL_READ);
      if (body === null) return { read: false, because: 'it is too big to read here' };

      const text = textOutOf(body, contentType!);
      if (!text) return { read: false, because: 'there was no text in it' };

      /* A private Drive link answers 200 with a login page. Storing that means
         answering about the contract in the words "Sign in to continue". */
      if (looksLikeASignInPage(text)) {
        return { read: false, because: 'it is not readable without signing in' };
      }

      /* With its bank details already gone, before the assistant keeps it as a document. See
         bank-details-are-never-kept. */
      return { read: true, text: withoutBankDetails(text), from: plan.asked };
    }

    return { read: false, because: 'that address redirected too many times' };
  }

  /** Every address the name resolves to has to be public. One private answer is a refusal. */
  private async resolvesSomewherePublic(hostname: string): Promise<boolean> {
    try {
      const addresses = await dns.promises.lookup(hostname, { all: true });
      return addresses.length > 0 && addresses.every((a) => isOutThere(a.address));
    } catch {
      return false;
    }
  }

  /** Reads the body, stopping at the cap rather than after it. */
  private async atMost(response: Response, cap: number): Promise<string | null> {
    const reader = response.body?.getReader();
    if (!reader) return null;

    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > cap) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
}
