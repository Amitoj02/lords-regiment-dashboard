/**
 * /buycheats — the redirect half (T-0313). See index.html for the whole story.
 *
 * ── WHY THIS IS A FILE AND NOT AN INLINE <script> ───────────────────────────
 * Production serves `script-src 'self'` (Caddyfile in lords-dashboard-backend),
 * which blocks inline script outright. It is the same trap that pins
 * `optimization.styles.inlineCritical: false` in angular.json — and it fails
 * ONLY in production, because `ng serve` sends no CSP header, so an inline
 * version would work everywhere it was tested and nowhere it mattered. An
 * external same-origin script is allowed as-is.
 *
 * ── WHY NOT <meta http-equiv="refresh"> ─────────────────────────────────────
 * It needs no JavaScript and no second request, which is the tempting part. But
 * a meta refresh sits in the markup an unfurler parses, and some follow it —
 * one that does would unfurl youtu.be and hand the joke over. No crawler
 * executes JavaScript, so a script redirect is invisible to every one of them.
 * That asymmetry is the entire design: the card is HTML, the redirect is JS.
 *
 * ── WHY THE DESTINATION IS NOT IN THIS FILE ─────────────────────────────────
 * nginx serves .js under `Cache-Control: public, immutable` for 30 days
 * (nginx.conf's asset block, matched by extension). A URL baked in here would
 * outlive an edit by a month in every browser that had already loaded it.
 * index.html is served `no-store`, so reading the href off it means changing
 * the destination takes effect on the next request.
 */
(function () {
    var link = document.getElementById('continue');
    if (!link) return;

    // `replace`, not `href =`: this page must not enter session history. Back
    // out of the video otherwise and the browser returns here, which redirects
    // forward again — a trap the reader cannot leave. `link.href` is already
    // resolved to an absolute URL by the DOM.
    window.location.replace(link.href);
})();
