/**
 * CRA dev-server proxy config.
 *
 * Forwards /api/* HTTP requests AND WebSocket connections to the Express
 * backend on port 3001. WebSocket is proxied via a dedicated path /ws so
 * the CRA hot-reload WS (which also lives on port 3000) is NOT affected.
 *
 * /chmod777 is intentionally NOT rewritten here — CRA's history fallback
 * already serves index.html with the real pathname intact.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app, server) {
  // ── HTTP API proxy ────────────────────────────────────────────────────────
  app.use(
    '/api',
    createProxyMiddleware({
      target:       'http://localhost:3001',
      changeOrigin: true,
      logLevel:     'silent',
      on: {
        error: (err, req, res) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backend server not reachable' }));
        },
      },
    })
  );

  // ── WebSocket proxy ───────────────────────────────────────────────────────
  // All WS connections to the CRA dev server are forwarded to port 3001.
  // http-proxy-middleware handles the WS upgrade automatically when you pass
  // the CRA `server` argument and call .upgrade() on it.
  const wsProxy = createProxyMiddleware({
    target:       'http://localhost:3001',
    changeOrigin: true,
    ws:           true,
    logLevel:     'silent',
    on: {
      error: () => {}, // silently ignore WS proxy errors (backend offline)
    },
  });

  // Register the upgrade handler so WebSocket connections get proxied
  server.on('upgrade', wsProxy.upgrade);
};
