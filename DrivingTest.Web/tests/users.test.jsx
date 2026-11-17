import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '../src/i18n';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import Layout from '../src/components/Layout';
import AdminRoute from '../src/components/AdminRoute';
import AdminUsers from '../src/pages/admin/AdminUsers';
import AuthForm from '../src/pages/AuthForm';
import ForgotPassword from '../src/pages/ForgotPassword';
import ResetPassword from '../src/pages/ResetPassword';
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
                <Route path="dang-nhap" element={<AuthForm mode="login" />} />
                <Route path="quen-mat-khau" element={<ForgotPassword />} />
                <Route path="dat-lai-mat-khau" element={<ResetPassword />} />
                <Route element={<AdminRoute />}>
                  <Route path="quan-tri/nguoi-dung" element={<AdminUsers />} />
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

const rowOf = async (email) => (await screen.findByText(email)).closest('tr');

describe('Quản lý người dùng', () => {
  it('người dùng thường không vào được', async () => {
    signIn('User');
    renderAt('/quan-tri/nguoi-dung');
    expect(await screen.findByText('Bạn không có quyền truy cập trang này.')).toBeTruthy();
    expect(calls.some((c) => c.path.startsWith('/api/admin'))).toBe(false);
  });

  it('liệt kê; không cho xóa chính mình', async () => {
    signIn('Admin');
    renderAt('/quan-tri/nguoi-dung');
    const me = await rowOf('a@b.c');
    expect(within(me).getByText('Bạn')).toBeTruthy();
    expect(within(me).getByText('Xóa').disabled).toBe(true);
    expect(within(await rowOf('lan@example.com')).getByText('3')).toBeTruthy();
  });

  it('thêm người dùng: gửi đúng payload, mật khẩu được sinh sẵn', async () => {
    signIn('Admin');
    renderAt('/quan-tri/nguoi-dung');
    fireEvent.click(await screen.findByText(/Thêm người dùng/, { selector: 'button' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'moi@example.com' } });
    fireEvent.change(within(dialog).getByLabelText('Tên hiển thị'), { target: { value: 'Người mới' } });
    fireEvent.change(within(dialog).getByLabelText(/^Vai trò/), { target: { value: 'Admin' } });
    fireEvent.click(within(dialog).getByText('Lưu'));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/admin/users')).toBe(true));
    const body = calls.find((c) => c.method === 'POST' && c.path === '/api/admin/users').body;
    expect(body).toMatchObject({ email: 'moi@example.com', displayName: 'Người mới', role: 'Admin' });
    expect(body.password).toMatch(/^(?=.*[A-Za-z])(?=.*\d).{12}$/);
    expect(await screen.findByText('Đã thêm người dùng.')).toBeTruthy();
  });

  it('thêm người dùng: hiện lỗi email trùng từ server', async () => {
    signIn('Admin');
    renderAt('/quan-tri/nguoi-dung');
    fireEvent.click(await screen.findByText(/Thêm người dùng/, { selector: 'button' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'a@b.c' } });
    fireEvent.change(within(dialog).getByLabelText('Tên hiển thị'), { target: { value: 'Trùng' } });
    fireEvent.click(within(dialog).getByText('Lưu'));
    expect(await within(dialog).findByText('Email is already registered.')).toBeTruthy();
  });

  it('sửa vai trò; không tự đổi vai trò của chính mình', async () => {
    signIn('Admin');
    renderAt('/quan-tri/nguoi-dung');
    fireEvent.click(within(await rowOf('a@b.c')).getByText('Sửa'));
    expect(within(await screen.findByRole('dialog')).getByLabelText(/^Vai trò/).disabled).toBe(true);
    fireEvent.click(within(screen.getByRole('dialog')).getByText('Huỷ'));

    fireEvent.click(within(await rowOf('lan@example.com')).getByText('Sửa'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/^Vai trò/), { target: { value: 'Admin' } });
    fireEvent.click(within(dialog).getByText('Lưu'));
    await waitFor(() => expect(calls.find((c) => c.method === 'PUT' && c.path === '/api/admin/users/u2')?.body)
      .toEqual({ email: 'lan@example.com', displayName: 'Lan', role: 'Admin' }));
  });

  it('đặt lại mật khẩu và xóa người dùng', async () => {
    signIn('Admin');
    renderAt('/quan-tri/nguoi-dung');
    fireEvent.click(within(await rowOf('lan@example.com')).getByText('Đặt lại MK'));
    fireEvent.click(within(await screen.findByRole('dialog')).getByText('Đặt mật khẩu'));
    await waitFor(() => expect(calls.some((c) => c.path === '/api/admin/users/u2/reset-password')).toBe(true));
    expect(calls.find((c) => c.path === '/api/admin/users/u2/reset-password').body.newPassword).toHaveLength(12);

    fireEvent.click(within(await rowOf('lan@example.com')).getByText('Xóa'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/3 lượt thi/)).toBeTruthy();
    fireEvent.click(within(dialog).getByText('Xóa'));
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/admin/users/u2')).toBe(true));
  });
});

describe('Quên mật khẩu', () => {
  it('trang đăng nhập có link Quên mật khẩu → gửi email', async () => {
    renderAt('/dang-nhap');
    fireEvent.click(await screen.findByText('Quên mật khẩu?'));
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'lan@example.com' } });
    fireEvent.click(screen.getByText('Gửi liên kết'));
    expect(await screen.findByText(/vừa được gửi/)).toBeTruthy();
    expect(calls.find((c) => c.path === '/api/auth/forgot-password').body).toEqual({ email: 'lan@example.com' });
  });

  it('đặt lại mật khẩu bằng token hợp lệ', async () => {
    renderAt('/dat-lai-mat-khau?token=good-token');
    fireEvent.change(await screen.findByLabelText(/^Mật khẩu mới/), { target: { value: 'NewPass123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'NewPass123' } });
    fireEvent.click(screen.getByText('Đặt mật khẩu mới'));
    expect(await screen.findByText(/Đã đặt lại mật khẩu/)).toBeTruthy();
    expect(calls.find((c) => c.path === '/api/auth/reset-password').body).toEqual({ token: 'good-token', newPassword: 'NewPass123' });
  });

  it('token hết hạn → báo lỗi và gợi ý yêu cầu link mới', async () => {
    renderAt('/dat-lai-mat-khau?token=expired');
    fireEvent.change(await screen.findByLabelText(/^Mật khẩu mới/), { target: { value: 'NewPass123' } });
    fireEvent.change(screen.getByLabelText('Nhập lại mật khẩu mới'), { target: { value: 'NewPass123' } });
    fireEvent.click(screen.getByText('Đặt mật khẩu mới'));
    expect(await screen.findByText(/Liên kết không hợp lệ hoặc đã hết hạn/)).toBeTruthy();
    expect(screen.getByText('Yêu cầu liên kết mới')).toBeTruthy();
  });

  it('thiếu token', async () => {
    renderAt('/dat-lai-mat-khau');
    expect(await screen.findByText('Liên kết đặt lại mật khẩu không hợp lệ.')).toBeTruthy();
  });
});
