# 🐳 Hướng Dẫn Vận Hành Hệ Thống Docker Cho IntelliJudge & Judge0

Tài liệu này hướng dẫn chi tiết về **kiến trúc**, **lý do phân tách**, và **quy trình khởi chạy, vận hành toàn bộ hệ thống** IntelliJudge bằng Docker.

---

## 💡 1. Tại Sao Lại Phân Tách Thành 2 Docker Stack Riêng Biệt?

Hệ thống được chia làm 2 cụm Docker độc lập:

1. **Cụm `judge0` (Chạy trong thư mục `judge0/`):**
   * **Nhiệm vụ:** Engine chấm bài sandbox độc lập (dịch vụ bên thứ 3). Nhận mã nguồn (C++, Python, Java...), biên dịch và thực thi an toàn trong môi trường cách ly.
   * **Container bao gồm:** `judge0-server`, `judge0-worker`, `judge0-db` (PostgreSQL), `judge0-redis`.

2. **Cụm `intellijudge` (Chạy ở thư mục gốc project):**
   * **Nhiệm vụ:** Ứng dụng Web chính (Frontend React, Backend FastAPI, CSDL MySQL quản lý người dùng/đề bài, Celery Worker xử lý AI Agent).
   * **Container bao gồm:** `intellijudge_frontend`, `intellijudge_backend`, `intellijudge_celery_worker`, `intellijudge_mysql`, `intellijudge_redis`.

### 📌 Lý do thiết kế:
* **Tính độc lập & Cách ly sự cố (Isolation):** Khi học sinh nộp bài nặng hoặc lặp vô tận (Infinite Loop), server Judge0 có thể quá tải nhưng Web App `IntelliJudge` vẫn hoạt động bình thường, không bị treo UI hay sập DB chính.
* **Khả năng mở rộng (Scalability):** Trên môi trường Production thực tế, `Judge0` có thể được đặt ở một máy chủ riêng có cấu hình mạnh, tách biệt hoàn toàn với Web Server.
* **Dễ nâng cấp & Bảo trì:** Không lo bị xung đột cấu hình DB/Redis giữa Web chính và Sandbox chấm bài.

---

## 🏗️ 2. Danh Sách Container & Cổng (Ports)

| Cụm Docker Stack | Tên Service | Container Name | Cổng (Host:Container) | Chức Năng |
| :--- | :--- | :--- | :--- | :--- |
| **Judge0** | `server` | `judge0-server-1` | `2358:2358` | API Sandbox chấm bài |
| **Judge0** | `worker` | `judge0-worker-1` | Internal | Worker thực thi & biên dịch code |
| **Judge0** | `db` | `judge0-db-1` | Internal | PostgreSQL lưu cache/lịch sử Judge0 |
| **Judge0** | `redis` | `judge0-redis-1` | Internal | Redis queue riêng của Judge0 |
| --- | --- | --- | --- | --- |
| **IntelliJudge** | `frontend` | `intellijudge_frontend` | `5173:80` | Giao diện Web (React + Nginx) |
| **IntelliJudge** | `backend` | `intellijudge_backend` | `8000:8000` | RESTful API Server (FastAPI) |
| **IntelliJudge** | `celery_worker` | `intellijudge_celery_worker` | Internal | Async Worker (Gọi AI Agent & Chấm bài) |
| **IntelliJudge** | `mysql_db` | `intellijudge_mysql` | `3306:3306` | CSDL chính MySQL 8.0 |
| **IntelliJudge** | `redis_queue` | `intellijudge_redis` | `6379:6379` | Broker chuyển tiếp việc cho Celery |

---

## 🚀 3. Quy Trình Khởi Chạy Hệ Thống (Step-by-Step)

> ⚠️ **Lưu ý quan trọng:** Bạn nên bật cụm **Judge0 trước**, sau đó mới bật cụm **IntelliJudge** để Backend FastAPI có thể kết nối ngay tới API Judge0 (cổng 2358).

