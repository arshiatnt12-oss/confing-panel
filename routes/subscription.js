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

function daysLeft(expiry) {
  if (!expiry) return null;
  return Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
}

function getStatus(row) {
  if (row.status === 'disabled') return 'disabled';
  const dl = daysLeft(row.expiry);
  if (dl !== null && dl < 0) return 'expired';
  if (row.traffic_limit_gb > 0 && row.traffic_used_gb >= row.traffic_limit_gb) return 'expired';
  return 'active';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Renders the human-facing management page shown when someone opens a
// subscription link in a normal web browser (instead of a VPN client app).
function renderManagementPage(row, config) {
  const status = getStatus(row);
  const dl = daysLeft(row.expiry);
  const statusFa = { active: 'فعال', disabled: 'غیرفعال', expired: 'منقضی' }[status];
  const timeText = row.expiry
    ? `${esc(row.expiry)}${dl !== null ? ` (${dl >= 0 ? dl + ' روز مانده' : 'منقضی شده'})` : ''}`
    : 'نامحدود';
  const total = row.traffic_limit_gb > 0 ? row.traffic_limit_gb.toFixed(2) + ' GB' : 'نامحدود';
  const used = (Number(row.traffic_used_gb) || 0).toFixed(3) + ' GB';
  const pct = row.traffic_limit_gb > 0 ? Math.min(100, Math.round((row.traffic_used_gb / row.traffic_limit_gb) * 100)) : 0;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Warbius - مدیریت کانفیگ</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root{ --bg:#0B0D18; --surface:#171a2b; --surface-2:#1F2238; --border:#2a2e46; --text:#EDEDF5; --muted:#8B8FB3; --accent:#6366F1; --accent-2:#8B5CF6; --green:#22C55E; }
  *{box-sizing:border-box;}
  body{ margin:0; background:var(--bg); color:var(--text); font-family:'Vazirmatn',sans-serif; min-height:100vh; display:flex; align-items:flex-start; justify-content:center; padding:28px 16px; }
  .card{ width:100%; max-width:440px; background:var(--surface); border:1px solid var(--border); border-radius:16px; overflow:hidden; box-shadow:0 30px 60px -20px rgba(0,0,0,.5); }
  .head{ display:flex; align-items:center; gap:10px; padding:18px 20px; border-bottom:1px solid var(--border); }
  .head img{ width:32px; height:32px; border-radius:8px; object-fit:cover; }
  .head .t{ font-weight:800; font-size:15px; }
  .head .t small{ display:block; font-weight:500; color:var(--muted); font-size:11.5px; }
  .body{ padding:20px; display:flex; flex-direction:column; gap:14px; }
  .name{ font-size:15px; font-weight:700; }
  .badge{ display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
  .badge.active{ background:rgba(34,197,94,.14); color:var(--green); }
  .badge.disabled{ background:var(--surface-2); color:var(--muted); }
  .badge.expired{ background:rgba(240,131,124,.14); color:#F0837C; }
  .stat-row{ display:flex; justify-content:space-between; font-size:12.5px; color:#C7C9DE; }
  .stat-row b{ font-family:'JetBrains Mono',monospace; font-weight:600; font-size:11.5px; }
  .bar{ width:100%; height:8px; border-radius:4px; background:#23273d; overflow:hidden; }
  .bar .fill{ height:100%; background:var(--green); }
  .cfg-label{ font-size:12px; color:var(--muted); font-weight:600; }
  .cfg-box{ background:#0F1120; border:1px solid var(--border); border-radius:9px; padding:12px; font-family:'JetBrains Mono',monospace; font-size:11.5px; direction:ltr; text-align:left; word-break:break-all; color:#C7C9DE; }
  .copy-btn{ background:linear-gradient(90deg,var(--accent),var(--accent-2)); color:#fff; border:none; padding:11px 16px; border-radius:9px; font-weight:700; font-size:13px; cursor:pointer; width:100%; font-family:inherit; }
  .telegram{ display:flex; align-items:center; justify-content:center; gap:8px; color:#B9B7FF; text-decoration:none; font-size:12.5px; font-weight:700; padding:9px 12px; border-radius:20px; background:rgba(139,92,246,.12); border:1px solid rgba(139,92,246,.3); }
  .telegram svg{ width:15px; height:15px; }
  .toast{ position:fixed; bottom:22px; left:50%; transform:translateX(-50%); background:var(--green); color:#08240F; padding:10px 18px; border-radius:9px; font-size:13px; font-weight:700; opacity:0; transition:.2s; pointer-events:none; }
  .toast.show{ opacity:1; }
</style>
</head>
<body>
  <div class="card">
    <div class="head">
      <img src="/logo-icon.png" alt="Warbius">
      <div class="t">Warbius VPN<small>مدیریت کانفیگ</small></div>
    </div>
    <div class="body">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div class="name">${esc(row.name)}</div>
        <span class="badge ${status}">${statusFa}</span>
      </div>
      <div class="stat-row"><span>حجم مصرف‌شده</span><b>${used} / ${total}</b></div>
      <div class="bar"><div class="fill" style="width:${pct}%"></div></div>
      <div class="stat-row"><span>زمان</span><b>${timeText}</b></div>
      <div>
        <div class="cfg-label">کانفیگ اتصال</div>
        <div class="cfg-box" id="cfg">${esc(config)}</div>
      </div>
      <button class="copy-btn" id="copyBtn">📋 کپی کردن کانفیگ</button>
      <a class="telegram" href="https://t.me/WARBIUSvpn" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 3.5 2.6 11c-.9.35-.9 1.65.02 1.98l4.6 1.6 1.8 5.6c.24.75 1.2.9 1.68.28l2.4-3.1 4.9 3.6c.7.5 1.7.13 1.9-.72l3.3-14.6c.2-1-.8-1.8-1.7-1.15Z"/></svg>
        <span>کانال تلگرام Warbius</span>
      </a>
    </div>
  </div>
  <div class="toast" id="toast">کپی شد</div>
  <script>
    document.getElementById('copyBtn').onclick = function(){
      var text = document.getElementById('cfg').textContent;
      navigator.clipboard.writeText(text).then(function(){
        var el = document.getElementById('toast');
        el.classList.add('show');
        setTimeout(function(){ el.classList.remove('show'); }, 1800);
      });
    };
  </script>
</body>
</html>`;
}

// GET /sub/:uuid
// - Opened by a VPN client app (v2rayNG, Shadowrocket, Clash, ...): return the
//   raw base64 subscription content, same as before.
// - Opened in a normal web browser: show a friendly management page with the
//   user's remaining volume, remaining time, and the config string to copy.
router.get('/:uuid', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE uuid = ?').get(req.params.uuid);
  if (!user) return res.status(404).send('not found');

  const settings = db.prepare('SELECT * FROM server_settings WHERE id = 1').get();
  if (!settings.address) return res.status(400).send('server not configured');

  const port = '443';
  const config = user.status === 'disabled' ? '' : buildConfig(rowToUser(user), settings, port);

  const acceptsHtml = (req.headers.accept || '').includes('text/html');
  if (acceptsHtml) {
    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(renderManagementPage(user, config || 'این کانفیگ غیرفعال است'));
  }

  if (user.status === 'disabled') return res.status(403).send('disabled');
  const b64 = Buffer.from(config, 'utf-8').toString('base64');
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(b64);
});

module.exports = router;
