const APP_VERSION = 'Warbius Panel v1.0';
const st = { token: localStorage.getItem('panel_token') || null, users: [], settings: null, configs: {} };

function toast(msg, isError){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', !!isError);
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1800);
}
function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (st.token) headers['Authorization'] = `Bearer ${st.token}`;
  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

// ---- Auth ----
function showLogin(){
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appShell').style.display = 'none';
}
function showApp(){
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  loadAll();
}
function logout(){
  st.token = null; localStorage.removeItem('panel_token'); showLogin();
}

document.getElementById('loginBtn').onclick = async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    st.token = data.token; localStorage.setItem('panel_token', data.token);
    showApp();
  } catch (e) { errEl.textContent = e.message; }
};
document.getElementById('logoutBtn').onclick = logout;

document.getElementById('changePassBtn').onclick = async () => {
  const currentPassword = document.getElementById('acc-current').value;
  const newPassword = document.getElementById('acc-new').value;
  try {
    await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    toast(t('passwordChanged'));
    document.getElementById('acc-current').value = '';
    document.getElementById('acc-new').value = '';
  } catch (e) { toast(e.message, true); }
};

// ---- Theme (light/dark) + background opacity ----
function applyTheme(mode){
  document.body.classList.toggle('theme-light', mode === 'light');
  document.getElementById('themeLightBtn').classList.toggle('active', mode === 'light');
  document.getElementById('themeDarkBtn').classList.toggle('active', mode !== 'light');
  try { localStorage.setItem('panel_theme', mode); } catch(e){}
}
function applyBgOpacity(pct){
  document.querySelectorAll('.warbius-banner .banner-logo').forEach(el=>{
    el.style.opacity = (pct/100).toFixed(2);
  });
  document.getElementById('bgOpacityVal').textContent = pct + '%';
  try { localStorage.setItem('panel_bg_opacity', pct); } catch(e){}
}
document.getElementById('themeLightBtn').onclick = () => applyTheme('light');
document.getElementById('themeDarkBtn').onclick = () => applyTheme('dark');
document.getElementById('bgOpacityRange').oninput = (e) => applyBgOpacity(e.target.value);

document.getElementById('setChangePassBtn').onclick = async () => {
  const currentPassword = document.getElementById('set-acc-current').value;
  const newPassword = document.getElementById('set-acc-new').value;
  try {
    await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    toast(t('passwordChanged'));
    document.getElementById('set-acc-current').value = '';
    document.getElementById('set-acc-new').value = '';
  } catch (e) { toast(e.message, true); }
};

// ---- Language ----
document.getElementById('langFa').onclick = () => applyLang('fa');
document.getElementById('langEn').onclick = () => applyLang('en');
function onLangChanged(){ renderHome(); renderUsersList(); }

// ---- Nav ----
document.querySelectorAll('.nav-item').forEach(el=>{
  el.onclick = () => {
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    el.classList.add('active');
    const v = el.dataset.view;
    ['home','users','cleanip','server','reality','settings','account'].forEach(name=>{
      document.getElementById(`view-${name}`).style.display = (name===v) ? '' : 'none';
    });
  };
});

// ---- Load data ----
async function loadAll(){
  try {
    const [users, settings] = await Promise.all([api('/users'), api('/settings')]);
    st.users = users; st.settings = settings;
    hydrateServerForm(); hydrateCleanIpForm(); hydrateRealityForm();
    document.getElementById('nu-path').value = st.settings.path || '/ws';
    renderHome(); renderUsersList();
  } catch (e) { toast(e.message, true); }
}

function hydrateServerForm(){
  document.getElementById('srv-address').value = st.settings.address || '';
  document.getElementById('srv-port').value = st.settings.port || '443';
  document.getElementById('srv-network').value = st.settings.network || 'ws';
  document.getElementById('srv-security').value = st.settings.security || 'tls';
  document.getElementById('srv-path').value = st.settings.path || '/ws';
  document.getElementById('srv-remark').value = 'warbius';
}
function hydrateCleanIpForm(){
  document.getElementById('cip-list').value = (st.settings.cleanIps || '').split('\n').filter(Boolean).join('\n');
}
function hydrateRealityForm(){
  document.getElementById('rl-enabled').value = st.settings.realityEnabled ? '1' : '0';
  document.getElementById('rl-dest').value = st.settings.realityDest || 'www.microsoft.com:443';
  document.getElementById('rl-proxy-host').value = st.settings.realityProxyHost || '';
  document.getElementById('rl-proxy-port').value = st.settings.realityProxyPort || '';
  document.getElementById('rl-pubkey').value = st.settings.realityPublicKey || '';
  document.getElementById('rl-shortid').value = st.settings.realityShortId || '';
}

