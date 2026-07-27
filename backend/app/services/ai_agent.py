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

    async def generate_ac_review(
        self,
        source_code: str,
        problem_title: str | None = None,
        problem_description: str | None = None,
    ) -> str:
        """
        Gọi LLM để phân tích bài nộp đã chạy thành công (AC - Accepted):
        - Nhận xét tính tối ưu về thời gian (Time) và bộ nhớ (Memory).
        - Đánh giá xem bài làm có bị Over-engineered (phức tạp hóa vấn đề, dài dòng, dùng OOP/con trỏ thừa) không.
        - Đề xuất hướng tối ưu tinh gọn nhất theo chuẩn Competitive Programming.
        """
        system_prompt = (
            "Bạn là một Giảng viên Cấu trúc Dữ liệu & Giải thuật và Chuyên gia Lập trình Thi đấu xuất sắc.\n"
            "Bài làm của sinh viên đã chạy ĐÚNG (Accepted - AC) và vượt qua toàn bộ test case.\n"
            "Nhiệm vụ của bạn là đọc kỹ mã nguồn của sinh viên và phân tích xem bài làm đã thực sự tối ưu nhất chưa.\n\n"
            "NGUYÊN TẮC ĐÁNH GIÁ MÃ NGUỒN:\n"
            "1. **Phát hiện Phức Tạp Hóa (Over-Engineering):**\n"
            "   - Kiểm tra xem sinh viên có dùng quá nhiều Class/Interface OOP, con trỏ thông minh (shared_ptr/unique_ptr), cấp phát động trên Heap không cần thiết trong bài tập thuật toán đơn giản không.\n"
            "   - Chỉ ra lý do tại sao việc này làm giảm hiệu năng (overhead bộ nhớ, CPU cache miss, cấp phát bộ nhớ chậm).\n\n"
            "2. **Đánh Giá Độ Phức Tạp & Tối Ưu:**\n"
            "   - Phân tích độ phức tạp Thời gian O(...) và Bộ nhớ O(...).\n"
            "   - Đề xuất giải pháp/cấu trúc dữ liệu tinh gọn nhất (ví dụ: chuyển từ OOP/Tree phức tạp sang mảng phẳng parent[]/rank[], vector đơn giản).\n\n"
            "3. **RÀNG BUỘC PHẢN HỒI:**\n"
            "   - KHÔNG cho trực tiếp 100% code hoàn chỉnh để giải bài toán.\n"
            "   - Cho phép viết các đoạn mã giả (pseudocode) hoặc khung hàm chính minh họa cách viết tinh gọn.\n"
            "   - Trả lời bằng Markdown rõ ràng, khen ngợi việc bài nộp chạy ĐÚNG nhưng đưa ra góp ý nâng tầm tư duy lập trình.\n\n"
            "CẤU TRÚC PHẢN HỒI YÊU CẦU:\n"
            "### 🎉 1. Đánh Giá Bài Làm (Accepted)\n"
            "- Khen ngợi sinh viên đã giải đúng bài toán.\n"
            "- Nhận xét ngắn gọn về độ phức tạp hiện tại của bài làm.\n\n"
            "### 🔍 2. Phân Tích Tính Tối Ưu & Khía Cạnh Cần Tinh Gọn (Over-Engineering)\n"
            "- Nhận xét xem code có bị quá cồng kềnh, dùng thừa lớp/con trỏ/cấp phát động không.\n"
            "- Phân tích ảnh hưởng của việc over-engineering tới bộ nhớ và tốc độ thực thi.\n\n"
            "### 🚀 3. Hướng Giải Quyết Tối Ưu & Tinh Gọn Nhất\n"
            "- Đề xuất phương pháp tối ưu tinh gọn nhất theo chuẩn Lập trình thi đấu (Competitive Programming).\n"
            "- Đưa ra mã giả (pseudocode) hoặc khung hàm tinh gọn để sinh viên tham khảo refactor."
        )

        extra_info = ""
        if problem_title:
            extra_info += f"**Tên bài tập:** {problem_title}\n"
        if problem_description:
            extra_info += f"**Mô tả bài tập:** {problem_description}\n"

        user_content = (
            f"Dưới đây là bài nộp đã AC của sinh viên:\n\n"
            f"{extra_info}"
            "--- MÃ NGUỒN SINH VIÊN ---\n"
            f"```\n{source_code}\n```\n\n"
            "Hãy đọc lại mã nguồn kỹ lưỡng và phân tích tính tối ưu cũng như hướng tinh gọn bài làm."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            "temperature": 0.2,
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.api_url, json=payload, headers=self.headers, timeout=60.0
                )
                response.raise_for_status()
                data = response.json()

                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "").strip()
                return "Không thể trích xuất gợi ý từ phản hồi của mô hình LLM."
            except Exception as e:
                print(f"[LLM API Error]: {e}")
                return "AI hiện chưa thể phân tích tối ưu do kết nối máy chủ LLM gặp sự cố."

