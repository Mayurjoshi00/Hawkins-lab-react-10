/**
 * CRA dev-server proxy config.
 *
 * By default, CRA's dev server uses connect-history-api-fallback which only
 * serves index.html for paths that look like navigation requests (no dot in
 * the last segment). /chmod777 qualifies, but the fallback only kicks in for
 * GET requests that accept text/html — so we explicitly whitelist it here to
 * be safe and future-proof.
 *
 * This file is picked up automatically by react-scripts — no extra install needed.
 */
module.exports = function (app) {
  // For every request to /chmod777, rewrite it to / so CRA serves index.html
  // and React boots normally. getInitialScreen() in App.jsx then reads
  // window.location.pathname and routes to the admin panel.
  app.use((req, res, next) => {
    if (req.path === '/chmod777') {
      req.url = '/';
    }
    next();
  });
};