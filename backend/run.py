import sys
import os
import subprocess
import time

def main():
    # Xác định đường dẫn Python của virtual environment
    # run.py được đặt ở thư mục backend/ và venv nằm cùng cấp.
    current_dir = os.path.dirname(os.path.abspath(__file__))
    python_exe = os.path.join(current_dir, "venv", "Scripts", "python.exe")
    
    if not os.path.exists(python_exe):
        # Fallback về python hiện tại nếu không thấy venv/
        python_exe = sys.executable

    print(f"Python Executable: {python_exe}")

    # Khởi động Uvicorn
    uvicorn_cmd = [python_exe, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]
    print("Khoi dong Uvicorn Server...")
    uvicorn_proc = subprocess.Popen(uvicorn_cmd, cwd=current_dir)

    # Khởi động Celery
    celery_cmd = [python_exe, "-m", "celery", "-A", "app.worker.tasks.celery_app", "worker", "--loglevel=info", "--pool=solo"]
    print("Khoi dong Celery Worker...")
    celery_proc = subprocess.Popen(celery_cmd, cwd=current_dir)

    try:
        while True:
            # Kiểm tra xem có tiến trình nào bị thoát đột ngột không
            if uvicorn_proc.poll() is not None:
                print("Uvicorn Server da ngung hoat dong. Dong toan bo tien trinh...")
                break
            if celery_proc.poll() is not None:
                print("Celery Worker da ngung hoat dong. Dong toan bo tien trinh...")
                break
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nNhan tin hieu ngat tu ban phim (Ctrl+C). Dang tat cac servers...")
        
    finally:
        # Dong cac tien trinh con
        for proc, name in [(uvicorn_proc, "Uvicorn"), (celery_proc, "Celery")]:
            if proc and proc.poll() is None:
                print(f"Dang dung {name} (terminate)...")
                try:
                    proc.terminate()
                    # Cho 3 giay de ket thuc mem mai
                    proc.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    print(f"Cuong che tat {name} (kill)...")
                    proc.kill()
                except Exception as e:
                    print(f"Gap loi khi dong {name}: {str(e)}")
                    
        print("He thong da tat hoan toan.")

if __name__ == "__main__":
    main()
