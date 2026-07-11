/**
 * Production environment. Same-origin `/api` — the nginx web container proxies
 * it to the api container over the compose network (no CORS, no hard-coded host).
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api',
};
