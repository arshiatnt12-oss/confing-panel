const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { buildConfig, buildRealityConfig } = require('../lib/configBuilder');
const xrayManager = require('../lib/xrayManager');

const router = express.Router();

function genUUID() {
  return crypto.randomUUID();
}

const FINGERPRINTS = ['chrome', 'firefox', 'safari', 'ios', 'android', 'edge', 'random'];
const NETWORKS = ['', 'ws', 'grpc', 'tcp'];

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    uuid: row.uuid,
    protocol: row.protocol || 'vless',
    network: row.network || '',
    port: row.port || '',
    sni: row.sni || '',
    ssMethod: row.ss_method || 'aes-256-gcm',
    expiry: row.expiry,
    trafficLimit: row.traffic_limit_gb,
    trafficUsed: row.traffic_used_gb,
    deviceLimit: row.device_limit === null || row.device_limit === undefined ? 1 : row.device_limit,
    fingerprint: row.fingerprint || 'chrome',
    status: row.status
  };
}

function getStatus(user) {
  if (user.status === 'disabled') return 'disabled';
  if (user.expiry) {
    const daysLeft = Math.ceil((new Date(user.expiry) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return 'expired';
  }
  if (user.trafficLimit > 0 && user.trafficUsed >= user.trafficLimit) return 'expired';
  return 'active';
}

// Turns a "days from now" number into an ISO date string. 0 or empty => unlimited (null).
function expiryFromDays(days) {
  const n = Number(days);
  if (!n || n <= 0) return null;
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// GET /api/users
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const users = rows.map(rowToUser).map(u => ({ ...u, computedStatus: getStatus(u) }));
  res.json(users);
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, expiry, expiryDays, trafficLimit, protocol, network, port, sni, deviceLimit, fingerprint } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'نام کاربر الزامی است' });
  }
  const uuid = (req.body.uuid && req.body.uuid.trim()) || genUUID();
  const finalProtocol = ['vless', 'vmess', 'shadowsocks'].includes(protocol) ? protocol : 'vless';
  const finalNetwork = NETWORKS.includes(network) ? network : '';
  const finalFingerprint = FINGERPRINTS.includes(fingerprint) ? fingerprint : 'chrome';
  const finalExpiry = expiry !== undefined && expiry !== '' ? expiry : expiryFromDays(expiryDays);
  const finalDeviceLimit = deviceLimit === undefined || deviceLimit === '' ? 1 : Math.max(0, parseInt(deviceLimit, 10) || 0);

  const stmt = db.prepare(`
    INSERT INTO users (name, uuid, protocol, network, port, sni, ss_method, expiry, traffic_limit_gb, traffic_used_gb, device_limit, fingerprint, status)
    VALUES (?, ?, ?, ?, ?, ?, 'aes-256-gcm', ?, ?, 0, ?, ?, 'active')
  `);
  try {
    const info = stmt.run(
      name.trim(),
      uuid,
      finalProtocol,
      finalNetwork,
      (port || '').toString().trim(),
      (sni || '').toString().trim(),
      finalExpiry,
      Number(trafficLimit) || 0,
      finalDeviceLimit,
      finalFingerprint
    );
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    xrayManager.scheduleRestart();
    res.status(201).json(rowToUser(row));
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'این UUID قبلاً استفاده شده است' });
    }
    res.status(500).json({ error: 'خطا در ایجاد کاربر' });
  }
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'کاربر یافت نشد' });

  const name = req.body.name !== undefined ? req.body.name.trim() : existing.name;
  const uuid = req.body.uuid !== undefined ? req.body.uuid.trim() : existing.uuid;
  const protocol = req.body.protocol !== undefined && ['vless', 'vmess', 'shadowsocks'].includes(req.body.protocol) ? req.body.protocol : existing.protocol;
  const network = req.body.network !== undefined && NETWORKS.includes(req.body.network) ? req.body.network : existing.network;
  const port = req.body.port !== undefined ? req.body.port.toString().trim() : existing.port;
  const sni = req.body.sni !== undefined ? req.body.sni.toString().trim() : existing.sni;
  let expiry = existing.expiry;
  if (req.body.expiry !== undefined) expiry = req.body.expiry || null;
  else if (req.body.expiryDays !== undefined) expiry = expiryFromDays(req.body.expiryDays);
  const trafficLimit = req.body.trafficLimit !== undefined ? Number(req.body.trafficLimit) || 0 : existing.traffic_limit_gb;
  const trafficUsed = req.body.trafficUsed !== undefined ? Number(req.body.trafficUsed) || 0 : existing.traffic_used_gb;
  const deviceLimit = req.body.deviceLimit !== undefined ? Math.max(0, parseInt(req.body.deviceLimit, 10) || 0) : existing.device_limit;
  const fingerprint = req.body.fingerprint !== undefined && FINGERPRINTS.includes(req.body.fingerprint) ? req.body.fingerprint : existing.fingerprint;
  const status = req.body.status !== undefined ? req.body.status : existing.status;

  db.prepare(`
    UPDATE users SET name=?, uuid=?, protocol=?, network=?, port=?, sni=?, expiry=?, traffic_limit_gb=?, traffic_used_gb=?, device_limit=?, fingerprint=?, status=?
    WHERE id=?
  `).run(name, uuid, protocol, network, port, sni, expiry, trafficLimit, trafficUsed, deviceLimit, fingerprint, status, req.params.id);

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  xrayManager.scheduleRestart();
  res.json(rowToUser(row));
});

// PATCH /api/users/:id/toggle
router.patch('/:id/toggle', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'کاربر یافت نشد' });
  const newStatus = existing.status === 'disabled' ? 'active' : 'disabled';
  db.prepare('UPDATE users SET status=? WHERE id=?').run(newStatus, req.params.id);
  xrayManager.scheduleRestart();
  res.json({ id: existing.id, status: newStatus });
});

// PATCH /api/users/:id/reset -> zero out used traffic
router.patch('/:id/reset', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'کاربر یافت نشد' });
  db.prepare('UPDATE users SET traffic_used_gb=0 WHERE id=?').run(req.params.id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(rowToUser(row));
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'کاربر یافت نشد' });
  xrayManager.scheduleRestart();
  res.json({ ok: true });
});

// GET /api/users/:id/config -> generated connection string
router.get('/:id/config', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
  const settings = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();

  if (!settings.address) {
    return res.status(400).json({ error: 'ابتدا آدرس سرور را در تنظیمات وارد کنید' });
  }
  // The built-in Railway server is always reached over TLS on 443 (Railway's
  // edge terminates TLS and forwards plain WS to our app) - a per-user custom
  // port only makes sense for an external VPS and isn't used here.
  const port = '443';

  const config = buildConfig(rowToUser(user), settings, port);
  res.json({ config, protocol: user.protocol || 'vless', port });
});

// GET /api/users/:id/config-reality -> VLESS+Reality+TCP connection string
// (faster / much harder to filter, but requires Reality to be set up in
// Settings first: keys generated + TCP Proxy host/port filled in).
router.get('/:id/config-reality', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'کاربر یافت نشد' });
  const settings = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();

  if (!settings.reality_enabled) {
    return res.status(400).json({ error: 'Reality در تنظیمات سرور فعال نیست' });
  }
  if (user.protocol !== 'vless') {
    return res.status(400).json({ error: 'Reality فقط برای کاربران VLESS در دسترس است' });
  }

  try {
    const config = buildRealityConfig(rowToUser(user), settings);
    res.json({ config, protocol: 'vless-reality' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
