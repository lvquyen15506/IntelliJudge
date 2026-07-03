import ProblemSidebar from "../components/ProblemSidebar";

function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Cột trái rộng hơn: Chứa bảng danh sách bài tập (sẽ làm ở Chặng 4) */}
      <div className="lg:col-span-3 flex flex-col space-y-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between items-center border-2 border-dashed border-gray-200 min-h-[450px] text-center text-gray-400">
          <div className="my-auto space-y-2">
            <p className="font-extrabold text-xl text-gray-300">
              Problem Table Container
            </p>
            <p className="text-sm text-gray-400">
              Khu vực danh sách bài tập lập trình C++ sẽ được thiết kế dạng bảng có phân trang ở Chặng 4.
            </p>
          </div>
        </div>
      </div>

      {/* Cột phải hẹp hơn: Chứa thanh bên phân loại Tags */}
      <div className="lg:col-span-1">
        <ProblemSidebar />
      </div>
    </div>
  );
}

export default HomePage;
