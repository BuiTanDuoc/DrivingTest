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

## Import ngân hàng câu hỏi

Đặt file JSON cùng định dạng với `questions.sample.json` vào `Seed/`, trỏ `Database:QuestionsSeedFile` tới file đó.
Import idempotent theo `number` (câu đã có sẽ bị bỏ qua). Mỗi câu phải có đúng một đáp án đúng.

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
