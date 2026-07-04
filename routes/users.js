const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

function genUUID() {
  return crypto.randomUUID();
}

function rowToUser(row) {
  return {
    id: row.id,
    name: row.name,
    uuid: row.uuid,
    expiry: row.expiry,
    trafficLimit: row.traffic_limit_gb,
    trafficUsed: row.traffic_used_gb,
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

// GET /api/users
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  const users = rows.map(rowToUser).map(u => ({ ...u, computedStatus: getStatus(u) }));
  res.json(users);
});

// POST /api/users
router.post('/', (req, res) => {
  const { name, expiry, trafficLimit } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'نام کاربر الزامی است' });
  }
  const uuid = (req.body.uuid && req.body.uuid.trim()) || genUUID();
  const stmt = db.prepare(`
    INSERT INTO users (name, uuid, expiry, traffic_limit_gb, traffic_used_gb, status)
    VALUES (?, ?, ?, ?, 0, 'active')
  `);
  try {
    const info = stmt.run(name.trim(), uuid, expiry || null, Number(trafficLimit) || 0);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
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
  const expiry = req.body.expiry !== undefined ? (req.body.expiry || null) : existing.expiry;
  const trafficLimit = req.body.trafficLimit !== undefined ? Number(req.body.trafficLimit) || 0 : existing.traffic_limit_gb;
  const trafficUsed = req.body.trafficUsed !== undefined ? Number(req.body.trafficUsed) || 0 : existing.traffic_used_gb;
  const status = req.body.status !== undefined ? req.body.status : existing.status;

  db.prepare(`
    UPDATE users SET name=?, uuid=?, expiry=?, traffic_limit_gb=?, traffic_used_gb=?, status=?
    WHERE id=?
  `).run(name, uuid, expiry, trafficLimit, trafficUsed, status, req.params.id);

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  res.json(rowToUser(row));
});

// PATCH /api/users/:id/toggle
router.patch('/:id/toggle', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'کاربر یافت نشد' });
  const newStatus = existing.status === 'disabled' ? 'active' : 'disabled';
  db.prepare('UPDATE users SET status=? WHERE id=?').run(newStatus, req.params.id);
  res.json({ id: existing.id, status: newStatus });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'کاربر یافت نشد' });
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

  const config = buildConfig(rowToUser(user), settings);
  res.json({ config, protocol: settings.protocol });
});

function buildConfig(user, s) {
  if (s.protocol === 'vless') {
    const params = new URLSearchParams();
    params.set('type', s.network);
    params.set('security', s.security);
    if (s.network === 'ws') {
      params.set('path', s.path);
      if (s.sni) params.set('host', s.sni);
    }
    if (s.network === 'grpc') {
      params.set('serviceName', (s.path || '').replace(/^\//, ''));
    }
    if (s.security === 'tls' && s.sni) params.set('sni', s.sni);
    const remark = encodeURIComponent(`${s.remark}-${user.name}`);
    return `vless://${user.uuid}@${s.address}:${s.port}?${params.toString()}#${remark}`;
  } else {
    const obj = {
      v: '2',
      ps: `${s.remark}-${user.name}`,
      add: s.address,
      port: String(s.port),
      id: user.uuid,
      aid: '0',
      scy: 'auto',
      net: s.network,
      type: 'none',
      host: s.sni || '',
      path: s.path || '/',
      tls: s.security === 'tls' ? 'tls' : '',
      sni: s.sni || ''
    };
    const b64 = Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64');
    return `vmess://${b64}`;
  }
}

module.exports = router;
