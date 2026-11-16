import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '../src/i18n';
import i18n from '../src/i18n';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import Layout from '../src/components/Layout';
import ProtectedRoute from '../src/components/ProtectedRoute';
import Home from '../src/pages/Home';
import Learn from '../src/pages/Learn';
import Exam from '../src/pages/Exam';
import Result from '../src/pages/Result';
import AuthForm from '../src/pages/AuthForm';
import { tokenStore } from '../src/api/client';
import { installFetch, result } from './mockApi';
import { parseUtc } from '../src/utils/format';

function renderAt(path) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="hoc" element={<Learn />} />
                <Route path="dang-nhap" element={<AuthForm mode="login" />} />
                <Route element={<ProtectedRoute />}>
                  <Route path="thi" element={<Exam />} />
                  <Route path="ket-qua/:id" element={<Result />} />
                </Route>
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

const login = () =>
  tokenStore.save({ accessToken: 'a', accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(), refreshToken: 'r', user: { id: 'u1', email: 'a@b.c', displayName: 'Mười' } });

let calls;
beforeEach(() => { localStorage.clear(); i18n.changeLanguage('vi'); calls = installFetch(); });
afterEach(cleanup);

describe('utils', () => {
  it('coi chuỗi thời gian thiếu "Z" là UTC', () => {
    expect(parseUtc('2026-01-01T08:00:00').toISOString()).toBe('2026-01-01T08:00:00.000Z');
    expect(parseUtc('2026-01-01T08:00:00Z').toISOString()).toBe('2026-01-01T08:00:00.000Z');
  });
});

describe('Trang chủ', () => {
  it('hiển thị chủ đề và format thi lấy từ backend', async () => {
    renderAt('/');
    expect(await screen.findByText('Khái niệm và quy tắc')).toBeTruthy();
    expect(await screen.findByText('Đạt từ 32/35 câu')).toBeTruthy();
  });

  it('đổi sang tiếng Anh', async () => {
    renderAt('/');
    fireEvent.click(screen.getByText('EN'));
    expect(await screen.findByText('Ace your class B driving test')).toBeTruthy();
  });
});

describe('Học lý thuyết', () => {
  it('chọn đáp án → gọi check và hiện giải thích, câu điểm liệt có nhãn', async () => {
    renderAt('/hoc');
    expect(await screen.findByText('Đèn đỏ phải làm gì?')).toBeTruthy();
    expect(screen.getAllByText('Điểm liệt').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('Dừng lại'));
    expect(await screen.findByText('Đèn đỏ là tín hiệu cấm đi.')).toBeTruthy();
    expect(calls.some((c) => c.path === '/api/questions/11/check' && c.body.answerId === 111)).toBe(true);
  });
});

describe('Đăng nhập', () => {
  it('đăng nhập thành công lưu token', async () => {
    renderAt('/dang-nhap');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.c' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'abcd1234' } });
    fireEvent.click(screen.getAllByText('Đăng nhập').find((el) => el.tagName === 'BUTTON' && el.className.includes('btn-lg')));
    await waitFor(() => expect(tokenStore.access).toBe('a'));
  });
});

describe('Thi thử', () => {
  it('chưa đăng nhập → chuyển tới trang đăng nhập', async () => {
    renderAt('/thi');
    expect(await screen.findByText('Đăng nhập để lưu lịch sử học và thi.')).toBeTruthy();
  });

  it('bắt đầu → chọn đáp án (autosave) → nộp bài → hiện kết quả', async () => {
    login();
    renderAt('/thi');

    fireEvent.click(await screen.findByText('Bắt đầu thi'));
    expect(await screen.findByText('Đèn đỏ phải làm gì?')).toBeTruthy();
    expect(screen.getByRole('timer').textContent).toMatch(/1[89]:\d\d/); // ~19 phút, kể cả khi expiresAt thiếu "Z"

    fireEvent.click(screen.getByText('Dừng lại'));
    await waitFor(() => expect(calls.some((c) => c.path.endsWith('/answers') && c.body.answerId === 111)).toBe(true));

    fireEvent.click(screen.getByText('Nộp bài'));
    fireEvent.click(await screen.findByText('Nộp bài', { selector: '.modal button' }));

    expect(await screen.findByText('TRƯỢT')).toBeTruthy();
    expect(screen.getByText(/điểm liệt nên bài thi bị tính là trượt/)).toBeTruthy();
    expect(calls.some((c) => c.path.endsWith('/submit'))).toBe(true);
  });
});

describe('Kết quả', () => {
  it('lọc chỉ câu sai', async () => {
    login();
    renderAt(`/ket-qua/${result.attemptId}`);
    expect(await screen.findByText('Biển tròn nền xanh là gì?')).toBeTruthy();
    fireEvent.click(screen.getByText('Chỉ câu sai'));
    await waitFor(() => expect(screen.queryByText('Biển tròn nền xanh là gì?')).toBeNull());
    expect(screen.getByText('Đèn đỏ phải làm gì?')).toBeTruthy();
  });
});
