const express = require('express');
const db = require('../db');
const xrayManager = require('../lib/xrayManager');

const router = express.Router();

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
