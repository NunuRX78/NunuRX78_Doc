# Quest Journal

Todo list kiểu quest log RPG, theo brief `design/game-brief.md`. Ứng dụng web thuần (HTML/CSS/JS,
không bundler) được đóng gói thành APK Android bằng Capacitor.

| File | Vai trò |
|---|---|
| `www/config.js` | Toàn bộ thông số cân bằng: XP/giờ, vàng/giờ, đường cong cấp, cửa hàng |
| `www/logic.js` | Luật game thuần, không đụng DOM (test ở `game-studio/tests/unit/quest-journal/`) |
| `www/app.js` | Giao diện, hiệu ứng, âm thanh WebAudio, lưu trữ (Capacitor Preferences / localStorage) |
| `www/updater.js` | Tự cập nhật: đọc `update.json` của release mới nhất, tải gói web bằng `@capgo/capacitor-updater` |
| `www/version.js` | Phiên bản và `nativeHash`, CI ghi đè khi build |
| `assets/` | Ảnh gốc để sinh icon và splash |

## Chạy thử

```bash
npm install
npm test          # unit test luật game
npm run serve     # mở http://localhost:8080 trên trình duyệt
```

## Build APK

GitHub Actions (`.github/workflows/quest-journal-apk.yml`) tự build mỗi khi thư mục này thay đổi,
rồi đăng file APK lên trang Releases của repo. Build tay trên máy có Android SDK và JDK 21:

```bash
npm ci
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Tự cập nhật

Giống `expense-app` (service worker luôn lấy bản mới từ mạng), nhưng cho APK. Mỗi release có thêm
`www-<version>.zip` và `update.json`. Khi mở app, `updater.js` đọc
`releases/latest/download/update.json`:

- **Cùng `nativeHash`** (chỉ đổi HTML/CSS/JS): tải gói web, dùng từ lần mở sau hoặc ngay khi bấm
  "Cập nhật ngay". Không cài lại APK, dữ liệu giữ nguyên.
- **Khác `nativeHash`** (đổi `package.json`, `capacitor.config.json` hoặc `assets/`): hiện nút "Tải APK".

Gói web lỗi không gọi được `notifyAppReady()` trong 15 giây thì plugin tự quay về gói trước đó.
