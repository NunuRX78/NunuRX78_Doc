# Đồng bộ với Google Sheets (miễn phí)

## 1. Tạo Sheet và dán script
1. Vào https://sheets.new để tạo một Google Sheet mới (đặt tên tuỳ ý, ví dụ "Sổ chi tiêu").
2. Menu **Tiện ích mở rộng → Apps Script**.
3. Xoá code mặc định, dán toàn bộ nội dung file `Code.gs`.
4. Sửa dòng đầu: `const TOKEN = '...'` thành một mã bí mật của riêng bạn (20+ ký tự ngẫu nhiên). Bấm 💾 Lưu.

## 2. Deploy thành web app
1. Bấm **Triển khai (Deploy) → Tùy chọn triển khai mới (New deployment)**.
2. Bấm bánh răng ⚙️ → chọn loại **Ứng dụng web (Web app)**.
3. **Execute as: Me** (Tôi) · **Who has access: Anyone** (Bất kỳ ai).
4. Bấm **Deploy**, cấp quyền khi Google hỏi (Advanced → Go to ... (unsafe) → Allow).
5. Copy **Web app URL** (dạng `https://script.google.com/macros/s/.../exec`).

> "Anyone" nghĩa là ai có link *và* biết TOKEN mới đọc/ghi được. Đừng chia sẻ TOKEN.
> Nếu sửa code Apps Script sau này, phải tạo **New deployment** (hoặc Manage deployments → Edit → New version) thì mới có hiệu lực.

## 3. Kết nối trong app
Trên điện thoại: **Menu ⋯ → Đồng bộ Google Sheets** → dán Web app URL và TOKEN → **Kết nối**.
Làm tương tự trên các thiết bị khác. Dữ liệu hiện có trên máy sẽ được đẩy lên Sheet, trang tính tên `GiaoDich`.

## Cách hoạt động
- Mọi thao tác ghi vào máy trước (dùng được offline), rồi tự đẩy lên Sheet; có mạng lại thì tự đồng bộ.
- App kéo dữ liệu mới khi mở lại hoặc khi bấm **Đồng bộ ngay**. Không đồng bộ realtime.
- Bạn có thể xem và sửa trực tiếp trên Sheet (cột `type`: `e` = chi, `i` = thu; `date` dạng `YYYY-MM-DD`, giữ định dạng văn bản).
- Nếu hai máy sửa cùng một giao dịch, bản đồng bộ sau cùng thắng.
