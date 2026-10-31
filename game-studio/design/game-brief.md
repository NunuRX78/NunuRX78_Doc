# Game Brief: Quest Journal (Nhật Ký Phiêu Lưu)

**One-sentence pitch:** Biến todo list thành quest log RPG. Mọi việc phải chia nhỏ thành quest tối đa 4 giờ, mỗi lúc chỉ làm đúng một quest, và mỗi lần gạch xong là một cú thắng có XP, vàng và hiệu ứng ăn mừng.

## Core loop
- Ghi việc thành quest. Quest ước lượng trên 4 giờ thì phải bổ thành các quest con, mỗi quest con tối đa 4 giờ.
- Chọn đúng **một** quest "Đang làm" rồi làm nó ngoài đời.
- Bấm hoàn thành: quest bị gạch, có hiệu ứng thưởng, nhận XP và vàng theo số giờ ước lượng.
- Lên cấp, tiêu vàng mở khóa đồ trang trí, rồi chọn quest tiếp theo.

## Player goal & fail state — what "working" looks like
- **Mục tiêu:** hoàn thành ít nhất 1 quest mỗi ngày để giữ chuỗi ngày (streak), lên cấp và mở khóa vật phẩm. Một phiên chơi trọn vẹn là khi một quest được gạch và phần thưởng hiện ra.
- **Thất bại:** hết một ngày mà không hoàn thành quest nào thì streak về 0. Không có cơ chế phạt nào khác.

## MVP — what must exist to be the game
1. Tạo quest gồm tên và số giờ ước lượng. Quest trên 4 giờ bị chặn cho tới khi được chia thành các quest con tối đa 4 giờ.
2. Danh sách quest, với đúng một ô "Đang làm". Chọn quest khác thì quest cũ quay lại danh sách.
3. Hoàn thành quest: gạch, hiện chữ "+XP / +vàng", có âm thanh và hiệu ứng hạt.
4. XP và level: XP tính theo số giờ ước lượng, có thanh XP, có màn lên cấp.
5. Vàng và cửa hàng nhỏ để mua đồ trang trí hoặc danh hiệu cho nhân vật.
6. Streak hằng ngày, kèm hiển thị số ngày liên tiếp.
7. Lưu cục bộ: quest, XP, vàng, streak và vật phẩm vẫn còn sau khi tắt game.

## Out of scope — not building this
- Không deadline, không nhắc việc hay thông báo đẩy, không quest lặp lại.
- Không đồng bộ cloud, không tài khoản, không multiplayer hay bảng xếp hạng.
- Không chiến đấu, không máu, không phạt mất XP.
- Không nhập dữ liệu từ Trello, Todoist hay ứng dụng khác.

## Build order
1. Tạo quest, danh sách, ô "Đang làm" và **cảm giác lúc hoàn thành** (MVP 1–3). Đây là phần rủi ro nhất: gạch xong phải thấy *đã*.
2. XP, level và màn lên cấp (MVP 4).
3. Lưu cục bộ (MVP 7).
4. Vàng và cửa hàng (MVP 5).
5. Streak hằng ngày (MVP 6).

---
**Who it's for / what they feel:** Người làm việc một mình hay trì hoãn (dev và người làm game indie) muốn cảm giác "xong việc như xong quest" mỗi ngày.

**Art & audio direction:** Pixel art 16-bit kiểu giao diện quest log của game RPG, nhạc nền chiptune nhẹ, tiếng "ding" và hiệu ứng tung vàng khi hoàn thành.

**Reference game:** Habitica, lấy phần "hoàn thành việc thì nhận XP và vàng, lên cấp, mua đồ". Không lấy party, boss, máu hay tính năng xã hội.
