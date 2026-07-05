import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { 
  ArrowLeft, Loader2, CheckCircle2, XCircle, Code, 
  Sparkles, Clock, HardDrive, Calendar, User, BookOpen 
} from "lucide-react";
import api from "../services/api";

function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("code"); // "code" hoặc "ai"

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

  // useEffect đầu tiên để gọi fetch ban đầu
  useEffect(() => {
    fetchSubmissionDetail(false);
  }, [id]);

  // useEffect thứ hai để thực hiện cơ chế Polling tự động refresh nếu bài nộp ở trạng thái PENDING
  useEffect(() => {
    if (!submission || (submission.status !== "PENDING" && submission.status !== "PROCESSING")) {
      return;
    }

    // Thiết lập bộ đếm thời gian gọi API sau mỗi 2 giây
    const intervalId = setInterval(() => {
      fetchSubmissionDetail(true);
    }, 2000);

    // Trả về hàm dọn dẹp bộ đếm (cleanup) khi unmount hoặc khi trạng thái thay đổi
    return () => {
      clearInterval(intervalId);
    };
  }, [submission?.status]);

  // Ánh xạ tên ngôn ngữ thân thiện
  const getLanguageLabel = (lang) => {
    switch (lang?.toLowerCase()) {
      case "cpp": return "C++ (GCC)";
      case "java": return "Java";
      case "python": return "Python 3";
      default: return lang || "Unknown";
    }
  };

  // Render Badge trạng thái lớn ở Header
  const renderStatusBadgeLarge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-amber-50 text-amber-800 border border-amber-250 animate-pulse">
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-850 border border-red-200">
            <XCircle className="h-4 w-4 text-red-650" />
            LỜI GIẢI SAI (WRONG ANSWER - WA)
          </div>
        );
      case "CE":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-850 border border-red-200">
            <XCircle className="h-4 w-4 text-red-655" />
            LỖI BIÊN DỊCH (COMPILE ERROR - CE)
          </div>
        );
      case "TLE":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-855 border border-red-200">
            <Loader2 className="h-4 w-4 text-red-650" />
            QUÁ GIỚI HẠN THỜI GIAN (TLE)
          </div>
        );
      case "MLE":
        return (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black bg-red-50 text-red-855 border border-red-200">
            <Loader2 className="h-4 w-4 text-red-650" />
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

  // Format các chỉ số
  const runTimeMs = submission.execution_time !== null ? `${(submission.execution_time * 1000).toFixed(0)} ms` : "--";
  const memoryKb = submission.memory_used !== null ? `${(submission.memory_used * 1024).toFixed(0)} KB` : "--";
  const submissionDate = new Date(submission.created_at).toLocaleString("vi-VN");

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Nút Quay Lại */}
      <Link
        to="/submissions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors group w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Quay lại lịch sử bài nộp
      </Link>

      {/* HEADER CARD: Kết quả tóm tắt */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="text-xs font-bold text-slate-400 tracking-wider font-mono">
              SUBMISSION ID: #{String(submission.id).padStart(5, "0")}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-slate-400" />
              {submission.problem_title}
            </h1>
          </div>
          {renderStatusBadgeLarge(submission.status)}
        </div>

        {/* Thông tin metadata */}
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
              <div className="font-bold text-slate-705 text-xs">{submissionDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TABS VIEW: Mã nguồn vs Phân tích AI */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        
        {/* Thanh chọn Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <button
            onClick={() => setActiveTab("code")}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all duration-150 ${
              activeTab === "code"
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Code className="h-4 w-4" />
            Mã nguồn
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
            AI Phân tích lỗi
            {submission.status !== "AC" && submission.status !== "PENDING" && !submission.ai_hint && (
              <span className="absolute top-2.5 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
              </span>
            )}
          </button>
        </div>

        {/* Chi tiết nội dung các Tabs */}
        <div className="p-6">
          {activeTab === "code" ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-[#1e1e1e]">
              
              {/* Info Bar */}
              <div className="bg-[#181818] border-b border-slate-850 px-4 py-2 flex items-center justify-between text-xs text-slate-400 font-mono">
                <span>{getLanguageLabel(submission.language)}</span>
                <span>Chế độ đọc (Read Only)</span>
              </div>

              {/* Editor */}
              <Editor
                height="450px"
                language={submission.language === "cpp" ? "cpp" : submission.language === "java" ? "java" : "python"}
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
          ) : (
            <div className="space-y-4 min-h-[300px]">
              
              {/* Trạng thái bài nộp Accepted (Không cần AI phân tích) */}
              {submission.status === "AC" && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl p-5 text-sm flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold mb-1">Lời giải hoàn hảo!</h4>
                    <p className="text-emerald-700 leading-relaxed">
                      Bài làm của bạn đã vượt qua tất cả các test case thành công và đạt kết quả tốt nhất. AI không phát hiện ra lỗi logic nào để tối ưu thêm. Hãy tiếp tục giải quyết các thử thách khác!
                    </p>
                  </div>
                </div>
              )}

              {/* Trạng thái PENDING - Chờ phân tích */}
              {submission.status === "PENDING" && (
                <div className="bg-slate-50 border border-slate-100 text-slate-500 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                  <div>
                    <h4 className="font-bold text-slate-700">Đang chờ chấm bài...</h4>
                    <p className="text-xs text-slate-400 mt-1">Gợi ý từ AI sẽ xuất hiện ngay sau khi có kết quả chấm chính thức từ hệ thống.</p>
                  </div>
                </div>
              )}

              {/* Lỗi (WA, CE, TLE...) nhưng đang đợi AI sinh Hint */}
              {submission.status !== "AC" && submission.status !== "PENDING" && !submission.ai_hint && (
                <div className="bg-purple-50/50 border border-purple-100 text-purple-800 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
                  <div>
                    <h4 className="font-bold text-purple-800">Trợ lý AI đang phân tích lỗi...</h4>
                    <p className="text-xs text-purple-500 mt-1">Hệ thống đang kiểm tra và thiết lập các gợi ý sửa đổi, quá trình này mất khoảng vài giây.</p>
                  </div>
                </div>
              )}

              {/* Hiển thị Hint dạng Markdown */}
              {submission.status !== "AC" && submission.ai_hint && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 font-sans text-slate-700">
                  <div className="flex items-center gap-2 text-purple-700 font-extrabold text-sm border-b border-slate-200 pb-3 mb-4">
                    <Sparkles className="h-4 w-4 animate-pulse text-purple-500" />
                    Báo cáo Phân tích gợi ý sửa lỗi từ AI
                  </div>
                  
                  {/* Nội dung Markdown */}
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
