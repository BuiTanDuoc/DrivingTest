# DrivingTest Backend

API cho website học và thi thử bằng lái xe hạng B — .NET 10, EF Core, SQL Server.

## Chạy nhanh

```bash
docker compose up -d                       # SQL Server
dotnet run --project src/DrivingTest.Api   # http://localhost:5080
```

Ở môi trường Development, ứng dụng tự tạo database, seed 6 chủ đề và import bộ 600 câu hỏi
(`src/DrivingTest.Infrastructure/Seed/questions.json`). Cấu hình đề thi cho dev (6 câu) nằm trong
`appsettings.Development.json`.

- Swagger UI: `http://localhost:5080/swagger` (tự mở khi chạy profile `http` trong Visual Studio / `dotnet run --launch-profile http`)
- OpenAPI: `http://localhost:5080/openapi/v1.json`
- Health: `http://localhost:5080/health`

## Tài khoản Admin

Admin đầu tiên được tạo khi khởi động (nếu `Database:AutoInitialize` bật) từ cấu hình:

```json
"Admin": { "Email": "admin@example.com", "Password": "…", "DisplayName": "Administrator" }
```

Dev đã có sẵn `admin@drivingtest.local` / `Admin@12345` trong `appsettings.Development.json` (**chỉ dùng cho dev**).
Production đặt bằng biến môi trường `Admin__Email`, `Admin__Password`. Nếu email đã tồn tại, hệ thống chỉ nâng quyền Admin, không đổi mật khẩu.
Token chứa claim `role`, nên người vừa được nâng quyền cần đăng nhập lại.

Xóa câu hỏi: câu chưa xuất hiện trong bài thi nào sẽ bị xóa hẳn; câu đã có trong lịch sử thi chỉ bị **ẩn** (`IsActive = false`)
để không làm hỏng kết quả cũ. Đáp án đã được chọn trong lịch sử thi không xóa được (sửa nội dung thì được).

> Cột `Role` là cột mới của bảng `Users`. Nếu bạn đã tạo database trước đó bằng `EnsureCreated`, hãy xóa database dev để tạo lại
> hoặc tạo migration.

## Migration (khuyến nghị cho production)

```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add Initial -p src/DrivingTest.Infrastructure -s src/DrivingTest.Api
dotnet ef database update          -p src/DrivingTest.Infrastructure -s src/DrivingTest.Api
```

Khi đã có migration, `Database:AutoInitialize` sẽ chạy `Migrate` thay vì `EnsureCreated`.

## Ngân hàng câu hỏi (600 câu)

Repo đã kèm sẵn bộ **600 câu hỏi sát hạch lái xe cơ giới đường bộ** (Cục CSGT, áp dụng từ 2025):

- `src/DrivingTest.Infrastructure/Seed/questions.json` — file seed được import khi khởi động.
- `tools/questions-600.csv` — cùng dữ liệu ở dạng CSV để chỉnh sửa (định dạng của `tools/csv-to-seed.mjs`).
- `../DrivingTest.Web/public/images/questions/NNN.webp` — 318 hình (biển báo, sa hình…); `imageUrl` = `/images/questions/NNN.webp`.
- `tools/pdf-to-seed.py` — script trích xuất từ file PDF gốc (đáp án đúng nhận theo phần gạch chân).

Phân chủ đề theo chương của bộ đề: 1–180 `rules`, 181–205 `ethics`, 206–263 `driving-skills`, 264–300 `vehicle`,
301–485 `signs`, 486–600 `scenarios`. 60 câu điểm liệt theo Phụ lục III Công văn 2262/CSGT-P5.
Phần giải thích (`explanation`) đang để trống.

Import idempotent theo `number`: câu đã có sẽ được bỏ qua. Nếu database đã có 6 câu mẫu cũ (số 1–6) hoặc cần nạp lại
sau khi sửa dữ liệu, chạy **một lần** với `Database:UpdateExistingQuestions=true` để ghi đè các câu trùng số:

```bash
dotnet run --project src/DrivingTest.Api -- --Database:UpdateExistingQuestions=true
```

(Đáp án đã nằm trong lịch sử thi không bị xóa; câu nào khác số lượng đáp án mà đã có lịch sử thi sẽ được cảnh báo trong log.)

Sửa dữ liệu rồi tạo lại JSON:

```bash
node tools/csv-to-seed.mjs tools/questions-600.csv src/DrivingTest.Infrastructure/Seed/questions.json
# hoặc trích lại từ PDF:  python tools/pdf-to-seed.py <file.pdf> <thư-mục-ra>   (cần pymupdf, pillow)
```

