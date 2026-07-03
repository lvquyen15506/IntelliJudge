import ProblemSidebar from "../components/ProblemSidebar";
import ProblemTable from "../components/ProblemTable";

function HomePage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Cột trái rộng hơn: Chứa bảng danh sách bài tập */}
      <div className="lg:col-span-3">
        <ProblemTable />
      </div>

      {/* Cột phải hẹp hơn: Chứa thanh bên phân loại Tags */}
      <div className="lg:col-span-1">
        <ProblemSidebar />
      </div>
    </div>
  );
}

export default HomePage;
