/** Giả lập backend theo đúng hợp đồng JSON của DrivingTest API. */
import { vi } from 'vitest';

export const topics = [
  { id: 1, code: 'rules', name: 'Khái niệm và quy tắc', description: null, questionCount: 2 },
  { id: 2, code: 'signs', name: 'Biển báo đường bộ', description: null, questionCount: 1 }
];

export const questions = [
  { id: 11, number: 1, topicId: 1, topicCode: 'rules', isCritical: true, imageUrl: null, text: 'Đèn đỏ phải làm gì?', isBookmarked: false,
    answers: [{ id: 111, text: 'Dừng lại' }, { id: 112, text: 'Đi tiếp' }] },
  { id: 12, number: 2, topicId: 2, topicCode: 'signs', isCritical: false, imageUrl: null, text: 'Biển tròn nền xanh là gì?', isBookmarked: false,
    answers: [{ id: 121, text: 'Biển cấm' }, { id: 122, text: 'Biển hiệu lệnh' }] }
];

const now = Date.now();
export const exam = {
  attemptId: '0192f0aa-0000-7000-8000-000000000001',
  startedAt: new Date(now).toISOString(),
  expiresAt: new Date(now + 19 * 60_000).toISOString().replace('Z', ''), // backend cũ có thể thiếu "Z"
  serverTime: new Date(now).toISOString(),
  totalQuestions: 2,
  questions: questions.map((q, i) => ({
    position: i + 1, questionId: q.id, imageUrl: null, text: q.text, answers: q.answers, selectedAnswerId: null, isFlagged: false
  }))
};

export const result = {
  attemptId: exam.attemptId, status: 'Submitted', startedAt: exam.startedAt, submittedAt: exam.startedAt, durationSeconds: 125,
  score: 1, totalQuestions: 2, passScore: 2, passed: false, failedByCritical: true,
  questions: [
    { position: 1, questionId: 11, isCritical: true, imageUrl: null, text: questions[0].text, explanation: 'Đèn đỏ là tín hiệu cấm đi.',
      answers: [{ id: 111, text: 'Dừng lại', isCorrect: true }, { id: 112, text: 'Đi tiếp', isCorrect: false }],
      selectedAnswerId: 112, isCorrect: false, isFlagged: false },
    { position: 2, questionId: 12, isCritical: false, imageUrl: null, text: questions[1].text, explanation: 'Biển hiệu lệnh.',
      answers: [{ id: 121, text: 'Biển cấm', isCorrect: false }, { id: 122, text: 'Biển hiệu lệnh', isCorrect: true }],
      selectedAnswerId: 122, isCorrect: true, isFlagged: false }
  ]
};

export function installFetch() {
  const calls = [];
  const json = (body, status = 200) =>
    Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

  globalThis.fetch = vi.fn((url, init = {}) => {
    const path = new URL(url, 'http://x').pathname;
    const method = init.method ?? 'GET';
    calls.push({ method, path, body: init.body ? JSON.parse(init.body) : undefined });

    if (path === '/api/stats/home') return json({ totalQuestions: 365, totalTopics: 6, totalAttempts: 120, totalUsers: 40 });
    if (path === '/api/topics') return json(topics);
    if (path === '/api/exam-info') return json({ totalQuestions: 35, durationMinutes: 19, passScore: 32, minCriticalQuestions: 1 });
    if (path === '/api/questions') return json({ items: questions, page: 1, pageSize: 10, totalCount: 2, totalPages: 1 });
    if (path === '/api/questions/11/check')
      return json({ isCorrect: true, correctAnswerId: 111, explanation: 'Đèn đỏ là tín hiệu cấm đi.' });
    if (path === '/api/exams/active') return json(null, 204);
    if (path === '/api/exams' && method === 'POST') return json(exam);
    if (path.endsWith('/answers')) return json(null, 204);
    if (path.endsWith('/submit')) return json(result);
    if (path.endsWith('/result')) return json(result);
    if (path === '/api/auth/login')
      return json({ accessToken: 'a', accessTokenExpiresAt: new Date(now + 900_000).toISOString(), refreshToken: 'r', user: { id: 'u1', email: 'a@b.c', displayName: 'Mười' } });
    return json({ title: 'Not found' }, 404);
  });
  return calls;
}
