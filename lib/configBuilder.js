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
  const network = user.network || s.network;
  const fp = user.fingerprint || 'chrome';

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
      tls: s.security === 'tls' ? 'tls' : '',
      sni: sni
    };
    const b64 = Buffer.from(JSON.stringify(obj), 'utf-8').toString('base64');
    return `vmess://${b64}`;
  }

  // default: vless
  const params = new URLSearchParams();
  params.set('type', network);
  params.set('security', s.security);
  if (network === 'ws') {
    params.set('path', s.path || '/');
    params.set('host', sni);
  }
  if (network === 'grpc') {
    params.set('serviceName', (s.path || '').replace(/^\//, ''));
  }
  if (s.security === 'tls') {
    params.set('sni', sni);
    params.set('fp', fp);
  }
  const remark = encodeURIComponent(`${s.remark}-${user.name}`);
  return `vless://${user.uuid}@${connectAddress}:${port}?${params.toString()}#${remark}`;
}

module.exports = { buildConfig, pickCleanIp };
