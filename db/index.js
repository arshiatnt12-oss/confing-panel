const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');
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
  network TEXT DEFAULT 'ws',
  path TEXT DEFAULT '/ws',
  security TEXT DEFAULT 'tls',
  remark TEXT DEFAULT 'warbius',
  clean_ips TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  uuid TEXT UNIQUE NOT NULL,
  protocol TEXT DEFAULT 'vless',
  port TEXT DEFAULT '',
  sni TEXT DEFAULT '',
  ss_method TEXT DEFAULT 'aes-256-gcm',
  expiry TEXT,
  traffic_limit_gb REAL DEFAULT 0,
  traffic_used_gb REAL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Add columns that may be missing if upgrading from an older schema
function ensureColumn(table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (e) {
    // Column already exists - ignore
  }
}
ensureColumn('users', 'protocol', "TEXT DEFAULT 'vless'");
ensureColumn('users', 'port', "TEXT DEFAULT ''");
ensureColumn('users', 'sni', "TEXT DEFAULT ''");
ensureColumn('users', 'ss_method', "TEXT DEFAULT 'aes-256-gcm'");
ensureColumn('users', 'network', "TEXT DEFAULT ''");
ensureColumn('users', 'device_limit', "INTEGER DEFAULT 1");
ensureColumn('users', 'fingerprint', "TEXT DEFAULT 'chrome'");
ensureColumn('server_settings', 'clean_ips', "TEXT DEFAULT ''");
ensureColumn('server_settings', 'remark', "TEXT DEFAULT 'warbius'");

// Seed default server settings row if missing
const settingsRow = db.prepare('SELECT id FROM server_settings WHERE id = 1').get();
if (!settingsRow) {
  db.prepare(`INSERT INTO server_settings (id) VALUES (1)`).run();
}

// Always sync the admin account to match the current environment variables.
// This means changing ADMIN_USERNAME / ADMIN_PASSWORD in Railway and redeploying
// will reliably update the login credentials, instead of only working the very
// first time the database is created.
const envUsername = process.env.ADMIN_USERNAME || 'admin';
const envPassword = process.env.ADMIN_PASSWORD || 'admin123';
const hash = bcrypt.hashSync(envPassword, 10);

const existingAdmin = db.prepare('SELECT * FROM admins LIMIT 1').get();
if (!existingAdmin) {
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(envUsername, hash);
  console.log(`[setup] Created admin account -> username: "${envUsername}"`);
} else {
  db.prepare('UPDATE admins SET username = ?, password_hash = ? WHERE id = ?').run(envUsername, hash, existingAdmin.id);
  console.log(`[setup] Synced admin account with environment variables -> username: "${envUsername}"`);
}
if (!process.env.ADMIN_PASSWORD) {
  console.log('[setup] WARNING: ADMIN_PASSWORD not set, using default "admin123". Set it in Railway Variables.');
}

module.exports = db;
