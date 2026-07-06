const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const db = require('../db');

// Xray-core binary is installed by the Dockerfile at build time on Railway.
// If it's missing (e.g. running locally in Termux without the Docker image),
// the panel still works for managing users/links, it just can't proxy traffic.
const XRAY_BIN = process.env.XRAY_BIN || '/usr/local/bin/xray';
const XRAY_CONFIG_PATH = path.join(__dirname, '..', 'xray-config.json');
const INTERNAL_XRAY_PORT = parseInt(process.env.XRAY_INTERNAL_PORT || '62789', 10);
// Dedicated port for the VLESS+Reality inbound. This is NOT reached through
// Railway's HTTP edge - it needs its own Railway "TCP Proxy" pointed at this
// same port (Settings -> Networking -> TCP Proxy), which is what makes
// Reality possible: the raw TLS handshake reaches Xray untouched instead of
// being terminated by Railway's edge first.
const REALITY_INTERNAL_PORT = parseInt(process.env.XRAY_REALITY_PORT || '48281', 10);

let xrayProcess = null;
let restartTimer = null;

function isXrayAvailable() {
  return fs.existsSync(XRAY_BIN);
}

// Runs `xray x25519` to produce a fresh Reality keypair. Only works where the
// Xray binary is present (i.e. on Railway, not in a plain Termux checkout).
function generateRealityKeyPair() {
  if (!isXrayAvailable()) {
    throw new Error('باینری Xray در دسترس نیست (فقط روی Railway کار می‌کند)');
  }
  const out = execFileSync(XRAY_BIN, ['x25519'], { encoding: 'utf-8' });
  const privMatch = out.match(/Private ?key:\s*(\S+)/i);
  const pubMatch = out.match(/(?:Public ?key|Password):\s*(\S+)/i);
  if (!privMatch || !pubMatch) {
    throw new Error('خروجی نامعتبر از xray x25519');
  }
  return { privateKey: privMatch[1], publicKey: pubMatch[1] };
}

function randomShortId() {
  return require('crypto').randomBytes(8).toString('hex').slice(0, 8);
}

function buildXrayConfig() {
  const settings = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  // Only VLESS+WebSocket users are served by the built-in Railway server -
  // that's the only combination that can pass through Railway's HTTP(S) edge.
  const users = db
    .prepare("SELECT * FROM users WHERE protocol = 'vless' AND status != 'disabled'")
    .all();

  const clients = users.map(u => ({ id: u.uuid, email: u.name || u.uuid }));

  const inbounds = [
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
  ];

  if (settings.reality_enabled && settings.reality_private_key) {
    const destHost = (settings.reality_dest || '').split(':')[0];
    inbounds.push({
      listen: '0.0.0.0',
      port: REALITY_INTERNAL_PORT,
      protocol: 'vless',
      settings: {
        clients: clients.map(c => ({ ...c, flow: 'xtls-rprx-vision' })),
        decryption: 'none'
      },
      streamSettings: {
        network: 'tcp',
        security: 'reality',
        realitySettings: {
          show: false,
          dest: settings.reality_dest || 'www.microsoft.com:443',
          xver: 0,
          serverNames: destHost ? [destHost] : [],
          privateKey: settings.reality_private_key,
          shortIds: [settings.reality_short_id || '']
        }
      }
    });
  }

  return {
    log: { loglevel: 'warning' },
    inbounds,
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
  if (cfg.inbounds[1]) {
    console.log(`[xray] reality inbound active on internal port ${REALITY_INTERNAL_PORT}`);
  }
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

module.exports = {
  startXray,
  scheduleRestart,
  stopXray,
  isXrayAvailable,
  generateRealityKeyPair,
  randomShortId,
  INTERNAL_XRAY_PORT,
  REALITY_INTERNAL_PORT
};
