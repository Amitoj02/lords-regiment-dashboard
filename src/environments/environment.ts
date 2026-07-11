/**
 * Development environment. The API is same-origin: `ng serve` (or the nginx
 * container in prod) proxies `/api` to the backend, so a relative base URL works
 * everywhere and there is no CORS. See proxy.conf.json (host) /
 * proxy.conf.docker.json (container).
 */
export const environment = {
    production: false,
    /** Relative, same-origin API base (proxied to the NestJS backend). */
    apiBaseUrl: '/api',
};
