# 🐳 Hướng Dẫn Sử Dụng DockerCho Hệ Thống IntelliJudge

Tài liệu này hướng dẫn chi tiết cách khởi chạy, cập nhật, quản lý và vận hành hệ thống **IntelliJudge** bằng **Docker Compose**.

---

## 🏗️ 1. Kiến Trúc Hàng Thể Container

Hệ thống IntelliJudge được đóng gói thành các dịch vụ Docker độc lập:

| Tên Service | Container Name | Cổng (Host:Container) | Chức năng |
| :--- | :--- | :--- | :--- |
| `mysql_db` | `intellijudge_mysql` | `3306:3306` | Cơ sở dữ liệu MySQL 8.0 |
| `redis_queue` | `intellijudge_redis` | `6379:6379` | Broker chuyển tiếp công việc cho Celery |
| `backend` | `intellijudge_backend` | `8000:8000` | RESTful API Server (FastAPI + Uvicorn) |
| `celery_worker` | `intellijudge_celery_worker` | Internal | Xử lý chấm bài async & gọi AI Agent sinh Hint |
| `frontend` | `intellijudge_frontend` | `5173:80` | Giao diện React SPA phục vụ qua Nginx |

---

## ❓ 2. Khi Nào Cần Build Lại Backend / Celery Worker?

> **Trả lời câu hỏi:** Khi thay đổi code Python hoặc tối ưu Prompt trong `ai_agent.py` / `tasks.py`, **BẮT BUỘC CẦN BUILD LẠI DOCKER**.

### Lý do:
Trong file `backend/Dockerfile`, mã nguồn backend được copy vào container thông qua lệnh `COPY . .` tại thời điểm build image. Do `docker-compose.yml` không gắn volume live-reload (`./backend:/app`), container chạy bản code đóng gói sẵn trong image. Celery Worker cũng nạp mã Python vào RAM khi khởi tạo.

Do đó, sau khi chỉnh sửa code backend, bạn cần build lại image để container nhận thay đổi mới nhất.

---

## 🚀 3. Các Lệnh Thao Tác Thường Dùng

### 3.1. Khởi chạy toàn bộ hệ thống lần đầu
Build image và khởi chạy tất cả 5 services dưới dạng background (detached mode):
```bash
docker compose up -d --build
```

### 3.2. Cập nhật & Build lại Backend + Celery Worker (Sau khi sửa code/prompt)
Nếu bạn vừa sửa code backend (như `ai_agent.py`, `tasks.py`, `models`), hãy chạy lệnh sau để build lại image và tái tạo container:
```bash
docker compose up -d --build backend celery_worker
```
> 💡 *Mẹo:* Lệnh này chỉ build lại backend và celery_worker, không làm gián đoạn database MySQL hay Redis.

### 3.3. Xem log thời gian thực (Live Logs)
- Xem log toàn bộ hệ thống:
  ```bash
  docker compose logs -f
  ```
- Xem log riêng của Backend và Celery Worker (để kiểm tra phản hồi AI / Chấm bài):
  ```bash
  docker compose logs -f backend celery_worker
  ```

### 3.4. Kiểm tra trạng thái các container
```bash
docker compose ps
```

### 3.5. Dừng hệ thống
- Dừng hệ thống (giữ nguyên dữ liệu MySQL trong volume):
  ```bash
  docker compose down
  ```
- Dừng hệ thống và xóa sạch volume dữ liệu (xóa toàn bộ DB để làm lại từ đầu):
  ```bash
  docker compose down -v
  ```

---

## 🛠️ 4. Cấu Hình Biến Môi Trường (Environment Variables)

File cấu hình chính nằm tại `backend/.env`. Lưu ý một số biến quan trọng khi chạy trong Docker:

- **LLM_API_URL**:
  - Nếu mô hình LLM (Ollama) chạy trực tiếp trên máy Host (Windows/Linux):
    ```env
    LLM_API_URL=http://host.docker.internal:11434/v1
    ```
  - Nếu dùng OpenAI / Cloud API:
    ```env
    LLM_API_URL=https://api.openai.com/v1
    LLM_API_KEY=your-api-key-here
    ```

- **JUDGE0_API_URL**:
  - Đảm bảo Judge0 kết nối đúng IP máy Host:
    ```env
    JUDGE0_API_URL=http://host.docker.internal:2358
    ```

---

## 🔍 5. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

1. **Celery Worker vẫn ra gợi ý AI cũ:**
   - Nguyên nhân: Chưa rebuild container `celery_worker`.
   - Phắc phục: Chạy `docker compose up -d --build celery_worker`.

2. **Backend không kết nối được MySQL khi mới bật:**
   - Trong `docker-compose.yml`, dịch vụ backend đã có `healthcheck` chờ MySQL sẵn sàng. Nếu bị lỗi kết nối lần đầu, chờ 10-15s hoặc kiểm tra log MySQL:
     ```bash
     docker compose logs mysql_db
     ```

3. **Không gọi được LLM Local (Ollama):**
   - Đảm bảo Ollama trên máy host đang chạy và đã cấp quyền lắng nghe IP (đặt `OLLAMA_HOST=0.0.0.0` trên máy Host nếu cần).
