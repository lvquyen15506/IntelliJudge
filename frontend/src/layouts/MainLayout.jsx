import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";

function MainLayout() {
  const location = useLocation();
  const isProblemDetailPage = location.pathname.startsWith("/problems/");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar cố định ở trên cùng */}
      <Navbar />

      {/* Phân vùng chứa nội dung động ở giữa */}
      <main className={isProblemDetailPage ? "flex-grow flex flex-col" : "flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
        <Outlet />
      </main>

      {/* Footer mờ nhẹ trang nhã ở dưới cùng */}
      {!isProblemDetailPage && (
        <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} IntelliJudge - Hệ thống chấm bài tự động. All rights reserved.
        </footer>
      )}
    </div>
  );
}

export default MainLayout;
