export default {
  app: { name: 'B-Class Driving Test', tagline: 'Study theory and take mock exams for the class B driving license' },
  nav: {
    home: 'Home', learn: 'Study', exam: 'Mock exam', history: 'History',
    login: 'Sign in', register: 'Sign up', logout: 'Sign out', menu: 'Open menu'
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

  notFound: { title: 'Page not found', body: "The page you're looking for doesn't exist.", back: 'Back to home' }
};
