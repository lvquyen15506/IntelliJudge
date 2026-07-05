import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserManagerPage from "./pages/admin/UserManagerPage";
import ProblemDetailPage from "./pages/ProblemDetailPage";
import SubmissionsPage from "./pages/SubmissionsPage";
import SubmissionDetailPage from "./pages/SubmissionDetailPage";
import RankingsPage from "./pages/RankingsPage";
import InfoPage from "./pages/InfoPage";

// Component bảo vệ Route Admin
const AdminRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] py-16 text-gray-500 gap-3">
        <div className="h-8 w-8 text-blue-600 animate-spin rounded-full border-2 border-t-blue-600"></div>
        <p className="font-semibold text-sm">Đang xác thực thông tin...</p>
      </div>
    );
  }
  
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    // Chuyển hướng về trang chủ nếu không phải admin hoặc super_admin
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* MainLayout bọc toàn bộ các trang con */}
          <Route path="/" element={<MainLayout />}>
            {/* Trang chủ - Danh sách bài tập */}
            <Route index element={<HomePage />} />
            
            {/* Trang Chi tiết bài tập & Làm bài */}
            <Route path="problems/:id" element={<ProblemDetailPage />} />
            
            {/* Trang Đăng nhập & Đăng ký */}
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />

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
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="submissions/:id" element={<SubmissionDetailPage />} />

            {/* Trang Xếp hạng */}
            <Route path="rankings" element={<RankingsPage />} />

            {/* Trang Thông tin */}
            <Route path="info" element={<InfoPage />} />

            {/* Nhóm Route được bảo vệ cho Admin */}
            <Route path="admin" element={<AdminRoute />}>
              <Route path="users" element={<UserManagerPage />} />
            </Route>

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
    </AuthProvider>
  );
}

export default App;
