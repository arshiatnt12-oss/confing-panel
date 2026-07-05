const st = { token: localStorage.getItem('panel_token') || null, users: [], settings: null, configs: {} };

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
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
  } catch (e) { toast(e.message); }
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
    ['home','users','cleanip','server','account'].forEach(name=>{
      document.getElementById(`view-${name}`).style.display = (name===v) ? '' : 'none';
    });
  };
});

// ---- Load data ----
async function loadAll(){
  try {
    const [users, settings] = await Promise.all([api('/users'), api('/settings')]);
    st.users = users; st.settings = settings;
    hydrateServerForm(); hydrateCleanIpForm();
    renderHome(); renderUsersList();
  } catch (e) { toast(e.message); }
}

function hydrateServerForm(){
  document.getElementById('srv-address').value = st.settings.address || '';
  document.getElementById('srv-port').value = st.settings.port || '443';
  document.getElementById('srv-network').value = st.settings.network || 'ws';
  document.getElementById('srv-security').value = st.settings.security || 'tls';
  document.getElementById('srv-path').value = st.settings.path || '/ws';
  document.getElementById('srv-remark').value = st.settings.remark || 'Warbius';
}
function hydrateCleanIpForm(){
  document.getElementById('cip-list').value = (st.settings.cleanIps || '').split('\n').filter(Boolean).join('\n');
}

document.getElementById('saveServerBtn').onclick = async () => {
  const payload = {
    address: document.getElementById('srv-address').value.trim(),
    port: document.getElementById('srv-port').value.trim() || '443',
    network: document.getElementById('srv-network').value,
    security: document.getElementById('srv-security').value,
    path: document.getElementById('srv-path').value.trim() || '/',
    remark: document.getElementById('srv-remark').value.trim() || 'Warbius'
  };
  try { st.settings = await api('/settings', { method:'PUT', body: JSON.stringify(payload) }); toast(t('applied')); st.configs = {}; renderUsersList(); }
  catch (e) { toast(e.message); }
};

