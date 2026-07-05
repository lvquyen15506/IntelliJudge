import { useState, useEffect } from "react";
import { 
  Loader2, Plus, UploadCloud, Trash2, X, AlertCircle, 
  CheckCircle, FileText, Settings, Tags, ArrowLeft, Edit 
} from "lucide-react";
import api from "../../services/api";

function AdminProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trạng thái hiển thị Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [showZipModal, setShowZipModal] = useState(false);

  // Form states (Thêm & Sửa)
  const [editingProblemId, setEditingProblemId] = useState(null);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("Dễ");
  const [timeLimit, setTimeLimit] = useState(1.0);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [tags, setTags] = useState("Cơ bản");
  const [description, setDescription] = useState("");
  const [testCases, setTestCases] = useState([{ input_data: "", output_data: "", is_hidden: false }]);
  
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualError, setManualError] = useState(null);
  const [manualSuccess, setManualSuccess] = useState(false);

  // Form Import ZIP
  const [zipFile, setZipFile] = useState(null);
  const [uploadingZip, setUploadingZip] = useState(false);
  const [zipError, setZipError] = useState(null);
  const [zipSuccess, setZipSuccess] = useState(null);

  // Fetch danh sách bài tập
  const fetchProblems = async () => {
    try {
      setLoading(true);
      const response = await api.get("/problems");
      setProblems(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách bài tập. Vui lòng kiểm tra kết nối API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProblems();
  }, []);

  // Xóa bài tập
  const handleDeleteProblem = async (problemId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài tập này và toàn bộ test cases liên quan? Action này không thể hoàn tác.")) {
      return;
    }
    try {
      await api.delete(`/problems/${problemId}`);
      fetchProblems();
      alert("Xóa bài tập thành công!");
    } catch (err) {
      console.error(err);
      alert("Xóa bài tập thất bại. Vui lòng thử lại.");
    }
  };

  // Logic click sửa bài tập
  const handleEditClick = async (prob) => {
    try {
      setLoading(true);
      const response = await api.get(`/problems/${prob.id}`);
      const data = response.data;

      // Điền sẵn thông tin cơ bản
      setTitle(data.title);
      setTimeLimit(data.time_limit);
      setMemoryLimit(data.memory_limit);
      setDescription(data.description);

      // Phân tích tách độ khó và tags
      let difficultyVal = "Dễ";
      let cleanTags = data.tags || "";
      if (cleanTags.includes("Trung bình")) {
        difficultyVal = "Trung bình";
        cleanTags = cleanTags.replace(/,\s*Trung bình|Trung bình,\s*|Trung bình/g, "");
      } else if (cleanTags.includes("Khó")) {
        difficultyVal = "Khó";
        cleanTags = cleanTags.replace(/,\s*Khó|Khó,\s*|Khó/g, "");
      } else if (cleanTags.includes("Dễ")) {
        difficultyVal = "Dễ";
        cleanTags = cleanTags.replace(/,\s*Dễ|Dễ,\s*|Dễ/g, "");
      }

      setDifficulty(difficultyVal);
      setTags(cleanTags.trim());

      // Điền test cases hiện có hoặc khởi tạo dòng trống
      setTestCases(
        data.test_cases && data.test_cases.length > 0
          ? data.test_cases.map((tc) => ({
              input_data: tc.input_data,
              output_data: tc.output_data,
              is_hidden: tc.is_hidden,
            }))
          : [{ input_data: "", output_data: "", is_hidden: false }]
      );

      setEditingProblemId(prob.id);
      setShowManualModal(true);
    } catch (err) {
      console.error(err);
      alert("Không thể tải chi tiết bài tập để sửa. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Đóng Modal thủ công & reset form
  const handleCloseManualModal = () => {
    setShowManualModal(false);
    setEditingProblemId(null);
    setTitle("");
    setDifficulty("Dễ");
    setTimeLimit(1.0);
    setMemoryLimit(256);
    setTags("Cơ bản");
    setDescription("");
    setTestCases([{ input_data: "", output_data: "", is_hidden: false }]);
    setManualError(null);
    setManualSuccess(false);
  };

  // Quản lý mảng Test Cases động
  const addTestCase = () => {
    setTestCases([...testCases, { input_data: "", output_data: "", is_hidden: false }]);
  };

  const removeTestCase = (index) => {
    if (testCases.length === 1) {
      alert("Bài tập phải có ít nhất 1 test case.");
      return;
    }
    setTestCases(testCases.filter((_, idx) => idx !== index));
  };

  const updateTestCase = (index, field, value) => {
    const updated = testCases.map((tc, idx) => {
      if (idx === index) {
        return { ...tc, [field]: value };
      }
      return tc;
    });
    setTestCases(updated);
  };

  // Gửi Form thủ công lên API
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSubmittingManual(true);
    setManualError(null);
    setManualSuccess(false);

    try {
      const finalTags = difficulty ? `${tags}, ${difficulty}` : tags;
      
      const payload = {
        title,
        description,
        time_limit: parseFloat(timeLimit),
        memory_limit: parseFloat(memoryLimit),
        tags: finalTags,
        test_cases: testCases.map((tc) => ({
          input_data: tc.input_data,
          output_data: tc.output_data,
          is_hidden: tc.is_hidden
        }))
      };

      if (editingProblemId) {
        // GỌI API PUT CẬP NHẬT TOÀN DIỆN BÀI TẬP VÀ TEST CASES
        await api.put(`/problems/${editingProblemId}`, payload);
        setManualSuccess(true);
        fetchProblems();
        
        setTimeout(() => {
          handleCloseManualModal();
        }, 1500);
      } else {
        // 1. Tạo bài tập mới
        const problemRes = await api.post("/problems", {
          title,
          description,
          time_limit: parseFloat(timeLimit),
          memory_limit: parseFloat(memoryLimit),
          tags: finalTags
        });

        const newProblemId = problemRes.data.id;

        // 2. Thêm danh sách test cases
        await Promise.all(
          testCases.map((tc) => 
            api.post(`/problems/${newProblemId}/testcases`, {
              input_data: tc.input_data,
              output_data: tc.output_data,
              is_hidden: tc.is_hidden
            })
          )
        );

        setManualSuccess(true);
        fetchProblems();
        
        setTimeout(() => {
          handleCloseManualModal();
        }, 1500);
      }

    } catch (err) {
      console.error(err);
      setManualError(err.response?.data?.detail || "Đã xảy ra lỗi khi lưu thông tin bài tập.");
    } finally {
      setSubmittingManual(false);
    }
  };

  // Submit file ZIP
  const handleZipSubmit = async (e) => {
    e.preventDefault();
    if (!zipFile) {
      setZipError("Vui lòng chọn 1 file ZIP trước khi tải lên.");
      return;
    }
    
    setUploadingZip(true);
    setZipError(null);
    setZipSuccess(null);

    const formData = new FormData();
    formData.append("file", zipFile);

    try {
      const response = await api.post("/problems/import-zip", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      setZipSuccess(response.data.message || "Import file ZIP thành công!");
      setZipFile(null);
      fetchProblems();
      
      setTimeout(() => {
        setShowZipModal(false);
        setZipSuccess(null);
      }, 1800);
    } catch (err) {
      console.error(err);
      setZipError(err.response?.data?.detail || "Nhập dữ liệu thất bại. Hãy chắc chắn cấu trúc ZIP đúng chuẩn.");
    } finally {
      setUploadingZip(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-500" />
            Quản trị kho Bài tập
          </h2>
          <p className="text-slate-500 text-sm">
            Quản lý, thêm thủ công hoặc import hàng loạt bài tập & test cases thông qua file nén ZIP.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManualModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all duration-205 flex items-center gap-2 active:scale-95 shadow-sm shadow-blue-500/10"
          >
            <Plus className="h-4 w-4" />
            Thêm Bài Mới
          </button>
          
          <button
            onClick={() => setShowZipModal(true)}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all duration-205 flex items-center gap-2 active:scale-95 shadow-sm"
          >
            <UploadCloud className="h-4 w-4" />
            Import ZIP
          </button>
        </div>
      </div>

      {/* Danh sách bài tập dưới dạng Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading && problems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="font-semibold text-sm">Đang tải danh sách quản trị...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-red-50 text-red-700">
            <p className="font-bold">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-550 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 pl-6 w-24">ID</th>
                  <th className="py-4">Tiêu đề</th>
                  <th className="py-4">Thời gian</th>
                  <th className="py-4">Bộ nhớ</th>
                  <th className="py-4">Chủ đề (Tags)</th>
                  <th className="py-4 text-center pr-6 w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-105 text-sm">
                {problems.map((prob) => {
                  const displayId = `PR${String(prob.id).padStart(7, "0")}`;
                  return (
                    <tr key={prob.id} className="hover:bg-slate-50/45 transition-colors duration-150">
                      <td className="py-4 pl-6 font-mono text-xs font-semibold text-slate-400">
                        {displayId}
                      </td>
                      <td className="py-4 font-bold text-slate-700">
                        {prob.title}
                      </td>
                      <td className="py-4 font-mono text-xs text-slate-650">
                        {prob.time_limit} s
                      </td>
                      <td className="py-4 font-mono text-xs text-slate-650">
                        {prob.memory_limit} MB
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1 text-slate-600 text-xs font-medium">
                          <Tags className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {prob.tags || "Cơ bản"}
                        </span>
                      </td>
                      <td className="py-4 text-center pr-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditClick(prob)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all duration-150 active:scale-95"
                            title="Sửa bài tập"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteProblem(prob.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-150 active:scale-95"
                            title="Xóa bài tập"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {problems.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-sm">Không tìm thấy bài tập nào</p>
                <p className="text-xs text-slate-400 mt-1">Hệ thống chưa có đề bài. Hãy thêm mới đề bài để bắt đầu.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: THÊM & SỬA BÀI TẬP */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                {editingProblemId ? <Edit className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
                {editingProblemId ? "Cập nhật bài tập" : "Thêm bài tập thủ công"}
              </h3>
              <button 
                onClick={handleCloseManualModal}
                className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleManualSubmit} className="p-6 space-y-6">
              
              {/* Alert thông báo */}
              {manualError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{manualError}</span>
                </div>
              )}
              {manualSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  <span>Lưu thông tin bài tập thành công!</span>
                </div>
              )}

              {/* Hàng 1: Tiêu đề & Độ khó */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-550 block">Tiêu đề bài tập <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tính tổng A và B"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-550 block">Mức độ độ khó</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Dễ">Dễ</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Khó">Khó</option>
                  </select>
                </div>
              </div>

              {/* Hàng 2: Limits & Tags */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-550 block">Time Limit (giây) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-550 block">Memory Limit (MB) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="4"
                    required
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-550 block">Tags (Cách nhau bằng dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="VD: Cơ bản, Toán học"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Hàng 3: Mô tả Markdown */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-550 block">Mô tả bài toán (Hỗ trợ Markdown) <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows="6"
                  placeholder="Nhập đề bài chi tiết..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              {/* Hàng 4: Danh sách Test Cases */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-extrabold text-slate-700 uppercase tracking-wide">Danh sách Test Cases</h4>
                  <button
                    type="button"
                    onClick={addTestCase}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 active:scale-95"
                  >
                    + Thêm dòng test
                  </button>
                </div>

                <div className="space-y-4">
                  {testCases.map((tc, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-3 relative group"
                    >
                      {/* Tiêu đề dòng Test Case */}
                      <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                        <span>TEST CASE #{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeTestCase(index)}
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                          title="Xóa dòng test case"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Đầu vào và đầu ra */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Input</span>
                          <textarea
                            rows="2"
                            required
                            placeholder="Nhập dữ liệu vào stdin..."
                            value={tc.input_data}
                            onChange={(e) => updateTestCase(index, "input_data", e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Expected Output</span>
                          <textarea
                            rows="2"
                            required
                            placeholder="Nhập dữ liệu mong đợi..."
                            value={tc.output_data}
                            onChange={(e) => updateTestCase(index, "output_data", e.target.value)}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Ẩn testcase */}
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-550 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tc.is_hidden}
                          onChange={(e) => updateTestCase(index, "is_hidden", e.target.checked)}
                          className="rounded border-slate-200 text-blue-600 focus:ring-blue-500"
                        />
                        Ẩn test case này (Chỉ dùng để chấm điểm, không hiển thị trong mô tả ví dụ mẫu)
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hàng 5: Submit buttons */}
              <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-4 bg-white sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={handleCloseManualModal}
                  className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-5 py-2 rounded-xl text-sm transition-all duration-200 active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-xl text-sm transition-all duration-205 flex items-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {submittingManual ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    editingProblemId ? "Cập nhật bài tập" : "Lưu bài tập"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT ZIP */}
      {showZipModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-blue-600" />
                Import ZIP bài tập
              </h3>
              <button 
                onClick={() => setShowZipModal(false)}
                className="p-1.5 hover:bg-slate-100 text-slate-450 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleZipSubmit} className="p-6 space-y-6">
              
              {zipError && (
                <div className="bg-red-50 border border-red-200 text-red-750 p-4 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{zipError}</span>
                </div>
              )}
              
              {zipSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-755 p-4 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  <span>{zipSuccess}</span>
                </div>
              )}

              {/* Drag/Drop Uploader mock */}
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-6 text-center transition-all bg-slate-50/50 relative">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <UploadCloud className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                
                {zipFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-700 truncate max-w-xs mx-auto">{zipFile.name}</p>
                    <p className="text-[10px] text-slate-455 font-mono">{(zipFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-600">Chọn hoặc kéo thả file ZIP đề bài</p>
                    <p className="text-[10px] text-slate-400 mt-1">Cấu trúc chứa problem.json và thư mục tests/</p>
                  </div>
                )}
              </div>

              {/* Hướng dẫn ZIP format */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-205 text-[10px] text-slate-550 space-y-1 leading-relaxed">
                <span className="font-extrabold uppercase text-slate-750 block mb-1">Cấu trúc ZIP chuẩn:</span>
                <div>• root/</div>
                <div className="pl-3 font-semibold text-slate-700">• problem.json <span className="text-slate-400 font-normal">(chứa title, description, time_limit, memory_limit, tags)</span></div>
                <div className="pl-3">• tests/</div>
                <div className="pl-6 font-semibold text-slate-700">• 1.in, 1.out <span className="text-slate-455 font-normal">(Cặp testcase số 1)</span></div>
                <div className="pl-6 font-semibold text-slate-700">• 2_hidden.in, 2_hidden.out <span className="text-slate-455 font-normal">(Cặp testcase ẩn số 2)</span></div>
              </div>

              {/* Submit */}
              <div className="flex justify-end items-center gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowZipModal(false)}
                  className="bg-white border border-slate-205 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-200 active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={uploadingZip}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all duration-205 flex items-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  {uploadingZip ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải lên...
                    </>
                  ) : (
                    "Bắt đầu Import"
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminProblemsPage;
