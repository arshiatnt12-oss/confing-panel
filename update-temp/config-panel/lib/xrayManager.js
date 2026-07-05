const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../db');

// Xray-core binary is installed by the Dockerfile at build time on Railway.
// If it's missing (e.g. running locally in Termux without the Docker image),
// the panel still works for managing users/links, it just can't proxy traffic.
const XRAY_BIN = process.env.XRAY_BIN || '/usr/local/bin/xray';
const XRAY_CONFIG_PATH = path.join(__dirname, '..', 'xray-config.json');
const INTERNAL_XRAY_PORT = parseInt(process.env.XRAY_INTERNAL_PORT || '62789', 10);

let xrayProcess = null;
let restartTimer = null;

function isXrayAvailable() {
  return fs.existsSync(XRAY_BIN);
}

function buildXrayConfig() {
  const settings = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  // Only VLESS+WebSocket users are served by the built-in Railway server -
  // that's the only combination that can pass through Railway's HTTP(S) edge.
  const users = db
    .prepare("SELECT * FROM users WHERE protocol = 'vless' AND status != 'disabled'")
    .all();

  const clients = users.map(u => ({ id: u.uuid, email: u.name || u.uuid }));

  return {
    log: { loglevel: 'warning' },
    inbounds: [
      {
        listen: '127.0.0.1',
        port: INTERNAL_XRAY_PORT,
        protocol: 'vless',
        settings: { clients, decryption: 'none' },
        streamSettings: {
          network: 'ws',
          security: 'none', // TLS is already terminated by Railway's edge
          wsSettings: { path: settings.path || '/ws' }
        }
      }
    ],
    outbounds: [{ protocol: 'freedom', tag: 'direct' }]
  };
}

function writeConfig() {
  const cfg = buildXrayConfig();
  fs.writeFileSync(XRAY_CONFIG_PATH, JSON.stringify(cfg, null, 2));
  return cfg;
}

function startXray() {
  if (!isXrayAvailable()) {
    console.log(
      `[xray] binary not found at ${XRAY_BIN} - built-in VPN server is disabled. ` +
      'Configs will not actually connect until this runs from the Docker image that installs Xray.'
    );
    return;
  }
  const cfg = writeConfig();
  if (xrayProcess) {
    try { xrayProcess.kill(); } catch (e) { /* already dead */ }
  }
  xrayProcess = spawn(XRAY_BIN, ['run', '-config', XRAY_CONFIG_PATH], { stdio: 'inherit' });
  xrayProcess.on('exit', (code) => {
    console.log('[xray] process exited with code', code);
    xrayProcess = null;
  });
  console.log(`[xray] started with ${cfg.inbounds[0].settings.clients.length} active vless user(s), internal port ${INTERNAL_XRAY_PORT}`);
}

// Debounced restart so several quick user edits don't spawn Xray repeatedly
function scheduleRestart() {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(startXray, 500);
}

function stopXray() {
  if (xrayProcess) {
    try { xrayProcess.kill(); } catch (e) { /* ignore */ }
    xrayProcess = null;
  }
}

module.exports = { startXray, scheduleRestart, stopXray, isXrayAvailable, INTERNAL_XRAY_PORT };
