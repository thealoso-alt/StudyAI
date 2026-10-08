import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  MessageSquareText,
  Wand2,
  BookOpenCheck,
  CheckCircle2,
  Flame,
  Award,
  Target,
  Zap,
} from 'lucide-react';
import { ActiveTab, Grade, Subject, UserProfile } from '../types/study';
import { SUBJECTS } from '../data/subjects';

interface Props {
  profile: UserProfile;
  selectedGrade: Grade;
  selectedSubject: Subject;
  setSelectedSubject: (s: Subject) => void;
  setActiveTab: (tab: ActiveTab) => void;
  onQuickAsk: (question: string) => void;
  onOpenAuth?: () => void;
}

export const HeroSection: React.FC<Props> = ({
  profile,
  selectedGrade,
  selectedSubject,
  setSelectedSubject,
  setActiveTab,
  onQuickAsk,
  onOpenAuth,
}) => {
  const [quickInput, setQuickInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onQuickAsk(quickInput.trim());
    setQuickInput('');
  };

  const featureCards = [
    {
      tab: 'chat' as ActiveTab,
      title: 'Hỏi AI',
      subtitle: 'Gia sư đối thoại 24/7',
      desc: 'Hỏi mọi thắc mắc lý thuyết, bài học, mẹo nhớ. AI giải thích cặn kẽ và kiểm tra mức độ hiểu bài.',
      icon: MessageSquareText,
      color: 'from-blue-600 to-indigo-600',
      badge: 'Tương tác đa lượt',
      border: 'hover:border-blue-400',
    },
    {
      tab: 'solver' as ActiveTab,
      title: 'Giải bài tập',
      subtitle: 'Sư phạm 6 bước',
      desc: 'Phân tích đề -> dữ kiện -> công thức -> giải từng bước -> đáp số -> giải thích tại sao & bẫy cần tránh.',
      icon: Wand2,
      color: 'from-indigo-600 to-purple-600',
      badge: 'Không chỉ đáp án',
      border: 'hover:border-indigo-400',
    },
    {
      tab: 'review' as ActiveTab,
      title: 'Ôn bài',
      subtitle: 'Đề cương & Sơ đồ',
      desc: 'Hệ thống hóa kiến thức trọng tâm, bảng công thức, ví dụ mẫu, lỗi thường gặp và tóm tắt 30 giây.',
      icon: BookOpenCheck,
      color: 'from-purple-600 to-pink-600',
      badge: 'Chuẩn SGK mới',
      border: 'hover:border-purple-400',
    },
    {
      tab: 'quiz' as ActiveTab,
      title: 'Trắc nghiệm',
      subtitle: 'Luyện thi & Đánh giá',
      desc: 'Tự tạo đề trắc nghiệm chuẩn SGK, bấm giờ thi, chấm điểm tức thì và chỉ ra chính xác lỗ hổng kiến thức.',
      icon: CheckCircle2,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Bắt bệnh kiến thức',
      border: 'hover:border-emerald-400',
    },
  ];

  const totalActions =
    profile.stats.questionsAsked +
    profile.stats.problemsSolved +
    profile.stats.reviewsCreated +
    profile.stats.quizzesCompleted;
  const targetGoal = 10;
  const progressPercent = Math.min(Math.round((totalActions / targetGoal) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 lg:p-10 shadow-xl shadow-indigo-950/20">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold text-indigo-200 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Gia sư AI đồng hành cùng học sinh Việt Nam</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            Chào {profile.name}! 🌟
            <br />
            <span className="bg-gradient-to-r from-sky-300 via-indigo-200 to-white bg-clip-text text-transparent">
              Hôm nay em muốn chinh phục môn học nào ở {selectedGrade}?
            </span>
          </h1>

          <p className="mt-3 text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
            StudyAI không chỉ đưa ra đáp án – thầy/cô AI hướng dẫn từng bước, giải thích bản chất
            và rèn luyện tư duy tự học vững chắc cho em.
          </p>

          {/* Quick Question Input Box */}
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="relative flex items-center shadow-lg rounded-2xl overflow-hidden bg-white/95 backdrop-blur-md p-1.5 focus-within:ring-4 focus-within:ring-sky-400/40 transition-all border border-white/20">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder={`Nhập câu hỏi, bài tập hoặc chủ đề em đang thắc mắc (Môn ${selectedSubject})...`}
                className="w-full bg-transparent px-4 py-3 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!quickInput.trim()}
                className="shrink-0 flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-bold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                <span>Hỏi ngay</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Subject Select Pills */}
          <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-indigo-200 font-semibold mr-1 shrink-0">Chọn nhanh môn:</span>
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedSubject(s.id)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${
                  selectedSubject === s.id
                    ? 'bg-sky-400 text-slate-950 font-bold shadow-xs'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200'
                }`}
              >
                {s.id}
              </button>
            ))}
          </div>

          {/* Guest Reminder Banner */}
          {profile.isGuest && (
            <div className="mt-5 p-3.5 sm:p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-sky-100">
              <div>
                <strong>👋 Bạn đang trải nghiệm ở chế độ Khách.</strong>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Để mọi kết quả học tập, điểm thi và lịch sử hỏi đáp được lưu trữ và tự động đồng bộ sang Google Sheets, hãy đăng nhập tài khoản của bạn!
                </p>
              </div>
              {onOpenAuth && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-indigo-950 font-bold text-xs shadow-xs transition-colors shrink-0"
                >
                  Đăng nhập / Đăng ký
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress & Study Status Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Tiến độ học tập tuần này
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  {totalActions}/{targetGoal} mục tiêu
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mỗi bài hỏi, giải bài hay trắc nghiệm đều giúp em củng cố kiến thức và tích lũy XP!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs sm:text-sm font-semibold">
            <div className="flex items-center gap-1.5 text-amber-600">
              <Flame className="w-4 h-4 fill-amber-500" />
              <span>{profile.streakDays} ngày liên tiếp</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-600">
              <Award className="w-4 h-4" />
              <span>{profile.xp} XP</span>
            </div>
            <button
              onClick={() => setActiveTab('progress')}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Xem chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-600 mb-1.5 font-medium">
            <span>Hoàn thành mục tiêu: {progressPercent}%</span>
            <span>
              {totalActions >= targetGoal ? '🎉 Đạt chỉ tiêu xuất sắc!' : `Còn ${targetGoal - totalActions} bài nữa`}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 4 Chức năng chính */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              4 Chức năng học tập cùng StudyAI
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Chọn chức năng phù hợp với nhu cầu học tập của em
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.tab}
                onClick={() => setActiveTab(card.tab)}
                className={`group text-left bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between ${card.border}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600/80 mb-2">
                    {card.subtitle}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                  <span>Trải nghiệm ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
