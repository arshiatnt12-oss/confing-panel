const express = require('express');
const net = require('net');
const db = require('../db');
const xrayManager = require('../lib/xrayManager');

const router = express.Router();

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

// Tests a single IP by opening a raw TCP connection to port 443 and timing
// how long the handshake takes. This tells us whether the IP is reachable
// ("clean") from this server and how fast it is, without needing any
// external ping binaries (which aren't available in this environment).
function testIp(ip, timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (!IPV4_RE.test(ip)) return resolve({ ip, clean: false });
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (clean) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve({ ip, clean, ping: clean ? Date.now() - start : null });
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(443, ip);
  });
}

// POST /api/settings/scan-ips -> { ips: ["1.1.1.1", ...] }
// Returns each IP's reachability + latency, sorted fastest-first.
router.post('/scan-ips', async (req, res) => {
  const ips = Array.isArray(req.body.ips) ? req.body.ips : [];
  const cleaned = [...new Set(ips.map(s => (s || '').toString().trim()).filter(Boolean))].slice(0, 60);
  if (cleaned.length === 0) return res.json({ results: [] });
  const results = await Promise.all(cleaned.map(ip => testIp(ip)));
  results.sort((a, b) => {
    if (a.clean !== b.clean) return a.clean ? -1 : 1;
    return (a.ping || 0) - (b.ping || 0);
  });
  res.json({ results });
});

function rowToSettings(row) {
  return {
    address: row.address,
    port: row.port,
    network: row.network,
    path: row.path,
    security: row.security,
    remark: row.remark,
    cleanIps: row.clean_ips || '',
    realityEnabled: !!row.reality_enabled,
    realityDest: row.reality_dest || 'www.microsoft.com:443',
    realityPublicKey: row.reality_public_key || '',
    realityShortId: row.reality_short_id || '',
    realityProxyHost: row.reality_proxy_host || '',
    realityProxyPort: row.reality_proxy_port || ''
    // realityPrivateKey is intentionally never sent to the client.
  };
}

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  res.json(rowToSettings(row));
});

router.put('/', (req, res) => {
  const existing = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  const next = { ...rowToSettings(existing), ...req.body };

  // Remark is fixed and can't be changed from the client.
  next.remark = 'warbius';

  // Never let a blank/missing address wipe out a previously saved domain -
  // the address only changes when the admin explicitly types a new one and
  // saves it.
  if (!req.body.address || !req.body.address.trim()) {
    next.address = existing.address;
  }

  db.prepare(`
    UPDATE server_settings
    SET address=?, port=?, network=?, path=?, security=?, remark=?, clean_ips=?,
        reality_enabled=?, reality_dest=?, reality_short_id=?, reality_proxy_host=?, reality_proxy_port=?
    WHERE id=1
  `).run(
    next.address, next.port, next.network, next.path, next.security, next.remark, next.cleanIps,
    next.realityEnabled ? 1 : 0,
    (next.realityDest || '').trim() || 'www.microsoft.com:443',
    (next.realityShortId || '').trim(),
    (next.realityProxyHost || '').trim(),
    (next.realityProxyPort || '').toString().trim()
  );

  xrayManager.scheduleRestart();
  const row = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  res.json(rowToSettings(row));
});

// POST /api/settings/reality/generate-keys -> creates a fresh Reality keypair
// and short id, and saves them (only the public key + short id are ever
// returned to the client).
router.post('/reality/generate-keys', (req, res) => {
  try {
    const { privateKey, publicKey } = xrayManager.generateRealityKeyPair();
    const shortId = xrayManager.randomShortId();
    db.prepare(`
      UPDATE server_settings SET reality_private_key=?, reality_public_key=?, reality_short_id=? WHERE id=1
    `).run(privateKey, publicKey, shortId);
    xrayManager.scheduleRestart();
    res.json({ publicKey, shortId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
