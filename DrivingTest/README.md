# DrivingTest Backend

API cho website học và thi thử bằng lái xe hạng B — .NET 10, EF Core, SQL Server.

## Chạy nhanh

```bash
docker compose up -d                       # SQL Server
dotnet run --project src/DrivingTest.Api   # http://localhost:5080
```

Ở môi trường Development, ứng dụng tự tạo database, seed 6 chủ đề và 6 câu hỏi mẫu
(`src/DrivingTest.Infrastructure/Seed/questions.sample.json`). Cấu hình đề thi cho dev (6 câu) nằm trong
`appsettings.Development.json`.

- OpenAPI: `http://localhost:5080/openapi/v1.json`
- Health: `http://localhost:5080/health`

## Migration (khuyến nghị cho production)

```bash
dotnet tool install --global dotnet-ef
dotnet ef migrations add Initial -p src/DrivingTest.Infrastructure -s src/DrivingTest.Api
dotnet ef database update          -p src/DrivingTest.Infrastructure -s src/DrivingTest.Api
```

Khi đã có migration, `Database:AutoInitialize` sẽ chạy `Migrate` thay vì `EnsureCreated`.

## Import ngân hàng câu hỏi (600 câu)

Repo **không kèm sẵn** bộ 600 câu (chỉ có 6 câu mẫu để chạy thử). Bạn nạp bộ đề từ nguồn mà bạn có quyền sử dụng:

1. Chuẩn bị file CSV theo mẫu `tools/questions.template.csv`
   (cột: `number, topic, critical, text, a1..a4, correct, explanation, image` và tùy chọn các cột `_en` cho tiếng Anh).
2. Chuyển sang JSON seed (có kiểm tra: trùng số câu, sai chủ đề, đáp án đúng không hợp lệ...):

```bash
node tools/csv-to-seed.mjs questions.csv src/DrivingTest.Infrastructure/Seed/questions.json
```

3. Trỏ cấu hình tới file mới và (tùy chọn) khai báo số câu mong đợi để có cảnh báo khi thiếu/thừa:

```json
"Database": { "AutoInitialize": true, "QuestionsSeedFile": "Seed/questions.json", "ExpectedQuestionCount": 600 }
```

4. Chạy API. Khi import xong, log sẽ in tổng số câu, số câu điểm liệt và số câu theo từng chủ đề để đối chiếu.

Mã chủ đề: `rules` (khái niệm và quy tắc), `signs` (biển báo), `scenarios` (sa hình), `driving-skills` (kỹ thuật lái xe),
`vehicle` (cấu tạo và sửa chữa), `ethics` (văn hóa/đạo đức). Câu điểm liệt đánh dấu bằng cột `critical`.
Import idempotent theo `number`: câu đã có sẽ được bỏ qua. Mỗi câu phải có đúng một đáp án đúng.

## Cấu hình quan trọng (`appsettings.json`)

| Khóa | Ý nghĩa |
|---|---|
| `Jwt:Key` | Khóa ký (≥ 32 ký tự). Production đặt bằng biến môi trường `Jwt__Key` hoặc secret store |
| `ConnectionStrings:Default` | Chuỗi kết nối SQL Server |
| `Exam:*` | Số câu, thời gian, điểm đạt, cơ cấu theo chủ đề, số câu điểm liệt tối thiểu |
| `Cors:AllowedOrigins` | Origin của frontend (Vite mặc định `http://localhost:5173`) |
| `RateLimiting:*` | Giới hạn request cho `/auth/*` và `/questions/{id}/check` |

## Endpoint

| Method | Route | Auth |
|---|---|---|
| POST | `/api/auth/register`, `/login`, `/refresh`, `/logout` | — |
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
| GET | `/api/stats/home` | — |
| GET | `/api/stats/me` | ✔ |

Ngôn ngữ: `?lang=vi|en` hoặc header `Accept-Language` (mặc định `vi`).

## Test

```bash
dotnet test
```
