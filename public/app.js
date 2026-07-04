const st = { users: [], server: null, token: localStorage.getItem('panel_token') || null };

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
  if (res.status === 401) {
    logout();
    throw new Error('نشست منقضی شده');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'خطای ناشناخته');
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
  st.token = null;
  localStorage.removeItem('panel_token');
  showLogin();
}

document.getElementById('loginBtn').onclick = async () => {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    st.token = data.token;
    localStorage.setItem('panel_token', data.token);
    showApp();
  } catch (e) {
    errEl.textContent = e.message;
  }
};
document.getElementById('logoutBtn').onclick = logout;

document.getElementById('changePassBtn').onclick = async () => {
  const currentPassword = document.getElementById('acc-current').value;
  const newPassword = document.getElementById('acc-new').value;
  try {
    await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    toast('رمز عبور تغییر کرد');
    document.getElementById('acc-current').value = '';
    document.getElementById('acc-new').value = '';
  } catch (e) { toast(e.message); }
};

// ---- Nav ----
document.querySelectorAll('.nav-item').forEach(el=>{
  el.onclick = () => {
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    el.classList.add('active');
    const v = el.dataset.view;
    ['users','server','account'].forEach(name=>{
      document.getElementById(`view-${name}`).style.display = (name===v) ? '' : 'none';
    });
  };
});

// ---- Load data ----
async function loadAll(){
  try {
    const [users, server] = await Promise.all([api('/users'), api('/settings')]);
    st.users = users;
    st.server = server;
    hydrateServerForm();
    renderUsers();
  } catch (e) { toast(e.message); }
}

function hydrateServerForm(){
  document.getElementById('srv-address').value = st.server.address || '';
  document.getElementById('srv-port').value = st.server.port || '443';
  document.getElementById('srv-protocol').value = st.server.protocol || 'vless';
  document.getElementById('srv-network').value = st.server.network || 'ws';
  document.getElementById('srv-path').value = st.server.path || '/ws';
  document.getElementById('srv-sni').value = st.server.sni || '';
  document.getElementById('srv-security').value = st.server.security || 'tls';
  document.getElementById('srv-remark').value = st.server.remark || 'MyPanel';
}

