/* Quest Journal — tự cập nhật, giống service worker của expense-app nhưng cho bản APK.
 *
 * Mỗi lần mở app (và khi quay lại app, tối đa 1 lần/giờ) đọc update.json của bản release mới nhất trên GitHub:
 *  - Cùng nativeHash (chỉ đổi HTML/CSS/JS): tải gói web về bằng @capgo/capacitor-updater, áp dụng ở lần mở sau,
 *    hoặc ngay khi bấm "Cập nhật ngay". Không cần cài lại APK, không mất dữ liệu.
 *  - Khác nativeHash (đổi plugin, icon, cấu hình Android): mời tải APK mới.
 * Dữ liệu người chơi nằm trong Preferences nên không bị ảnh hưởng khi đổi gói web.
 */
(function () {
  'use strict';
  const MANIFEST_URL = 'https://github.com/NunuRX78/NunuRX78_Doc/releases/latest/download/update.json';
  const CHECK_INTERVAL_MS = 60 * 60 * 1000;
  const NATIVE_HASH_KEY = 'qj-native-hash';

  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const plugin = (name) => (isNative && Cap.Plugins && Cap.Plugins[name]) || null;
  const V = window.QJ_VERSION || { web: 'dev', nativeHash: 'dev' };

  let lastCheck = 0;
  let checking = false;
  let notify = () => {};

  /** So sánh "1.0.12" với "1.0.9": >0 nếu a mới hơn b. */
  function compareVersions(a, b) {
    const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  async function getJson(url) {
    const http = plugin('CapacitorHttp');
    if (http) {
      // HTTP native: không bị CORS và theo được redirect của GitHub Releases
      const res = await http.get({ url, params: { t: String(Date.now()) }, responseType: 'json' });
      if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
      return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    }
    const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  /** Bản native đang cài ứng với nativeHash nào. Ghi lại khi app chạy gói web gốc đi kèm APK. */
  async function installedNativeHash(updater) {
    const prefs = plugin('Preferences');
    const cur = await updater.current();
    if (cur.bundle.id === 'builtin') {
      if (prefs) await prefs.set({ key: NATIVE_HASH_KEY, value: V.nativeHash });
      return V.nativeHash;
    }
    const saved = prefs ? (await prefs.get({ key: NATIVE_HASH_KEY })).value : null;
    return saved || V.nativeHash;
  }

  function banner(text, actionLabel, onAction) {
    let b = document.getElementById('updateBanner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'updateBanner';
      b.className = 'update-banner';
      document.body.appendChild(b);
    }
    b.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = text;
    b.appendChild(span);
    if (actionLabel) {
      const btn = document.createElement('button');
      btn.className = 'btn small primary';
      btn.textContent = actionLabel;
      btn.addEventListener('click', onAction);
      b.appendChild(btn);
    }
    const close = document.createElement('button');
    close.className = 'icon-btn';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Đóng');
    close.addEventListener('click', () => b.remove());
    b.appendChild(close);
  }

  /** Kiểm tra bản mới. `manual` = người dùng bấm nút, nên báo cả khi đã là bản mới nhất. */
  async function check(manual = false) {
    const updater = plugin('CapacitorUpdater');
    if (!updater) { if (manual) notify('Chỉ bản cài trên điện thoại mới tự cập nhật được.'); return; }
    if (checking) return;
    if (!manual && Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
    checking = true;
    lastCheck = Date.now();
    try {
      if (manual) notify('Đang kiểm tra bản mới…');
      const m = await getJson(MANIFEST_URL);
      if (!m || !m.version || compareVersions(m.version, V.web) <= 0 || V.web === 'dev') {
        if (manual) notify(`Bạn đang dùng bản mới nhất (${V.web}).`);
        return;
      }
      const nativeHash = await installedNativeHash(updater);
      if (m.nativeHash !== nativeHash) {
        banner(`Có bản cài đặt mới ${m.version}.`, 'Tải APK', () => { window.location.href = m.apk; });
        return;
      }
      const list = await updater.list();
      let bundle = (list.bundles || []).find(x => x.version === m.version && x.status === 'success');
      if (!bundle) bundle = await updater.download({ url: m.zip, version: m.version });
      await updater.next({ id: bundle.id });
      banner(`Đã tải bản ${m.version}. Sẽ dùng từ lần mở sau.`, 'Cập nhật ngay', () => updater.set({ id: bundle.id }));
    } catch (e) {
      console.warn('Kiểm tra cập nhật lỗi', e);
      if (manual) notify('Không kiểm tra được cập nhật. Kiểm tra kết nối mạng rồi thử lại.');
    } finally {
      checking = false;
    }
  }

  async function init(options = {}) {
    notify = options.toast || notify;
    const updater = plugin('CapacitorUpdater');
    if (updater) {
      // Báo gói web hiện tại chạy ổn; nếu không, plugin tự quay về gói trước đó.
      try { await updater.notifyAppReady(); } catch (e) { console.warn(e); }
      try {
        const cur = await updater.current();
        const prefs = plugin('Preferences');
        const shownKey = 'qj-updated-to';
        const shown = prefs ? (await prefs.get({ key: shownKey })).value : null;
        if (cur.bundle.id !== 'builtin' && shown !== V.web) {
          notify(`✨ Đã cập nhật lên bản ${V.web}`);
          if (prefs) await prefs.set({ key: shownKey, value: V.web });
        }
      } catch (e) { /* bỏ qua */ }
    }
    setTimeout(() => check(false), 1500);
    const app = plugin('App');
    if (app) app.addListener('resume', () => check(false));
  }

  window.QJUpdater = { init, check, compareVersions, version: V };
})();
