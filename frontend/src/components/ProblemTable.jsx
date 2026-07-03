import { useState } from "react";
import { Search } from "lucide-react";

function ProblemTable() {
  const [searchQuery, setSearchQuery] = useState("");

  // Dữ liệu giả lập (Mock Data) theo yêu cầu trong ảnh thiết kế
  const mockProblems = [
    {
      id: "PR2600001",
      title: "Tổng a cộng b",
      difficulty: "Dễ",
      submitted: 473,
      accepted: 315,
    },
    {
      id: "PR2600002",
      title: "Cộng trừ nhân chia",
      difficulty: "Dễ",
      submitted: 728,
      accepted: 326,
    },
    {
      id: "PR2500225",
      title: "Kiểm tra tam giác",
      difficulty: "Trung bình",
      submitted: 713,
      accepted: 307,
    },
    {
      id: "PR2500230",
      title: "Bình phương và lập phương",
      difficulty: "Trung bình",
      submitted: 529,
      accepted: 229,
    },
    {
      id: "HV1711001",
      title: "Chia tiền",
      difficulty: "Khó",
      submitted: 146,
      accepted: 83,
    },
  ];

  // Logic lọc tìm kiếm theo ID hoặc Tiêu đề bài tập
  const filteredProblems = mockProblems.filter((problem) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      problem.title.toLowerCase().includes(query) ||
      problem.id.toLowerCase().includes(query)
    );
  });

  // Hàm render Badge màu sắc cho từng mức độ khó
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
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200 bg-gray-50/50 focus:bg-white"
          />
        </div>
      </div>

      {/* Bảng chứa dữ liệu bài tập */}
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
            {filteredProblems.map((problem) => (
              <tr
                key={problem.id}
                className="hover:bg-slate-50/60 transition-colors duration-150 group"
              >
                {/* ID cột dạng mã font-mono */}
                <td className="py-4 pl-4 font-mono text-xs text-gray-400 font-medium">
                  {problem.id}
                </td>
                {/* Tiêu đề cột rộng nhất và hover đổi màu */}
                <td className="py-4 font-bold text-gray-700 group-hover:text-blue-600 transition-colors duration-150 cursor-pointer">
                  {problem.title}
                </td>
                {/* Badge độ khó */}
                <td className="py-4">{renderDifficultyBadge(problem.difficulty)}</td>
                {/* Lượt nộp */}
                <td className="py-4 text-gray-500 font-medium">{problem.submitted}</td>
                {/* Số bài đạt màu xanh lá */}
                <td className="py-4 text-emerald-600 font-semibold pr-4">
                  {problem.accepted}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Trạng thái rỗng khi tìm kiếm không ra kết quả */}
      {filteredProblems.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="font-medium">Không tìm thấy bài tập nào phù hợp.</p>
          <p className="text-xs text-gray-400 mt-1">
            Vui lòng kiểm tra lại chính tả từ khóa của bạn.
          </p>
        </div>
      )}
    </div>
  );
}

export default ProblemTable;
