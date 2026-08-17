/**
 * Cloudflare Worker entrypoint for the Vite game artifact published by Sites.
 */
const worker = {
  async fetch(request, env) {
    const assetUrl = new URL(request.url);
    if (assetUrl.pathname === '/') {
      assetUrl.pathname = '/index.html';
    }

    return env.ASSETS.fetch(new Request(assetUrl, request));
  },
};

export default worker;
