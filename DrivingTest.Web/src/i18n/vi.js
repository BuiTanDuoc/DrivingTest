export default {
  app: { name: 'Thi Bằng Lái B', tagline: 'Học lý thuyết và thi thử bằng lái xe hạng B' },
  nav: {
    home: 'Trang chủ', learn: 'Học lý thuyết', exam: 'Thi thử', history: 'Lịch sử',
    login: 'Đăng nhập', register: 'Đăng ký', logout: 'Đăng xuất', menu: 'Mở menu', admin: 'Quản trị', profile: 'Tài khoản'
  },
  common: {
    loading: 'Đang tải...', retry: 'Thử lại', network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
    error: 'Đã có lỗi xảy ra', prev: 'Trước', next: 'Sau', page: 'Trang {{page}} / {{total}}',
    cancel: 'Huỷ', confirm: 'Xác nhận', questions: 'câu', minutes: 'phút', loginRequired: 'Cần đăng nhập',
    loginPrompt: 'Vui lòng đăng nhập để sử dụng tính năng này.'
  },
  theme: { light: 'Chế độ sáng', dark: 'Chế độ tối', toggle: 'Đổi giao diện sáng/tối' },
  lang: { toggle: 'Đổi ngôn ngữ' },
  footer: { text: 'Nội dung mang tính tham khảo. Hãy đối chiếu với tài liệu chính thức mới nhất.' },

  home: {
    heroTitle: 'Chinh phục bằng lái hạng B',
    heroSubtitle: 'Ôn lý thuyết theo từng chủ đề, thi thử như thật với đồng hồ đếm ngược và theo dõi tiến độ của bạn.',
    ctaLearn: 'Bắt đầu học', ctaExam: 'Thi thử ngay',
    statsQuestions: 'Câu hỏi', statsAttempts: 'Lượt thi', statsUsers: 'Người dùng',
    topicsTitle: 'Chủ đề ôn tập', topicsSubtitle: 'Chọn một chủ đề để bắt đầu ôn luyện.',
    questionsCount: '{{count}} câu hỏi',
    examTitle: 'Format thi thử', examSubtitle: 'Mô phỏng bài thi lý thuyết thực tế.',
    examQuestions: '{{count}} câu hỏi ngẫu nhiên', examDuration: '{{count}} phút làm bài',
    examPass: 'Đạt từ {{pass}}/{{total}} câu', examCritical: 'Sai câu điểm liệt là trượt',
    examAuto: 'Tự động nộp khi hết giờ'
  },

  learn: {
    title: 'Học lý thuyết', subtitle: 'Chọn đáp án để xem đúng/sai và giải thích ngay.',
    search: 'Tìm câu hỏi hoặc nhập số câu...', allTopics: 'Tất cả', criticalOnly: 'Chỉ câu điểm liệt',
    tabAll: 'Tất cả câu hỏi', tabBookmarks: 'Đã đánh dấu', tabReview: 'Câu làm sai',
    total: '{{count}} câu hỏi', empty: 'Không tìm thấy câu hỏi phù hợp.',
    emptyBookmarks: 'Bạn chưa đánh dấu câu hỏi nào.', emptyReview: 'Chưa có câu nào làm sai. Tuyệt vời!',
    loginToBookmark: 'Đăng nhập để đánh dấu câu hỏi và lưu tiến độ.',
    correct: 'Chính xác!', wrong: 'Chưa đúng', explanation: 'Giải thích', checking: 'Đang kiểm tra...'
  },

  question: {
    number: 'Câu {{n}}', critical: 'Điểm liệt', flag: 'Đánh dấu nghi ngờ', unflag: 'Bỏ đánh dấu nghi ngờ',
    bookmark: 'Đánh dấu để ôn lại', unbookmark: 'Bỏ đánh dấu', correct: 'Đúng', wrong: 'Sai', skipped: 'Bỏ trống'
  },

  exam: {
    title: 'Thi thử', introSubtitle: 'Bài thi mô phỏng thực tế. Hãy chuẩn bị sẵn sàng trước khi bắt đầu.',
    start: 'Bắt đầu thi', starting: 'Đang tạo đề...', resume: 'Tiếp tục bài đang làm',
    resumeHint: 'Bạn có một bài thi chưa nộp, còn {{time}}.',
    rules: 'Quy tắc', timeLeft: 'Thời gian còn lại', answered: 'Đã làm {{done}}/{{total}}',
    viewSingle: 'Từng câu', viewGrid: 'Dạng lưới', prev: 'Câu trước', next: 'Câu sau',
    flag: 'Nghi ngờ', unflag: 'Bỏ nghi ngờ', submit: 'Nộp bài', submitting: 'Đang nộp...',
    confirmTitle: 'Nộp bài thi?', confirmBody: 'Sau khi nộp bạn không thể sửa đáp án.',
    unanswered: '{{count}} câu chưa làm', flaggedCount: '{{count}} câu đánh dấu nghi ngờ',
    keepGoing: 'Làm tiếp', confirmSubmit: 'Nộp bài',
    legendDone: 'Đã làm', legendTodo: 'Chưa làm', legendFlagged: 'Nghi ngờ', legendCurrent: 'Đang xem',
    saveFailed: 'Không lưu được đáp án. Vui lòng thử lại.', timeUp: 'Hết giờ! Hệ thống đang nộp bài của bạn...',
    leaveWarning: 'Bài thi chưa nộp. Bạn có chắc muốn rời trang?', navigator: 'Danh sách câu',
    shortcuts: 'Phím tắt: 1-4 chọn đáp án · ←/→ đổi câu · F đánh dấu nghi ngờ',
    loginRequired: 'Đăng nhập để làm bài thi thử và lưu kết quả.'
  },

  result: {
    title: 'Kết quả thi', passed: 'ĐẠT', failed: 'TRƯỢT',
    failedCritical: 'Bạn đã sai (hoặc bỏ trống) một câu điểm liệt nên bài thi bị tính là trượt.',
    failedScore: 'Bạn chưa đạt số câu đúng tối thiểu ({{pass}}/{{total}}).',
    expired: 'Bài thi hết giờ và được hệ thống tự động nộp.',
    score: 'Điểm', time: 'Thời gian làm bài', date: 'Ngày thi', need: 'Cần {{pass}}/{{total}} để đạt',
    review: 'Xem lại bài làm', filterAll: 'Tất cả', filterWrong: 'Chỉ câu sai',
    yourAnswer: 'Bạn chọn', notAnswered: 'Bạn chưa trả lời câu này', noWrong: 'Không có câu nào sai.',
    retry: 'Thi lại', toHistory: 'Xem lịch sử', toLearn: 'Ôn lại lý thuyết'
  },

  history: {
    title: 'Lịch sử & thống kê', subtitle: 'Theo dõi tiến độ học và kết quả các lần thi.',
    attempts: 'Tổng lượt thi', passRate: 'Tỷ lệ đạt', avgScore: 'Điểm trung bình', bestScore: 'Điểm cao nhất',
    learning: 'Tiến độ học tập', studied: 'Đã học {{done}}/{{total}} câu', mastered: 'Đã thuộc {{done}}/{{total}} câu',
    topicTitle: 'Kết quả theo chủ đề', topicLegendStudied: 'Đã học', topicLegendMastered: 'Đã thuộc',
    examAccuracy: 'Đúng khi thi: {{correct}}/{{total}}', noExam: 'Chưa có dữ liệu thi',
    recent: 'Lịch sử thi', empty: 'Bạn chưa có lượt thi nào.', startExam: 'Thi thử ngay',
    passed: 'Đạt', failed: 'Trượt', expired: 'Hết giờ', detail: 'Chi tiết'
  },

  auth: {
    loginTitle: 'Đăng nhập', registerTitle: 'Tạo tài khoản',
    loginSubtitle: 'Đăng nhập để lưu lịch sử học và thi.', registerSubtitle: 'Đăng ký để lưu lịch sử học và thi.',
    email: 'Email', password: 'Mật khẩu', displayName: 'Tên hiển thị',
    loginBtn: 'Đăng nhập', registerBtn: 'Đăng ký', noAccount: 'Chưa có tài khoản?', haveAccount: 'Đã có tài khoản?',
    passwordHint: 'Tối thiểu 8 ký tự, gồm chữ và số.',
    errEmail: 'Email không hợp lệ.', errPassword: 'Mật khẩu cần tối thiểu 8 ký tự, gồm chữ và số.',
    errName: 'Vui lòng nhập tên hiển thị.', errRequired: 'Vui lòng nhập đầy đủ thông tin.'
  },

  profile: {
    title: 'Tài khoản của tôi', subtitle: 'Quản lý thông tin cá nhân và mật khẩu.',
    info: 'Thông tin cá nhân', email: 'Email', role: 'Vai trò', roleAdmin: 'Quản trị viên', roleUser: 'Người dùng',
    joined: 'Ngày tham gia', displayName: 'Tên hiển thị', save: 'Lưu thay đổi', saving: 'Đang lưu...', saved: 'Đã cập nhật hồ sơ.',
    passwordTitle: 'Đổi mật khẩu', current: 'Mật khẩu hiện tại', newPassword: 'Mật khẩu mới', confirm: 'Nhập lại mật khẩu mới',
    change: 'Đổi mật khẩu', changed: 'Đã đổi mật khẩu. Các thiết bị khác sẽ phải đăng nhập lại.',
    mismatch: 'Mật khẩu nhập lại không khớp.', sameAsOld: 'Mật khẩu mới phải khác mật khẩu hiện tại.'
  },

  admin: {
    title: 'Quản lý câu hỏi', subtitle: 'Thêm, sửa, xóa ngân hàng câu hỏi.', add: 'Thêm câu hỏi',
    search: 'Tìm theo nội dung hoặc số câu...', allTopics: 'Tất cả chủ đề',
    statusAll: 'Mọi trạng thái', statusActive: 'Đang hiển thị', statusInactive: 'Đã ẩn', criticalOnly: 'Chỉ câu điểm liệt',
    colNumber: 'Số', colTopic: 'Chủ đề', colQuestion: 'Câu hỏi', colStatus: 'Trạng thái', colActions: 'Thao tác',
    active: 'Hiển thị', inactive: 'Đã ẩn', edit: 'Sửa', delete: 'Xóa', total: '{{count}} câu hỏi', empty: 'Không có câu hỏi nào.',
    forbidden: 'Bạn không có quyền truy cập trang này.',
    deleteTitle: 'Xóa câu hỏi?', deleteBody: 'Câu {{n}} sẽ bị xóa. Nếu câu đã xuất hiện trong lịch sử thi, câu sẽ được ẩn thay vì xóa hẳn.',
    deleted: 'Đã xóa câu hỏi.', deactivated: 'Câu hỏi đã có trong lịch sử thi nên được chuyển sang trạng thái ẩn.',
    created: 'Đã thêm câu hỏi.', updated: 'Đã lưu câu hỏi.'
  },

  editor: {
    newTitle: 'Thêm câu hỏi', editTitle: 'Sửa câu {{n}}', back: 'Quay lại danh sách',
    number: 'Số câu', topic: 'Chủ đề', chooseTopic: '— Chọn chủ đề —', critical: 'Câu điểm liệt', active: 'Hiển thị cho người dùng',
    image: 'Đường dẫn ảnh (URL)', imageHint: 'Để trống nếu câu hỏi không có hình.',
    langVi: 'Tiếng Việt', langEn: 'English', englishHint: 'Bản tiếng Anh là tùy chọn. Bỏ trống thì người dùng sẽ thấy bản tiếng Việt.',
    text: 'Nội dung câu hỏi', explanation: 'Giải thích', answers: 'Đáp án', answerPlaceholder: 'Nội dung đáp án {{n}}',
    correct: 'Đúng', addAnswer: 'Thêm đáp án', removeAnswer: 'Xóa đáp án', moveUp: 'Chuyển lên', moveDown: 'Chuyển xuống',
    save: 'Lưu câu hỏi', saving: 'Đang lưu...', delete: 'Xóa câu hỏi',
    errNumber: 'Số câu phải là số nguyên dương.', errTopic: 'Hãy chọn chủ đề.', errText: 'Hãy nhập nội dung câu hỏi (tiếng Việt).',
    errAnswers: 'Cần ít nhất 2 đáp án, mỗi đáp án có nội dung tiếng Việt.', errCorrect: 'Hãy chọn đúng một đáp án đúng.'
  },

  notFound: { title: 'Không tìm thấy trang', body: 'Trang bạn tìm không tồn tại.', back: 'Về trang chủ' }
};
