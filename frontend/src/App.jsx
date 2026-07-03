import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* MainLayout bọc toàn bộ các trang con */}
        <Route path="/" element={<MainLayout />}>
          {/* Trang chủ - Danh sách bài tập */}
          <Route index element={<HomePage />} />

          {/* Trang Kỳ thi */}
          <Route
            path="contests"
            element={
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Kỳ thi</h2>
                <p className="text-gray-500">Danh sách các cuộc thi lập trình đang và sắp diễn ra.</p>
              </div>
            }
          />

          {/* Trang Bài nộp */}
          <Route
            path="submissions"
            element={
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Lịch sử nộp bài</h2>
                <p className="text-gray-500">Xem trạng thái chấm bài và mã nguồn bài làm của bạn.</p>
              </div>
            }
          />

          {/* Trang Xếp hạng */}
          <Route
            path="rankings"
            element={
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Bảng xếp hạng</h2>
                <p className="text-gray-500">Bảng vàng vinh danh các sinh viên xuất sắc nhất hệ thống.</p>
              </div>
            }
          />

          {/* Trang Thông tin */}
          <Route
            path="info"
            element={
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Thông tin dự án</h2>
                <p className="text-gray-500">IntelliJudge - Hệ thống chấm bài & Trợ giảng AI gợi ý sửa lỗi code.</p>
              </div>
            }
          />

          {/* Trang 404 - Bắt lỗi đường dẫn không hợp lệ */}
          <Route
            path="*"
            element={
              <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm text-center">
                <h2 className="text-3xl font-extrabold text-red-600 mb-2">404</h2>
                <p className="text-gray-500">Trang bạn tìm kiếm không tồn tại.</p>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
