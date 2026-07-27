FROM python:3.11-slim

WORKDIR /app

# Cài đặt các thư viện hệ thống cần thiết
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy mã nguồn backend
COPY . .

# Expose cổng của Uvicorn API
EXPOSE 8000

# Lệnh khởi chạy mặc định cho Backend Server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
