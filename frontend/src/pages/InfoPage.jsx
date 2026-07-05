import { useState } from "react";
import { Terminal, HelpCircle, Check, Copy, HelpCircle as HelpIcon, Sparkles } from "lucide-react";

function InfoPage() {
  const [copiedKey, setCopiedKey] = useState(null);

  const compilers = [
    {
      lang: "C++ (GCC 13)",
      cmd: "/usr/bin/g++ -O2 -w -fmax-errors=3 -std=c++20 {src_path} -lm -o {exe_path}",
      key: "cpp",
      desc: "Biên dịch tối ưu hóa O2 tốc độ cao, hỗ trợ toàn bộ tiêu chuẩn C++20 mới nhất."
    },
    {
      lang: "Python 3 (3.12)",
      cmd: "/usr/bin/python3 -m py_compile {src_path}",
      key: "py",
      desc: "Kiểm tra cú pháp tĩnh trước khi thực thi để hạn chế lỗi runtime."
    },
    {
      lang: "Java (Temurin 21)",
      cmd: "/usr/bin/javac {src_path} -d {exe_dir}",
      key: "java",
      desc: "Biên dịch bytecode chạy trên môi trường JVM JDK 21 LTS ổn định."
    }
  ];

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      
      {/* Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-blue-600" />
          Thông tin hệ thống & Trình chấm
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Tìm hiểu thông số kỹ thuật, cấu hình compiler của Sandbox Judge0 và ý nghĩa các trạng thái chấm bài.
        </p>
      </div>

      {/* Grid Layout 2 Cột */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CỘT TRÁI: Compiler & Cấu hình biên dịch */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Terminal className="h-5 w-5 text-blue-600" />
            Cấu hình Biên dịch & Thông số
          </h3>
          
          <div className="space-y-6">
            {compilers.map((c) => (
              <div key={c.key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">{c.lang}</span>
                  <button
                    onClick={() => handleCopy(c.cmd, c.key)}
                    className="text-xs flex items-center gap-1 text-slate-400 hover:text-blue-650 transition-colors"
                  >
                    {copiedKey === c.key ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
                
                <div className="relative group">
                  <pre className="bg-slate-900 text-slate-350 text-xs font-mono p-3.5 rounded-xl overflow-x-auto select-all leading-relaxed whitespace-pre-wrap break-all border border-slate-800">
                    <code>{c.cmd}</code>
                  </pre>
                </div>
                <p className="text-xs text-slate-400 font-semibold italic">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CỘT PHẢI: Giải thích kết quả chấm bài */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Giải thích kết quả chấm bài
          </h3>

          <div className="space-y-4">
            
            {/* Trạng thái 1 */}
            <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all duration-150">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0 w-32 justify-center">
                Pending / Proc.
              </span>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Đang chờ chấm</h4>
                <p className="text-xs text-slate-450 mt-0.5 leading-relaxed">
                  Mã nguồn của bạn đã gửi thành công và đang nằm trong hàng đợi hoặc đang được biên dịch/thực thi bởi sandbox bảo mật.
                </p>
              </div>
            </div>

            {/* Trạng thái 2 */}
            <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all duration-150">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-250 shrink-0 w-32 justify-center">
                Accepted (AC)
              </span>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Bài làm chính xác</h4>
                <p className="text-xs text-slate-455 mt-0.5 leading-relaxed text-emerald-800">
                  Lời giải của bạn chạy ra kết quả khớp 100% với toàn bộ hệ thống test case kiểm tra cả về đầu ra, giới hạn thời gian và giới hạn bộ nhớ.
                </p>
              </div>
            </div>

            {/* Trạng thái 3 */}
            <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all duration-150">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-750 border border-red-200 shrink-0 w-32 justify-center">
                Wrong Answer (WA)
              </span>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Sai kết quả (WA)</h4>
                <p className="text-xs text-slate-450 mt-0.5 leading-relaxed">
                  Chương trình chạy bình thường không lỗi nhưng kết quả đầu ra (stdout) không khớp với kết quả mong đợi của đề bài ở một hoặc nhiều test case.
                </p>
              </div>
            </div>

            {/* Trạng thái 4 */}
            <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all duration-150">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-750 border border-red-200 shrink-0 w-32 justify-center">
                Compile Error (CE)
              </span>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Lỗi biên dịch (CE)</h4>
                <p className="text-xs text-slate-450 mt-0.5 leading-relaxed">
                  Compiler (g++ hoặc javac) phát hiện lỗi cú pháp trong mã nguồn của bạn và không thể tạo file thực thi. Hãy kiểm tra lại log lỗi biên dịch.
                </p>
              </div>
            </div>

            {/* Trạng thái 5 */}
            <div className="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all duration-150">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-755 border border-red-205 shrink-0 w-32 justify-center">
                TLE / MLE
              </span>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Quá giới hạn bộ nhớ/thời gian</h4>
                <p className="text-xs text-slate-450 mt-0.5 leading-relaxed">
                  Chương trình thực thi bị chặn do sử dụng vượt quá lượng RAM cho phép hoặc chạy quá thời gian (CPU time limit) định nghĩa sẵn trong đề bài.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

export default InfoPage;
