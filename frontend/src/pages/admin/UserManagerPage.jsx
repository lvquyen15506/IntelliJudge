import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Shield, Plus, X, Loader2, AlertCircle, CheckCircle2, User, Mail, ShieldAlert, Edit, Trash2 } from "lucide-react";
import api from "../../services/api";

function UserManagerPage() {
  const { user } = useAuth();
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // States cho modal thêm tài khoản
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("STUDENT");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [modalSuccess, setModalSuccess] = useState(false);

  // States cho modal sửa tài khoản
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("STUDENT");
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState(null);
  const [editModalSuccess, setEditModalSuccess] = useState(false);

  // States cho modal xác nhận xóa
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleteModalLoading, setDeleteModalLoading] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState(null);
  const [deleteModalSuccess, setDeleteModalSuccess] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      // API call tự động đính kèm Authorization header nhờ interceptor
      const res = await api.get("/users");
      setUsersList(res.data);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách tài khoản. Hãy chắc chắn bạn là Admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    setModalSuccess(false);

    try {
      await api.post("/users", {
        username: newUsername,
        email: newEmail,
        password: newPassword,
        role: newRole,
      });

      setModalSuccess(true);
      // Reset form
      setNewUsername("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("STUDENT");

      // Tải lại danh sách
      fetchUsers();

      // Đóng modal sau 1.5 giây
      setTimeout(() => {
        setIsModalOpen(false);
        setModalSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setModalError(err.response.data.detail);
      } else {
        setModalError("Không thể tạo tài khoản mới. Vui lòng kiểm tra lại dữ liệu.");
      }
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditClick = (usr) => {
    setEditingUser(usr);
    setEditUsername(usr.username);
    setEditEmail(usr.email);
    setEditPassword(""); // để trống trừ khi muốn đổi
    setEditRole(usr.role);
    setEditModalError(null);
    setEditModalSuccess(false);
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditModalLoading(true);
    setEditModalError(null);
    setEditModalSuccess(false);

    try {
      const payload = {
        username: editUsername,
        email: editEmail,
        role: editRole,
      };
      if (editPassword) {
        payload.password = editPassword;
      }

      await api.put(`/users/${editingUser.id}`, payload);

      setEditModalSuccess(true);
      fetchUsers();

      // Đóng modal sau 1.5 giây
      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditModalSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setEditModalError(err.response.data.detail);
      } else {
        setEditModalError("Không thể cập nhật tài khoản. Vui lòng kiểm tra lại.");
      }
    } finally {
      setEditModalLoading(false);
    }
  };

  const handleDeleteClick = (usr) => {
    setDeletingUser(usr);
    setDeleteModalError(null);
    setDeleteModalSuccess(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteModalLoading(true);
    setDeleteModalError(null);
    setDeleteModalSuccess(false);

    try {
      await api.delete(`/users/${deletingUser.id}`);
      setDeleteModalSuccess(true);
      fetchUsers();

      // Đóng modal sau 1.5 giây
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setDeleteModalSuccess(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data && err.response.data.detail) {
        setDeleteModalError(err.response.data.detail);
      } else {
        setDeleteModalError("Không thể xóa tài khoản. Vui lòng thử lại.");
      }
    } finally {
      setDeleteModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Nút thêm tài khoản */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Quản trị Người dùng
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý tài khoản Admin và Sinh viên trong hệ thống chấm bài.
          </p>
        </div>
        {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
          <button
            onClick={() => {
              if (user?.role === "ADMIN") {
                setNewRole("STUDENT");
              }
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-500/10 flex items-center gap-2 transition-all duration-200 transform active:scale-95 text-sm"
          >
            <Plus className="h-4 w-4" />
            Thêm tài khoản
          </button>
        )}
      </div>

      {/* Thông báo lỗi tổng quát */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Bảng Danh sách Người dùng */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-3">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
          <p className="font-semibold text-sm">Đang tải danh sách người dùng...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Tên đăng nhập</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Vai trò (Role)</th>
                  <th className="py-4 px-6">Ngày tham gia</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {usersList.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="py-4 px-6 font-mono text-xs text-gray-400 font-medium">
                      #{usr.id}
                    </td>
                    <td className="py-4 px-6 font-semibold text-gray-800">
                      {usr.username}
                      {usr.id === user?.id && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Bạn
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-500">{usr.email}</td>
                    <td className="py-4 px-6">
                      {usr.role === "SUPER_ADMIN" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-300 shadow-sm animate-pulse">
                          <ShieldAlert className="h-3 w-3 text-purple-700" />
                          SUPER ADMIN
                        </span>
                      ) : usr.role === "ADMIN" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <ShieldAlert className="h-3 w-3" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                          STUDENT
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {new Date(usr.created_at).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(usr)}
                          disabled={!(user?.role === "SUPER_ADMIN" || (user?.role === "ADMIN" && usr.role === "STUDENT"))}
                          className={`p-1.5 rounded-lg border transition-all duration-200 ${
                            (user?.role === "SUPER_ADMIN" || (user?.role === "ADMIN" && usr.role === "STUDENT"))
                              ? "text-blue-600 border-blue-100 hover:bg-blue-50 active:scale-95 cursor-pointer"
                              : "text-gray-300 border-gray-100 cursor-not-allowed"
                          }`}
                          title="Sửa tài khoản"
                        >
                          <Edit className="h-4.5 w-4.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(usr)}
                          disabled={!(user?.role === "SUPER_ADMIN" || (user?.role === "ADMIN" && usr.role === "STUDENT")) || usr.id === user?.id}
                          className={`p-1.5 rounded-lg border transition-all duration-200 ${
                            (user?.role === "SUPER_ADMIN" || (user?.role === "ADMIN" && usr.role === "STUDENT")) && usr.id !== user?.id
                              ? "text-red-600 border-red-100 hover:bg-red-50 active:scale-95 cursor-pointer"
                              : "text-gray-300 border-gray-100 cursor-not-allowed"
                          }`}
                          title={usr.id === user?.id ? "Không thể xóa chính mình" : "Xóa tài khoản"}
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Thêm tài khoản mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 relative animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="font-extrabold text-lg text-gray-800">Tạo tài khoản mới</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {modalSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p className="font-semibold">Đã thêm người dùng thành công!</p>
                </div>
              )}

              {modalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-center gap-3 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="font-medium">{modalError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Tên tài khoản
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Nhập tên tài khoản"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="example@school.edu.vn"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Mật khẩu
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mật khẩu khởi tạo"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Vai trò hệ thống
                </label>
                {user?.role === "SUPER_ADMIN" ? (
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm bg-white"
                  >
                    <option value="STUDENT">STUDENT (Sinh viên)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Quản trị tối cao)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value="STUDENT (Sinh viên)"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm focus:outline-none cursor-not-allowed font-medium"
                  />
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || modalSuccess}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {modalLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu tài khoản"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa tài khoản */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 relative animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
              <h3 className="font-extrabold text-lg text-gray-800">Cập nhật tài khoản</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              {editModalSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p className="font-semibold">Cập nhật tài khoản thành công!</p>
                </div>
              )}

              {editModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-center gap-3 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="font-medium">{editModalError}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Tên tài khoản
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <User className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Nhập tên tài khoản"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="example@school.edu.vn"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Mật khẩu mới (để trống nếu không đổi)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Mật khẩu mới"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Vai trò hệ thống
                </label>
                {user?.role === "SUPER_ADMIN" ? (
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm bg-white"
                  >
                    <option value="STUDENT">STUDENT (Sinh viên)</option>
                    <option value="ADMIN">ADMIN (Quản trị viên)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Quản trị tối cao)</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    readOnly
                    value="STUDENT (Sinh viên)"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm focus:outline-none cursor-not-allowed font-medium"
                  />
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={editModalLoading || editModalSuccess}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {editModalLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    "Lưu thay đổi"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-gray-100 relative animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center border border-red-100">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-800">Xác nhận xóa tài khoản</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Bạn có chắc chắn muốn xóa tài khoản <span className="font-bold text-gray-800">"{deletingUser?.username}"</span> không? Hành động này không thể hoàn tác.
                </p>
              </div>

              {deleteModalSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 flex items-center justify-center gap-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p className="font-semibold">Đã xóa tài khoản thành công!</p>
                </div>
              )}

              {deleteModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 flex items-center justify-center gap-3 text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="font-medium">{deleteModalError}</p>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleteModalLoading || deleteModalSuccess}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {deleteModalLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xóa...
                    </>
                  ) : (
                    "Xác nhận xóa"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagerPage;
