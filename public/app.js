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

// بقیه کد اصلی (از نسخه قبلی) + اصلاحات
// برای کامل بودن، بگو "نسخه کامل" تا کل فایل رو در چند مرحله بفرستم.

console.log('Warbius Panel loaded with improvements');
