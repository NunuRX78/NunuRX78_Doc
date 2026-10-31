# Quest Journal

Todo list kiểu quest log RPG, theo brief `design/game-brief.md`. Ứng dụng web thuần (HTML/CSS/JS,
không bundler) được đóng gói thành APK Android bằng Capacitor.

| File | Vai trò |
|---|---|
| `www/config.js` | Toàn bộ thông số cân bằng: XP/giờ, vàng/giờ, đường cong cấp, cửa hàng |
| `www/logic.js` | Luật game thuần, không đụng DOM (test ở `game-studio/tests/unit/quest-journal/`) |
| `www/app.js` | Giao diện, hiệu ứng, âm thanh WebAudio, lưu trữ (Capacitor Preferences / localStorage) |
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
