const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'data.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS server_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  address TEXT DEFAULT '',
  port TEXT DEFAULT '443',
  protocol TEXT DEFAULT 'vless',
  network TEXT DEFAULT 'ws',
  path TEXT DEFAULT '/ws',
  sni TEXT DEFAULT '',
  security TEXT DEFAULT 'tls',
  remark TEXT DEFAULT 'MyPanel'
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  uuid TEXT UNIQUE NOT NULL,
  expiry TEXT,
  traffic_limit_gb REAL DEFAULT 0,
  traffic_used_gb REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

const settingsRow = db.prepare('SELECT id FROM server_settings WHERE id = 1').get();
if (!settingsRow) {
  db.prepare(`INSERT INTO server_settings (id) VALUES (1)`).run();
}

const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (adminCount === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`[setup] Created initial admin account -> username: "${username}"`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('[setup] WARNING: using default password "admin123". Set ADMIN_PASSWORD in .env and restart, then change it.');
  }
}

module.exports = db;
