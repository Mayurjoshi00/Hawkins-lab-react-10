/**
 * CRA dev-server proxy config.
 *
 * Forwards /api/* requests to the Express backend on port 3001.
 * Everything else (React routes, static assets, favicon) stays on port 3000.
 *
 * /chmod777 is intentionally NOT rewritten here — CRA's history fallback
 * already serves index.html with the real pathname intact, which is what
 * getInitialScreen() in App.jsx needs to detect the admin route.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  // Only proxy paths that start with /api — nothing else
  app.use(
    '/api',
    createProxyMiddleware({
      target:       'http://localhost:3001',
      changeOrigin: true,
      logLevel:     'silent',
      // Don't proxy if backend is down — let the request fail fast
      // so LoginScreen's offline fallback can kick in
      on: {
        error: (err, req, res) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backend server not reachable' }));
        },
      },
    })
  );
};
