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

// Auth, Language, Nav ... (بقیه کد اصلی)
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

// ... (بقیه کدهای اصلی رو فعلاً نگه دار)
