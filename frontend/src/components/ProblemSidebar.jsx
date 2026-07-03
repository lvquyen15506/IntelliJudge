import { BookOpen, Shuffle, BarChart3 } from "lucide-react";

function ProblemSidebar() {
  // Danh sách các thẻ phân loại giả lập giống trong ảnh thiết kế
  const tags = [
    "Bản ghi",
    "Chính phương",
    "CTDL",
    "Đồ thị",
    "Hai con trỏ",
    "Hình học",
    "Mảng",
    "Quy hoạch động",
    "Sắp xếp",
    "Toán học",
    "Xử lý xâu",
    "Tham lam",
    "Đệ quy"
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-6">
      {/* Tiêu đề Sidebar */}
      <div className="flex items-center space-x-2 pb-4 border-b border-gray-100">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h3 className="font-bold text-gray-800 text-base">Phân loại bài tập</h3>
      </div>

      {/* Nút Hành động: Thử thách ngẫu nhiên */}
      <button className="w-full flex items-center justify-center space-x-2 bg-blue-50/60 hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-blue-100 hover:border-blue-200 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 transform active:scale-[0.98] shadow-sm">
        <Shuffle className="h-4 w-4" />
        <span>Thử thách 1 bài ngẫu nhiên</span>
      </button>

      {/* Danh sách Tags */}
      <div>
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Tags phổ biến
        </h4>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1.5 bg-gray-50/60 hover:bg-white text-gray-600 hover:text-blue-600 rounded-full border border-gray-100 hover:border-blue-400 cursor-pointer transition-all duration-150 shadow-sm hover:shadow"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Khung Placeholder cho biểu đồ kỹ năng */}
      <div className="pt-4 border-t border-gray-100">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Phân tích kỹ năng
        </h4>
        <div className="border border-dashed border-gray-200 bg-gray-50/40 rounded-xl p-6 flex flex-col items-center justify-center text-center h-36">
          <BarChart3 className="h-8 w-8 text-gray-300 mb-2" />
          <span className="text-xs font-medium text-gray-400">Biểu đồ Radar kỹ năng</span>
          <span className="text-[10px] text-gray-400 mt-1">(Sẽ cập nhật ở các chặng sau)</span>
        </div>
      </div>
    </div>
  );
}

export default ProblemSidebar;
