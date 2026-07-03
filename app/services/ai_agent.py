import httpx
from app.core.config import settings


class AIAgentService:
    def __init__(self):
        # Su dung API OpenAI-compatible de nguoi dung de dang cau hinh qua .env (Ollama, OpenAI, v.v.)
        self.api_url = settings.LLM_API_URL.rstrip("/") + "/chat/completions"
        self.headers = {"Content-Type": "application/json"}
        if settings.LLM_API_KEY and settings.LLM_API_KEY != "ollama":
            self.headers["Authorization"] = f"Bearer {settings.LLM_API_KEY}"
        self.model = settings.LLM_MODEL

    async def generate_hint(
        self,
        source_code: str,
        failed_input: str,
        expected_output: str,
        actual_output: str,
        status: str,
    ) -> str:
        """
        Goi LLM de sinh goi y (Hint) ma khong ro ri code dap an.
        """
        system_prompt = (
            "Bạn là một trợ giảng ảo môn Cấu trúc dữ liệu và Giải thuật (giảng dạy bằng tiếng Việt).\n"
            "Sinh viên vừa nộp bài giải C++ nhưng bị hệ thống chấm điểm đánh giá lỗi là: {status}.\n"
            "Nhiệm vụ của bạn là hướng dẫn sinh viên tìm ra lỗi logic hoặc hướng đi tối ưu thuật toán.\n\n"
            "RÀNG BUỘC TUYỆT ĐỐI:\n"
            "- TUYỆT ĐỐI KHÔNG ĐƯỢC cung cấp mã nguồn (code) giải pháp dưới bất kỳ ngôn ngữ lập trình nào.\n"
            "- KHÔNG viết các đoạn mã mẫu, hàm mẫu hoặc dòng code sửa lỗi.\n"
            "- Nếu sinh viên yêu cầu viết code hoặc sửa hộ code, hãy lịch sự từ chối và chỉ hướng dẫn logic.\n"
            "- Chỉ gợi ý thuật toán, chỉ ra lỗi sai logic hoặc phân tích độ phức tạp Big O trong code sinh viên.\n\n"
            "Hãy viết phản hồi rõ ràng, mạch lạc và chia nhỏ ý để sinh viên tự sửa bài."
        ).format(status=status)

        user_content = (
            "Dưới đây là thông tin chi tiết bài nộp bị lỗi của tôi:\n\n"
            "--- MÃ NGUỒN C++ CỦA SINH VIÊN ---\n"
            f"{source_code}\n\n"
            "--- TEST CASE BỊ SAI ---\n"
            f"Input: {failed_input}\n"
            f"Output mong muốn (Expected): {expected_output}\n"
            f"Output thực tế từ code sinh viên (Actual): {actual_output}\n\n"
            "Hãy phân tích và gợi ý hướng sửa lỗi logic/tối ưu Big O cho tôi."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,  # Dat nhiet do thap de mo ta chinh xac va tuan thu rang buoc
        }

        # Thiet lap timeout lon (60 giay) vi LLM chay local hoac sinh text rat mat thoi gian
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.api_url, json=payload, headers=self.headers, timeout=60.0
                )
                response.raise_for_status()
                data = response.json()

                choices = data.get("choices", [])
                if choices:
                    hint = choices[0].get("message", {}).get("content", "").strip()
                    return hint
                return "Không thể trích xuất gợi ý từ phản hồi của mô hình LLM."
            except Exception as e:
                print(f"[LLM API Error]: {e}")
                return (
                    "Gợi ý sửa lỗi từ AI hiện chưa sẵn sàng do phản hồi từ máy chủ LLM bị chậm "
                    "hoặc gặp sự cố kết nối. Vui lòng thử lại sau."
                )
