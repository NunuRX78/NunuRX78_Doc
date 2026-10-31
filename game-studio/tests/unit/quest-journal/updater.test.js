// Unit test cho phần tự cập nhật (updater.js) với Capacitor giả lập.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const CODE = fs.readFileSync(path.join(__dirname, '../../../src/quest-journal/www/updater.js'), 'utf8');

function load({ web = '1.0.5', nativeHash = 'aaa', manifest, current = 'builtin', bundles = [] } = {}) {
  const calls = [];
  const prefs = {};
  const el = () => ({ appendChild() {}, addEventListener() {}, setAttribute() {}, remove() {}, set innerHTML(v) {}, set textContent(v) { this.text = v; } });
  const banners = [];
  const doc = {
    getElementById: () => null,
    createElement: () => el(),
    body: { appendChild(b) { banners.push(b); } }
  };
  const Plugins = {
    CapacitorHttp: { get: async ({ url }) => { calls.push(['http', url]); return { status: 200, data: manifest }; } },
    CapacitorUpdater: {
      current: async () => ({ bundle: { id: current, version: web } }),
      list: async () => ({ bundles }),
      download: async (o) => { calls.push(['download', o.url, o.version]); return { id: 'b1', version: o.version, status: 'success' }; },
      next: async (o) => { calls.push(['next', o.id]); },
      set: async (o) => { calls.push(['set', o.id]); },
      notifyAppReady: async () => { calls.push(['ready']); }
    },
    Preferences: { get: async ({ key }) => ({ value: prefs[key] ?? null }), set: async ({ key, value }) => { prefs[key] = value; } }
  };
  const window = { QJ_VERSION: { web, nativeHash }, Capacitor: { isNativePlatform: () => true, Plugins }, location: {} };
  vm.runInNewContext(CODE, { window, document: doc, console, setTimeout: () => {}, Date, JSON, String, Math, parseInt });
  return { U: window.QJUpdater, calls, prefs, banners, window };
}

test('so sánh phiên bản theo số, không theo chữ', () => {
  const { U } = load();
  assert.ok(U.compareVersions('1.0.12', '1.0.9') > 0);
  assert.ok(U.compareVersions('1.0.9', '1.0.12') < 0);
  assert.equal(U.compareVersions('1.0.3', '1.0.3'), 0);
});

test('bản mới cùng nativeHash: tải gói web và đặt làm gói kế tiếp', async () => {
  const manifest = { version: '1.0.6', nativeHash: 'aaa', zip: 'https://x/www.zip', apk: 'https://x/a.apk' };
  const { U, calls, prefs } = load({ manifest });
  await U.check(true);
  assert.deepEqual(calls.filter(c => c[0] !== 'http'), [['download', 'https://x/www.zip', '1.0.6'], ['next', 'b1']]);
  assert.equal(prefs['qj-native-hash'], 'aaa');
});

test('bản mới khác nativeHash: không tải gói web, hiện lời mời tải APK', async () => {
  const manifest = { version: '1.0.6', nativeHash: 'bbb', zip: 'https://x/www.zip', apk: 'https://x/a.apk' };
  const { U, calls, banners } = load({ manifest });
  await U.check(true);
  assert.equal(calls.some(c => c[0] === 'download'), false);
  assert.equal(banners.length, 1);
});

test('đã là bản mới nhất thì không tải gì', async () => {
  const { U, calls } = load({ manifest: { version: '1.0.5', nativeHash: 'aaa' } });
  await U.check(true);
  assert.equal(calls.some(c => c[0] === 'download'), false);
});

test('gói đã tải từ trước thì dùng lại, không tải lần nữa', async () => {
  const manifest = { version: '1.0.6', nativeHash: 'aaa', zip: 'z', apk: 'a' };
  const { U, calls } = load({ manifest, bundles: [{ id: 'old', version: '1.0.6', status: 'success' }] });
  await U.check(true);
  assert.deepEqual(calls.filter(c => c[0] !== 'http'), [['next', 'old']]);
});