### Bước 1: Khởi chạy cụm Engine chấm bài (Judge0)

Mở terminal tại thư mục gốc của project, di chuyển vào thư mục `judge0` và khởi chạy:

```bash
cd judge0
docker compose up -d
```

* **Kiểm tra Judge0 đã sẵn sàng chưa:**
  Truy cập trên trình duyệt hoặc chạy: `http://localhost:2358/system_info`
  Nếu nhận về thông tin JSON hệ thống là Judge0 đã hoạt động thành công.

* Quay lại thư mục gốc dự án:
```bash
cd ..
```

---

### Bước 2: Khởi chạy cụm Ứng dụng chính (IntelliJudge)

Tại thư mục gốc dự án (`IntelliJudge`), chạy lệnh build và khởi động 5 services:

```bash
docker compose up -d --build
```

Lệnh này sẽ tự động build image cho `frontend`, `backend`, `celery_worker` và tải các image MySQL, Redis về để khởi chạy toàn bộ ứng dụng.

---

## 🔄 4. Cập Nhật Code Backend / Prompt AI (Rebuild)

Khi bạn chỉnh sửa code Python trong `backend/` (như file `ai_agent.py`, `tasks.py`, `models.py`...):

Chỉ cần build lại riêng **Backend** và **Celery Worker** mà **không ảnh hưởng** tới Database hay Frontend:

```bash
docker compose up -d --build backend celery_worker
```

---

## 📊 5. Theo Dõi Log & Quản Lý Hệ Thống

### 5.1. Xem Live Log (Thời gian thực)
* Xem log cụm IntelliJudge:
  ```bash
  docker compose logs -f
  ```
* Xem riêng log Backend & Celery Worker (kiểm tra sinh AI hint / chấm bài):
  ```bash
  docker compose logs -f backend celery_worker
  ```
* Xem log cụm Judge0:
  ```bash
  cd judge0
  docker compose logs -f
  ```

### 5.2. Kiểm tra trạng thái các container
```bash
docker compose ps
```

### 5.3. Dừng hệ thống

* **Dừng cụm IntelliJudge (giữ nguyên dữ liệu MySQL):**
  ```bash
  docker compose down
  ```
* **Dừng cụm Judge0:**
  ```bash
  cd judge0
  docker compose down
  ```
* **Xóa sạch dữ liệu DB để làm lại từ đầu:**
  ```bash
  docker compose down -v
  ```

---

## 🛠️ 6. Cấu Hình Biến Môi Trường (Environment Variables)

File `backend/.env` quy định cách Backend kết nối tới Judge0 và LLM AI:

```env
# Kết nối tới Judge0 chạy ở cụm Docker riêng trên cổng 2358
JUDGE0_API_URL=http://host.docker.internal:2358

# Cấu hình AI Agent (Local Ollama hoặc Cloud API)
LLM_API_URL=http://host.docker.internal:11434/v1
LLM_MODEL=qwen2.5-coder:7b
```

---

## 🔍 7. Khắc Phục Lỗi Thường Gặp (Troubleshooting)

1. **Backend báo không kết nối được Judge0 (Errno 111 Connection Refused):**
   * Khắc phục: Kiểm tra cụm Judge0 đã bật chưa (`cd judge0 && docker compose ps`). Đảm bảo cổng `2358` đang mở.

2. **Celery Worker vẫn ra phản hồi AI cũ sau khi sửa Prompt:**
   * Khắc phục: Chạy `docker compose up -d --build celery_worker` để nạp lại mã nguồn Python mới vào RAM.

3. **Chạy Docker trên Windows bị đè cổng (Port collision):**
   * Các cổng sử dụng: `5173` (Frontend), `8000` (Backend API), `2358` (Judge0), `3306` (MySQL), `6379` (Redis). Hãy chắc chắn các phần mềm khác không chiếm những cổng này.
