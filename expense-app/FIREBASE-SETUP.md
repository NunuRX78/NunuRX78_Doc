# Cài đặt Firebase (miễn phí, gói Spark)

1. Vào https://console.firebase.google.com → **Add project** (tắt Google Analytics cũng được).
2. **Build → Authentication → Get started → Email/Password → Enable → Save.**
3. **Build → Firestore Database → Create database** → chọn vị trí `asia-southeast1` (Singapore) → Production mode.
   Sau đó vào tab **Rules**, dán nội dung file `firestore.rules` rồi **Publish**.
4. **Project settings (⚙️) → Your apps → biểu tượng Web `</>`** → đặt tên app → copy đoạn `firebaseConfig`
   và dán vào file `firebase-config.js` (thay các giá trị `YOUR_...`).
5. Đưa thư mục `expense-app/` lên web https (để cài vào điện thoại):
   - **Firebase Hosting** (cùng project, miễn phí): `npm i -g firebase-tools && firebase login && firebase init hosting`
     (public directory = `expense-app`, không chọn single-page app) rồi `firebase deploy`.
   - hoặc GitHub Pages.
6. Mở link bằng Chrome trên điện thoại → Menu ⋮ → Thêm vào màn hình chính.
   Trong app: **Menu → Đồng bộ đám mây → Đăng ký** (lần đầu) rồi dùng cùng email/mật khẩu trên các thiết bị khác.

Ghi chú
- Dữ liệu lưu tại `users/{uid}/tx/{id}`; rules đảm bảo mỗi tài khoản chỉ truy cập dữ liệu của mình.
- `apiKey` của Firebase không phải bí mật; bảo mật nằm ở Rules.
- Khi mất mạng app vẫn ghi được, tự đẩy lên khi có mạng lại.
- Lần đăng nhập đầu tiên trên một máy, dữ liệu sẵn có trên máy được tải lên cloud.