Mã chủ đề: `rules` (khái niệm và quy tắc), `signs` (biển báo), `scenarios` (sa hình), `driving-skills` (kỹ thuật lái xe),
`vehicle` (cấu tạo và sửa chữa), `ethics` (văn hóa/đạo đức). Mỗi câu phải có đúng một đáp án đúng.

## Swagger

Swagger UI bật sẵn ở Development (ở môi trường khác: `Swagger:Enabled=true`). Gọi API cần đăng nhập:

1. `POST /api/auth/login` → copy `accessToken`.
2. Bấm **Authorize**, dán token (không cần gõ chữ `Bearer`). Token được giữ lại khi tải lại trang.

## Quên mật khẩu

`POST /api/auth/forgot-password` gửi email chứa link `PasswordReset:ResetUrl?token=...` (hạn `PasswordReset:TokenMinutes` phút).
Token được ký bằng ASP.NET Data Protection, gắn với mật khẩu hiện tại nên **chỉ dùng được một lần** và không cần bảng mới.
Đặt lại thành công sẽ đăng xuất mọi thiết bị. API luôn trả 204 để không lộ email nào đã đăng ký.

- Dev chưa cấu hình SMTP (`Email:Host` trống): nội dung email (kèm link) được ghi ra **log console**.
- Production: cấu hình `Email:Host/Port/UserName/Password/FromAddress` (ví dụ Gmail SMTP với App Password),
  và lưu khóa Data Protection ở nơi bền vững (volume) nếu chạy Docker, nếu không link cũ sẽ mất hiệu lực khi container khởi động lại.

## Quản lý người dùng (Admin)

`/api/admin/users`: xem, tìm kiếm, thêm, sửa (email, tên, vai trò), xóa, đặt lại mật khẩu.
Không thể tự xóa hoặc tự hạ quyền chính mình, hệ thống luôn giữ ít nhất một Admin. Đổi vai trò hoặc đặt lại mật khẩu
sẽ thu hồi mọi phiên đăng nhập của người đó. Xóa người dùng sẽ xóa luôn lịch sử thi, bookmark, tiến độ học.

## Cấu hình quan trọng (`appsettings.json`)

| Khóa | Ý nghĩa |
|---|---|
| `Jwt:Key` | Khóa ký (≥ 32 ký tự). Production đặt bằng biến môi trường `Jwt__Key` hoặc secret store |
| `ConnectionStrings:Default` | Chuỗi kết nối SQL Server |
| `Exam:*` | Số câu, thời gian, điểm đạt, cơ cấu theo chủ đề, số câu điểm liệt tối thiểu |
| `Cors:AllowedOrigins` | Origin của frontend (Vite mặc định `http://localhost:5173`) |
| `RateLimiting:*` | Giới hạn request cho `/auth/*` và `/questions/{id}/check` |
| `PasswordReset:*` | `ResetUrl` (trang đặt lại mật khẩu của frontend), `TokenMinutes` |
| `Email:*` | SMTP gửi email quên mật khẩu (trống `Host` = chỉ ghi log) |
| `Swagger:Enabled` | Bật Swagger ngoài môi trường Development |

## Endpoint

| Method | Route | Auth |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/refresh`, `/logout` | — |
| POST | `/api/auth/forgot-password`, `/api/auth/reset-password` | — |
| GET | `/api/topics` | — |
| GET | `/api/questions?topicId&search&criticalOnly&page&pageSize` | tùy chọn |
| POST | `/api/questions/{id}/check` | tùy chọn |
| GET | `/api/questions/review` | ✔ |
| GET/PUT/DELETE | `/api/bookmarks[/{questionId}]` | ✔ |
| POST | `/api/exams` | ✔ |
| GET | `/api/exams/active`, `/history`, `/{id}`, `/{id}/result` | ✔ |
| PUT | `/api/exams/{id}/answers` | ✔ |
| POST | `/api/exams/{id}/submit` | ✔ |
| GET | `/api/exam-info` | — |
| GET/PUT | `/api/profile` | ✔ |
| POST | `/api/profile/change-password` | ✔ (trả token mới, đăng xuất thiết bị khác) |
| GET/POST/PUT/DELETE | `/api/admin/questions[/{id}]` | ✔ Admin |
| GET/POST/PUT/DELETE | `/api/admin/users[/{id}]` | ✔ Admin |
| POST | `/api/admin/users/{id}/reset-password` | ✔ Admin |
| GET | `/api/stats/home` | — |
| GET | `/api/stats/me` | ✔ |

Ngôn ngữ: `?lang=vi|en` hoặc header `Accept-Language` (mặc định `vi`).

## Test

```bash
dotnet test
```
