# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
import re
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

    def _strip_code_comments(self, code: str) -> str:
        """
        Loại bỏ hoàn toàn các ghi chú (comment //, /* */, #) trong mã nguồn
        để AI tập trung phân tích logic thực thi và không đọc comment của sinh viên.
        """
        if not code:
            return ""
        # 1. Bỏ comment khối /* ... */
        cleaned = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
        # 2. Xử lý từng dòng để bỏ comment đơn // và # (bảo vệ các chỉ thị preprocessor như #include, #define)
        lines = []
        for line in cleaned.splitlines():
            line_no_slash = re.sub(r"//.*$", "", line)
            stripped_line = line_no_slash.strip()
            if (
                stripped_line.startswith("#include")
                or stripped_line.startswith("#define")
                or stripped_line.startswith("#pragma")
                or stripped_line.startswith("#ifndef")
                or stripped_line.startswith("#endif")
            ):
                lines.append(line_no_slash)
            else:
                line_no_hash = re.sub(r"#.*$", "", line_no_slash)
                lines.append(line_no_hash)
        return "\n".join(lines)

    def _clean_llm_response(self, text: str) -> str:
        if not text:
            return "Gợi ý sửa lỗi từ AI chưa thể hiển thị. Vui lòng thử lại sau."
        
        # Nếu có thẻ đóng </think>, lấy nội dung đằng sau thẻ </think>
        if "</think>" in text:
            cleaned = text.split("</think>")[-1].strip()
        elif "<think>" in text:
            # Nếu chỉ có <think> mà không có </think>, loại bỏ khối <think>...
            cleaned = re.sub(r"<think>.*", "", text, flags=re.DOTALL).strip()
        else:
            cleaned = text.strip()

        if not cleaned:
            return "Gợi ý sửa lỗi từ AI đang hoàn thiện. Vui lòng bấm Nộp lại bài (Resubmit) để tải lại."
        return cleaned

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
        cleaned_source_code = self._strip_code_comments(source_code)

        system_prompt = (
            "Bạn là một Trợ giảng ảo môn Cấu trúc dữ liệu và Giải thuật (giảng dạy bằng tiếng Việt).\n"
            "Sinh viên vừa nộp bài giải lập trình nhưng hệ thống chấm điểm (Online Judge) báo lỗi: {status}.\n"
            "Nhiệm vụ của bạn là hướng dẫn sinh viên tìm ra lỗi logic, định hướng thuật toán đúng/tối ưu và đề xuất các hoạt động rèn luyện giúp sinh viên tự sửa bài.\n\n"
            "RÀNG BUỘC TUYỆT ĐỐI VỀ MÃ NGUỒN & CÚ PHÁP (NGHIÊM CẤM CODE):\n"
            "1. TUYỆT ĐỐI KHÔNG ĐƯỢC cung cấp mã nguồn (code) giải pháp, đoạn mã mẫu, hàm mẫu hoặc dòng code sửa lỗi dưới bất kỳ ngôn ngữ lập trình nào (C++, Python, Java...).\n"
            "2. KHÔNG viết các câu lệnh lập trình cụ thể như `cin >>`, `cout <<`, `printf`, `print()`, `if (...)`, `return ...`, cũng như các biểu thức toán học dưới dạng code như `year % 400 == 0`.\n"
            "3. KHÔNG sử dụng các khối thẻ code (```) hoặc inline code đặt trong dấu backtick (`) để minh họa cú pháp hay dòng lệnh.\n"
            "4. CHỈ DÙNG THUẦN LỜI VĂN BẰNG TIẾNG VIỆT để diễn giải thuật toán và ý tưởng logic.\n"
            "5. PHONG CÁCH GỢI Ý (BÀI BỊ LỖI {status}): KHÔNG khen ngợi gượng ép hay nhận xét sai về mã nguồn. Hãy phân tích thẳng thắn, lịch sự và mang tính xây dựng. Bắt đầu bằng: 'Để khắc phục lỗi trên và giải đúng bài toán, bạn có thể thực hiện theo quy tắc / thuật toán sau:', sau đó diễn giải chi tiết tư tưởng thuật toán hoàn toàn bằng LỜI VĂN BẰNG TIẾNG VIỆT, KHÔNG CODE/LỆNH.\n"
            "6. TUYỆT ĐỐI KHÔNG đọc, phân tích hay phụ thuộc vào các ghi chú (comments / chú thích) trong mã nguồn. Đánh giá hoàn toàn dựa trên logic thực thi.\n"
            "7. Phản hồi phải viết bằng định dạng Markdown rõ ràng, bố cục mạch lạc với biểu tượng trực quan.\n"
            "8. PHẢN HỒI HOÀN TOÀN BẰNG TIẾNG VIỆT. Tuyệt đối KHÔNG được chèn ký tự hay từ tiếng Trung/chữ Hán vào nội dung.\n\n"
            "CẤU TRÚC PHẢN HỒI YÊU CẦU:\n"
            "### 🎯 1. Phân Tích Nguyên Nhân Lỗi ({status})\n"
            "- Giải thích ngắn gọn, chính xác lý do vì sao bài nộp mắc lỗi `{status}` dựa trên test case bị sai (dùng hoàn toàn lời văn).\n"
            "- So sánh điểm khác biệt giữa kết quả thực tế (Actual) và kết quả mong muốn (Expected).\n\n"
            "### 💡 2. Gợi Ý Cách Làm & Tư Duy Thuật Toán (HOÀN TOÀN BẰNG LỜI VĂN, KHÔNG DÙNG CODE/LỆNH)\n"
            "- **Phân tích độ phức tạp:** Đánh giá độ phức tạp thời gian/bộ nhớ (Big O) của mã nguồn hiện tại bằng lời diễn giải.\n"
            "- **Định hướng thuật toán:** Bắt đầu bằng: 'Để khắc phục lỗi trên và giải đúng bài toán, bạn có thể thực hiện theo quy tắc / thuật toán sau:' và diễn giải chi tiết quy tắc/thuật toán bằng lời văn.\n"
            "- **Trường hợp biên (Edge Cases):** Chỉ ra các trường hợp đặc biệt cần lưu ý diễn giải bằng lời.\n\n"
            "### 🛠️ 3. Hoạt Động & Các Bước Rèn Luyện Sinh Viên Cần Thực Hiện\n"
            "- **Hoạt động 1 (Chạy vết - Dry Run):** Hướng dẫn sinh viên cách mô phỏng từng bước chạy thuật toán trên giấy với input bị lỗi.\n"
            "- **Hoạt động 2 (Đặt câu hỏi tự suy ngẫm):** Đặt 1-2 câu hỏi gợi mở để sinh viên tự kiểm tra tư duy và phát hiện lỗ hổng logic.\n"
            "- **Hoạt động 3 (Các bước kiểm thử & Debug):** Gợi ý 2-3 bước kiểm thử cụ thể bằng lời văn."
        ).format(status=status)

        extra_info = ""
        if problem_title:
            extra_info += f"**Tên bài tập:** {problem_title}\n"
        if problem_description:
            extra_info += f"**Mô tả bài tập:** {problem_description}\n"

        user_content = (
            f"Dưới đây là thông tin bài nộp bị lỗi:\n\n"
            f"{extra_info}"
            "--- MÃ NGUỒN CỦA SINH VIÊN (ĐÃ LỌC BỎ COMMENT) ---\n"
            f"```\n{cleaned_source_code}\n```\n\n"
            "--- TEST CASE BỊ SAI ---\n"
            f"- **Input:** {failed_input}\n"
            f"- **Output mong muốn (Expected):** {expected_output}\n"
            f"- **Output thực tế / Trạng thái (Actual):** {actual_output}\n\n"
            "Hãy phân tích chính thức và đưa ra phản hồi đầy đủ theo cấu trúc 3 phần trên. NHẮC LẠI: KHÔNG KHEN NGỢI GƯỢNG ÉP BÀI LỖI, TUYỆT ĐỐI KHÔNG DÙNG BẤT KỲ DÒNG CODE, DẤU BACKTICK KHỐI HOẶC CÂU LỆNH NÀO."
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
                    hint = choices[0].get("message", {}).get("content", "").strip()
                    return self._clean_llm_response(hint)
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
        cleaned_source_code = self._strip_code_comments(source_code)

        system_prompt = (
            "Bạn là một Giảng viên Cấu trúc Dữ liệu & Giải thuật và Chuyên gia Lập trình Thi đấu xuất sắc.\n"
            "Bài làm của sinh viên đã chạy ĐÚNG (Accepted - AC) và vượt qua toàn bộ test case.\n"
            "Nhiệm vụ của bạn là đọc kỹ mã nguồn của sinh viên và phân tích xem bài làm đã thực sự tối ưu nhất chưa.\n\n"
            "NGUYÊN TẮC ĐÁNH GIÁ MÃ NGUỒN (NGHIÊM CẤM CODE):\n"
            "1. **Phát hiện Phức Tạp Hóa (Over-Engineering):**\n"
            "   - Kiểm tra xem sinh viên có dùng quá nhiều Class/Interface OOP, con trỏ thông minh (shared_ptr/unique_ptr), cấp phát động trên Heap không cần thiết không.\n"
            "   - Chỉ ra lý do tại sao việc này làm giảm hiệu năng bằng lời văn.\n\n"
            "2. **Đánh Giá Độ Phức Tạp & Tối Ưu:**\n"
            "   - Phân tích độ phức tạp Thời gian O(...) và Bộ nhớ O(...).\n"
            "   - Đề xuất giải pháp/cấu trúc dữ liệu tinh gọn nhất bằng lời văn.\n\n"
            "3. **PHONG CÁCH GỢI Ý THUẬT TOÁN:**\n"
            "   - Khen ngợi nhẹ nhàng: 'Tôi thấy bạn đã làm tốt rồi / đạt kết quả AC, nhưng bài này có thể sử dụng thuật toán [Tên thuật toán X] để tối ưu hơn...'\n"
            "   - Diễn giải chi tiết thuật toán X bằng LỜI VĂN BẰNG TIẾNG VIỆT, KHÔNG DÙNG MÃ NGUỒN HAY CÂU LỆNH CỤ THỂ.\n"
            "   - TUYỆT ĐỐI KHÔNG đọc hay phân tích ghi chú (comments) trong code.\n\n"
            "4. **RÀNG BUỘC TUYỆT ĐỐI VỀ PHẢN HỒI (NGHIÊM CẤM CODE & BACKTICK):**\n"
            "   - TUYỆT ĐỐI KHÔNG ĐƯỢC viết mã nguồn (code), đoạn mã mẫu, câu lệnh lập trình (cin, cout, print, if...), mã giả (pseudocode), struct, class hay khung hàm mẫu dưới bất kỳ ngôn ngữ nào.\n"
            "   - KHÔNG dùng thẻ code block (```) hoặc inline code trong dấu backtick (`) cho các câu lệnh.\n"
            "   - CHỈ HƯỚNG DẪN BẰNG LỜI VĂN BẰNG TIẾNG VIỆT.\n\n"
            "CẤU TRÚC PHẢN HỒI YÊU CẦU:\n"
            "### 🎉 1. Đánh Giá Bài Làm (Accepted)\n"
            "- Khen ngợi sinh viên đã giải đúng bài toán.\n"
            "- Nhận xét ngắn gọn về độ phức tạp hiện tại của bài làm.\n\n"
            "### 🔍 2. Phân Tích Tính Tối Ưu & Khía Cạnh Cần Tinh Gọn (Over-Engineering)\n"
            "- Nhận xét xem code có bị quá cồng kềnh, dùng thừa lớp/con trỏ/cấp phát động không bằng lời văn.\n\n"
            "### 🚀 3. Hướng Giải Quyết Tối Ưu & Tinh Gọn Nhất (HOÀN TOÀN DÙNG LỜI VĂN, KHÔNG CODE/PSEUDOCODE)\n"
            "- Bắt đầu bằng: 'Tôi thấy bạn đã làm tốt..., nhưng bài này có thể sử dụng thuật toán X để tối ưu hơn...'\n"
            "- Mô tả tư tưởng phương pháp tối ưu tinh gọn nhất theo chuẩn Lập trình thi đấu hoàn toàn bằng văn bản diễn giải."
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
                    hint = choices[0].get("message", {}).get("content", "").strip()
                    return self._clean_llm_response(hint)
                return "Không thể trích xuất gợi ý từ phản hồi của mô hình LLM."
            except Exception as e:
                print(f"[LLM API Error]: {e}")
                return "AI hiện chưa thể phân tích tối ưu do kết nối máy chủ LLM gặp sự cố."