document.getElementById('saveServerBtn').onclick = async () => {
  const payload = {
    address: document.getElementById('srv-address').value.trim(),
    port: document.getElementById('srv-port').value.trim() || '443',
    network: document.getElementById('srv-network').value,
    security: document.getElementById('srv-security').value,
    path: document.getElementById('srv-path').value.trim() || '/',
    remark: 'warbius'
  };
  try { st.settings = await api('/settings', { method:'PUT', body: JSON.stringify(payload) }); toast(t('applied')); st.configs = {}; renderUsersList(); }
  catch (e) { toast(e.message, true); }
};

let lastCleanIps = [];
document.getElementById('scanIpBtn').onclick = async () => {
  const ips = document.getElementById('cip-scan-input').value.split('\n').map(s=>s.trim()).filter(Boolean);
  if (ips.length === 0) return;
  const btn = document.getElementById('scanIpBtn');
  const resultsEl = document.getElementById('ipScanResults');
  const toolbar = document.getElementById('ipScanToolbar');
  btn.disabled = true;
  const prevText = btn.textContent;
  btn.textContent = t('scanning');
  resultsEl.innerHTML = '';
  toolbar.style.display = 'none';
  try {
    const data = await api('/settings/scan-ips', { method:'POST', body: JSON.stringify({ ips }) });
    const results = data.results || [];
    lastCleanIps = results.filter(r=>r.clean).map(r=>r.ip);
    if (results.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state">${t('noCleanIpsFound')}</div>`;
    } else {
      resultsEl.innerHTML = results.map(r=>{
        if (!r.clean) {
          return `<div class="ipscan-row"><span class="ip">${escapeHtml(r.ip)}</span><span class="dead">${t('deadIp')}</span></div>`;
        }
        const cls = r.ping<150?'fast':(r.ping<400?'mid':'slow');
        return `<div class="ipscan-row">
          <span class="ip">${escapeHtml(r.ip)}</span>
          <span class="meta">
            <span class="ping ${cls}">${r.ping} ms</span>
            <button class="icon-btn" onclick="copySingleIp('${r.ip}')" title="${t('copy')}">📋</button>
          </span>
        </div>`;
      }).join('');
      toolbar.style.display = lastCleanIps.length ? 'flex' : 'none';
      document.getElementById('ipScanCount').textContent = `${lastCleanIps.length} / ${results.length}`;
    }
    toast(t('ipScanDone'));
  } catch (e) { toast(e.message, true); }
  finally { btn.disabled = false; btn.textContent = prevText; }
};
function copySingleIp(ip){
  navigator.clipboard.writeText(ip).then(()=>toast(t('copied'))).catch(()=>{});
}
document.getElementById('copyAllIpBtn').onclick = () => {
  if (lastCleanIps.length === 0) return;
  navigator.clipboard.writeText(lastCleanIps.join('\n')).then(()=>toast(t('copied'))).catch(()=>{});
};

document.getElementById('applyCleanIpBtn').onclick = async () => {
  const cleanIps = document.getElementById('cip-list').value.split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
  try { st.settings = await api('/settings', { method:'PUT', body: JSON.stringify({ cleanIps }) }); toast(t('applied')); st.configs = {}; renderUsersList(); }
  catch (e) { toast(e.message, true); }
};

document.getElementById('saveRealityBtn').onclick = async () => {
  const payload = {
    realityEnabled: document.getElementById('rl-enabled').value === '1',
    realityDest: document.getElementById('rl-dest').value.trim() || 'www.microsoft.com:443',
    realityProxyHost: document.getElementById('rl-proxy-host').value.trim(),
    realityProxyPort: document.getElementById('rl-proxy-port').value.trim()
  };
  try { st.settings = await api('/settings', { method:'PUT', body: JSON.stringify(payload) }); hydrateRealityForm(); toast(t('applied')); st.configs = {}; renderUsersList(); }
  catch (e) { toast(e.message, true); }
};

