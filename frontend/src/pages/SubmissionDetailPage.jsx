// SPDX-License-Identifier: MIT
// Copyright (c) 2026 La Văn Quyền. All rights reserved.
import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { 
  ArrowLeft, Loader2, CheckCircle2, XCircle, Code, 
  Sparkles, Clock, HardDrive, Calendar, User, BookOpen,
  RotateCcw, Check, X, Layers, AlertCircle
} from "lucide-react";
import api from "../services/api";

function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("results"); // "results" | "code" | "ai"

  // Fetch dữ liệu từ API
  const fetchSubmissionDetail = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await api.get(`/submissions/${id}`);
      setSubmission(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      if (!isSilent) setError("Không thể kết nối đến máy chủ hoặc bài nộp không tồn tại.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissionDetail(false);
  }, [id]);

  // Polling tự động refresh nếu bài nộp ở trạng thái PENDING / PROCESSING hoặc AI hint chưa có
  useEffect(() => {
    if (!submission) return;

    const isPending = submission.status === "PENDING" || submission.status === "PROCESSING";
    const isWaitingForAi = !submission.ai_hint;

    if (!isPending && !isWaitingForAi) {
      return;
    }

    const intervalId = setInterval(() => {
      fetchSubmissionDetail(true);
    }, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [submission?.status, submission?.ai_hint]);

  // Ánh xạ tên ngôn ngữ thân thiện
  const getLanguageLabel = (lang) => {
    switch (lang?.toLowerCase()) {
      case "cpp": return "C++ (GCC)";
      case "java": return "Java";
      case "python": return "Python 3";
      default: return lang || "Unknown";
    }
  };

  // Parse JSON kết quả test cases nếu có
  const getTestCaseResults = () => {
    if (!submission?.test_case_results) return [];
    try {
      return JSON.parse(submission.test_case_results);
    } catch (e) {
      console.error("Error parsing test_case_results:", e);
      return [];
    }
  };

  // Render Badge trạng thái lớn ở Header
  const renderStatusBadgeLarge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            ĐANG CHẤM BÀI (PENDING)
          </div>
        );
      case "AC":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            CHẤP NHẬN BÀI LÀM (ACCEPTED - AC)
          </div>
        );
      case "WA":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-800 border border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            LỜI GIẢI SAI (WRONG ANSWER - WA)
          </div>
        );
      case "CE":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-800 border border-red-200">
            <XCircle className="h-4 w-4 text-red-600" />
            LỖI BIÊN DỊCH (COMPILE ERROR - CE)
          </div>
        );
      case "TLE":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-800 border border-red-200">
            <Loader2 className="h-4 w-4 text-red-600" />
            QUÁ GIỚI HẠN THỜI GIAN (TLE)
          </div>
        );
      case "MLE":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-800 border border-red-200">
            <Loader2 className="h-4 w-4 text-red-600" />
            QUÁ GIỚI HẠN BỘ NHỚ (MLE)
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-slate-50 text-slate-800 border border-slate-200">
            {status}
          </div>
        );
    }
  };

  if (loading && !submission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="font-semibold text-sm">Đang tải chi tiết bài nộp...</p>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-red-50 border border-red-200 rounded-2xl text-center">
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800 mb-2">Đã xảy ra lỗi</h3>
        <p className="text-sm text-red-700 mb-6">{error || "Bài nộp không tồn tại."}</p>
        <Link
          to="/submissions"
          className="inline-flex items-center gap-2 bg-white text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm text-sm font-semibold transition-all duration-200 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách bài nộp
        </Link>
      </div>
    );
  }

  const runTimeMs = submission.execution_time !== null ? `${(submission.execution_time * 1000).toFixed(0)} ms` : "--";
  const memoryKb = submission.memory_used !== null ? `${(submission.memory_used * 1024).toFixed(0)} KB` : "--";
  const submissionDate = new Date(submission.created_at).toLocaleString("vi-VN");
  const testCaseResults = getTestCaseResults();

  // Tính tổng điểm test case
  const totalTestCases = testCaseResults.length;
  const passedTestCases = testCaseResults.filter(tc => tc.status === "AC").length;
  const totalScore = passedTestCases;
  const maxScore = totalTestCases;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/submissions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Quay lại lịch sử bài nộp
        </Link>

        {/* Nút Nộp lại bài này */}
        <Link
          to={`/problems/${submission.problem_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Nộp lại bài này (Resubmit)
        </Link>
      </div>

      {/* HEADER CARD: Tóm tắt bài nộp ICTU style */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-400 tracking-wider font-mono">
              SUBMISSION ID: #{String(submission.id).padStart(5, "0")}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
              Submission of <span className="text-blue-600">{submission.problem_title}</span> by <span className="text-slate-700">{submission.username}</span>
            </h1>
          </div>
          {renderStatusBadgeLarge(submission.status)}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">Tài khoản</div>
              <div className="font-bold text-slate-700">{submission.username}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">Thời gian chạy</div>
              <div className="font-bold text-slate-700 font-mono text-xs">{runTimeMs}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
              <HardDrive className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">Bộ nhớ sử dụng</div>
              <div className="font-bold text-slate-700 font-mono text-xs">{memoryKb}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-50 text-slate-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">Ngày nộp bài</div>
              <div className="font-bold text-slate-700 text-xs">{submissionDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS VIEW: Execution Results vs Mã Nguồn vs AI Phân Tích */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {/* Thanh Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("results")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all duration-150 ${
              activeTab === "results"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Layers className="h-4 w-4" />
            Kết quả Test Cases
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all duration-150 ${
              activeTab === "code"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Code className="h-4 w-4" />
            Mã nguồn ({getLanguageLabel(submission.language)})
          </button>
          
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all duration-150 relative ${
              activeTab === "ai"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Sparkles className="h-4 w-4 text-purple-500 animate-pulse" />
            AI Phân tích & Gợi ý
            {submission.status !== "AC" && submission.status !== "PENDING" && !submission.ai_hint && (
              <span className="absolute top-2.5 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* CHI TIẾT TABS */}
        <div className="p-6">
          
          {/* TAB 1: KẾT QUẢ EXECUTION RESULTS (TEST CASES) */}
          {activeTab === "results" && (
            <div className="space-y-6">
              
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                  Execution Results
                </h3>
              </div>

              {submission.status === "PENDING" ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 text-amber-600 animate-spin" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-base">Đang thực thi các Test Case...</h4>
                    <p className="text-xs text-amber-700 mt-1">Hệ thống đang chạy mã nguồn của bạn qua từng test case thử nghiệm.</p>
                  </div>
                </div>
              ) : testCaseResults.length > 0 ? (
                <div className="space-y-6">
                  
                  {/* Hàng Icon Trạng thái (❌ ❌ ❌ hoặc ✅ ✅ ✅) */}
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-500 mr-2">Tổng quan:</span>
                    {testCaseResults.map((tc, idx) => (
                      <span
                        key={idx}
                        title={`Test #${tc.index}: ${tc.status}`}
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md font-extrabold text-xs shadow-sm ${
                          tc.status === "AC"
                            ? "bg-emerald-500 text-white"
                            : tc.status === "SKIPPED"
                            ? "bg-slate-200 text-slate-500"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {tc.status === "AC" ? "✓" : tc.status === "SKIPPED" ? "-" : "✗"}
                      </span>
                    ))}
                  </div>

                  {/* Danh sách từng Test Case */}
                  <div className="space-y-2.5 font-mono">
                    {testCaseResults.map((tc, idx) => (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                          tc.status === "AC"
                            ? "bg-emerald-50/40 border-emerald-200 text-emerald-900"
                            : tc.status === "SKIPPED"
                            ? "bg-slate-50 border-slate-200 text-slate-400"
                            : "bg-red-50/40 border-red-200 text-red-900"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 text-xs sm:text-sm">
                          <span className={`font-black ${tc.status === "AC" ? "text-emerald-600" : tc.status === "SKIPPED" ? "text-slate-400" : "text-red-600"}`}>
                            {tc.status === "AC" ? "✔" : tc.status === "SKIPPED" ? "–" : "✖"}
                          </span>
                          <span className="font-bold">Test case #{tc.index}:</span>
                          <span className={`font-black px-2 py-0.5 rounded text-xs ${
                            tc.status === "AC"
                              ? "bg-emerald-100 text-emerald-800"
                              : tc.status === "SKIPPED"
                              ? "bg-slate-200 text-slate-600"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {tc.status}
                          </span>
                          <span className="text-slate-500 text-xs font-normal">
                            [{tc.time !== undefined ? (tc.time * 1000).toFixed(0) : "0"}ms, {tc.memory !== undefined ? tc.memory.toFixed(2) : "0"} MB]
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-500 self-end sm:self-auto">
                          ({tc.score}/{tc.max_score})
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Khối thống kê tổng tài nguyên & Điểm số */}
                  <div className="bg-slate-100/70 p-4 rounded-xl border border-slate-200 text-xs sm:text-sm font-mono space-y-1 text-slate-700">
                    <div><b>Resources:</b> {submission.execution_time !== null ? `${submission.execution_time.toFixed(3)}s` : "0s"}, {submission.memory_used !== null ? `${submission.memory_used.toFixed(2)} MB` : "0 MB"}</div>
                    <div><b>Final score:</b> <span className={submission.status === "AC" ? "text-emerald-600 font-extrabold" : "text-amber-600 font-extrabold"}>{passedTestCases}/{totalTestCases}</span> ({submission.points !== undefined && submission.points !== null ? submission.points.toFixed(2) : (passedTestCases / (totalTestCases || 1)).toFixed(2)} points)</div>
                  </div>

                </div>
              ) : (
                /* Fallback cho bài nộp chưa có chi tiết test case */
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm text-slate-600 space-y-2">
                  <div className="font-bold text-slate-800">Kết quả tổng quan:</div>
                  <div>Trạng thái: <b>{submission.status}</b></div>
                  <div>Thời gian thực thi: <b>{runTimeMs}</b></div>
                  <div>Bộ nhớ sử dụng: <b>{memoryKb}</b></div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: MÃ NGUỒN (SOURCE CODE) */}
          {activeTab === "code" && (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-[#1e1e1e]">
              <div className="bg-[#181818] border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{getLanguageLabel(submission.language)}</span>
                <span>Chế độ đọc (Read Only)</span>
              </div>

              <Editor
                height="450px"
                language={submission.language === "cpp" ? "cpp" : "python"}
                theme="vs-dark"
                value={submission.code}
                options={{
                  readOnly: true,
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  padding: { top: 12, bottom: 12 },
                  cursorBlinking: "smooth",
                }}
              />
            </div>
          )}

          {/* TAB 3: AI PHÂN TÍCH LỖI & TỐI ƯU */}
          {activeTab === "ai" && (
            <div className="space-y-4 min-h-[300px]">
              
              {submission.status === "PENDING" && (
                <div className="bg-slate-50 border border-slate-100 text-slate-500 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                  <div>
                    <h4 className="font-bold text-slate-700">Đang chờ chấm bài...</h4>
                    <p className="text-xs text-slate-400 mt-1">Gợi ý từ AI sẽ xuất hiện ngay sau khi có kết quả chấm chính thức từ hệ thống.</p>
                  </div>
                </div>
              )}

              {submission.status !== "PENDING" && !submission.ai_hint && (
                <div className={submission.status === "AC" ? "bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-5 text-sm flex items-start gap-3" : "bg-purple-50/50 border border-purple-100 text-purple-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3"}>
                  {submission.status === "AC" ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-extrabold mb-1">Lời giải hoàn hảo!</h4>
                        <p className="text-emerald-700 leading-relaxed">
                          Bài làm của bạn đã vượt qua tất cả các test case thành công. Nộp bài nộp mới để trải nghiệm gợi ý tối ưu mã nguồn từ AI.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                      <div>
                        <h4 className="font-bold text-purple-800">Trợ lý AI đang phân tích lỗi...</h4>
                        <p className="text-xs text-purple-500 mt-1">Hệ thống đang kiểm tra và thiết lập các gợi ý sửa đổi, quá trình này mất khoảng vài giây.</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {submission.ai_hint && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 font-sans text-slate-700">
                  <div className="flex items-center gap-2 text-purple-700 font-extrabold text-sm border-b border-slate-200 pb-3 mb-4">
                    <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
                    {submission.status === "AC"
                      ? "Báo cáo Phân tích & Gợi ý Tối ưu hóa Mã nguồn từ AI"
                      : "Báo cáo Phân tích Gợi ý Sửa lỗi từ AI"}
                  </div>
                  
                  <div className="markdown-body prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    <ReactMarkdown>{submission.ai_hint}</ReactMarkdown>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}

export default SubmissionDetailPage;
