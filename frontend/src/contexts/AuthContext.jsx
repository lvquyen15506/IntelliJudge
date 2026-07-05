import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

// Hàm giải mã JWT payload mà không cần thư viện ngoài
const decodeToken = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  // Khởi tạo Auth: Kiểm tra token hợp lệ khi tải trang
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        const decoded = decodeToken(storedToken);
        // Kiểm tra hết hạn (exp tính bằng giây)
        if (decoded && decoded.exp && decoded.exp * 1000 > Date.now()) {
          try {
            // Lấy thông tin user đầy đủ (có role) từ API
            const res = await api.get("/users/me");
            setUser(res.data);
            setToken(storedToken);
          } catch (err) {
            console.error("Lỗi xác minh token tự động:", err);
            handleLogout();
          }
        } else {
          // Token hết hạn
          handleLogout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = async (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    try {
      const res = await api.get("/users/me");
      setUser(res.data);
      return res.data;
    } catch (err) {
      console.error("Lỗi tải thông tin user sau đăng nhập:", err);
      handleLogout();
      throw err;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login: handleLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được dùng trong AuthProvider");
  }
  return context;
};
