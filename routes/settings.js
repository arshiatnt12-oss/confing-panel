const express = require('express');
const db = require('../db');

const router = express.Router();

function rowToSettings(row) {
  return {
    address: row.address,
    port: row.port,
    protocol: row.protocol,
    network: row.network,
    path: row.path,
    sni: row.sni,
    security: row.security,
    remark: row.remark
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
    SET address=?, port=?, protocol=?, network=?, path=?, sni=?, security=?, remark=?
    WHERE id=1
  `).run(next.address, next.port, next.protocol, next.network, next.path, next.sni, next.security, next.remark);

  res.json(next);
});

module.exports = router;
