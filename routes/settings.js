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
    cleanIps: row.clean_ips || ''
  };
}

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  res.json(rowToSettings(row));
});

router.put('/', (req, res) => {
  const existing = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  const next = { ...rowToSettings(existing), ...req.body };

  db.prepare(`
    UPDATE server_settings
    SET address=?, port=?, network=?, path=?, security=?, remark=?, clean_ips=?
    WHERE id=1
  `).run(next.address, next.port, next.network, next.path, next.security, next.remark, next.cleanIps);

  xrayManager.scheduleRestart();
  res.json(next);
});

module.exports = router;
