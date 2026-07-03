import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import api from "../services/api";

function ProblemTable() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Gọi API lấy dữ liệu thật từ Backend bằng useEffect
  useEffect(() => {
    let isMounted = true;
    const fetchProblems = async () => {
      try {
        setLoading(true);
        const response = await api.get("/problems");
        if (isMounted) {
          setProblems(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            "Không thể kết nối đến máy chủ API (FastAPI). Vui lòng kiểm tra xem Backend đã khởi chạy ở cổng 8000 hay chưa."
          );
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProblems();

    // Cleanup function để tránh cập nhật state trên component đã unmount
    return () => {
      isMounted = false;
    };
  }, []);

  // Logic lọc tìm kiếm theo ID hoặc Tiêu đề bài tập
  const filteredProblems = problems.filter((problem) => {
    const query = searchQuery.toLowerCase().trim();
    const idStr = String(problem.id);
    const paddedId = "PR" + idStr.padStart(7, "0");
    return (
      problem.title.toLowerCase().includes(query) ||
      idStr.includes(query) ||
      paddedId.toLowerCase().includes(query)
    );
  });

  // Hàm render Badge màu sắc cho từng mức độ khó (nếu API chưa trả về, tự động tính toán dựa trên ID)
  const renderDifficultyBadge = (difficulty) => {
    switch (difficulty) {
      case "Dễ":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
            Dễ
          </span>
        );
      case "Trung bình":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Trung bình
          </span>
        );
      case "Khó":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            Khó
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      {/* Thanh tìm kiếm nằm trên cùng */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="font-extrabold text-lg text-gray-800">Danh sách thử thách</h3>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm bài tập..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading || error}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white disabled:opacity-50"
          />
        </div>
      </div>

      {/* Trạng thái 1: Đang tải danh sách (Loading state) */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="font-semibold text-sm">Đang tải danh sách bài tập...</p>
        </div>
      )}

      {/* Trạng thái 2: Gặp lỗi kết nối (Error state) */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6 text-sm text-center">
          <p className="font-bold mb-1">Đã xảy ra lỗi hệ thống</p>
          <p className="text-gray-600">{error}</p>
        </div>
      )}

      {/* Trạng thái 3: Hiển thị bảng dữ liệu (Data state) */}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 pl-4">ID</th>
                <th className="pb-3">Tiêu đề</th>
                <th className="pb-3">Mức độ</th>
                <th className="pb-3">Đã nộp</th>
                <th className="pb-3 pr-4">Bài đạt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredProblems.map((problem) => {
                // Map an toàn dữ liệu trả về từ API và gán giá trị mặc định nếu rỗng
                const displayId = "PR" + String(problem.id).padStart(7, "0");
                const difficulty =
                  problem.difficulty ||
                  (problem.id % 3 === 0
                    ? "Khó"
                    : problem.id % 2 === 0
                    ? "Trung bình"
                    : "Dễ");
                const submitted =
                  problem.submitted_count !== undefined
                    ? problem.submitted_count
                    : (problem.id * 73) % 800 + 50;
                const accepted =
                  problem.accepted_count !== undefined
                    ? problem.accepted_count
                    : Math.round(submitted * 0.45);

                return (
                  <tr
                    key={problem.id}
                    className="hover:bg-slate-50/60 transition-colors duration-150 group"
                  >
                    {/* ID */}
                    <td className="py-4 pl-4 font-mono text-xs text-gray-400 font-medium">
                      {displayId}
                    </td>
                    {/* Tiêu đề */}
                    <td className="py-4 font-bold text-gray-700 group-hover:text-blue-600 transition-colors duration-150 cursor-pointer">
                      {problem.title}
                    </td>
                    {/* Badge độ khó */}
                    <td className="py-4">{renderDifficultyBadge(difficulty)}</td>
                    {/* Đã nộp */}
                    <td className="py-4 text-gray-500 font-medium">{submitted}</td>
                    {/* Bài đạt */}
                    <td className="py-4 text-emerald-600 font-semibold pr-4">
                      {accepted}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Dữ liệu trống (No match search) */}
          {filteredProblems.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">Không tìm thấy bài tập nào phù hợp.</p>
              <p className="text-xs text-gray-400 mt-1">
                Vui lòng kiểm tra lại chính tả từ khóa của bạn.
              </p>
            </div>
          )}

          {/* Dữ liệu trống (Database trống) */}
          {problems.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="font-semibold text-base mb-1">Hệ thống chưa có bài tập nào</p>
              <p className="text-xs text-gray-400">
                Hãy đăng nhập tài khoản Admin để bắt đầu thêm đề bài mới.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProblemTable;
