import { describe, expect, it } from 'vitest';

import worker from '../../tools/sites/staticWorker.mjs';

describe('Sites static worker', () => {
  it('serves the root shell from index.html', async () => {
    const requestedUrls: string[] = [];
    const response = await worker.fetch(new Request('https://site.test/'), {
      ASSETS: {
        fetch: async (request: Request) => {
          requestedUrls.push(request.url);
          return new URL(request.url).pathname === '/index.html'
            ? new Response('shell')
            : new Response('not found', { status: 404 });
        },
      },
    });

    expect(response.status).toBe(200);
    expect(requestedUrls).toEqual(['https://site.test/index.html']);
  });
});
