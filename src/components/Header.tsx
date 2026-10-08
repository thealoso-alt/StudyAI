import React from 'react';
import {
  GraduationCap,
  MessageSquareText,
  Wand2,
  BookOpenCheck,
  CheckCircle2,
  BarChart3,
  Flame,
  Award,
  ChevronDown,
  User,
  Sheet,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { Grade, ActiveTab, UserProfile } from '../types/study';
import { GRADES } from '../data/subjects';
import { getSpreadsheetUrl } from '../services/firebaseWorkspace';

interface Props {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedGrade: Grade;
  setSelectedGrade: (grade: Grade) => void;
  profile: UserProfile;
  onOpenAuth: () => void;
  onOpenFormulas?: () => void;
}

export const Header: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  selectedGrade,
  setSelectedGrade,
  profile,
  onOpenAuth,
  onOpenFormulas,
}) => {
  // Tabs: Bỏ menu admin trên thanh công cụ, chỉ giữ các tính năng học tập
  const tabs = [
    {
      id: 'chat' as ActiveTab,
      label: 'Hỏi AI',
      icon: MessageSquareText,
      badge: 'Gia sư 24/7',
    },
    {
      id: 'solver' as ActiveTab,
      label: 'Giải bài',
      icon: Wand2,
      badge: 'Từng bước',
    },
    {
      id: 'review' as ActiveTab,
      label: 'Ôn bài',
      icon: BookOpenCheck,
      badge: 'Trọng tâm',
    },
    {
      id: 'quiz' as ActiveTab,
      label: 'Trắc nghiệm',
      icon: CheckCircle2,
      badge: 'Luyện thi & Tạo đề',
    },
    {
      id: 'progress' as ActiveTab,
      label: 'Tiến độ',
      icon: BarChart3,
      badge: 'Lỗ hổng & Điểm',
    },
  ];

  const sheetUrl = getSpreadsheetUrl();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('chat')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                    StudyAI
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                    VN
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                  Trợ lý học tập & Tạo đề AI
                </p>
              </div>
            </button>

            {/* Quick Grade Selector in Header */}
            <div className="relative ml-2 sm:ml-4">
              <label htmlFor="grade-select" className="sr-only">
                Chọn khối lớp
              </label>
              <div className="flex items-center bg-slate-100 hover:bg-slate-200/80 transition-colors rounded-lg px-2.5 py-1.5 border border-slate-200/70 text-xs sm:text-sm font-semibold text-slate-700">
                <span className="text-slate-400 mr-1.5 text-xs hidden sm:inline">Khối:</span>
                <select
                  id="grade-select"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value as Grade)}
                  className="bg-transparent text-indigo-700 font-bold focus:outline-none cursor-pointer pr-4 appearance-none"
                >
                  {GRADES.map((g) => (
                    <option key={g} value={g} className="text-slate-800">
                      {g}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 -ml-3 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all relative ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User Account & Gamification Stats */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Formula Guide Button */}
            {onOpenFormulas && (
              <button
                onClick={onOpenFormulas}
                title="Cẩm nang tra cứu và chuẩn hóa công thức Toán - Lý - Hóa"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 text-xs font-bold transition-all shadow-2xs hover:scale-102"
              >
                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Công thức chuẩn</span>
              </button>
            )}

            {/* Google Sheet badge if linked */}
            {sheetUrl && (
              <a
                href={sheetUrl}
                target="_blank"
                rel="noreferrer"
                title="Bảng điểm Google Sheets tự động lưu"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Google Sheets</span>
              </a>
            )}

            {!profile.isGuest && (
              <>
                {/* Streak */}
                <div
                  title={`${profile.streakDays} ngày học tập liên tiếp!`}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-700 text-xs sm:text-sm font-bold shadow-2xs"
                >
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                  <span>{profile.streakDays}</span>
                  <span className="hidden sm:inline text-[11px] font-medium text-amber-600">
                    ngày
                  </span>
                </div>

                {/* XP */}
                <div
                  title={`${profile.xp} điểm kinh nghiệm tích lũy`}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-700 text-xs sm:text-sm font-bold shadow-2xs"
                >
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>{profile.xp}</span>
                  <span className="hidden sm:inline text-[11px] font-medium text-indigo-600">
                    XP
                  </span>
                </div>
              </>
            )}

            {/* Account Profile Button / Guest Login Button */}
            {profile.isGuest ? (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs"
                title="Đăng nhập hoặc Đăng ký để lưu kết quả"
              >
                <User className="w-3.5 h-3.5" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/90 border border-slate-200 text-xs font-bold text-slate-800 transition-colors shadow-2xs"
                title="Quản lý tài khoản & Đổi mật khẩu"
              >
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span className="max-w-[80px] sm:max-w-[120px] truncate">
                  {profile.role === 'admin' ? 'Admin: ' : profile.role === 'teacher' ? 'GV ' : ''}
                  {profile.name}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
