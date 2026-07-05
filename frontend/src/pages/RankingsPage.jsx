import { useState, useEffect } from "react";
import { Loader2, Trophy, Award, Search, Percent, RefreshCw } from "lucide-react";
import api from "../services/api";

function RankingsPage() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dữ liệu bảng xếp hạng
  const fetchRankings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/rankings");
      setRankings(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Không thể kết nối đến máy chủ API để lấy bảng xếp hạng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  // Tính tỷ lệ thắng an toàn chống division by zero
  const getWinRate = (solved, total) => {
    if (!total || total <= 0) return "0.0";
    return ((solved / total) * 100).toFixed(1);
  };

  if (loading && rankings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-slate-500">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        <p className="font-semibold text-sm">Đang tải bảng xếp hạng Coder...</p>
      </div>
    );
  }

  if (error && rankings.length === 0) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-red-50 border border-red-200 rounded-2xl text-center text-red-700">
        <Award className="h-12 w-12 text-red-500 mx-auto mb-4 animate-bounce" />
        <h3 className="text-lg font-bold mb-2">Đã xảy ra lỗi</h3>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  // Lấy dữ liệu cho biểu đồ Top 5 podium
  // Sắp xếp thứ tự hiển thị bục vinh quang: [Hạng 4, Hạng 2, Hạng 1, Hạng 3, Hạng 5]
  const top5 = rankings.slice(0, 5);
  const podiumOrder = [];
  if (top5[3]) podiumOrder.push({ item: top5[3], rank: 4, height: "h-[45%]", color: "bg-slate-200/50 border-slate-300/40 text-slate-600" });
  if (top5[1]) podiumOrder.push({ item: top5[1], rank: 2, height: "h-[70%]", color: "bg-slate-100 border-slate-350 text-slate-700 shadow-slate-200" });
  if (top5[0]) podiumOrder.push({ item: top5[0], rank: 1, height: "h-[90%]", color: "bg-yellow-50/60 border-yellow-350 text-yellow-800 shadow-yellow-100" });
  if (top5[2]) podiumOrder.push({ item: top5[2], rank: 3, height: "h-[55%]", color: "bg-orange-50/50 border-orange-300 text-orange-700 shadow-orange-100" });
  if (top5[4]) podiumOrder.push({ item: top5[4], rank: 5, height: "h-[35%]", color: "bg-slate-200/40 border-slate-250 text-slate-500" });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Bảng xếp hạng Coder
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Bảng vàng vinh danh những tài năng lập trình xuất sắc nhất hệ thống IntelliJudge.
          </p>
        </div>
        <button
          onClick={fetchRankings}
          disabled={loading}
          className="bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-all duration-200 flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          Làm mới bảng
        </button>
      </div>

      {/* PODIUM CHART: Top 5 */}
      {top5.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-6 text-center">
            Top 5 Lập trình viên xuất sắc nhất
          </h3>
          
          <div className="flex items-end justify-center gap-3 sm:gap-6 h-64 border-b border-slate-100 pb-2">
            {podiumOrder.map(({ item, rank, height, color }) => (
              <div 
                key={item.id} 
                className={`w-24 sm:w-28 flex flex-col justify-end items-center text-center rounded-t-2xl border-t-4 border-x border-slate-100/50 shadow-sm transition-all duration-300 hover:-translate-y-1.5 ${height} ${color}`}
              >
                {/* Username */}
                <div className="px-2 font-bold text-xs sm:text-sm truncate w-full mb-1">
                  {item.user.username}
                </div>
                
                {/* Solved Count */}
                <div className="text-[10px] sm:text-xs font-semibold opacity-85 mb-4">
                  {item.solved_count} bài đúng
                </div>

                {/* Rank Badge inside Podium block */}
                <div className="bg-white/90 border border-current rounded-full w-7 h-7 flex items-center justify-center font-black text-xs shadow-sm mb-4">
                  {rank === 1 ? "👑" : rank}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RANKINGS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="py-4 pl-6 w-20">Hạng</th>
                <th className="py-4">Tài khoản</th>
                <th className="py-4 text-center">Điểm (Score)</th>
                <th className="py-4 text-center">Bài đúng (AC)</th>
                <th className="py-4 text-center">Đã nộp</th>
                <th className="py-4 text-center pr-6">Tỉ lệ đạt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {rankings.map((r, index) => {
                const rank = index + 1;
                const score = r.solved_count * 10; // 10 điểm cho mỗi bài đúng
                const winRate = getWinRate(r.solved_count, r.total_submissions);
                
                // Class nổi bật cho Top 1, 2, 3
                let rowClass = "hover:bg-slate-50/50 transition-colors duration-150";
                let rankBadge = (
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold text-slate-400 bg-slate-100">
                    {rank}
                  </span>
                );

                if (rank === 1) {
                  rowClass = "bg-yellow-50/20 hover:bg-yellow-55/30 transition-colors duration-150 border-l-4 border-yellow-400 pl-[18px]";
                  rankBadge = (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-800 border border-yellow-250 shadow-sm shadow-yellow-200/55 font-black text-xs animate-bounce">
                      🥇
                    </span>
                  );
                } else if (rank === 2) {
                  rowClass = "bg-slate-50/40 hover:bg-slate-100/50 transition-colors duration-150 border-l-4 border-slate-350 pl-[18px]";
                  rankBadge = (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center bg-slate-100 text-slate-800 border border-slate-200 shadow-sm font-black text-xs">
                      🥈
                    </span>
                  );
                } else if (rank === 3) {
                  rowClass = "bg-orange-50/20 hover:bg-orange-100/30 transition-colors duration-150 border-l-4 border-orange-300 pl-[18px]";
                  rankBadge = (
                    <span className="w-7 h-7 rounded-full flex items-center justify-center bg-orange-100 text-orange-850 border border-orange-200 shadow-sm font-black text-xs">
                      🥉
                    </span>
                  );
                }

                return (
                  <tr key={r.id} className={rowClass}>
                    {/* Hạng */}
                    <td className="py-4 pl-6">
                      {rankBadge}
                    </td>
                    {/* Tài khoản */}
                    <td className="py-4 font-bold text-slate-800">
                      {r.user.username}
                      {r.user.role === "SUPER_ADMIN" && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-700 uppercase">
                          S.Admin
                        </span>
                      )}
                    </td>
                    {/* Điểm */}
                    <td className="py-4 text-center font-mono font-bold text-blue-600">
                      {score}
                    </td>
                    {/* Bài đúng */}
                    <td className="py-4 text-center font-mono font-bold text-emerald-650">
                      {r.solved_count}
                    </td>
                    {/* Đã nộp */}
                    <td className="py-4 text-center font-mono text-slate-500">
                      {r.total_submissions}
                    </td>
                    {/* Tỉ lệ thắng */}
                    <td className="py-4 text-center pr-6 font-mono font-semibold text-slate-650">
                      <span className="inline-flex items-center gap-0.5">
                        {winRate}
                        <Percent className="h-3 w-3 text-slate-400" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rankings.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <Award className="h-10 w-10 text-slate-350 mx-auto mb-2" />
              <p className="font-semibold text-sm">Chưa có bảng xếp hạng</p>
              <p className="text-xs text-slate-400 mt-1">Bảng xếp hạng sẽ tự động cập nhật ngay khi có bài nộp Accepted đầu tiên.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default RankingsPage;