document.getElementById('applyCleanIpBtn').onclick = async () => {
  const cleanIps = document.getElementById('cip-list').value.split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
  try { st.settings = await api('/settings', { method:'PUT', body: JSON.stringify({ cleanIps }) }); toast(t('applied')); st.configs = {}; renderUsersList(); }
  catch (e) { toast(e.message); }
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
    wrap.innerHTML = `<div class="empty-state"><div class="glyph">◌</div>${t('emptyUsers')}</div>`;
    return;
  }
  wrap.innerHTML = st.users.map(u=>{
    const status = getStatus(u);
    return `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--border);">
      <div style="font-weight:600; font-size:13px;">${escapeHtml(u.name)}</div>
      <span class="badge ${status}">${statusLabel(status)}</span>
    </div>`;
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
  const fillClass = pct>=100 ? 'full' : (pct>=80 ? 'high' : '');
  const timeText = u.expiry ? escapeHtml(u.expiry) + (dl!==null?` (${dl>=0?dl+' '+t('days'):t('passed')})`:'') : t('unlimited');
  const deviceText = (u.deviceLimit===0 || u.deviceLimit===undefined || u.deviceLimit===null) ? '∞' : u.deviceLimit;
  const totalText = u.trafficLimit>0 ? u.trafficLimit.toFixed(2)+' GB' : t('unlimited');
  const usedText = (Number(u.trafficUsed)||0).toFixed(3)+' GB';
  const isOnline = status === 'active';
  return `
  <div class="user-card">
    <div class="user-card-head">
      <span class="badge-dot ${isOnline?'online':'offline'}">${isOnline?t('onlineLabel'):statusLabel(status)}</span>
      <div class="head-right">
        <button class="icon-btn" onclick="toggleStatus(${u.id})" title="${t('edit')}">${u.status==='disabled'?'▶':'⏸'}</button>
        <button class="icon-btn" onclick="openEditUserModal(${u.id})" title="${t('edit')}">✎</button>
        <span class="name">${escapeHtml(u.name)}</span>
        <span class="proto-badge">🦅</span>
      </div>
    </div>
    <div class="uuid-row mono">${escapeHtml(u.uuid)} 🔑</div>
    <div class="stat-row">
      <div class="stat-item"><span class="v">${escapeHtml(u.fingerprint||'chrome')}</span><span class="ic">🔑</span></div>
      <div class="stat-item">
        <span class="v">${timeText}</span>
        <span class="ic">📅</span>
      </div>
    </div>
    <div class="stat-row">
      <div class="stat-item"><span class="v">${usedText} :${t('usedLabel')}</span><span class="ic">📊</span></div>
      <div class="stat-item"><span class="v">${t('totalLabel')}: ${totalText}</span><span class="ic">📦</span></div>
    </div>
    <div class="stat-row">
      <div class="stat-item"><span class="v">${deviceText} ${t('deviceLabel')}</span><span class="ic">📱</span></div>
      <div class="stat-item"></div>
    </div>
    <div class="traffic-bar"><div class="fill ${fillClass}" style="width:${pct}%"></div></div>
    <div id="cfg-${u.id}" style="display:none;"></div>
    <div class="user-card-actions">
      <button class="pill-btn danger" onclick="deleteUser(${u.id})">🗑️ ${t('delete')}</button>
      <button class="pill-btn reset" onclick="resetUser(${u.id})">↻ ${t('resetBtn')}</button>
      <button class="pill-btn sub" onclick="copySub('${u.uuid}')">🔗 ${t('subBtn')}</button>
      <button class="pill-btn link" onclick="copyConfig(${u.id})">📋 ${t('linkBtn')}</button>
    </div>
  </div>`;
}

async function copyConfig(id){
  let cfg = st.configs[id];
  if (cfg === undefined) cfg = await getConfigFor(id);
  if (!cfg || cfg.error) { toast((cfg && cfg.error) || t('copied')); return; }
  navigator.clipboard.writeText(cfg.config).then(()=>toast(t('linkCopied'))).catch(()=>{});
}

function copySub(uuid){
  const subUrl = `${location.origin}/sub/${uuid}`;
  navigator.clipboard.writeText(subUrl).then(()=>toast(t('subCopied'))).catch(()=>{});
}

async function resetUser(id){
  if(!confirm(t('resetConfirm'))) return;
  try { await api(`/users/${id}/reset`, { method:'PATCH' }); await loadAll(); toast(t('resetDone')); }
  catch(e){ toast(e.message); }
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
    sni: document.getElementById('nu-sni').value.trim()
  };
  try {
    await api('/users', { method:'POST', body: JSON.stringify(payload) });
    resetCreateForm();
    st.configs = {};
    await loadAll();
    toast(t('userCreated'));
  } catch (e) { toast(e.message); }
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
            <div class="field"><label>${t('fieldDeviceLimit')}</label><input id="eu-device-limit" type="number" min="0" value="${user.deviceLimit!=null?user.deviceLimit:1}"></div>
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
      trafficUsed: parseFloat(document.getElementById('eu-used').value) || 0,
      deviceLimit: parseInt(document.getElementById('eu-device-limit').value, 10) || 0,
      fingerprint: document.getElementById('eu-fingerprint').value
    };
    try {
      await api(`/users/${user.id}`, { method:'PUT', body: JSON.stringify(payload) });
      st.configs = {};
      await loadAll();
      closeModal();
      toast(t('userUpdated'));
    } catch (e) { toast(e.message); }
  };
}
function closeModal(){ document.getElementById('modalRoot').innerHTML = ''; }

async function toggleStatus(id){
  try { await api(`/users/${id}/toggle`, { method:'PATCH' }); await loadAll(); }
  catch(e){ toast(e.message); }
}
async function deleteUser(id){
  if(!confirm(t('confirmDelete'))) return;
  try { await api(`/users/${id}`, { method:'DELETE' }); delete st.configs[id]; await loadAll(); }
  catch(e){ toast(e.message); }
}

// ---- Init ----
(function init(){
  const savedLang = localStorage.getItem('panel_lang') || 'fa';
  applyLang(savedLang);
  if (st.token) showApp(); else showLogin();
})();
