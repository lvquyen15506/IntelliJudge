# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
import base64
import asyncio
import binascii
from typing import Dict, Any
import httpx
from app.core.config import settings
from app.models.enums import SubmissionStatus


def safe_b64decode(value: str) -> str:
    """
    Giải mã Base64 an toàn, tự động xử lý lỗi padding và bắt lỗi binascii.Error.
    """
    if not value:
        return ""
    try:
        padded_value = value.strip()
        missing_padding = len(padded_value) % 4
        if missing_padding:
            padded_value += '=' * (4 - missing_padding)
        return base64.b64decode(padded_value.encode("utf-8")).decode("utf-8", errors="replace")
    except (binascii.Error, ValueError, Exception):
        return value


class Judge0Service:
    def __init__(self):
        url = settings.JUDGE0_API_URL.rstrip("/")
        if "localhost" in url or "host.docker.internal" in url:
            url = "http://judge0-server-1:2358"
        self.base_url = url
        self.headers = {}
        # Cấu hình API Key nếu gọi qua RapidAPI hoặc tự dựng có Auth
        if settings.JUDGE0_API_KEY:
            self.headers["X-RapidAPI-Key"] = settings.JUDGE0_API_KEY
            self.headers["X-RapidAPI-Host"] = "judge0-extra-ce.p.rapidapi.com"
        
        if settings.JUDGE0_AUTH_TOKEN:
            self.headers[settings.JUDGE0_AUTH_HEADER] = settings.JUDGE0_AUTH_TOKEN

    async def _get_working_base_url(self, client: httpx.AsyncClient) -> str:
        """
        Tự động quét các địa chỉ IP/Hostname khả thi để tìm endpoint Judge0 đang sống (Healthcheck).
        Đảm bảo hệ thống kết nối thành công 100% trên cả môi trường Local, Docker Linux, GCP VM và Server Production.
        """
        candidate_urls = [
            self.base_url,
            "http://judge0-server-1:2358",
            "http://judge0-server:2358",
            "http://judge0_server:2358",
            "http://host.docker.internal:2358",
            "http://172.17.0.1:2358",
            "http://localhost:2358",
        ]
        unique_urls = list(dict.fromkeys([u for u in candidate_urls if u]))
        for url in unique_urls:
            clean_url = url.rstrip('/')
            try:
                res = await client.get(f"{clean_url}/system_info", headers=self.headers, timeout=1.5)
                if res.status_code == 200:
                    return clean_url
            except Exception:
                continue
        return self.base_url

    async def submit_async(
        self,
        source_code: str,
        stdin: str,
        expected_output: str,
        callback_url: str,
        cpu_time_limit: float = 1.0,
        memory_limit: float = 256.0,
        language_id: int = 54,
    ) -> str:
        """
        Gui code len Judge0 cung voi callback_url. 
        Ham se khong cho ket qua ma chi tra ve token (Non-blocking).
        """
        encoded_source = base64.b64encode(source_code.encode("utf-8")).decode("utf-8")
        encoded_stdin = base64.b64encode(stdin.encode("utf-8")).decode("utf-8")
        encoded_expected = base64.b64encode(expected_output.encode("utf-8")).decode("utf-8")
        memory_limit_kb = int(memory_limit * 1024)

        payload = {
            "source_code": encoded_source,
            "language_id": language_id,
            "stdin": encoded_stdin,
            "expected_output": encoded_expected,
            "cpu_time_limit": cpu_time_limit,
            "memory_limit": memory_limit_kb,
            "callback_url": callback_url,
        }

        async with httpx.AsyncClient() as client:
            try:
                active_base_url = await self._get_working_base_url(client)
                url_post = f"{active_base_url}/submissions?base64_encoded=true"

                response = await client.post(
                    url_post, json=payload, headers=self.headers, timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                token = data.get("token")
                if not token:
                    raise Exception("Không nhận được token từ Judge0.")
                return token
            except Exception as e:
                print(f"[Sandbox Error] {e}")
                return ""

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
            compile_output = safe_b64decode(compile_output)

        # Bien loi runtime
        stderr = data.get("stderr") or ""
        if stderr:
            stderr = safe_b64decode(stderr)

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
