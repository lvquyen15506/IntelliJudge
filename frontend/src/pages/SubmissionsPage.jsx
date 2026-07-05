import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle, Clock, HardDrive, RefreshCw } from "lucide-react";
import api from "../services/api";

function SubmissionsPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Hàm gọi API lấy danh sách bài nộp
  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await api.get("/submissions");
      setSubmissions(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể kết nối tới máy chủ API để lấy lịch sử nộp bài.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Hàm ánh xạ ngôn ngữ
  const formatLanguageName = (lang) => {
    switch (lang?.toLowerCase()) {
      case "cpp": return "C++ (GCC)";
      case "java": return "Java";
      case "python": return "Python 3";
      default: return lang || "Unknown";
    }
  };

  // Render Badge màu cho trạng thái bài nộp
  const renderStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
            Đang chấm...
          </span>
        );
      case "AC":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            Accepted (AC)
          </span>
        );
      case "WA":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="h-3 w-3 text-red-600" />
            Wrong Answer
          </span>
        );
      case "CE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="h-3 w-3 text-red-600" />
            Compile Error
          </span>
        );
      case "TLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="h-3 w-3 text-red-600" />
            Time Limit Exceeded
          </span>
        );
      case "MLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
            <XCircle className="h-3 w-3 text-red-600" />
            Memory Limit Exceeded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Lịch sử bài nộp</h2>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi tiến trình và kết quả bài làm của bạn hoặc các sinh viên trong hệ thống.
          </p>
        </div>
        <button
          onClick={fetchSubmissions}
          disabled={loading}
          className="bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        
        {loading && submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="font-semibold text-sm">Đang tải lịch sử bài nộp...</p>
          </div>
        ) : error && submissions.length === 0 ? (
          <div className="p-8 text-center bg-red-50 text-red-700 border-b border-red-100">
            <p className="font-bold">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 pl-6">Mã bài nộp</th>
                  <th className="py-4">Sinh viên</th>
                  <th className="py-4">Đề bài</th>
                  <th className="py-4">Ngôn ngữ</th>
                  <th className="py-4">Thời gian</th>
                  <th className="py-4">Bộ nhớ</th>
                  <th className="py-4 pr-6">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {submissions.map((sub) => {
                  const displayId = `SUB#${String(sub.id).padStart(5, "0")}`;
                  const runTimeMs = sub.execution_time !== null ? `${(sub.execution_time * 1000).toFixed(0)} ms` : "--";
                  const memoryKb = sub.memory_used !== null ? `${(sub.memory_used * 1024).toFixed(0)} KB` : "--";

                  return (
                    <tr
                      key={sub.id}
                      onClick={() => navigate(`/submissions/${sub.id}`)}
                      className="hover:bg-blue-50/20 active:bg-blue-50/30 transition-all duration-150 cursor-pointer group"
                    >
                      {/* ID */}
                      <td className="py-4 pl-6 font-mono text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                        {displayId}
                      </td>
                      {/* Tài khoản */}
                      <td className="py-4 font-semibold text-slate-700">
                        {sub.username}
                      </td>
                      {/* Bài tập */}
                      <td className="py-4 font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                        {sub.problem_title}
                      </td>
                      {/* Ngôn ngữ */}
                      <td className="py-4 text-slate-600">
                        {formatLanguageName(sub.language)}
                      </td>
                      {/* Thời gian */}
                      <td className="py-4 text-slate-500 font-mono text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-350" />
                          {runTimeMs}
                        </span>
                      </td>
                      {/* Bộ nhớ */}
                      <td className="py-4 text-slate-500 font-mono text-xs">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3.5 w-3.5 text-slate-350" />
                          {memoryKb}
                        </span>
                      </td>
                      {/* Trạng thái */}
                      <td className="py-4 pr-6">
                        {renderStatusBadge(sub.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty state */}
            {submissions.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p className="font-semibold text-base">Không có dữ liệu bài nộp nào</p>
                <p className="text-xs text-slate-400 mt-1">Hãy vào danh sách bài tập để nộp bài làm đầu tiên của bạn.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubmissionsPage;
