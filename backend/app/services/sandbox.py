import base64
from typing import Dict, Any
import httpx
from app.core.config import settings
from app.models.enums import SubmissionStatus


class Judge0Service:
    def __init__(self):
        self.base_url = settings.JUDGE0_API_URL.rstrip("/")
        self.headers = {}
        # Cấu hình API Key nếu gọi qua RapidAPI hoặc tự dựng có Auth
        if settings.JUDGE0_API_KEY:
            self.headers["X-RapidAPI-Key"] = settings.JUDGE0_API_KEY
            self.headers["X-RapidAPI-Host"] = "judge0-extra-ce.p.rapidapi.com"

    async def submit_and_wait(
        self,
        source_code: str,
        stdin: str,
        expected_output: str,
        cpu_time_limit: float = 1.0,
        memory_limit: float = 256.0,  # Don vi: MB
        language_id: int = 54,  # C++ (GCC 9.2.0) hoac phu hop voi Judge0
    ) -> Dict[str, Any]:
        """
        Gui code len Judge0, doi chay dong bo va tra ve ket qua da duoc anh xa.
        """
        # Base64 encode truoc khi truyen tin de tranh loi ky tu dac biet
        encoded_source = base64.b64encode(source_code.encode("utf-8")).decode("utf-8")
        encoded_stdin = base64.b64encode(stdin.encode("utf-8")).decode("utf-8")
        encoded_expected = base64.b64encode(expected_output.encode("utf-8")).decode("utf-8")

        # Judge0 nhan gioi han Memory theo Kilobytes (KB). 1MB = 1024KB.
        memory_limit_kb = int(memory_limit * 1024)

        payload = {
            "source_code": encoded_source,
            "language_id": language_id,
            "stdin": encoded_stdin,
            "expected_output": encoded_expected,
            "cpu_time_limit": cpu_time_limit,
            "memory_limit": memory_limit_kb,
        }

        # Query wait=true de nhan ket qua dong bo ngay lap tuc cho worker
        url = f"{self.base_url}/submissions?base64_encoded=true&wait=true"

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url, json=payload, headers=self.headers, timeout=30.0
                )
                response.raise_for_status()
                data = response.json()
                return self._parse_result(data)
            except Exception as e:
                # Neu loi ket noi hoac loi he thong Judge0, tra ve CE hoac WA kem mo ta loi
                return {
                    "status": SubmissionStatus.CE,
                    "time": 0.0,
                    "memory": 0.0,
                    "error": f"Loi he thong Sandbox: {str(e)}",
                }

    def _parse_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Anh xa trang thai cua Judge0 ve Enum cua he thong.
        """
        # Status IDs cua Judge0:
        # 1: In Queue, 2: Processing, 3: Accepted (AC), 4: Wrong Answer (WA)
        # 5: Time Limit Exceeded (TLE), 6: Compilation Error (CE)
        # 7->12: Runtime Errors (NZEC, SIGSEGV, SIGABRT,...)
        status_info = data.get("status", {})
        status_id = status_info.get("id", 13)
        status_desc = status_info.get("description", "")

        time_taken = float(data.get("time") or 0.0)
        # Convert tu KB sang MB
        memory_used = float(data.get("memory") or 0.0) / 1024.0

        # Bien bien dich loi
        compile_output = data.get("compile_output") or ""
        if compile_output:
            try:
                compile_output = base64.b64decode(compile_output.encode("utf-8")).decode("utf-8")
            except Exception:
                pass

        # Bien loi runtime
        stderr = data.get("stderr") or ""
        if stderr:
            try:
                stderr = base64.b64decode(stderr.encode("utf-8")).decode("utf-8")
            except Exception:
                pass

        error_message = compile_output or stderr

        # Anh xa trang thai
        if status_id == 3:
            mapped_status = SubmissionStatus.AC
        elif status_id == 4:
            mapped_status = SubmissionStatus.WA
        elif status_id == 5:
            mapped_status = SubmissionStatus.TLE
        elif status_id == 6:
            mapped_status = SubmissionStatus.CE
        elif status_id in [7, 8, 9, 10, 11, 12]:
            # Neu mo ta co chua chu Memory hoac out of memory thi coi nhu MLE
            if (
                "memory limit exceeded" in status_desc.lower()
                or "out of memory" in error_message.lower()
            ):
                mapped_status = SubmissionStatus.MLE
            else:
                # Mac dinh cac loi runtime error khac tinh la WA (hoac runtime error)
                mapped_status = SubmissionStatus.WA
        else:
            mapped_status = SubmissionStatus.WA

        # Kiem tra thu cong RAM neu can thiet (du phong)
        if "memory limit exceeded" in status_desc.lower():
            mapped_status = SubmissionStatus.MLE

        return {
            "status": mapped_status,
            "time": time_taken,
            "memory": memory_used,
            "error": error_message,
        }
