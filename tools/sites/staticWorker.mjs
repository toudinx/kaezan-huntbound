/**
 * Cloudflare Worker entrypoint for the Vite game artifact published by Sites.
 */
const worker = {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};

export default worker;
