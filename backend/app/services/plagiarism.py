# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
import re
from typing import List, Set


class PlagiarismService:
    """
    Dịch vụ phát hiện chép bài (Plagiarism Detection) dựa trên thuật toán K-shingles Jaccard Similarity.
    Chuẩn hóa mã nguồn bằng cách loại bỏ comment, khoảng trắng thừa và đếm tỷ lệ trùng lặp token.
    """

    @staticmethod
    def tokenize(code: str) -> List[str]:
        # 1. Loại bỏ comment Python và C/C++
        code = re.sub(r"//.*|#.*|/\*[\s\S]*?\*/", "", code)

        # 2. Tách các từ khóa, tên biến, toán tử
        tokens = re.findall(r"\w+|[^\w\s]", code)
        return tokens

    @staticmethod
    def get_shingles(tokens: List[str], k: int = 3) -> Set[str]:
        if len(tokens) < k:
            return {" ".join(tokens)} if tokens else set()
        return {" ".join(tokens[i : i + k]) for i in range(len(tokens) - k + 1)}

    @classmethod
    def calculate_similarity(cls, code1: str, code2: str, k: int = 3) -> float:
        """
        Tính phần trăm tương đồng giữa 2 đoạn code (0.0% - 100.0%).
        """
        tokens1 = cls.tokenize(code1)
        tokens2 = cls.tokenize(code2)

        if not tokens1 or not tokens2:
            return 0.0

        shingles1 = cls.get_shingles(tokens1, k=k)
        shingles2 = cls.get_shingles(tokens2, k=k)

        intersection = shingles1.intersection(shingles2)
        union = shingles1.union(shingles2)

        if not union:
            return 0.0

        similarity = len(intersection) / len(union)
        return round(similarity * 100, 2)
