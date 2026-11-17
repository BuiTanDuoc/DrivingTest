import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '../src/i18n';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import Layout from '../src/components/Layout';
import ProtectedRoute from '../src/components/ProtectedRoute';
import AdminRoute from '../src/components/AdminRoute';
import Profile from '../src/pages/Profile';
import AdminQuestions from '../src/pages/admin/AdminQuestions';
import QuestionEditor from '../src/pages/admin/QuestionEditor';
import { tokenStore } from '../src/api/client';
import { installFetch } from './mockApi';

function renderAt(path) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<Layout />}>
                <Route element={<ProtectedRoute />}>
                  <Route path="tai-khoan" element={<Profile />} />
                </Route>
                <Route element={<AdminRoute />}>
                  <Route path="quan-tri" element={<AdminQuestions />} />
                  <Route path="quan-tri/cau-hoi/moi" element={<QuestionEditor />} />
                  <Route path="quan-tri/cau-hoi/:id" element={<QuestionEditor />} />
                </Route>
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

const signIn = (role) =>
  tokenStore.save({
    accessToken: 'a', accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(), refreshToken: 'r',
    user: { id: 'u1', email: 'a@b.c', displayName: 'Mười', role }
  });

let calls;
beforeEach(() => { localStorage.clear(); i18n.changeLanguage('vi'); calls = installFetch(); });
afterEach(cleanup);

describe('Quyền truy cập trang quản trị', () => {
  it('người dùng thường bị chặn (403) và không gọi API admin', async () => {
    signIn('User');
    renderAt('/quan-tri');
    expect(await screen.findByText('Bạn không có quyền truy cập trang này.')).toBeTruthy();
    expect(calls.some((c) => c.path.startsWith('/api/admin'))).toBe(false);
  });

  it('menu Quản trị chỉ hiện với Admin', async () => {
    signIn('Admin');
    renderAt('/quan-tri');
    expect(await screen.findByText('Quản lý câu hỏi')).toBeTruthy();
    expect(screen.getAllByText('Quản trị').length).toBeGreaterThan(0);
  });
});

describe('Quản lý câu hỏi', () => {
  it('liệt kê và xóa câu hỏi', async () => {
    signIn('Admin');
    renderAt('/quan-tri');
    expect(await screen.findByText('Đèn đỏ phải làm gì?')).toBeTruthy();

    fireEvent.click(screen.getByText('Xóa'));
    fireEvent.click(await screen.findByText('Xóa', { selector: '.modal button.btn-danger' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/admin/questions/11')).toBe(true));
  });

  it('thêm câu hỏi: gửi đúng payload, bỏ trống tiếng Anh', async () => {
    signIn('Admin');
    renderAt('/quan-tri/cau-hoi/moi');
    await screen.findByText('Thêm câu hỏi', { selector: 'h1' });
    await screen.findByText('Khái niệm và quy tắc'); // chủ đề đã tải

    fireEvent.change(screen.getByLabelText('Số câu'), { target: { value: '601' } });
    fireEvent.change(screen.getByLabelText('Chủ đề'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Nội dung câu hỏi \(VI\)/), { target: { value: 'Câu hỏi mới?' } });
    fireEvent.change(screen.getByLabelText('Nội dung đáp án 1'), { target: { value: 'Đúng' } });
    fireEvent.change(screen.getByLabelText('Nội dung đáp án 2'), { target: { value: 'Sai' } });
    fireEvent.click(screen.getByLabelText('Đúng 1'));
    fireEvent.click(screen.getByText('Lưu câu hỏi'));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/admin/questions')).toBe(true));
    const body = calls.find((c) => c.method === 'POST' && c.path === '/api/admin/questions').body;
    expect(body.number).toBe(601);
    expect(body.topicId).toBe(1);
    expect(body.texts).toEqual({ vi: { text: 'Câu hỏi mới?', explanation: '' } }); // không có "en"
    expect(body.answers).toEqual([
      { id: null, isCorrect: true, texts: { vi: 'Đúng' } },
      { id: null, isCorrect: false, texts: { vi: 'Sai' } } // 2 đáp án trống đã bị loại
    ]);
  });

  it('không cho lưu khi thiếu dữ liệu', async () => {
    signIn('Admin');
    renderAt('/quan-tri/cau-hoi/moi');
    fireEvent.click(await screen.findByText('Lưu câu hỏi'));
    expect(await screen.findByText('Hãy chọn chủ đề.')).toBeTruthy();
    expect(screen.getByText('Cần ít nhất 2 đáp án, mỗi đáp án có nội dung tiếng Việt.')).toBeTruthy();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
  });

  it('sửa câu hỏi: giữ Id đáp án cũ', async () => {
    signIn('Admin');
    renderAt('/quan-tri/cau-hoi/11');
    await screen.findByDisplayValue('Dừng lại');
    fireEvent.change(screen.getByLabelText('Nội dung đáp án 2'), { target: { value: 'Đi tiếp nếu vắng xe' } });
    fireEvent.click(screen.getByText('Lưu câu hỏi'));

    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.path === '/api/admin/questions/11')).toBe(true));
    const body = calls.find((c) => c.method === 'PUT' && c.path === '/api/admin/questions/11').body;
    expect(body.answers.map((a) => a.id)).toEqual([111, 112]);
    expect(body.answers[1].texts.vi).toBe('Đi tiếp nếu vắng xe');
  });
});

describe('Tài khoản', () => {
  it('đổi mật khẩu thành công → lưu token mới', async () => {
    signIn('User');
    renderAt('/tai-khoan');
    await screen.findByText('Đổi mật khẩu', { selector: 'h3' });

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), { target: { value: 'old12345' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('Đổi mật khẩu', { selector: 'button' }));

    await waitFor(() => expect(tokenStore.access).toBe('new-access'));
    expect(tokenStore.refresh).toBe('r2');
  });

  it('mật khẩu nhập lại không khớp → không gọi API', async () => {
    signIn('User');
    renderAt('/tai-khoan');
    await screen.findByText('Đổi mật khẩu', { selector: 'h3' });

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), { target: { value: 'old12345' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'different1' } });
    fireEvent.click(screen.getByText('Đổi mật khẩu', { selector: 'button' }));

    expect(await screen.findByText('Mật khẩu nhập lại không khớp.')).toBeTruthy();
    expect(calls.some((c) => c.path === '/api/profile/change-password')).toBe(false);
  });

  it('sai mật khẩu hiện tại → hiện lỗi từ backend ở đúng ô', async () => {
    signIn('User');
    renderAt('/tai-khoan');
    await screen.findByText('Đổi mật khẩu', { selector: 'h3' });

    fireEvent.change(screen.getByLabelText('Mật khẩu hiện tại'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByLabelText(/^Mật khẩu mới/), { target: { value: 'newpass123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByText('Đổi mật khẩu', { selector: 'button' }));

    expect(await screen.findByText('Current password is incorrect.')).toBeTruthy();
    expect(tokenStore.access).toBe('a'); // token cũ giữ nguyên
  });

  it('đổi tên hiển thị', async () => {
    signIn('User');
    renderAt('/tai-khoan');
    const input = await screen.findByDisplayValue('Mười');
    fireEvent.change(input, { target: { value: 'Mười Phạm' } });
    fireEvent.click(screen.getByText('Lưu thay đổi'));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.path === '/api/profile' && c.body.displayName === 'Mười Phạm')).toBe(true));
    await waitFor(() => expect(tokenStore.user.displayName).toBe('Mười Phạm'));
  });
});
