/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Màu xanh dương chủ đạo như hình ảnh yêu cầu
        primary: {
          light: "#3b82f6",
          DEFAULT: "#1d4ed8",
          dark: "#1e3a8a",
        }
      }
    },
  },
  plugins: [],
}
