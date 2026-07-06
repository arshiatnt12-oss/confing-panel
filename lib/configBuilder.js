// Picks a connect IP from the saved clean-IP list, deterministically per user
// so the same user always gets the same IP (round robin by user id).
function pickCleanIp(settings, userId) {
  const list = (settings.clean_ips || '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  if (list.length === 0) return null;
  const idx = userId % list.length;
  return list[idx];
}

function buildConfig(user, s, port) {
  const domain = s.address;
  const cleanIp = pickCleanIp(s, user.id);
  const connectAddress = cleanIp || domain;
  const sni = user.sni || domain;
  const network = user.network || s.network || 'ws';
  const fp = user.fingerprint || 'chrome';
  // The built-in Railway server always sits behind Railway's edge, which
  // terminates TLS on 443 - so security is always tls here, regardless of
  // whatever value happens to be stored in server_settings.
  const security = 'tls';

  if (user.protocol === 'shadowsocks') {
    const password = user.uuid;
    const userInfo = Buffer.from(`${user.ssMethod || 'aes-256-gcm'}:${password}`).toString('base64');
    const remark = encodeURIComponent(`${s.remark}-${user.name}`);
    return `ss://${userInfo}@${connectAddress}:${port}#${remark}`;
  }

  if (user.protocol === 'vmess') {
    const obj = {
      v: '2',
      ps: `${s.remark}-${user.name}`,
      add: connectAddress,
      port: String(port),
      id: user.uuid,
      aid: '0',
      scy: 'auto',
      net: network,
      type: 'none',
      host: sni,
      path: s.path || '/',
      tls: security === 'tls' ? 'tls' : '',
      sni: sni
    };
    const b64 = Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64');
    return `vmess://${b64}`;
  }

  // default: vless
  const params = new URLSearchParams();
  params.set('type', network);
  params.set('security', security);
  if (network === 'ws') {
    params.set('path', s.path || '/');
    params.set('host', sni);
  }
  if (network === 'grpc') {
    params.set('serviceName', (s.path || '').replace(/^\//, ''));
  }
  if (security === 'tls') {
    params.set('sni', sni);
    params.set('fp', fp);
  }
  const remark = encodeURIComponent(`${s.remark}-${user.name}`);
  return `vless://${user.uuid}@${connectAddress}:${port}?${params.toString()}#${remark}`;
}

// Builds a VLESS+Reality+TCP link. Reality bypasses Railway's HTTP edge
// entirely - it connects straight to Xray's own TCP port via a Railway
// "TCP Proxy", so the TLS handshake is genuine (against the camouflage
// site) and much harder for DPI/filtering to fingerprint or slow down.
function buildRealityConfig(user, s) {
  if (!s.reality_proxy_host || !s.reality_proxy_port) {
    throw new Error('ابتدا هاست/پورت TCP Proxy را در تنظیمات Reality وارد کنید');
  }
  const destHost = (s.reality_dest || '').split(':')[0];
  const params = new URLSearchParams();
  params.set('security', 'reality');
  params.set('encryption', 'none');
  params.set('pbk', s.reality_public_key || '');
  params.set('fp', user.fingerprint || 'chrome');
  params.set('type', 'tcp');
  params.set('flow', 'xtls-rprx-vision');
  params.set('sni', destHost);
  params.set('sid', s.reality_short_id || '');
  const remark = encodeURIComponent(`${s.remark}-${user.name}-reality`);
  return `vless://${user.uuid}@${s.reality_proxy_host}:${s.reality_proxy_port}?${params.toString()}#${remark}`;
}

module.exports = { buildConfig, buildRealityConfig, pickCleanIp };
