# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
import enum


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class SubmissionStatus(str, enum.Enum):
    PENDING = "PENDING"
    AC = "AC"
    WA = "WA"
    TLE = "TLE"
    MLE = "MLE"
    CE = "CE"
    SYSTEM_ERROR = "SYSTEM_ERROR"
