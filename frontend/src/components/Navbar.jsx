import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Terminal, LogOut, LogIn, User, Shield } from "lucide-react";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Hàm tạo CSS class động cho NavLink khi Active/Inactive
  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 py-1 ${
      isActive
        ? "text-white font-semibold border-b-2 border-white"
        : "text-blue-100 hover:text-white"
    }`;

  const handleLogoutClick = () => {
    logout();
    navigate("/");
  };

  return (
    <nav className="bg-[#1e40af] text-white shadow-md"> {/* Màu xanh dương đậm sang trọng */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Bên trái: Logo & Icon */}
          <Link to="/" className="flex items-center space-x-3 cursor-pointer">
            <div className="bg-white/15 p-2 rounded-lg">
              <Terminal className="h-6 w-6 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">
              IntelliJudge
            </span>
          </Link>

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

            {/* Hiển thị thêm tab Quản trị nếu vai trò là ADMIN hoặc SUPER_ADMIN */}
            {user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
              <>
                <NavLink to="/admin/users" className={navLinkClass}>
                  Quản lý User
                </NavLink>
                <NavLink to="/admin/problems" className={navLinkClass}>
                  Quản lý Đề bài
                </NavLink>
              </>
            )}
          </div>

          {/* Bên phải: Trạng thái Đăng nhập */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Profile User */}
                <div className="flex items-center space-x-2 bg-white/10 px-4 py-1.5 rounded-full border border-white/10">
                  <User className="h-4 w-4 text-blue-200" />
                  <span className="text-sm font-semibold tracking-wide">
                    {user.username}
                  </span>
                  
                  {/* Badge hiển thị vai trò */}
                  {user.role === "SUPER_ADMIN" ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-600 text-white border border-purple-700/30 uppercase shadow-sm shadow-purple-500/20">
                      <Shield className="h-2.5 w-2.5" />
                      Super Admin
                    </span>
                  ) : user.role === "ADMIN" ? (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200/30 uppercase">
                      <Shield className="h-2.5 w-2.5" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-green-100 text-green-800 border border-green-200/30 uppercase">
                      SV
                    </span>
                  )}
                </div>

                {/* Nút Đăng xuất */}
                <button
                  onClick={handleLogoutClick}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Đăng xuất
                </button>
              </div>
            ) : (
              /* Nút Đăng nhập nếu chưa xác thực */
              <button
                onClick={() => navigate("/login")}
                className="bg-white text-[#1e40af] hover:bg-blue-50 px-5 py-2 rounded-full text-sm font-bold shadow-sm transition-all duration-200 transform active:scale-95 flex items-center gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
