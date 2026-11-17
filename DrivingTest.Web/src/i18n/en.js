export default {
  app: { name: 'B-Class Driving Test', tagline: 'Study theory and take mock exams for the class B driving license' },
  nav: {
    home: 'Home', learn: 'Study', exam: 'Mock exam', history: 'History',
    login: 'Sign in', register: 'Sign up', logout: 'Sign out', menu: 'Open menu', admin: 'Admin', profile: 'Account'
  },
  common: {
    loading: 'Loading...', retry: 'Try again', network: 'Cannot reach the server. Please try again.',
    error: 'Something went wrong', prev: 'Previous', next: 'Next', page: 'Page {{page}} of {{total}}',
    cancel: 'Cancel', confirm: 'Confirm', questions: 'questions', minutes: 'min', loginRequired: 'Sign-in required',
    loginPrompt: 'Please sign in to use this feature.'
  },
  theme: { light: 'Light mode', dark: 'Dark mode', toggle: 'Toggle light/dark theme' },
  lang: { toggle: 'Change language' },
  footer: { text: 'Content is for reference only. Always verify against the latest official documents.' },

  home: {
    heroTitle: 'Ace your class B driving test',
    heroSubtitle: 'Study theory by topic, take realistic mock exams with a countdown timer and track your progress.',
    ctaLearn: 'Start studying', ctaExam: 'Take a mock exam',
    statsQuestions: 'Questions', statsAttempts: 'Exam attempts', statsUsers: 'Users',
    topicsTitle: 'Study topics', topicsSubtitle: 'Pick a topic to start practicing.',
    questionsCount: '{{count}} questions',
    examTitle: 'Mock exam format', examSubtitle: 'Simulates the real theory test.',
    examQuestions: '{{count}} random questions', examDuration: '{{count}} minutes',
    examPass: 'Pass with {{pass}}/{{total}} correct', examCritical: 'A wrong critical question means fail',
    examAuto: 'Auto-submits when time is up'
  },

  learn: {
    title: 'Study theory', subtitle: 'Pick an answer to see right/wrong and the explanation instantly.',
    search: 'Search questions or enter a number...', allTopics: 'All', criticalOnly: 'Critical only',
    tabAll: 'All questions', tabBookmarks: 'Bookmarked', tabReview: 'Missed questions',
    total: '{{count}} questions', empty: 'No matching questions found.',
    emptyBookmarks: "You haven't bookmarked any questions yet.", emptyReview: 'No missed questions. Great job!',
    loginToBookmark: 'Sign in to bookmark questions and save your progress.',
    correct: 'Correct!', wrong: 'Not quite', explanation: 'Explanation', checking: 'Checking...'
  },

  question: {
    number: 'Question {{n}}', critical: 'Critical', flag: 'Flag as doubtful', unflag: 'Remove flag',
    bookmark: 'Bookmark for review', unbookmark: 'Remove bookmark', correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped'
  },

  exam: {
    title: 'Mock exam', introSubtitle: 'A realistic simulation. Get ready before you start.',
    start: 'Start exam', starting: 'Preparing your exam...', resume: 'Resume exam in progress',
    resumeHint: 'You have an unsubmitted exam with {{time}} left.',
    rules: 'Rules', timeLeft: 'Time left', answered: 'Answered {{done}}/{{total}}',
    viewSingle: 'One by one', viewGrid: 'Grid view', prev: 'Previous', next: 'Next',
    flag: 'Doubtful', unflag: 'Unflag', submit: 'Submit', submitting: 'Submitting...',
    confirmTitle: 'Submit your exam?', confirmBody: 'You cannot change your answers after submitting.',
    unanswered: '{{count}} unanswered', flaggedCount: '{{count}} flagged as doubtful',
    keepGoing: 'Keep going', confirmSubmit: 'Submit',
    legendDone: 'Answered', legendTodo: 'Unanswered', legendFlagged: 'Doubtful', legendCurrent: 'Current',
    saveFailed: 'Could not save your answer. Please try again.', timeUp: "Time's up! Submitting your exam...",
    leaveWarning: 'Your exam has not been submitted. Leave this page?', navigator: 'Questions',
    shortcuts: 'Shortcuts: 1-4 pick answer · ←/→ navigate · F flag',
    loginRequired: 'Sign in to take mock exams and save your results.'
  },

  result: {
    title: 'Exam result', passed: 'PASSED', failed: 'FAILED',
    failedCritical: 'You got a critical question wrong (or left it blank), so the exam counts as failed.',
    failedScore: 'You did not reach the minimum score ({{pass}}/{{total}}).',
    expired: 'Time ran out and the exam was submitted automatically.',
    score: 'Score', time: 'Time taken', date: 'Date', need: 'Need {{pass}}/{{total}} to pass',
    review: 'Review your answers', filterAll: 'All', filterWrong: 'Wrong only',
    yourAnswer: 'Your answer', notAnswered: "You didn't answer this question", noWrong: 'No wrong answers.',
    retry: 'Try again', toHistory: 'View history', toLearn: 'Review theory'
  },

  history: {
    title: 'History & statistics', subtitle: 'Track your study progress and exam results.',
    attempts: 'Total attempts', passRate: 'Pass rate', avgScore: 'Average score', bestScore: 'Best score',
    learning: 'Learning progress', studied: 'Studied {{done}}/{{total}}', mastered: 'Mastered {{done}}/{{total}}',
    topicTitle: 'Results by topic', topicLegendStudied: 'Studied', topicLegendMastered: 'Mastered',
    examAccuracy: 'Correct in exams: {{correct}}/{{total}}', noExam: 'No exam data yet',
    recent: 'Exam history', empty: "You haven't taken any exams yet.", startExam: 'Take a mock exam',
    passed: 'Passed', failed: 'Failed', expired: 'Timed out', detail: 'Details'
  },

  auth: {
    loginTitle: 'Sign in', registerTitle: 'Create an account',
    loginSubtitle: 'Sign in to save your study and exam history.', registerSubtitle: 'Sign up to save your study and exam history.',
    email: 'Email', password: 'Password', displayName: 'Display name',
    loginBtn: 'Sign in', registerBtn: 'Sign up', noAccount: "Don't have an account?", haveAccount: 'Already have an account?',
    passwordHint: 'At least 8 characters, with letters and digits.',
    errEmail: 'Invalid email address.', errPassword: 'Password needs at least 8 characters, with letters and digits.',
    errName: 'Please enter a display name.', errRequired: 'Please fill in all fields.'
  },

  profile: {
    title: 'My account', subtitle: 'Manage your personal information and password.',
    info: 'Personal information', email: 'Email', role: 'Role', roleAdmin: 'Administrator', roleUser: 'User',
    joined: 'Member since', displayName: 'Display name', save: 'Save changes', saving: 'Saving...', saved: 'Profile updated.',
    passwordTitle: 'Change password', current: 'Current password', newPassword: 'New password', confirm: 'Confirm new password',
    change: 'Change password', changed: 'Password changed. Your other devices will need to sign in again.',
    mismatch: 'The passwords do not match.', sameAsOld: 'The new password must differ from the current one.'
  },

  admin: {
    title: 'Question management', subtitle: 'Add, edit and delete questions in the bank.', add: 'Add question',
    search: 'Search by text or number...', allTopics: 'All topics',
    statusAll: 'Any status', statusActive: 'Visible', statusInactive: 'Hidden', criticalOnly: 'Critical only',
    colNumber: 'No.', colTopic: 'Topic', colQuestion: 'Question', colStatus: 'Status', colActions: 'Actions',
    active: 'Visible', inactive: 'Hidden', edit: 'Edit', delete: 'Delete', total: '{{count}} questions', empty: 'No questions found.',
    forbidden: 'You do not have permission to view this page.',
    deleteTitle: 'Delete this question?', deleteBody: 'Question {{n}} will be deleted. If it appears in exam history it will be hidden instead of removed.',
    deleted: 'Question deleted.', deactivated: 'The question appears in exam history, so it was hidden instead of deleted.',
    created: 'Question added.', updated: 'Question saved.'
  },

  editor: {
    newTitle: 'Add question', editTitle: 'Edit question {{n}}', back: 'Back to the list',
    number: 'Number', topic: 'Topic', chooseTopic: '— Choose a topic —', critical: 'Critical question', active: 'Visible to users',
    image: 'Image URL', imageHint: 'Leave empty if the question has no image.',
    langVi: 'Tiếng Việt', langEn: 'English', englishHint: 'The English version is optional. If empty, users will see the Vietnamese text.',
    text: 'Question text', explanation: 'Explanation', answers: 'Answers', answerPlaceholder: 'Answer {{n}} text',
    correct: 'Correct', addAnswer: 'Add answer', removeAnswer: 'Remove answer', moveUp: 'Move up', moveDown: 'Move down',
    save: 'Save question', saving: 'Saving...', delete: 'Delete question',
    errNumber: 'The number must be a positive integer.', errTopic: 'Please choose a topic.', errText: 'Please enter the question text (Vietnamese).',
    errAnswers: 'At least 2 answers are required, each with Vietnamese text.', errCorrect: 'Mark exactly one answer as correct.'
  },

  adminTabs: { questions: 'Questions', users: 'Users' },

  users: {
    title: 'User management', subtitle: 'View, add, edit and delete accounts, and reset passwords.', add: 'Add user',
    search: 'Search by email or name...', allRoles: 'All roles',
    colUser: 'User', colRole: 'Role', colExams: 'Exams', colCreated: 'Created',
    total: '{{count}} users', empty: 'No users found.', you: 'You',
    createTitle: 'Add user', editTitle: 'Edit user', save: 'Save',
    created: 'User added.', updated: 'User updated.', deleted: 'User deleted.',
    generate: 'Generate', cannotChangeOwnRole: 'You cannot change your own role.',
    cannotDeleteSelf: 'You cannot delete the account you are signed in with.',
    resetPassword: 'Reset password', resetTitle: 'Reset password',
    resetBody: 'Set a new password for {{name}} ({{email}}). They will be signed out of every device; send them the new password.',
    resetConfirm: 'Set password', passwordReset: 'Password reset for {{email}} (copied to clipboard).',
    deleteTitle: 'Delete user?', deleteBody: 'The account {{name}} ({{email}}) will be permanently deleted.',
    deleteExams: 'All {{count}} exam attempts, bookmarks and study progress of this user will also be deleted.'
  },

  forgot: {
    link: 'Forgot password?', title: 'Forgot password',
    subtitle: 'Enter the email you registered with and we will send you a link to reset your password.',
    submit: 'Send link', sending: 'Sending...',
    sent: 'If {{email}} is registered, an email with instructions to reset your password is on its way.',
    sentHint: "Didn't get it? Check your spam folder or try again in a few minutes.",
    resend: 'Send again', backToLogin: 'Back to sign in'
  },

  reset: {
    title: 'Reset password', subtitle: 'Enter a new password for your account.', submit: 'Set new password',
    done: 'Your password has been reset. You can now sign in with the new password.',
    invalid: 'This link is invalid or has expired.', missing: 'This password reset link is invalid.',
    requestNew: 'Request a new link'
  },

  notFound: { title: 'Page not found', body: "The page you're looking for doesn't exist.", back: 'Back to home' }
};
