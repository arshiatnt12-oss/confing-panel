require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const httpProxy = require('http-proxy');

const db = require('./db');
const { router: authRouter, requireAuth } = require('./routes/auth');
const usersRouter = require('./routes/users');
const settingsRouter = require('./routes/settings');
const subscriptionRouter = require('./routes/subscription');
const xrayManager = require('./lib/xrayManager');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public auth routes (login)
app.use('/api/auth', authRouter);

// Public subscription endpoint (opened directly by VPN client apps, no login)
app.use('/sub', subscriptionRouter);

// Protected API routes
app.use('/api/users', requireAuth, usersRouter);
app.use('/api/settings', requireAuth, settingsRouter);

// Static frontend
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);

// Any websocket upgrade request on the configured VLESS path gets forwarded
// to the local Xray process. Everything else is just the panel itself.
const wsProxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${xrayManager.INTERNAL_XRAY_PORT}`,
  ws: true
});
wsProxy.on('error', (err) => {
  console.error('[xray-proxy] error:', err.message);
});

server.on('upgrade', (req, socket, head) => {
  const settings = db.prepare('SELECT path FROM server_settings WHERE id = 1').get();
  const xrayPath = (settings && settings.path) || '/ws';
  if (req.url && req.url.startsWith(xrayPath)) {
    wsProxy.ws(req, socket, head);
  } else {
    socket.destroy();
  }
});

server.listen(PORT, () => {
  console.log(`Config panel running at http://localhost:${PORT}`);
  xrayManager.startXray();
});