document.getElementById('saveServerBtn').onclick = async () => {
  const payload = {
    address: document.getElementById('srv-address').value.trim(),
    port: document.getElementById('srv-port').value.trim() || '443',
    protocol: document.getElementById('srv-protocol').value,
    network: document.getElementById('srv-network').value,
    path: document.getElementById('srv-path').value.trim() || '/',
    sni: document.getElementById('srv-sni').value.trim(),
    security: document.getElementById('srv-security').value,
    remark: document.getElementById('srv-remark').value.trim() || 'MyPanel'
  };
  try {
    st.server = await api('/settings', { method: 'PUT', body: JSON.stringify(payload) });
    toast('تنظیمات سرور ذخیره شد');
  } catch (e) { toast(e.message); }
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

// ---- Render ----
function renderUsers(){
  const wrap = document.getElementById('tableWrap');
  document.getElementById('statTotal').textContent = st.users.length;
  document.getElementById('statActive').textContent = st.users.filter(u=>getStatus(u)==='active').length;
  document.getElementById('statSoon').textContent = st.users.filter(u=>{
    const dl = daysLeft(u.expiry); return dl!==null && dl>=0 && dl<=3 && getStatus(u)==='active';
  }).length;
  document.getElementById('statExpired').textContent = st.users.filter(u=>['expired','disabled'].includes(getStatus(u))).length;

  if(st.users.length === 0){
    wrap.innerHTML = `<div class="empty-state"><div class="glyph">◌</div>هنوز کاربری اضافه نشده.<br>با دکمه «کاربر جدید» اولین کاربر رو بساز.</div>`;
    return;
  }

  const rows = st.users.map(u=>{
    const status = getStatus(u);
    const statusLabel = {active:'فعال', disabled:'غیرفعال', expired:'منقضی'}[status];
    const dl = daysLeft(u.expiry);
    const pct = u.trafficLimit>0 ? Math.min(100, Math.round((u.trafficUsed/u.trafficLimit)*100)) : 0;
    const fillClass = pct>=100 ? 'full' : (pct>=80 ? 'high' : '');
    return `
    <tr>
      <td><div style="font-weight:600;">${escapeHtml(u.name)}</div><div class="uid mono">${u.uuid}</div></td>
      <td><span class="badge ${status}">${statusLabel}</span></td>
      <td>${u.expiry ? escapeHtml(u.expiry) + (dl!==null?` <span style="color:var(--muted)">(${dl>=0?dl+' روز':'گذشته'})</span>`:'') : '<span style="color:var(--muted)">نامحدود</span>'}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <div class="traffic-bar"><div class="fill ${fillClass}" style="width:${pct}%"></div></div>
          <span class="mono" style="font-size:11px; color:var(--muted);">${u.trafficLimit>0 ? u.trafficUsed+'/'+u.trafficLimit+'GB' : '∞'}</span>
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="کانفیگ" onclick="showConfig(${u.id})">▤</button>
          <button class="icon-btn" title="ویرایش" onclick="openUserModal(${u.id})">✎</button>
          <button class="icon-btn" title="فعال/غیرفعال" onclick="toggleStatus(${u.id})">${u.status==='disabled'?'▶':'⏸'}</button>
          <button class="icon-btn" title="حذف" onclick="deleteUser(${u.id})">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `<table><thead><tr><th>نام کاربر</th><th>وضعیت</th><th>انقضا</th><th>ترافیک</th><th>عملیات</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ---- User modal ----
function openUserModal(id){
  const editing = !!id;
  const user = editing ? st.users.find(u=>u.id===id) : { id:null, name:'', uuid:'', expiry:'', trafficLimit:0, trafficUsed:0, status:'active' };

  document.getElementById('modalRoot').innerHTML = `
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-head"><h3>${editing?'ویرایش کاربر':'کاربر جدید'}</h3><button class="close" id="closeModal">✕</button></div>
        <div class="modal-body">
          <div class="field"><label>نام کاربر</label><input id="f-name" value="${escapeHtml(user.name)}" placeholder="مثلاً: علی"></div>
          <div class="field"><label>UUID ${editing?'':'(خالی=تصادفی)'}</label><input id="f-uuid" class="mono" value="${user.uuid}"></div>
          <div class="field-row">
            <div class="field"><label>تاریخ انقضا (اختیاری)</label><input id="f-expiry" type="date" value="${user.expiry||''}"></div>
            <div class="field"><label>سقف ترافیک (GB, ۰=نامحدود)</label><input id="f-limit" type="number" min="0" value="${user.trafficLimit||0}"></div>
          </div>
          ${editing ? `<div class="field"><label>مصرف فعلی (GB)</label><input id="f-used" type="number" min="0" value="${user.trafficUsed||0}"></div>` : ''}
        </div>
        <div class="modal-foot">
          <button class="btn secondary" id="cancelModal">انصراف</button>
          <button class="btn" id="saveUser">ذخیره</button>
        </div>
      </div>
    </div>`;

  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('cancelModal').onclick = closeModal;
  document.getElementById('overlay').onclick = (e) => { if(e.target.id==='overlay') closeModal(); };

  document.getElementById('saveUser').onclick = async () => {
    const name = document.getElementById('f-name').value.trim();
    if(!name){ toast('نام کاربر رو وارد کن'); return; }
    const payload = {
      name,
      uuid: document.getElementById('f-uuid').value.trim(),
      expiry: document.getElementById('f-expiry').value,
      trafficLimit: parseFloat(document.getElementById('f-limit').value) || 0
    };
    if (editing) payload.trafficUsed = parseFloat(document.getElementById('f-used').value) || 0;

    try {
      if (editing) await api(`/users/${user.id}`, { method:'PUT', body: JSON.stringify(payload) });
      else await api('/users', { method:'POST', body: JSON.stringify(payload) });
      await loadAll();
      closeModal();
      toast(editing ? 'کاربر بروزرسانی شد' : 'کاربر اضافه شد');
    } catch (e) { toast(e.message); }
  };
}
function closeModal(){ document.getElementById('modalRoot').innerHTML = ''; }
document.getElementById('addUserBtn').onclick = () => openUserModal(null);

async function toggleStatus(id){
  try { await api(`/users/${id}/toggle`, { method:'PATCH' }); await loadAll(); }
  catch(e){ toast(e.message); }
}
async function deleteUser(id){
  if(!confirm('این کاربر حذف بشه؟')) return;
  try { await api(`/users/${id}`, { method:'DELETE' }); await loadAll(); }
  catch(e){ toast(e.message); }
}

async function showConfig(id){
  const u = st.users.find(x=>x.id===id);
  if(!u) return;
  let cfg = null, err = null;
  try {
    const data = await api(`/users/${id}/config`);
    cfg = data.config;
  } catch (e) { err = e.message; }

  document.getElementById('modalRoot').innerHTML = `
    <div class="overlay" id="overlay">
      <div class="modal">
        <div class="modal-head"><h3>کانفیگ — ${escapeHtml(u.name)}</h3><button class="close" id="closeModal">✕</button></div>
        <div class="modal-body">
          ${err ? `<div style="color:var(--muted); font-size:13px;">${escapeHtml(err)}</div>` : `
          <div class="field"><label>لینک اتصال</label><div class="config-out mono" id="cfgText">${escapeHtml(cfg)}</div></div>
          <div class="copy-row"><button class="btn" id="copyBtn">کپی کردن</button></div>
          `}
        </div>
        <div class="modal-foot"><button class="btn secondary" id="cancelModal">بستن</button></div>
      </div>
    </div>`;

  document.getElementById('closeModal').onclick = closeModal;
  document.getElementById('cancelModal').onclick = closeModal;
  document.getElementById('overlay').onclick = (e) => { if(e.target.id==='overlay') closeModal(); };
  const copyBtn = document.getElementById('copyBtn');
  if (copyBtn) copyBtn.onclick = () => navigator.clipboard.writeText(cfg).then(()=>toast('کپی شد')).catch(()=>toast('خطا در کپی'));
}

// ---- Init ----
if (st.token) showApp(); else showLogin();
