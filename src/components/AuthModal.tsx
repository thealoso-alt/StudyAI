import React, { useState } from 'react';
import {
  X,
  User,
  GraduationCap,
  Briefcase,
  Mail,
  Lock,
  Building,
  CheckCircle2,
  Sparkles,
  Sheet,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  LogOut,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';
import { AppUser, Grade, Subject, UserProfile, UserRole } from '../types/study';
import { GRADES, SUBJECTS } from '../data/subjects';
import {
  signInWithGoogle,
  autoSyncUser,
  getSpreadsheetUrl,
} from '../services/firebaseWorkspace';
import {
  loginUser,
  logoutUser,
  changeUserPassword,
  saveAccountRecord,
  saveProfile,
} from '../services/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUserChanged: (updated: UserProfile) => void;
  onNotification: (msg: string) => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onNotification,
}) => {
  // If guest, default to login/register tabs. If logged in, show profile/password change.
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profile'>(
    currentUser.isGuest ? 'login' : 'profile'
  );

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [role, setRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [grade, setGrade] = useState<Grade>('Lớp 10');
  const [subject, setSubject] = useState<Subject>('Toán');
  const [school, setSchool] = useState('');

  // Change password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePwSuccess, setChangePwSuccess] = useState(false);

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Handle Login (HS, GV, Admin: tk: admin - mk: admin123)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMsg('Vui lòng nhập tên đăng nhập/email và mật khẩu.');
      return;
    }

    setLoading(true);
    const result = loginUser(loginIdentifier, loginPassword);
    setLoading(false);

    if (result.success && result.profile) {
      onUserChanged(result.profile);
      onNotification(
        `Đăng nhập thành công! Chào mừng ${result.profile.role === 'admin' ? 'Quản trị viên' : result.profile.role === 'teacher' ? 'Thầy/Cô' : 'bạn'} ${result.profile.name}. 🚀`
      );
      // Auto-sync in background
      autoSyncUser({
        id: result.profile.id,
        username: result.profile.username || loginIdentifier,
        email: result.profile.email,
        name: result.profile.name,
        role: result.profile.role,
        grade: result.profile.grade,
        school: result.profile.school,
        createdAt: Date.now(),
      });
      onClose();
    } else {
      setErrorMsg(result.error || 'Đăng nhập không thành công.');
    }
  };

  // Quick fill admin credentials
  const handleQuickFillAdmin = () => {
    setLoginIdentifier('admin');
    setLoginPassword('admin123');
    setErrorMsg(null);
  };

  // 2. Handle Registration (Mở quyền đăng ký cho GV và HS)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim() || !email.trim()) {
      setErrorMsg('Vui lòng điền họ tên và email.');
      return;
    }
    if (!registerPassword.trim() || registerPassword.trim().length < 4) {
      setErrorMsg('Mật khẩu phải có ít nhất 4 ký tự.');
      return;
    }

    setLoading(true);

    try {
      const uName = username.trim() || email.split('@')[0] || `user_${Date.now()}`;
      const newUser: AppUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username: uName.toLowerCase(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: registerPassword.trim(),
        role,
        grade,
        subject: role === 'teacher' ? subject : undefined,
        school: school.trim() || (role === 'teacher' ? 'Trường THCS/THPT' : 'Trường THPT'),
        createdAt: Date.now(),
      };

      // Save locally
      saveAccountRecord(newUser);

      // Auto-sync to Google Sheet and Firestore automatically without buttons
      autoSyncUser(newUser);

      // Login user immediately
      const updatedProfile: UserProfile = {
        id: newUser.id,
        username: newUser.username,
        isGuest: false,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatarSeed: newUser.role === 'teacher' ? 'teacher-owl' : 'studious-cat',
        grade: newUser.grade,
        favoriteSubject: newUser.subject || 'Toán',
        school: newUser.school,
        xp: 50,
        streakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        stats: {
          questionsAsked: 0,
          problemsSolved: 0,
          reviewsCreated: 0,
          quizzesCompleted: 0,
          totalQuizScoreSum: 0,
        },
      };

      saveProfile(updatedProfile);
      localStorage.setItem('study_ai_active_session_user_v3', newUser.id);
      onUserChanged(updatedProfile);

      onNotification(
        `Đăng ký tài khoản ${role === 'teacher' ? 'Giáo viên' : 'Học sinh'} thành công! Tự động lưu và đồng bộ Google Sheets.`
      );
      onClose();
    } catch (err: any) {
      console.error('Lỗi đăng ký:', err);
      setErrorMsg(err.message || 'Lỗi khi đăng ký tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Change Password (Đổi mật khẩu và lưu lại cho lần đăng nhập sau)
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setChangePwSuccess(false);

    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 4 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }

    setLoading(true);
    const res = changeUserPassword(currentUser.id, oldPassword, newPassword);
    setLoading(false);

    if (res.success) {
      setChangePwSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onNotification('Đổi mật khẩu thành công! Mật khẩu mới đã được lưu cho các lần đăng nhập sau.');
      // Auto-sync updated account to Google Sheet
      autoSyncUser({
        id: currentUser.id,
        username: currentUser.username || currentUser.email,
        email: currentUser.email,
        name: currentUser.name,
        password: newPassword,
        role: currentUser.role,
        grade: currentUser.grade,
        school: currentUser.school,
        createdAt: Date.now(),
      });
    } else {
      setErrorMsg(res.error || 'Không thể đổi mật khẩu.');
    }
  };

  // 4. Handle Logout (Trở về trạng thái khách)
  const handleLogout = () => {
    const guest = logoutUser();
    onUserChanged(guest);
    onNotification('Đã đăng xuất. Bạn đang ở chế độ Khách.');
    onClose();
  };

  // 5. Google OAuth Sign-in
  const handleGoogleAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogle();
      if (res) {
        const gUser = res.user;
        const appUser: AppUser = {
          id: gUser.uid,
          username: (gUser.email || '').split('@')[0] || `user_${Date.now()}`,
          name: gUser.displayName || 'Người dùng Google',
          email: gUser.email || '',
          password: 'google_oauth_account',
          role: role || 'student',
          grade,
          subject: role === 'teacher' ? subject : undefined,
          school: school || 'Học sinh Việt Nam',
          createdAt: Date.now(),
        };

        saveAccountRecord(appUser);
        autoSyncUser(appUser);

        const updatedProfile: UserProfile = {
          ...currentUser,
          id: appUser.id,
          username: appUser.username,
          isGuest: false,
          name: appUser.name,
          email: appUser.email,
          role: appUser.role,
          grade: appUser.grade,
          school: appUser.school,
        };
        saveProfile(updatedProfile);
        localStorage.setItem('study_ai_active_session_user_v3', appUser.id);
        onUserChanged(updatedProfile);

        onNotification('Đã kết nối tài khoản Google & Google Sheets thành công!');
        onClose();
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      setErrorMsg(err?.message || 'Không thể đăng nhập Google.');
    } finally {
      setLoading(false);
    }
  };

  const sheetUrl = getSpreadsheetUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sky-300">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Tài Khoản StudyAI</h3>
              <p className="text-[11px] text-slate-300">
                {currentUser.isGuest
                  ? 'Đăng nhập hoặc Đăng ký để lưu kết quả học tập & Google Sheet'
                  : `Đang đăng nhập: ${currentUser.name} (${currentUser.role})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guest Warning Notice if in Guest mode */}
        {currentUser.isGuest && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-2.5 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Chế độ Khách:</strong> Để lưu kết quả học tập, điểm thi và tiến độ vào tài khoản của bạn & Google Sheet, vui lòng đăng nhập!
            </span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-6 pt-4 border-b border-slate-100 flex gap-2">
          {currentUser.isGuest ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                }}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'login'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setErrorMsg(null);
                }}
                className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'register'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Đăng Ký Mới (HS & GV)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setErrorMsg(null);
                }}
                className="pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 border-indigo-600 text-indigo-700"
              >
                Thông Tin & Đổi Mật Khẩu
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                }}
                className="pb-2.5 px-3 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 border-b-2 border-transparent"
              >
                Chuyển Tài Khoản Khác
              </button>
            </>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: ĐĂNG NHẬP (HS, GV, ADMIN) */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập hoặc Email:
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="admin hoặc email/tên đăng nhập..."
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu:
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showLoginPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Quick Hint for Admin Account */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>
                      Tài khoản Admin: <strong>admin</strong> / <strong>admin123</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFillAdmin}
                    className="text-xs text-indigo-700 font-bold hover:underline"
                  >
                    Điền nhanh
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
                </button>
              </form>

              {/* Quick Google Sign In */}
              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200" />
                <span className="shrink mx-3 text-slate-400 text-xs">hoặc</span>
                <div className="grow border-t border-slate-200" />
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 transition-colors text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Đăng nhập nhanh với Google</span>
              </button>
            </div>
          )}

          {/* TAB 2: ĐĂNG KÝ MỚI (HS & GV) */}
          {activeTab === 'register' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Chọn vai trò đăng ký:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                      role === 'student'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Học sinh (HS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('teacher')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-2xl border text-xs font-bold transition-all ${
                      role === 'teacher'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>Giáo viên (GV)</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Họ và tên:
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'teacher' ? 'Thầy Nguyễn Văn A' : 'Nguyễn Minh Anh'}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tên đăng nhập:
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="minhanh123"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email:
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu:
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="Mật khẩu ít nhất 4 ký tự..."
                      className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Khối lớp:
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value as Grade)}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  {role === 'teacher' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Môn giảng dạy:
                      </label>
                      <select
                        value={subject}
                        onChange={(e) => setSubject(e.target.value as Subject)}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500 bg-white"
                      >
                        {SUBJECTS.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Trường học:
                      </label>
                      <input
                        type="text"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        placeholder="THCS/THPT..."
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? 'Đang tạo & tự động lưu Google Sheet...' : 'Đăng Ký Tài Khoản'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: THÔNG TIN TÀI KHOẢN & ĐỔI MẬT KHẨU (CHO TÀI KHOẢN ĐANG ĐĂNG NHẬP) */}
          {activeTab === 'profile' && !currentUser.isGuest && (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                      {currentUser.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{currentUser.name}</h4>
                      <p className="text-xs text-slate-500">
                        {currentUser.email || currentUser.username} •{' '}
                        <span className="font-bold text-indigo-700 uppercase">{currentUser.role}</span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-bold">
                    {currentUser.grade}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Tích lũy</span>
                    <strong className="text-indigo-600">{currentUser.xp} XP</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Chuỗi học</span>
                    <strong className="text-amber-600">{currentUser.streakDays} ngày</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Bài làm</span>
                    <strong className="text-emerald-600">{currentUser.stats.quizzesCompleted} quiz</strong>
                  </div>
                </div>

                {sheetUrl && (
                  <div className="pt-1">
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:underline"
                    >
                      <Sheet className="w-3.5 h-3.5" />
                      <span>Xem bảng điểm của bạn trên Google Sheets ↗</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Form Đổi Mật Khẩu (Sau khi đổi lưu lại cho lần đăng nhập sau) */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Đổi Mật Khẩu (Lưu lại cho các lần đăng nhập sau)</span>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Mật khẩu hiện tại:
                    </label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Mật khẩu cũ..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Mật khẩu mới:
                      </label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mật khẩu mới..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Nhập lại mật khẩu:
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Xác nhận..."
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {changePwSuccess && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Đã đổi mật khẩu thành công! Hãy dùng mật khẩu này cho các lần sau.</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                  >
                    {loading ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu Mới'}
                  </button>
                </form>
              </div>

              {/* Nút Đăng Xuất (Thoát ra về trạng thái Khách) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs sm:text-sm border border-rose-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng Xuất (Trở về trạng thái Khách)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
