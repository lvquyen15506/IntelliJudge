import { NavLink } from "react-router-dom";
import { Terminal } from "lucide-react";

function Navbar() {
  // Hàm tạo CSS class động cho NavLink khi Active/Inactive
  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 py-1 ${
      isActive
        ? "text-white font-semibold border-b-2 border-white"
        : "text-blue-100 hover:text-white"
    }`;

  return (
    <nav className="bg-[#1e40af] text-white shadow-md"> {/* Màu xanh dương đậm sang trọng */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Bên trái: Logo & Icon */}
          <div className="flex items-center space-x-3 cursor-pointer">
            <div className="bg-white/15 p-2 rounded-lg">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              IntelliJudge
            </span>
          </div>

          {/* Ở giữa: Thanh menu điều hướng */}
          <div className="hidden md:flex items-center space-x-8">
            <NavLink to="/" className={navLinkClass}>
              Bài tập
            </NavLink>
            <NavLink to="/contests" className={navLinkClass}>
              Kỳ thi
            </NavLink>
            <NavLink to="/submissions" className={navLinkClass}>
              Bài nộp
            </NavLink>
            <NavLink to="/rankings" className={navLinkClass}>
              Xếp hạng
            </NavLink>
            <NavLink to="/info" className={navLinkClass}>
              Thông tin
            </NavLink>
          </div>

          {/* Bên phải: Nút Đăng nhập */}
          <div className="flex items-center">
            <button className="bg-white text-[#1e40af] hover:bg-blue-50 px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all duration-200 transform active:scale-95">
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
