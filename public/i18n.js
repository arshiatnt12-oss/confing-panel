const I18N = {
  fa: {
    telegramText: 'کانال تلگرام',
    navHome: 'خانه', navUsers: 'کاربر جدید', navCleanip: 'Clean IP',
    navServer: 'تنظیمات سرور', navReality: 'Reality', navAccount: 'حساب کاربری', logout: 'خروج',
    loginTitle: 'ورود به پنل', username: 'نام کاربری', password: 'رمز عبور', loginBtn: 'ورود',
    homeSubtitle: 'نمای کلی مصرف و وضعیت کاربران',
    statTotalUsers: 'کل کاربران', statActive: 'فعال', statTraffic: 'مجموع ترافیک (GB)', statExpiring: 'نزدیک به انقضا',
    usersTitle: 'کاربر جدید', usersSubtitle: 'ساخت و مدیریت کانفیگ‌ها',
    fieldName: 'نام کاربر', fieldExpiry: 'تاریخ انقضا', fieldVolume: 'حجم (GB)',
    fieldProtocol: 'پروتکل', fieldPort: 'پورت',
    portHint: 'این پورت رو از بخش TCP Proxy پروژه‌ی Railway بگیر',
    fieldSni: 'SNI', createBtn: 'ساخت کانفیگ', listTitle: 'کاربران ساخته‌شده',
    configLink: 'لینک کانفیگ', configVolume: 'حجم', configTime: 'زمان', configPort: 'پورت',
    edit: 'ویرایش', delete: 'حذف', copy: 'کپی', copied: 'کپی شد',
    newConfigTitle: 'ساخت کانفیگ جدید',
    fieldUsername: 'نام کاربری', usernamePlaceholder: 'مثلاً: کاربر علی',
    fieldSize: 'حجم', fieldUnit: 'واحد', fieldExpiryDays: 'انقضا (روز)',
    fieldDeviceLimit: 'محدودیت دستگاه', fieldFingerprint: 'فینگرپرینت',
    unlimitedHint: '۰ = نامحدود',
    linkBtn: 'لینک', subBtn: 'ساب', resetBtn: 'ریست',
    uuidLabel: 'شناسه', deviceLabel: 'دستگاه', totalLabel: 'کل', usedLabel: 'مصرف شده',
    onlineLabel: 'آنلاین', offlineLabel: 'غیرفعال',
    linkCopied: 'لینک کانفیگ کپی شد', subCopied: 'لینک ساب کپی شد',
    resetConfirm: 'مصرف این کاربر صفر بشه؟', resetDone: 'مصرف ریست شد',
    cleanipTitle: 'Clean IP',
    cleanipHint: 'هر آی‌پی رو در یک خط جدا وارد کن. این آی‌پی‌ها به‌جای دامنه به‌عنوان آدرس اتصال کانفیگ‌ها استفاده می‌شن.',
    apply: 'اعمال', applied: 'ذخیره شد',
    serverTitle: 'تنظیمات سرور', serverSubtitle: 'مقادیر پیش‌فرض برای ساخت کانفیگ‌ها',
    fieldAddress: 'آدرس / دامنه سرور', fieldDefaultPort: 'پورت پیش‌فرض',
    fieldNetwork: 'شبکه (Network)', fieldSecurity: 'امنیت (Security)',
    fieldPath: 'مسیر (Path)', fieldRemark: 'برچسب (Remark)',
    accountTitle: 'حساب کاربری', accountSubtitle: 'تغییر رمز عبور ادمین',
    currentPassword: 'رمز فعلی', newPassword: 'رمز جدید', changePassword: 'تغییر رمز',
    unlimited: 'نامحدود', days: 'روز', passed: 'گذشته',
    statusActive: 'فعال', statusDisabled: 'غیرفعال', statusExpired: 'منقضی',
    emptyUsers: 'هنوز کاربری ساخته نشده.',
    nameRequired: 'نام کاربر رو وارد کن', userCreated: 'کاربر ساخته شد', userUpdated: 'کاربر بروزرسانی شد',
    confirmDelete: 'این کاربر حذف بشه؟', passwordChanged: 'رمز عبور تغییر کرد',
    editUserTitle: 'ویرایش کاربر', cancel: 'انصراف', save: 'ذخیره', close: 'بستن',
    defaultUsernameLabel: 'نام کاربری:', defaultPasswordLabel: 'رمز عبور:',
    remarkLockedHint: 'این مقدار ثابته و قابل تغییر نیست.',
    realityTitle: 'Reality (سرعت بالا / ضدفیلتر)', realitySubtitle: 'اتصال مستقیم بدون عبور از edge ریلوی - نیازمند یک TCP Proxy جدا',
    realityHint: '۱) توی تنظیمات Railway، بخش Networking، یک «TCP Proxy» جدید بساز که به پورت 48281 (یا هرچی این‌جا ست کردی) اشاره کنه. ۲) هاست و پورتی که Railway بهت داد رو پایین وارد کن. ۳) دکمه‌ی «ساخت کلید» رو بزن. ۴) فعالش کن و ذخیره کن.',
    realityEnabledLabel: 'فعال‌سازی Reality', off: 'غیرفعال', on: 'فعال',
    realityDestLabel: 'دامنه‌ی استتار (Dest)', realityProxyHostLabel: 'هاست TCP Proxy', realityProxyPortLabel: 'پورت TCP Proxy',
    realityPublicKeyLabel: 'کلید عمومی (Public Key)', realityShortIdLabel: 'Short ID', generateKeys: 'ساخت کلید',

    navSettings: 'تنظیمات پنل',
    panelWelcome: 'خوش اومدی به Warbius Panel 👋',
    displayModeLabel: 'حالت نمایش', lightMode: 'روشن', darkMode: 'تاریک',
    bgOpacityLabel: 'شفافیت پس‌زمینه',
    settingsTitle: 'تنظیمات پنل', settingsSubtitle: 'ظاهر، رمز عبور و اطلاعات پنل',
    backgroundPathLabel: 'پس‌زمینه', versionLabel: 'نسخه', protocolsLabel: 'پروتکل‌ها',
    tableName: 'نام', tableProtocol: 'پروتکل', tableUsage: 'مصرف', tableCredit: 'اعتبار',
    tableStatus: 'وضعیت', tableSub: 'ساب', tableActions: 'عملیات',
    recentUsersTitle: 'کاربران اخیر',
    fieldConcurrent: 'اتصال هم‌زمان',
    fieldTransport: 'نوع انتقال', fieldStatusSelect: 'وضعیت', resetUsageLabel: 'ریست مصرف',
    ipScannerTitle: 'اسکنر آی‌پی', ipScannerHint: 'آی‌پی‌ها رو (هر خط یکی) وارد کن تا آی‌پی‌های تمیز پیدا بشن.',
    ipScanPlaceholder: '1.1.1.1\n8.8.8.8', scanBtn: 'اسکن کن', scanning: 'در حال اسکن...',
    copyAll: 'کپی همه', pingLabel: 'پینگ', addToListBtn: 'افزودن به لیست', deadIp: 'پاسخ نداد',
    ipScanDone: 'اسکن تمام شد', ipsAdded: 'به لیست اضافه شد', noCleanIpsFound: 'هیچ آی‌پی تمیزی پیدا نشد'
  },
  en: {
    telegramText: 'Telegram Channel',
    navHome: 'Home', navUsers: 'New User', navCleanip: 'Clean IP',
    navServer: 'Server Settings', navReality: 'Reality', navAccount: 'Account', logout: 'Log out',
    loginTitle: 'Sign in', username: 'Username', password: 'Password', loginBtn: 'Sign in',
    homeSubtitle: 'Overview of usage and user status',
    statTotalUsers: 'Total Users', statActive: 'Active', statTraffic: 'Total Traffic (GB)', statExpiring: 'Expiring Soon',
    usersTitle: 'New User', usersSubtitle: 'Create and manage configs',
    fieldName: 'User Name', fieldExpiry: 'Expiry Date', fieldVolume: 'Volume (GB)',
    fieldProtocol: 'Protocol', fieldPort: 'Port',
    portHint: 'Get this port from the TCP Proxy section of your Railway project',
    fieldSni: 'SNI', createBtn: 'Create Config', listTitle: 'Created Users',
    configLink: 'Config Link', configVolume: 'Volume', configTime: 'Time', configPort: 'Port',
    edit: 'Edit', delete: 'Delete', copy: 'Copy', copied: 'Copied',
    newConfigTitle: 'Create New Config',
    fieldUsername: 'Username', usernamePlaceholder: 'e.g. User Ali',
    fieldSize: 'Size', fieldUnit: 'Unit', fieldExpiryDays: 'Expiry (days)',
    fieldDeviceLimit: 'Device Limit', fieldFingerprint: 'Fingerprint',
    unlimitedHint: '0 = Unlimited',
    linkBtn: 'Link', subBtn: 'Sub', resetBtn: 'Reset',
    uuidLabel: 'UUID', deviceLabel: 'Devices', totalLabel: 'Total', usedLabel: 'Used',
    onlineLabel: 'Online', offlineLabel: 'Disabled',
    linkCopied: 'Config link copied', subCopied: 'Sub link copied',
    resetConfirm: 'Reset usage for this user?', resetDone: 'Usage reset',
    cleanipTitle: 'Clean IP',
    cleanipHint: 'Enter each IP on its own line. These IPs are used as the connect address of configs instead of the domain.',
    apply: 'Apply', applied: 'Saved',
    serverTitle: 'Server Settings', serverSubtitle: 'Default values used to build configs',
    fieldAddress: 'Server Address / Domain', fieldDefaultPort: 'Default Port',
    fieldNetwork: 'Network', fieldSecurity: 'Security',
    fieldPath: 'Path', fieldRemark: 'Remark',
    accountTitle: 'Account', accountSubtitle: 'Change admin password',
    currentPassword: 'Current Password', newPassword: 'New Password', changePassword: 'Change Password',
    unlimited: 'Unlimited', days: 'd', passed: 'passed',
    statusActive: 'Active', statusDisabled: 'Disabled', statusExpired: 'Expired',
    emptyUsers: 'No users created yet.',
    nameRequired: 'Enter the user name', userCreated: 'User created', userUpdated: 'User updated',
    confirmDelete: 'Delete this user?', passwordChanged: 'Password changed',
    editUserTitle: 'Edit User', cancel: 'Cancel', save: 'Save', close: 'Close',
    defaultUsernameLabel: 'Username:', defaultPasswordLabel: 'Password:',
    remarkLockedHint: 'This value is fixed and cannot be changed.',
    realityTitle: 'Reality (High speed / Anti-censorship)', realitySubtitle: 'Direct connection bypassing Railway\'s edge - requires a separate TCP Proxy',
    realityHint: '1) In Railway settings, under Networking, create a new "TCP Proxy" pointing at port 48281 (or whatever you set here). 2) Enter the host/port Railway gave you below. 3) Click "Generate Keys". 4) Enable and save.',
    realityEnabledLabel: 'Enable Reality', off: 'Disabled', on: 'Enabled',
    realityDestLabel: 'Camouflage domain (Dest)', realityProxyHostLabel: 'TCP Proxy host', realityProxyPortLabel: 'TCP Proxy port',
    realityPublicKeyLabel: 'Public Key', realityShortIdLabel: 'Short ID', generateKeys: 'Generate Keys',

    navSettings: 'Panel Settings',
    panelWelcome: 'Welcome to Warbius Panel 👋',
    displayModeLabel: 'Display Mode', lightMode: 'Light', darkMode: 'Dark',
    bgOpacityLabel: 'Background Opacity',
    settingsTitle: 'Panel Settings', settingsSubtitle: 'Appearance, password, and panel info',
    backgroundPathLabel: 'Background', versionLabel: 'Version', protocolsLabel: 'Protocols',
    tableName: 'Name', tableProtocol: 'Protocol', tableUsage: 'Usage', tableCredit: 'Validity',
    tableStatus: 'Status', tableSub: 'Sub', tableActions: 'Actions',
    recentUsersTitle: 'Recent Users',
    fieldConcurrent: 'Concurrent Connections',
    fieldTransport: 'Transport Type', fieldStatusSelect: 'Status', resetUsageLabel: 'Reset Usage',
    ipScannerTitle: 'IP Scanner', ipScannerHint: 'Enter IPs (one per line) to find clean ones.',
    ipScanPlaceholder: '1.1.1.1\n8.8.8.8', scanBtn: 'Scan', scanning: 'Scanning...',
    copyAll: 'Copy All', pingLabel: 'Ping', addToListBtn: 'Add to List', deadIp: 'No response',
    ipScanDone: 'Scan finished', ipsAdded: 'Added to list', noCleanIpsFound: 'No clean IPs found'
  }
};

let currentLang = 'fa';
function t(key) { return (I18N[currentLang] && I18N[currentLang][key]) || key; }

function applyLang(lang) {
  currentLang = lang;
  document.getElementById('htmlRoot').setAttribute('lang', lang);
  document.getElementById('htmlRoot').setAttribute('dir', lang === 'fa' ? 'rtl' : 'ltr');
  document.getElementById('langFa').classList.toggle('active', lang === 'fa');
  document.getElementById('langEn').classList.toggle('active', lang === 'en');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.setAttribute('placeholder', t(key));
  });
  try { localStorage.setItem('panel_lang', lang); } catch (e) {}
  if (typeof onLangChanged === 'function') onLangChanged();
}
