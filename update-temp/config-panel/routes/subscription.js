const express = require('express');
const db = require('../db');
const { buildConfig } = require('../lib/configBuilder');

const router = express.Router();

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
    fingerprint: row.fingerprint || 'chrome'
  };
}

// GET /sub/:uuid -> base64 subscription content for VPN client apps
router.get('/:uuid', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE uuid = ?').get(req.params.uuid);
  if (!user) return res.status(404).send('not found');
  if (user.status === 'disabled') return res.status(403).send('disabled');

  const settings = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  if (!settings.address) return res.status(400).send('server not configured');

  const port = '443';
  const config = buildConfig(rowToUser(user), settings, port);
  const b64 = Buffer.from(config, 'utf-8').toString('base64');

  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(b64);
});

module.exports = router;
