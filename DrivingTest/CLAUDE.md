# DrivingTest Backend — quyết định kiến trúc

Backend cho website học và thi thử bằng lái xe hạng B. .NET 10, SQL Server.

## Cấu trúc (Clean Architecture)
- `Domain`: entity, enum, `Languages` (không phụ thuộc gì).
- `Application`: use case theo feature (`Features/*`), `IAppDbContext`, validator, options, pipeline behavior.
- `Infrastructure`: EF Core (`AppDbContext`, configuration), JWT, password hasher, seeder, background worker.
- `Api`: Minimal API endpoints, DI, auth, CORS, rate limiting, xử lý lỗi.

## Quy ước
- **Không AutoMapper**: mapping thủ công (`QuestionMapper`, `ExamMapper`).
- **Không repository**: handler dùng `IAppDbContext` (EF Core) trực tiếp.
- **CQRS** bằng Mediator source-generated (`martinothamar/Mediator`), `ServiceLifetime.Scoped`.
- **FluentValidation** chạy trong `ValidationBehavior`; lỗi trả ProblemDetails 400 kèm `errors`.
- Giá trị cấu hình nằm trong `appsettings.json` (`Exam`, `Jwt`, `Cache`, `RateLimiting`, `Cors`), có validate khi khởi động.
- Comment nghiệp vụ viết tiếng Việt.

## Quyết định quan trọng
- **Chấm điểm ở server.** Đáp án đúng chỉ rời server qua `POST /api/questions/{id}/check` (chế độ học) hoặc kết quả bài thi đã nộp.
- **Snapshot đề thi** (`ExamAttemptQuestion`) + `PassScore`/`TotalQuestions` lưu theo từng bài, nên đổi cấu hình không ảnh hưởng bài cũ.
- **Hạn nộp do server giữ** (`ExpiresAt`); client chỉ hiển thị đồng hồ. `SubmitGraceSeconds` châm chước độ trễ mạng.
- **Bài quá hạn** được `ExamExpirationWorker` tự chấm (Expired). `RowVersion` chặn chấm trùng giữa client và worker.
- `StartExam` trả lại bài đang làm dở nếu còn hạn (không sinh bài dở dang mới).
- Đề thi lấy ngẫu nhiên theo `Exam:TopicQuota` và bảo đảm tối thiểu `Exam:MinCriticalQuestions` câu điểm liệt.
- Câu điểm liệt bị sai **hoặc bỏ trống** là trượt.
- Refresh token lưu dạng hash SHA-256, xoay vòng mỗi lần refresh; dùng lại token đã thu hồi sẽ thu hồi toàn bộ phiên.
- Nội dung đa ngôn ngữ tách bảng `*Translation`; thiếu bản dịch thì fallback tiếng Việt.
- Cache `HybridCache` cho chủ đề và thống kê trang chủ, invalidate theo tag `bank`/`stats` khi import câu hỏi.

## Cần xác nhận với quy định hiện hành
`Exam:TotalQuestions`, `DurationMinutes`, `PassScore` và `TopicQuota` trong `appsettings.json` là giá trị mẫu, phải đối chiếu với cơ cấu đề chính thức.
