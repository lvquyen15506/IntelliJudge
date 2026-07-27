import { useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Terminal, LogOut, LogIn, User, Shield, Menu, X } from "lucide-react";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Hàm tạo CSS class động cho NavLink khi Active/Inactive
  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-200 py-1 ${
      isActive
        ? "text-white font-semibold border-b-2 border-white"
        : "text-blue-100 hover:text-white"
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `block text-base font-semibold py-2 px-3 rounded-lg transition-colors ${
      isActive ? "bg-white/20 text-white font-bold" : "text-blue-100 hover:bg-white/10"
    }`;

  const handleLogoutClick = () => {
    logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-[#1e40af] text-white shadow-md z-50 relative"> {/* Màu xanh dương đậm sang trọng */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Bên trái: Logo & Icon */}
          <div className="flex items-center space-x-3">
            {/* Nút Hamburger Menu trên Mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 focus:outline-none"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <Link to="/" className="flex items-center space-x-3 cursor-pointer">
              <div className="bg-white/15 p-2 rounded-lg">
                <Terminal className="h-6 w-6 text-white" />
              </div>
              <span className="font-extrabold text-xl tracking-tight">
                IntelliJudge
              </span>
            </Link>
          </div>

          {/* Ở giữa: Thanh menu điều hướng Desktop */}
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
          <div className="flex items-center space-x-3 sm:space-x-4">
            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Profile User */}
                <div className="flex items-center space-x-1.5 sm:space-x-2 bg-white/10 px-2.5 sm:px-4 py-1.5 rounded-full border border-white/10">
                  <User className="h-4 w-4 text-blue-200" />
                  <span className="text-xs sm:text-sm font-semibold tracking-wide truncate max-w-[90px] sm:max-w-[150px]">
                    {user.username}
                  </span>
                  
                  {/* Badge hiển thị vai trò */}
                  {user.role === "SUPER_ADMIN" ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold bg-purple-600 text-white border border-purple-700/30 uppercase shadow-sm shadow-purple-500/20">
                      <Shield className="h-2.5 w-2.5" />
                      <span className="hidden sm:inline">Super Admin</span>
                      <span className="sm:hidden">SA</span>
                    </span>
                  ) : user.role === "ADMIN" ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200/30 uppercase">
                      <Shield className="h-2.5 w-2.5" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold bg-green-100 text-green-800 border border-green-200/30 uppercase">
                      SV
                    </span>
                  )}
                </div>

                {/* Nút Đăng xuất */}
                <button
                  onClick={handleLogoutClick}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1.5 active:scale-95 shadow-sm"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            ) : (
              /* Nút Đăng nhập nếu chưa xác thực */
              <button
                onClick={() => navigate("/login")}
                className="bg-white text-[#1e40af] hover:bg-blue-50 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold shadow-sm transition-all duration-200 transform active:scale-95 flex items-center gap-1.5"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown Menu trên Mobile khi click Hamburger */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#1d3b9e] border-t border-white/10 px-4 pt-3 pb-4 space-y-1 shadow-lg animate-in slide-in-from-top duration-200">
          <NavLink to="/" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Bài tập
          </NavLink>
          <NavLink to="/contests" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Kỳ thi
          </NavLink>
          <NavLink to="/submissions" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Bài nộp
          </NavLink>
          <NavLink to="/rankings" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Xếp hạng
          </NavLink>
          <NavLink to="/info" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
            Thông tin
          </NavLink>

          {user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN") && (
            <div className="pt-2 border-t border-white/10 space-y-1">
              <div className="text-[11px] font-bold text-blue-200 uppercase px-3 pt-1">Quản trị viên</div>
              <NavLink to="/admin/users" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
                Quản lý User
              </NavLink>
              <NavLink to="/admin/problems" onClick={() => setMobileMenuOpen(false)} className={mobileNavLinkClass}>
                Quản lý Đề bài
              </NavLink>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
