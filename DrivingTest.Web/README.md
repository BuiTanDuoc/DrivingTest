# 🚗 Thi Bằng Lái B / B-Class Driving Test Prep

**🇻🇳 Tiếng Việt** | [🇬🇧 English](#-english)

Website học và thi thử bằng lái xe hạng B: **React + Vite**, giao diện **sáng/tối**, **song ngữ Anh - Việt**.
Kết nối với backend `DrivingTest.Backend` (.NET 10).

## 🇻🇳 Tiếng Việt

### ✨ Tính năng

| Trang | Đường dẫn | Mô tả |
|---|---|---|
| Trang chủ | `/` | Banner animation, thống kê (câu hỏi, lượt thi, người dùng) với hiệu ứng đếm số, chủ đề ôn tập, format thi (lấy từ backend) |
| Học lý thuyết | `/hoc` | Lọc theo chủ đề, tìm kiếm (không phân biệt dấu), phân trang; chọn đáp án → đúng/sai + giải thích; đánh dấu câu để ôn lại; ôn lại câu làm sai; câu điểm liệt viền đỏ |
| Thi thử | `/thi` | Đề ngẫu nhiên, đếm ngược theo giờ server, xem từng câu hoặc dạng lưới, sidebar điều hướng, đánh dấu nghi ngờ, autosave đáp án, tự động nộp khi hết giờ, phím tắt |
| Kết quả | `/ket-qua/:id` | Điểm, đạt/trượt (kèm lý do), thời gian, xem lại từng câu kèm giải thích, lọc câu sai |
| Lịch sử & thống kê | `/lich-su` | Tổng lượt thi, tỷ lệ đạt, điểm trung bình, tiến độ học, kết quả theo chủ đề, lịch sử thi |
| Tài khoản | `/dang-nhap`, `/dang-ky` | Đăng ký / đăng nhập (JWT + refresh token tự động) |
| Hồ sơ | `/tai-khoan` | Xem và đổi tên hiển thị, đổi mật khẩu (các thiết bị khác bị đăng xuất) |
| Quản trị (Admin) | `/quan-tri`, `/quan-tri/cau-hoi/moi`, `/quan-tri/cau-hoi/:id` | Danh sách, tìm kiếm, lọc; thêm / sửa / xóa câu hỏi song ngữ; chỉ tài khoản Admin |

> **Lưu ý:** backend yêu cầu đăng nhập cho thi thử, kết quả và lịch sử. Học lý thuyết dùng được khi chưa đăng nhập.

### 🚀 Chạy dự án

```bash
# 1. Chạy backend (xem README của DrivingTest.Backend) → http://localhost:5080
# 2. Chạy web
npm install
npm run dev          # http://localhost:5173 (tự proxy /api sang backend)
npm test             # chạy test (giả lập API)
npm run build        # build production vào dist/
```

- Dev: Vite proxy `/api` → `http://localhost:5080` (đổi bằng biến `VITE_PROXY_TARGET`).
- Production: đặt `VITE_API_URL=https://api.example.com` khi build, và thêm origin của web vào `Cors:AllowedOrigins` của backend.

### 📁 Cấu trúc

```text
src/
├── api/          # client (JWT, tự refresh, ApiError) và các hàm gọi endpoint
├── components/   # Layout, QuestionCard, Pagination, Feedback...
├── context/      # Auth, Theme, Toast
├── hooks/        # useAsync, useCountdown, useCountUp, useDebounce
├── i18n/         # vi.js, en.js
├── pages/        # Home, Learn, Exam, Result, History, AuthForm, NotFound
├── styles/       # global.css (biến CSS cho sáng/tối)
└── utils/        # format ngày giờ, icon chủ đề
```

### 🧩 Ghi chú thiết kế

- **Phân quyền**: menu và route `/quan-tri` chỉ hiện với `role = Admin` (lấy từ backend); backend vẫn kiểm tra quyền ở mọi endpoint `/api/admin`.
- **Xóa câu hỏi** đã có trong lịch sử thi chỉ ẩn câu đó, không xóa hẳn (backend quyết định và web báo rõ cho admin).
- **Đồng hồ thi** tính theo mốc `expiresAt` của server và độ lệch giờ server-client, nên không trôi khi tab bị ngủ hoặc máy sai giờ.
- **Autosave** đáp án qua hàng đợi tuần tự; lỗi thì hoàn tác và báo người dùng. Nộp bài chờ hàng đợi xong.
- **F5 giữa chừng**: vào lại `/thi` sẽ có nút "Tiếp tục bài đang làm".
- Ngôn ngữ gửi lên backend qua header `Accept-Language`; nội dung câu hỏi đổi theo ngôn ngữ đang chọn.

## 🇬🇧 English

A web app for studying theory and taking mock exams for the Vietnamese **class B driving license**, built with
**React + Vite**, with **light/dark mode** and **English / Vietnamese** languages. It talks to the `DrivingTest.Backend` (.NET 10) API.

### ✨ Features

| Page | Route | Description |
|---|---|---|
| Home | `/` | Animated banner, count-up stats, study topics, exam format (served by the backend) |
| Study | `/hoc` | Topic filter, accent-insensitive search, pagination; instant right/wrong + explanation; bookmarks; review missed questions; critical questions have a red border |
| Mock exam | `/thi` | Random exam, server-synced countdown, single or grid view, navigator sidebar, flag doubtful questions, answer autosave, auto-submit on timeout, keyboard shortcuts |
| Result | `/ket-qua/:id` | Score, pass/fail with the reason, time taken, per-question review, wrong-only filter |
| History & stats | `/lich-su` | Attempts, pass rate, average score, learning progress, per-topic results, exam history |
| Auth | `/dang-nhap`, `/dang-ky` | Sign up / sign in (JWT with automatic refresh) |
| Profile | `/tai-khoan` | Edit display name, change password (other devices are signed out) |
| Admin | `/quan-tri`, `/quan-tri/cau-hoi/moi`, `/quan-tri/cau-hoi/:id` | List, search and filter; add / edit / delete bilingual questions; Admin accounts only |

> **Note:** the backend requires sign-in for mock exams, results and history. Studying works without an account.

### 🚀 Getting started

```bash
npm install
npm run dev      # http://localhost:5173 (proxies /api to the backend on :5080)
npm test
npm run build
```

For production, build with `VITE_API_URL=https://api.example.com` and add the web origin to the backend's `Cors:AllowedOrigins`.

### ⚠️ Disclaimer

Question content and exam rules are for reference only. Always verify against the latest official documents.
