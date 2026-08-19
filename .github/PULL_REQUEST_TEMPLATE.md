<!-- SPDX-License-Identifier: MIT -->
<!-- Copyright (c) 2026 La Văn Quyền. All rights reserved. -->

## 📋 Release & PR Verification Checklist

Trước khi thực hiện **Merge** hoặc phát hành bản **Release mới**, hãy chắc chắn rằng bạn đã tích chọn đầy đủ các tiêu chí dưới đây:

### 1. ⚙️ Build & Mã nguồn (Code Quality)
- [ ] Tất cả các file mã nguồn (Backend & Frontend) không còn lỗi cú pháp hoặc lỗi import.
- [ ] Lệnh `docker compose build` chạy thành công không có lỗi.
- [ ] File `backend/.env.example` đã được cập nhật đầy đủ các biến môi trường mới nhất.

### 2. 🤖 AI Agent & Chức năng sư phạm
- [ ] AI Agent phân tích lỗi thuần Tiếng Việt, loại bỏ hoàn toàn các thẻ CoT (`<think>`).
- [ ] Đã tự động lọc bỏ ghi chú (comments) trong code trước khi đưa cho AI.
- [ ] AI không đưa ra đoạn code mẫu hay cú pháp lệnh cụ thể.
- [ ] Không có hiện tượng khen ngợi gượng ép cho các bài nộp bị lỗi (WA/TLE/MLE/CE).

### 3. 🧪 Kiểm thử Thực tế (User Flow Verification)
- [ ] Sinh viên nộp bài thành công, nhận kết quả chấm từ Judge0 và gợi ý AI trong vòng 1-2s.
- [ ] Frontend tự động refetch / polling kết quả cho đến khi AI hint xuất hiện.
- [ ] Admin / Giảng viên kiểm tra tính năng tạo đề bài và Module chống chép bài (Plagiarism Detection).
