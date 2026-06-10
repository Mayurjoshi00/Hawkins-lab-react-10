/**
 * CRA dev-server proxy config.
 *
 * IMPORTANT: Do NOT rewrite /chmod777 to '/'.
 * CRA's connect-history-api-fallback already serves index.html for any
 * HTML-accepting GET with no file extension — /chmod777 qualifies.
 * Rewriting to '/' would corrupt window.location.pathname in the browser,
 * breaking getInitialScreen() in App.jsx.
 *
 * This file only handles forwarding /api/* to the backend server.
 */
module.exports = function (app) {
  // Forward API calls to the Express backend if it's running on port 3001.
  // In standalone/offline mode this is a no-op (requests just fail and the
  // client falls back to offline mode automatically).
  app.use('/api', (req, res, next) => {
    // Let CRA's own proxy (set via "proxy" in package.json) handle it,
    // or just pass through — the LoginScreen has its own offline fallback.
    next();
  });

  // /chmod777 — do nothing special here.
  // CRA's history fallback will serve index.html with the real pathname intact.
};
