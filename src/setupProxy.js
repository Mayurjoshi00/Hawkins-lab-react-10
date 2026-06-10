/**
 * CRA dev-server proxy config.
 *
 * Forwards /api/* HTTP requests to the Express backend on port 3001.
 * WebSocket connections are proxied by setting ws:true on the same middleware —
 * CRA's webpack-dev-server automatically upgrades WS connections through it.
 *
 * /chmod777 is intentionally NOT rewritten here — CRA's history fallback
 * already serves index.html with the real pathname intact.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target:       'http://localhost:3001',
      changeOrigin: true,
      ws:           true,   // also proxy WebSocket upgrades on this middleware
      logLevel:     'silent',
      on: {
        error: (err, req, res) => {
          // Only send HTTP error response for non-WS requests
          if (res && typeof res.writeHead === 'function') {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Backend server not reachable' }));
          }
        },
      },
    })
  );
};
