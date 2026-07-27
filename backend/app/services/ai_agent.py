import httpx
from app.core.config import settings


class AIAgentService:
    def __init__(self):
        # Sử dụng API OpenAI-compatible để người dùng dễ dàng cấu hình qua .env (Ollama, OpenAI, v.v.)
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
        problem_title: str | None = None,
        problem_description: str | None = None,
    ) -> str:
        """
        Gọi LLM để sinh gợi ý (Hint) bao gồm:
        - Phân tích nguyên nhân lỗi (Wrong Answer, TLE, MLE, RTE, v.v.)
        - Gợi ý cách làm thuật toán (Tư duy giải thuật, độ phức tạp Big O, cấu trúc dữ liệu tối ưu)
        - Các hoạt động & bước rèn luyện sinh viên cần thực hiện (Dry-run, tự kiểm tra, debugging)
        Đảm bảo không rò rỉ mã nguồn giải pháp.
        """
        system_prompt = (
            "Bạn là một Trợ giảng ảo môn Cấu trúc dữ liệu và Giải thuật (giảng dạy bằng tiếng Việt).\n"
            "Sinh viên vừa nộp bài giải lập trình nhưng hệ thống chấm điểm (Online Judge) báo lỗi: {status}.\n"
            "Nhiệm vụ của bạn là hướng dẫn sinh viên tìm ra lỗi logic, định hướng thuật toán tối ưu và đề xuất các hoạt động rèn luyện giúp sinh viên tự sửa bài.\n\n"
            "RÀNG BUỘC TUYỆT ĐỐI:\n"
            "1. TUYỆT ĐỐI KHÔNG ĐƯỢC cung cấp mã nguồn (code) giải pháp dưới bất kỳ ngôn ngữ lập trình nào.\n"
            "2. KHÔNG viết các đoạn mã mẫu, hàm mẫu hoặc dòng code sửa lỗi.\n"
            "3. Nếu sinh viên yêu cầu viết code hoặc sửa hộ code, hãy lịch sự từ chối và chỉ tập trung phân tích tư duy giải thuật.\n"
            "4. Phản hồi phải viết bằng định dạng Markdown rõ ràng, bố cục mạch lạc với biểu tượng trực quan.\n\n"
            "CẤU TRÚC PHẢN HỒI YÊU CẦU:\n"
            "### 🎯 1. Phân Tích Nguyên Nhân Lỗi ({status})\n"
            "- Giải thích ngắn gọn lý do vì sao bài nộp mắc lỗi `{status}` dựa trên test case bị sai.\n"
            "- So sánh điểm khác biệt giữa kết quả thực tế (Actual) và kết quả mong muốn (Expected).\n\n"
            "### 💡 2. Gợi Ý Cách Làm & Tư Duy Thuật Toán\n"
            "- **Phân tích độ phức tạp:** Đánh giá độ phức tạp thời gian/bộ nhớ (Big O) của mã nguồn hiện tại.\n"
            "- **Định hướng thuật toán:** Đề xuất tư tưởng giải thuật phù hợp hoặc tối ưu hơn (ví dụ: Quy hoạch động, Hai con trỏ, Tìm kiếm nhị phân, Hash Map, Stack/Queue, Tham lam, Đồ thị... tùy thuộc vào yêu cầu bài toán).\n"
            "- **Trường hợp biên (Edge Cases):** Chỉ ra các trường hợp đặc biệt cần lưu ý (ví dụ: N=1, mảng rỗng, giá trị lớn gây tràn số `long long`, số âm...).\n\n"
            "### 🛠️ 3. Hoạt Động & Các Bước Rèn Luyện Sinh Viên Cần Thực Hiện\n"
            "- **Hoạt động 1 (Chạy vết - Dry Run):** Hướng dẫn sinh viên cách mô phỏng từng bước chạy thuật toán trên giấy với input bị lỗi.\n"
            "- **Hoạt động 2 (Đặt câu hỏi tự suy ngẫm):** Đặt 1-2 câu hỏi gợi mở để sinh viên tự kiểm tra tư duy và phát hiện lỗ hổng logic.\n"
            "- **Hoạt động 3 (Các bước kiểm thử & Debug):** Gợi ý 2-3 bước kiểm thử cụ thể (như kiểm tra điều kiện lặp, khởi tạo giá trị ban đầu, kiểu dữ liệu output)."
        ).format(status=status)

        extra_info = ""
        if problem_title:
            extra_info += f"**Tên bài tập:** {problem_title}\n"
        if problem_description:
            extra_info += f"**Mô tả bài tập:** {problem_description}\n"

        user_content = (
            f"Dưới đây là thông tin bài nộp bị lỗi:\n\n"
            f"{extra_info}"
            "--- MÃ NGUỒN CỦA SINH VIÊN ---\n"
            f"```\n{source_code}\n```\n\n"
            "--- TEST CASE BỊ SAI ---\n"
            f"- **Input:** {failed_input}\n"
            f"- **Output mong muốn (Expected):** {expected_output}\n"
            f"- **Output thực tế / Trạng thái (Actual):** {actual_output}\n\n"
            "Hãy phân tích và đưa ra phản hồi đầy đủ theo cấu trúc 3 phần trên."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,  # Đặt nhiệt độ thấp để mô tả chính xác và tuân thủ ràng buộc
        }

        # Thiết lập timeout lớn (60 giây) vì LLM chạy local hoặc sinh text rất mất thời gian
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

