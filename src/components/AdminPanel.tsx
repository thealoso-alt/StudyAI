import React, { useState } from 'react';
import {
  ShieldCheck,
  Sheet,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Sparkles,
  Link,
  Save,
  Download,
  Search,
  Check,
  Trash2,
  KeyRound,
  RefreshCw,
  Zap,
  Code,
  Copy,
} from 'lucide-react';
import { AppUser, QuizSubmissionResult, SavedBankQuiz, UserProfile, UserRole } from '../types/study';
import {
  getSpreadsheetUrl,
  setCustomSpreadsheetId,
  syncAllAppDataToGoogleSheets,
  signInWithGoogle,
  getAppsScriptWebhookUrl,
  setAppsScriptWebhookUrl,
  getLastAutoSyncTime,
  SAMPLE_APPS_SCRIPT_CODE,
} from '../services/firebaseWorkspace';
import {
  getStoredAccounts,
  getAllQuizHistory,
  getBankQuizzes,
  getStoredWeakTopics,
  saveProfile,
  deleteAccountRecord,
  saveAccountRecord,
} from '../services/storage';

interface Props {
  currentUser: UserProfile;
  onUserChanged: (updated: UserProfile) => void;
  onNotification: (msg: string) => void;
}

export const AdminPanel: React.FC<Props> = ({
  currentUser,
  onUserChanged,
  onNotification,
}) => {
  const currentUrl = getSpreadsheetUrl() || '';
  const [sheetInput, setSheetInput] = useState(currentUrl);
  const [savedSheetUrl, setSavedSheetUrl] = useState(currentUrl);
  const [webhookInput, setWebhookInput] = useState(getAppsScriptWebhookUrl());
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAdminSubTab, setActiveAdminSubTab] = useState<'sheet' | 'accounts' | 'quizzes'>('sheet');

  // Password reset modal state
  const [resettingUser, setResettingUser] = useState<AppUser | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  const [accounts, setAccounts] = useState<AppUser[]>(getStoredAccounts);
  const quizHistory: QuizSubmissionResult[] = getAllQuizHistory();
  const bankQuizzes: SavedBankQuiz[] = getBankQuizzes();
  const weakTopics = getStoredWeakTopics(currentUser.id);
  const lastSyncTime = getLastAutoSyncTime();

  // Save custom sheet link (Vị trí gắn link Google Sheet cho admin)
  const handleSaveSheetLink = () => {
    if (!sheetInput.trim()) {
      alert('Vui lòng nhập đường link hoặc ID của Google Sheet.');
      return;
    }
    try {
      const parsedId = setCustomSpreadsheetId(sheetInput.trim());
      const fullUrl = `https://docs.google.com/spreadsheets/d/${parsedId}`;
      setSavedSheetUrl(fullUrl);
      onNotification('Đã gắn liên kết Google Sheet thành công! Hệ thống sẽ tự động lưu dữ liệu vào bảng tính này.');
    } catch (e: any) {
      alert(e.message || 'Link Google Sheet không hợp lệ.');
    }
  };

  // Save Apps Script Webhook URL (Tùy chọn ghi trực tiếp không cần popup)
  const handleSaveWebhook = () => {
    setAppsScriptWebhookUrl(webhookInput);
    onNotification('Đã lưu cấu hình Google Apps Script Webhook thành công!');
  };

  // Copy sample code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(SAMPLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    onNotification('Đã sao chép mã Google Apps Script vào bộ nhớ tạm!');
  };

  // Connect Google account to enable Google Sheets API
  const handleConnectGoogle = async () => {
    try {
      onNotification('Đang mở cửa sổ xác thực Google Sheets...');
      const res = await signInWithGoogle();
      if (res) {
        onNotification('Đã kết nối tài khoản Google thành công! Hệ thống tự động đồng bộ thời gian thực.');
        // Perform initial auto-sync
        await syncAllAppDataToGoogleSheets(res.accessToken);
        setSavedSheetUrl(getSpreadsheetUrl() || savedSheetUrl);
      }
    } catch (e: any) {
      if (e?.code !== 'auth/popup-closed-by-user') {
        alert('Lỗi kết nối Google: ' + (e.message || 'Không xác định'));
      }
    }
  };

  // Force sync all data
  const handleSyncAllData = async () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    try {
      let res;
      try {
        res = await syncAllAppDataToGoogleSheets();
      } catch (err: any) {
        if (err.message?.includes('Chưa kết nối tài khoản Google')) {
          onNotification('Vui lòng đăng nhập tài khoản Google để cấp quyền Google Sheets...');
          const googleRes = await signInWithGoogle();
          if (googleRes) {
            res = await syncAllAppDataToGoogleSheets(googleRes.accessToken);
          } else {
            setSyncing(false);
            return;
          }
        } else {
          throw err;
        }
      }

      if (res && res.success) {
        setSavedSheetUrl(res.sheetUrl);
        setSheetInput(res.sheetUrl);
        setSyncSuccessMsg(`Đã cập nhật toàn bộ: ${res.stats.accountsCount} tài khoản, ${res.stats.quizzesCount} bài thi, ${res.stats.bankCount} đề thi ngân hàng sang Google Sheet! 🚀`);
        onNotification('Đã đồng bộ toàn bộ dữ liệu sang Google Sheet thành công!');
      }
    } catch (err: any) {
      console.error(err);
      alert('Lỗi đồng bộ Google Sheets: ' + (err.message || 'Không xác định'));
    } finally {
      setSyncing(false);
    }
  };

  // Delete account
  const handleDeleteAccount = (acc: AppUser) => {
    if (acc.username === 'admin') {
      alert('Không thể xóa tài khoản Quản trị viên gốc.');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${acc.name} (${acc.email || acc.username})?`)) {
      deleteAccountRecord(acc.id);
      setAccounts(getStoredAccounts());
      onNotification(`Đã xóa tài khoản ${acc.name}.`);
    }
  };

  // Reset password
  const handleConfirmResetPassword = () => {
    if (!resettingUser) return;
    if (!newPasswordVal.trim() || newPasswordVal.trim().length < 4) {
      alert('Mật khẩu mới phải có ít nhất 4 ký tự.');
      return;
    }
    resettingUser.password = newPasswordVal.trim();
    saveAccountRecord(resettingUser);
    setAccounts(getStoredAccounts());
    onNotification(`Đã đặt lại mật khẩu cho tài khoản ${resettingUser.name} thành công!`);
    setResettingUser(null);
    setNewPasswordVal('');
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesRole = roleFilter === 'all' || acc.role === roleFilter;
    const matchesSearch =
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.username && acc.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.school && acc.school.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  // Chặn học sinh hoặc khách xem thông tin quản lý: Chỉ admin mới có quyền truy cập
  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto space-y-4 shadow-sm my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Không có quyền truy cập</h3>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Khu vực quản lý hệ thống chỉ dành riêng cho Quản trị viên (Admin). Tài khoản học sinh và giáo viên không thể xem thông tin này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-sky-300 mb-3 border border-indigo-400/30">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Khu Vực Quản Trị Hệ Thống (tk: admin - mk: admin123)</span>
          </div>

          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Quản trị toàn bộ ứng dụng & Tự động lưu Google Sheets
          </h2>
          <p className="mt-2 text-slate-300 text-xs sm:text-sm leading-relaxed">
            Hệ thống quản lý toàn bộ học sinh, giáo viên, đề thi và bảng điểm.
            <strong> Mọi thông tin trên app được tự động lưu vào Google Sheet trong nền (background)</strong> mà không cần thao tác đẩy thủ công.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 border border-white/10 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Chế độ tự động lưu: <strong>ĐANG BẬT</strong></span>
            </div>
            {lastSyncTime > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-300 border border-white/10">
                Ghi nhận tự động: {new Date(lastSyncTime).toLocaleTimeString('vi-VN')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Sub Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveAdminSubTab('sheet')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeAdminSubTab === 'sheet'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sheet className="w-4 h-4" />
          <span>Gắn Link Google Sheet & Tự Động Lưu</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeAdminSubTab === 'accounts'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quản Lý Tài Khoản ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminSubTab('quizzes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeAdminSubTab === 'quizzes'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Toàn Bộ Bài Làm Quiz ({quizHistory.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: GẮN LINK GOOGLE SHEET CHO ADMIN & AUTO-SYNC ENGINE */}
      {activeAdminSubTab === 'sheet' && (
        <div className="space-y-6">
          {/* Card: Vị trí gắn link Google Sheet cho admin */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Sheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Vị Trí Gắn Link Google Sheet Cho Quản Trị Viên (Admin)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dán đường link bảng tính Google Sheet để hệ thống tự động lưu điểm số, tài khoản và tiến độ học tập
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>Tự động lưu: BẬT</span>
              </div>
            </div>

            {/* Input Link Google Sheet */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Đường link hoặc Spreadsheet ID Google Sheets:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Link className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    placeholder="Ví dụ: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                    className="w-full pl-9 pr-3 py-3 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <button
                  onClick={handleSaveSheetLink}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu liên kết</span>
                </button>

                {savedSheetUrl && (
                  <a
                    href={savedSheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm border border-emerald-200 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Mở Google Sheet</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Auto-Sync Explanation Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-200/90 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tự động đồng bộ ngầm (Không cần bấm nút đẩy qua)</span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Tất cả thông tin trên ứng dụng được tự động lưu sang Google Sheet
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    Mỗi khi có học sinh/giáo viên tạo tài khoản mới, hoàn thành bài quiz, đổi mật khẩu hoặc học tập tích lũy XP, hệ thống tự động ghi nhận ngay lập tức vào 5 bảng tương ứng:
                    <strong> TaiKhoan</strong>, <strong>LichSuQuiz</strong>, <strong>TienDoHocTap</strong>, <strong>LoHongKienThuc</strong>, <strong>NganHangDeThi</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                  <button
                    onClick={handleConnectGoogle}
                    className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 shadow-2xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Cấp quyền Google Sheets</span>
                  </button>

                  <button
                    onClick={handleSyncAllData}
                    disabled={syncing}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    <span>{syncing ? 'Đang kiểm tra...' : 'Đồng bộ lại toàn bộ'}</span>
                  </button>
                </div>
              </div>

              {syncSuccessMsg && (
                <div className="p-3 rounded-xl bg-white border border-emerald-300 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Optional: Apps Script Webhook Integration */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-800">
                    Google Apps Script Webhook (Tùy chọn - Ghi dữ liệu trực tiếp 100% không cần đăng nhập Google)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Gắn Web App URL từ Google Sheets để mọi thiết bị học sinh đều có thể tự động ghi vào sheet mà không cần popup
                  </p>
                </div>

                <button
                  onClick={() => setShowCodeSnippet(!showCodeSnippet)}
                  className="text-xs text-indigo-700 font-bold hover:underline flex items-center gap-1"
                >
                  <Code className="w-3.5 h-3.5" />
                  <span>{showCodeSnippet ? 'Ẩn mã Apps Script' : 'Xem mã Apps Script'}</span>
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={webhookInput}
                  onChange={(e) => setWebhookInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleSaveWebhook}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200"
                >
                  Lưu Webhook
                </button>
              </div>

              {showCodeSnippet && (
                <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono space-y-2">
                  <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                    <span>Mã Google Apps Script (Tools &gt; Script editor):</span>
                    <button
                      onClick={handleCopyCode}
                      className="text-xs text-sky-400 font-bold flex items-center gap-1 hover:underline"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Đã sao chép' : 'Sao chép mã'}</span>
                    </button>
                  </div>
                  <pre className="overflow-x-auto text-[11px] leading-relaxed max-h-48 scrollbar-thin">
                    {SAMPLE_APPS_SCRIPT_CODE}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2 font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{accounts.length}</div>
              <span className="text-xs text-slate-500 font-medium">Tài khoản trên hệ thống</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{quizHistory.length}</div>
              <span className="text-xs text-slate-500 font-medium">Lượt làm bài trắc nghiệm</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 font-bold">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{bankQuizzes.length}</div>
              <span className="text-xs text-slate-500 font-medium">Đề trong ngân hàng</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-2 font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">{weakTopics.length}</div>
              <span className="text-xs text-slate-500 font-medium">Lỗ hổng kiến thức</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: QUẢN LÝ TÀI KHOẢN (Mở quyền quản lý toàn bộ cho admin) */}
      {activeAdminSubTab === 'accounts' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Quản lý toàn bộ tài khoản (Admin Control)
              </h3>
              <p className="text-xs text-slate-500">
                Xem chi tiết, đặt lại mật khẩu hoặc xóa tài khoản Học sinh & Giáo viên
              </p>
            </div>

            {/* Filter Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên, username, email..."
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    roleFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setRoleFilter('student')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    roleFilter === 'student' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Học sinh
                </button>
                <button
                  onClick={() => setRoleFilter('teacher')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    roleFilter === 'teacher' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Giáo viên
                </button>
                <button
                  onClick={() => setRoleFilter('admin')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    roleFilter === 'admin' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Admin
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tài khoản / Họ Tên</th>
                  <th className="py-2.5 px-3">Username / Email</th>
                  <th className="py-2.5 px-3">Vai trò</th>
                  <th className="py-2.5 px-3">Khối lớp / Môn</th>
                  <th className="py-2.5 px-3">Trường học</th>
                  <th className="py-2.5 px-3 text-right">Thao tác Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      <div>{acc.name}</div>
                      {acc.username === 'admin' && (
                        <span className="text-[10px] text-purple-700 font-bold">(Root Admin)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <div>{acc.username || '—'}</div>
                      <div className="text-[11px] text-slate-400">{acc.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          acc.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : acc.role === 'teacher'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {acc.role === 'teacher' ? 'GIÁO VIÊN' : acc.role === 'admin' ? 'ADMIN' : 'HỌC SINH'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {acc.grade} {acc.subject ? `• ${acc.subject}` : ''}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{acc.school || '—'}</td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        onClick={() => {
                          setResettingUser(acc);
                          setNewPasswordVal('');
                        }}
                        title="Đặt lại mật khẩu"
                        className="p-1 rounded-lg hover:bg-slate-200 text-slate-600"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {acc.username !== 'admin' && (
                        <button
                          onClick={() => handleDeleteAccount(acc)}
                          title="Xóa tài khoản"
                          className="p-1 rounded-lg hover:bg-rose-100 text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TOÀN BỘ LỊCH SỬ QUIZ */}
      {activeAdminSubTab === 'quizzes' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900">
              Toàn bộ lịch sử bài làm trắc nghiệm trên hệ thống
            </h3>
            <p className="text-xs text-slate-500">
              Theo dõi kết quả điểm thi và chuyên đề của học sinh
            </p>
          </div>

          {quizHistory.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              Chưa có bài thi trắc nghiệm nào được nộp trên hệ thống.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Thời gian</th>
                    <th className="py-2 px-3">Người làm</th>
                    <th className="py-2 px-3">Môn học</th>
                    <th className="py-2 px-3">Khối lớp</th>
                    <th className="py-2 px-3">Chủ đề</th>
                    <th className="py-2 px-3">Kết quả</th>
                    <th className="py-2 px-3">Điểm số</th>
                    <th className="py-2 px-3">Lỗ hổng kiến thức</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quizHistory.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3 text-slate-400 whitespace-nowrap">
                        {new Date(q.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {q.userName || 'Học sinh'}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-700">{q.subject}</td>
                      <td className="py-2 px-3 text-slate-600">{q.grade}</td>
                      <td className="py-2 px-3 text-slate-700 max-w-xs truncate">{q.topic}</td>
                      <td className="py-2 px-3 font-bold text-slate-800">
                        {q.correctCount}/{q.totalQuestions}
                      </td>
                      <td className="py-2 px-3 font-extrabold text-indigo-700">
                        {q.score.toFixed(1)}/10
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        {q.weakSubtopics && q.weakSubtopics.length > 0
                          ? q.weakSubtopics.join(', ')
                          : 'Đạt chuẩn'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Password Reset Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900">
              Đặt lại mật khẩu cho: {resettingUser.name}
            </h4>
            <p className="text-xs text-slate-500">
              Nhập mật khẩu mới cho tài khoản ({resettingUser.username || resettingUser.email}):
            </p>

            <input
              type="text"
              value={newPasswordVal}
              onChange={(e) => setNewPasswordVal(e.target.value)}
              placeholder="Nhập mật khẩu mới..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-indigo-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResettingUser(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmResetPassword}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Lưu mật khẩu mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
