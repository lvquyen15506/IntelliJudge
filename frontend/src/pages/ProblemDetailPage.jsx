import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Play, Loader2, Clock, HardDrive, AlertCircle, ArrowLeft, Send } from "lucide-react";
import api from "../services/api";

const languageTemplates = {
  cpp: `#include <iostream>
using namespace std;

int main() {
    // Viết mã nguồn C++ của bạn tại đây
    int a, b;
    if (cin >> a >> b) {
        cout << (a + b) << endl;
    }
    return 0;
}
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Viết mã nguồn Java của bạn tại đây
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println(a + b);
        }
    }
}
`,
  python: `# Viết mã nguồn Python của bạn tại đây
import sys

def main():
    # Đọc dữ liệu từ stdin
    input_data = sys.stdin.read().split()
    if len(input_data) >= 2:
        a = int(input_data[0])
        b = int(input_data[1])
        print(a + b)

if __name__ == "__main__":
    main()
`
};

function ProblemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [language, setLanguage] = useState("cpp");
  const [theme, setTheme] = useState("vs-dark");
  const [codes, setCodes] = useState({
    cpp: languageTemplates.cpp,
    java: languageTemplates.java,
    python: languageTemplates.python,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Fetch dữ liệu chi tiết bài tập
  useEffect(() => {
    let isMounted = true;
    const fetchProblemDetail = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/problems/${id}`);
        if (isMounted) {
          setProblem(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("Không thể tải thông tin bài tập này. Vui lòng kiểm tra lại kết nối hoặc ID bài tập.");
          console.error(err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchProblemDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Cập nhật mã nguồn khi người dùng gõ
  const handleEditorChange = (value) => {
    setCodes((prev) => ({
      ...prev,
      [language]: value || "",
    }));
  };

  // Thay đổi ngôn ngữ lập trình
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  // Nộp bài
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const sourceCode = codes[language];
      
      // Gửi cả 'code' (theo database schema) và 'source_code' (đáp ứng yêu cầu đề bài) để đảm bảo an toàn tuyệt đối
      await api.post("/submissions", {
        problem_id: parseInt(id),
        language: language,
        code: sourceCode,
        source_code: sourceCode,
      });

      // Điều hướng về trang lịch sử nộp bài
      navigate("/submissions");
    } catch (err) {
      console.error(err);
      setSubmitError(
        err.response?.data?.detail || 
        "Gửi bài làm thất bại. Vui lòng thử lại sau hoặc liên hệ quản trị viên."
      );
      setSubmitting(false);
    }
  };

  // Render Badge màu cho độ khó
  const getDifficultyBadge = (difficulty) => {
    const diff = difficulty || "Dễ";
    switch (diff) {
      case "Dễ":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-emerald-700 border border-green-200">
            Dễ
          </span>
        );
      case "Trung bình":
      case "TB":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Trung bình
          </span>
        );
      case "Khó":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            Khó
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
            {diff}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="font-semibold text-sm">Đang tải đề bài & môi trường làm bài...</p>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-red-50 border border-red-200 rounded-2xl text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-800 mb-2">Đã xảy ra lỗi</h3>
        <p className="text-sm text-red-700 mb-6">{error || "Bài tập không tồn tại."}</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-white text-slate-700 hover:bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm text-sm font-semibold transition-all duration-200 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách bài tập
        </Link>
      </div>
    );
  }

  // Lọc lấy các test case công khai (sample input/output)
  const sampleTestCases = problem.test_cases?.filter((tc) => !tc.is_hidden) || [];

  return (
    <div className="h-[calc(100vh-64px)] grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50">
      
      {/* CỘT TRÁI: Thông tin đề bài (Scroll độc lập) */}
      <div className="overflow-y-auto bg-white p-6 md:p-8 flex flex-col h-full">
        
        {/* Nút quay lại */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors duration-150 mb-5 group w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Quay lại trang chủ
        </Link>

        {/* Tên đề bài */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-tight mb-4">
          {problem.title}
        </h1>

        {/* Khối Badge thông tin */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {getDifficultyBadge(problem.difficulty)}
          
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Giới hạn thời gian: {(problem.time_limit * 1000).toFixed(0)}ms
          </span>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
            <HardDrive className="h-3.5 w-3.5 text-slate-400" />
            Giới hạn bộ nhớ: {problem.memory_limit}MB
          </span>
        </div>

        {/* Nội dung mô tả đề bài */}
        <div className="prose max-w-none text-slate-600 leading-relaxed font-sans text-sm md:text-base whitespace-pre-line mb-8 border-t border-slate-100 pt-6">
          {problem.description}
        </div>

        {/* Khu vực Ví dụ mẫu (Sample Input / Output) */}
        {sampleTestCases.length > 0 && (
          <div className="mt-auto pt-6 border-t border-slate-100">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700 mb-4">
              Ví dụ mẫu
            </h3>
            
            <div className="space-y-6">
              {sampleTestCases.map((tc, index) => (
                <div key={tc.id} className="space-y-3">
                  <div className="text-xs font-bold text-slate-500">Ví dụ {index + 1}:</div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Input mẫu */}
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-1">Input mẫu:</span>
                      <div className="bg-slate-800 text-slate-300 font-mono text-xs md:text-sm p-3 rounded-lg overflow-x-auto whitespace-pre">
                        {tc.input_data}
                      </div>
                    </div>

                    {/* Output mẫu */}
                    <div>
                      <span className="text-xs font-semibold text-slate-400 block mb-1">Output mẫu:</span>
                      <div className="bg-slate-800 text-slate-300 font-mono text-xs md:text-sm p-3 rounded-lg overflow-x-auto whitespace-pre">
                        {tc.output_data}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CỘT PHẢI: Khu vực Code Editor (Scroll độc lập) */}
      <div className="overflow-y-auto bg-slate-50 flex flex-col h-full">
        
        {/* Top bar của Editor: Selector ngôn ngữ & giao diện */}
        <div className="h-[60px] min-h-[60px] bg-white border-b border-slate-200 px-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            {/* Chọn ngôn ngữ */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Ngôn ngữ:</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 cursor-pointer"
              >
                <option value="cpp">C++ (GCC)</option>
                <option value="java">Java (OpenJDK)</option>
                <option value="python">Python 3</option>
              </select>
            </div>

            {/* Chọn Theme */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Giao diện:</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 cursor-pointer"
              >
                <option value="vs-dark">VS Dark</option>
                <option value="light">VS Light</option>
              </select>
            </div>
          </div>

          <div className="text-[10px] sm:text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
            Auto Save
          </div>
        </div>

        {/* Vùng chứa Editor và Footer dưới cùng */}
        <div className="flex-grow flex flex-col h-[calc(100%-60px)]">
          {/* Editor Monaco */}
          <div className="flex-grow overflow-hidden bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={language === "cpp" ? "cpp" : language === "java" ? "java" : "python"}
              theme={theme}
              value={codes[language]}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                tabSize: 4,
                cursorBlinking: "smooth",
                smoothScrolling: true,
              }}
            />
          </div>

          {/* Footer làm bài chứa nút nộp */}
          <div className="h-[56px] min-h-[56px] bg-white border-t border-slate-200 px-4 flex items-center justify-between">
            {submitError ? (
              <div className="text-xs text-red-600 font-semibold flex items-center gap-1.5 max-w-[55%] truncate">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span className="truncate">{submitError}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                Nhấn <b>Nộp bài</b> để chạy hệ thống chấm test.
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all duration-200 flex items-center gap-2 shadow-md shadow-blue-500/10 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang chấm bài...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Nộp bài làm
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ProblemDetailPage;
