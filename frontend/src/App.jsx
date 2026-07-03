function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <h1 className="text-4xl font-extrabold text-blue-700 tracking-tight mb-2">
          IntelliJudge
        </h1>
        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
          Online Judge System
        </p>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Giao diện hệ thống chấm bài và hỗ trợ sửa lỗi tự động đã được khởi tạo thành công bằng ReactJS + Vite và Tailwind CSS.
        </p>
        <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-semibold border border-blue-100 shadow-sm">
          🚀 Chặng 1: Thiết lập Core và Config thành công!
        </div>
      </div>
    </div>
  );
}

export default App;