document.getElementById('genRealityKeysBtn').onclick = async () => {
  try {
    const res = await api('/settings/reality/generate-keys', { method:'POST' });
    st.settings.realityPublicKey = res.publicKey;
    st.settings.realityShortId = res.shortId;
    hydrateRealityForm();
    toast(t('applied'));
  } catch (e) { toast(e.message, true); }
};

// ---- Status helpers ----
function daysLeft(expiry){
  if(!expiry) return null;
  return Math.ceil((new Date(expiry) - new Date()) / (1000*60*60*24));
}
function getStatus(u){
  if(u.status === 'disabled') return 'disabled';
  if (u.computedStatus) return u.computedStatus;
  const dl = daysLeft(u.expiry);
  if(dl !== null && dl < 0) return 'expired';
  if(u.trafficLimit > 0 && u.trafficUsed >= u.trafficLimit) return 'expired';
  return 'active';
}
function statusLabel(s){
  return { active: t('statusActive'), disabled: t('statusDisabled'), expired: t('statusExpired') }[s];
}

// ---- Home ----
function renderHome(){
  document.getElementById('statTotal').textContent = st.users.length;
  document.getElementById('statActive').textContent = st.users.filter(u=>getStatus(u)==='active').length;
  const totalTraffic = st.users.reduce((sum,u)=> sum + (Number(u.trafficUsed)||0), 0);
  document.getElementById('statTraffic').textContent = totalTraffic.toFixed(1);
  document.getElementById('statSoon').textContent = st.users.filter(u=>{
    const dl = daysLeft(u.expiry); return dl!==null && dl>=0 && dl<=3 && getStatus(u)==='active';
  }).length;

  const wrap = document.getElementById('homeTableWrap');
  if(st.users.length === 0){
    wrap.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="glyph">◌</div>${t('emptyUsers')}</div></td></tr>`;
    return;
  }
  wrap.innerHTML = st.users.map(u=>{
    const status = getStatus(u);
    const pct = u.trafficLimit>0 ? Math.min(100, Math.round((u.trafficUsed/u.trafficLimit)*100)) : 0;
    const dl = daysLeft(u.expiry);
    const creditText = u.expiry ? (dl!==null ? (dl>=0? dl+' '+t('days') : t('passed')) : escapeHtml(u.expiry)) : t('unlimited');
    const usedText = (Number(u.trafficUsed)||0).toFixed(2);
    const totalText = u.trafficLimit>0 ? u.trafficLimit.toFixed(2) : '∞';
    return `<tr>
      <td class="name-cell">${escapeHtml(u.name)}</td>
      <td><span class="proto-chip">${(u.protocol||'vless').toUpperCase()}</span></td>
      <td class="usage-cell">
        <div class="mini-bar"><div class="fill" style="width:${pct}%"></div></div>
        <div class="usage-txt">${usedText} / ${totalText} GB</div>
      </td>
      <td>${creditText}</td>
      <td><span class="badge ${status}">${statusLabel(status)}</span></td>
      <td><button class="icon-btn" title="${t('subBtn')}" onclick="copySub('${u.uuid}')">🔗</button></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" onclick="toggleStatus(${u.id})" title="${t('edit')}">${u.status==='disabled'?'▶':'⏸'}</button>
          <button class="icon-btn" onclick="openEditUserModal(${u.id})" title="${t('edit')}">✎</button>
          <button class="icon-btn" onclick="deleteUser(${u.id})" title="${t('delete')}">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// ---- Users list (detailed cards) ----
async function getConfigFor(id){
  if (st.configs[id] !== undefined) return st.configs[id];
  try {
    const data = await api(`/users/${id}/config`);
    st.configs[id] = data;
    return data;
  } catch (e) {
    st.configs[id] = { error: e.message };
    return st.configs[id];
  }
}

async function renderUsersList(){
  const wrap = document.getElementById('usersListWrap');
  if (st.users.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="glyph">◌</div>${t('emptyUsers')}</div>`;
    return;
  }
  wrap.innerHTML = st.users.map(u => userCardSkeleton(u)).join('');
  for (const u of st.users) {
    const cfg = await getConfigFor(u.id);
    const el = document.getElementById(`cfg-${u.id}`);
    if (!el) continue;
    if (cfg.error) {
      el.innerHTML = `<div style="color:var(--muted); font-size:12px;">${escapeHtml(cfg.error)}</div>`;
    } else {
      el.innerHTML = `<div class="config-out mono">${escapeHtml(cfg.config)}</div>
        <div class="copy-row" style="margin-top:8px;"><button class="btn small secondary" onclick="copyConfig(${u.id})">${t('copy')}</button></div>`;
    }
  }
}

function userCardSkeleton(u){
  const status = getStatus(u);
  const dl = daysLeft(u.expiry);
  const pct = u.trafficLimit>0 ? Math.min(100, Math.round((u.trafficUsed/u.trafficLimit)*100)) : 0;
  const timeText = u.expiry ? escapeHtml(u.expiry) + (dl!==null?` (${dl>=0?dl+' '+t('days'):t('passed')})`:'') : t('unlimited');
  const deviceText = (u.deviceLimit===0 || u.deviceLimit===undefined || u.deviceLimit===null) ? '∞' : u.deviceLimit;
  const totalText = u.trafficLimit>0 ? u.trafficLimit.toFixed(2)+' GB' : t('unlimited');
  const usedText = (Number(u.trafficUsed)||0).toFixed(3)+' GB';
  const isOnline = status === 'active';
  return `
  <div class="user-row">
    <div class="user-row-main">
      <span class="badge-dot ${isOnline?'online':'offline'}">${isOnline?t('onlineLabel'):statusLabel(status)}</span>
      <span class="name">${escapeHtml(u.name)}</span>
      <span class="proto-badge">🦅</span>
      <span class="uuid-row mono">${escapeHtml(u.uuid)} 🔑</span>
      <span class="user-row-stat"><span class="v">${escapeHtml(u.fingerprint||'chrome')}</span><span class="ic">🔑</span></span>
      <span class="user-row-stat"><span class="v">${timeText}</span><span class="ic">📅</span></span>
      <span class="user-row-stat"><span class="v">${usedText} :${t('usedLabel')}</span><span class="ic">📊</span></span>
      <span class="user-row-stat"><span class="v">${t('totalLabel')}: ${totalText}</span><span class="ic">📦</span></span>
      <span class="user-row-stat"><span class="v">${deviceText} ${t('deviceLabel')}</span><span class="ic">📱</span></span>
      <span class="user-row-actions">
        <button class="icon-btn" onclick="toggleStatus(${u.id})" title="${t('edit')}">${u.status==='disabled'?'▶':'⏸'}</button>
        <button class="icon-btn" onclick="openEditUserModal(${u.id})" title="${t('edit')}">✎</button>
        <button class="pill-btn danger" onclick="deleteUser(${u.id})">🗑️ ${t('delete')}</button>
        <button class="pill-btn reset" onclick="resetUser(${u.id})">↻ ${t('resetBtn')}</button>
        <button class="pill-btn sub" onclick="copySub('${u.uuid}')">🔗 ${t('subBtn')}</button>
        <button class="pill-btn link" onclick="copyConfig(${u.id})">📋 ${t('linkBtn')}</button>
        ${(st.settings.realityEnabled && u.protocol === 'vless') ? `<button class="pill-btn reality" onclick="copyReality(${u.id})">⚡ Reality</button>` : ''}
      </span>
    </div>
    <div class="traffic-bar green"><div class="fill" style="width:${pct}%"></div></div>
    <div id="cfg-${u.id}" style="display:none;"></div>
  </div>`;
}

async function copyConfig(id){
  let cfg = st.configs[id];
  if (cfg === undefined) cfg = await getConfigFor(id);
  if (!cfg || cfg.error) { toast((cfg && cfg.error) || t('copied'), true); return; }
  navigator.clipboard.writeText(cfg.config).then(()=>toast(t('linkCopied'))).catch(()=>{});
}

function copySub(uuid){
  const subUrl = `${location.origin}/sub/${uuid}`;
  navigator.clipboard.writeText(subUrl).then(()=>toast(t('subCopied'))).catch(()=>{});
}

async function copyReality(id){
  try {
    const data = await api(`/users/${id}/config-reality`);
    navigator.clipboard.writeText(data.config).then(()=>toast(t('linkCopied'))).catch(()=>{});
  } catch (e) { toast(e.message, true); }
}

async function resetUser(id){
  if(!confirm(t('resetConfirm'))) return;
  try { await api(`/users/${id}/reset`, { method:'PATCH' }); await loadAll(); toast(t('resetDone')); }
  catch(e){ toast(e.message, true); }
}

// ---- Create user ----
document.getElementById('createUserBtn').onclick = async () => {
  const name = document.getElementById('nu-name').value.trim();
  if (!name) { toast(t('nameRequired')); return; }
  const unit = document.getElementById('nu-unit').value;
  const rawSize = parseFloat(document.getElementById('nu-limit').value) || 0;
  const trafficLimit = unit === 'MB' ? rawSize / 1024 : rawSize;
  const [protocol, network] = document.getElementById('nu-protocol-net').value.split('|');
  const payload = {
    name,
    expiryDays: parseInt(document.getElementById('nu-expiry-days').value, 10) || 0,
    trafficLimit,
    deviceLimit: parseInt(document.getElementById('nu-device-limit').value, 10) || 0,
    fingerprint: document.getElementById('nu-fingerprint').value,
    protocol,
    network: network || '',
    port: document.getElementById('nu-port').value.trim(),
    sni: document.getElementById('nu-sni').value.trim(),
    status: document.getElementById('nu-status').value
  };
  try {
    await api('/users', { method:'POST', body: JSON.stringify(payload) });
    resetCreateForm();
    st.configs = {};
    await loadAll();
    toast(t('userCreated'));
  } catch (e) { toast(e.message, true); }
};

function resetCreateForm(){
  document.getElementById('nu-name').value = '';
  document.getElementById('nu-limit').value = '2';
  document.getElementById('nu-unit').value = 'GB';
  document.getElementById('nu-expiry-days').value = '30';
  document.getElementById('nu-device-limit').value = '1';
  document.getElementById('nu-fingerprint').value = 'chrome';
  document.getElementById('nu-protocol-net').value = 'vless|ws';
  document.getElementById('nu-port').value = '';
  document.getElementById('nu-sni').value = '';
  document.getElementById('nu-status').value = 'active';
}
document.getElementById('cancelCreateBtn').onclick = resetCreateForm;

// ---- Edit user modal ----
function openEditUserModal(id){
  const user = st.users.find(u=>u.id===id);
  if (!user) return;
  document.getElementById('modalRoot').innerHTML = `
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-head"><h3>${t('editUserTitle')}</h3><button class="close" id="closeModal">✕</button></div>
        <div class="modal-body">
          <div class="field"><label>${t('fieldName')}</label><input id="eu-name" value="${escapeHtml(user.name)}"></div>
          <div class="field-row">
            <div class="field"><label>${t('fieldProtocol')}</label>
              <select id="eu-protocol">
                <option value="vless" ${user.protocol==='vless'?'selected':''}>VLESS</option>
                <option value="vmess" ${user.protocol==='vmess'?'selected':''}>VMess</option>
                <option value="shadowsocks" ${user.protocol==='shadowsocks'?'selected':''}>Shadowsocks</option>
              </select>
            </div>
            <div class="field"><label>${t('fieldPort')}</label><input id="eu-port" type="number" value="${escapeHtml(user.port||'')}"></div>
          </div>
          <div class="field"><label>${t('fieldSni')}</label><input id="eu-sni" value="${escapeHtml(user.sni||'')}"></div>
          <div class="field-row">
            <div class="field"><label>${t('fieldExpiry')}</label><input id="eu-expiry" type="date" value="${user.expiry||''}"></div>
            <div class="field"><label>${t('fieldVolume')}</label><input id="eu-limit" type="number" min="0" value="${user.trafficLimit||0}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>${t('fieldConcurrent')}</label><input id="eu-device-limit" type="number" min="0" value="${user.deviceLimit!=null?user.deviceLimit:1}"></div>
            <div class="field"><label>${t('fieldFingerprint')}</label>
              <select id="eu-fingerprint">
                <option value="chrome" ${user.fingerprint==='chrome'?'selected':''}>Chrome</option>
                <option value="firefox" ${user.fingerprint==='firefox'?'selected':''}>Firefox</option>
                <option value="safari" ${user.fingerprint==='safari'?'selected':''}>Safari</option>
                <option value="ios" ${user.fingerprint==='ios'?'selected':''}>iOS</option>
                <option value="android" ${user.fingerprint==='android'?'selected':''}>Android</option>
                <option value="edge" ${user.fingerprint==='edge'?'selected':''}>Edge</option>
                <option value="random" ${user.fingerprint==='random'?'selected':''}>Random</option>
              </select>
            </div>
          </div>
          <div class="field"><label>${t('configVolume')} (used)</label><input id="eu-used" type="number" min="0" value="${user.trafficUsed||0}"></div>
          <div class="field-row">
            <div class="field"><label>${t('fieldPath')}</label><input id="eu-path" disabled value="${escapeHtml(st.settings.path||'/ws')}"></div>
            <div class="field"><label>${t('fieldStatusSelect')}</label>
              <select id="eu-status">
                <option value="active" ${user.status!=='disabled'?'selected':''}>${t('statusActive')}</option>
                <option value="disabled" ${user.status==='disabled'?'selected':''}>${t('statusDisabled')}</option>
              </select>
            </div>
          </div>
          <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; color:var(--muted); cursor:pointer;">
            <input type="checkbox" id="eu-reset-usage" style="width:auto;"> ${t('resetUsageLabel')}
          </label>
        </div>
        <div class="modal-foot">
          <button class="btn secondary" id="cancelModal">${t('cancel')}</button>
          <button class="btn" id="saveUser">${t('save')}</button>
        </div>
      </div>
    </div>`;
  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('cancelModal').onclick = closeModal;
  document.getElementById('overlay').onclick = (e) => { if(e.target.id==='overlay') closeModal(); };
  document.getElementById('saveUser').onclick = async () => {
    const payload = {
      name: document.getElementById('eu-name').value.trim(),
      protocol: document.getElementById('eu-protocol').value,
      port: document.getElementById('eu-port').value.trim(),
      sni: document.getElementById('eu-sni').value.trim(),
      expiry: document.getElementById('eu-expiry').value,
      trafficLimit: parseFloat(document.getElementById('eu-limit').value) || 0,
      trafficUsed: document.getElementById('eu-reset-usage').checked ? 0 : (parseFloat(document.getElementById('eu-used').value) || 0),
      deviceLimit: parseInt(document.getElementById('eu-device-limit').value, 10) || 0,
      fingerprint: document.getElementById('eu-fingerprint').value,
      status: document.getElementById('eu-status').value
    };
    try {
      await api(`/users/${user.id}`, { method:'PUT', body: JSON.stringify(payload) });
      st.configs = {};
      await loadAll();
      closeModal();
      toast(t('userUpdated'));
    } catch (e) { toast(e.message, true); }
  };
}
function closeModal(){ document.getElementById('modalRoot').innerHTML = ''; }

async function toggleStatus(id){
  try { await api(`/users/${id}/toggle`, { method:'PATCH' }); await loadAll(); }
  catch(e){ toast(e.message, true); }
}
async function deleteUser(id){
  if(!confirm(t('confirmDelete'))) return;
  try { await api(`/users/${id}`, { method:'DELETE' }); delete st.configs[id]; await loadAll(); }
  catch(e){ toast(e.message, true); }
}

// ---- Init ----
(function init(){
  const savedLang = localStorage.getItem('panel_lang') || 'fa';
  applyLang(savedLang);
  document.getElementById('homeVersionBadge').textContent = APP_VERSION;
  document.getElementById('settingsVersionVal').textContent = APP_VERSION;
  const savedTheme = localStorage.getItem('panel_theme') || 'dark';
  applyTheme(savedTheme);
  const savedOpacity = localStorage.getItem('panel_bg_opacity');
  document.getElementById('bgOpacityRange').value = savedOpacity != null ? savedOpacity : 18;
  applyBgOpacity(document.getElementById('bgOpacityRange').value);
  if (st.token) showApp(); else showLogin();
})();
