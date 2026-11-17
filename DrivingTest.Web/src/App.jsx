import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Learn from './pages/Learn';
import Exam from './pages/Exam';
import Result from './pages/Result';
import History from './pages/History';
import AuthForm from './pages/AuthForm';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import AdminQuestions from './pages/admin/AdminQuestions';
import QuestionEditor from './pages/admin/QuestionEditor';
import AdminRoute from './components/AdminRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="hoc" element={<Learn />} />
          <Route path="dang-nhap" element={<AuthForm mode="login" />} />
          <Route path="dang-ky" element={<AuthForm mode="register" />} />

          {/* Thi thử, kết quả, lịch sử cần đăng nhập (backend yêu cầu token). */}
          <Route element={<ProtectedRoute />}>
            <Route path="thi" element={<Exam />} />
            <Route path="ket-qua/:id" element={<Result />} />
            <Route path="lich-su" element={<History />} />
            <Route path="tai-khoan" element={<Profile />} />
          </Route>

          {/* Quản trị: chỉ tài khoản Admin. */}
          <Route element={<AdminRoute />}>
            <Route path="quan-tri" element={<AdminQuestions />} />
            <Route path="quan-tri/cau-hoi/moi" element={<QuestionEditor />} />
            <Route path="quan-tri/cau-hoi/:id" element={<QuestionEditor />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
