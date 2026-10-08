import React, { useState } from 'react';
import {
  BarChart3,
  Flame,
  Award,
  Target,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Calendar,
  Zap,
  TrendingUp,
  BrainCircuit,
  Sheet,
  ExternalLink,
  User,
  GraduationCap,
  Briefcase,
  Check,
} from 'lucide-react';
import { UserProfile, WeakTopicItem, QuizSubmissionResult, Grade, Subject } from '../types/study';
import {
  markWeakTopicResolved,
  getStoredQuizHistory,
} from '../services/storage';
import { getSpreadsheetUrl } from '../services/firebaseWorkspace';

interface Props {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  weakTopics: WeakTopicItem[];
  setWeakTopics: React.Dispatch<React.SetStateAction<WeakTopicItem[]>>;
  onGoToReview: (topic: string) => void;
  onGoToQuiz: (subject: Subject, topic: string) => void;
  onOpenAuth: () => void;
}

export const ProgressTracker: React.FC<Props> = ({
  profile,
  setProfile,
  weakTopics,
  setWeakTopics,
  onGoToReview,
  onGoToQuiz,
  onOpenAuth,
}) => {
  const quizHistory: QuizSubmissionResult[] = getStoredQuizHistory(profile.id);
  const sheetUrl = getSpreadsheetUrl();

  const handleResolveWeakTopic = (id: string) => {
    const updated = markWeakTopicResolved(id, profile.id);
    setWeakTopics(updated);
  };

  const totalQuizzes = quizHistory.length;
  const averageScore =
    totalQuizzes > 0
      ? (
          quizHistory.reduce((acc, q) => acc + q.score, 0) / totalQuizzes
        ).toFixed(1)
      : profile.stats.quizzesCompleted > 0
      ? (profile.stats.totalQuizScoreSum / profile.stats.quizzesCompleted).toFixed(1)
      : '0.0';

  // Subject performance breakdown based on quiz history
  const subjectScores: Record<string, { totalScore: number; count: number }> = {};
  quizHistory.forEach((q) => {
    if (!subjectScores[q.subject]) {
      subjectScores[q.subject] = { totalScore: 0, count: 0 };
    }
    subjectScores[q.subject].totalScore += q.score;
    subjectScores[q.subject].count += 1;
  });

  return (
    <div className="space-y-6">
      {/* Guest Mode Notice */}
      {profile.isGuest && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">Bạn đang xem ở chế độ Khách (Chưa đăng nhập)</h4>
              <p className="text-xs text-amber-800">
                Tiến độ học tập, điểm XP, chuỗi ngày học và phân tích lỗ hổng kiến thức chỉ được lưu chính xác khi bạn đăng nhập tài khoản Học sinh hoặc Giáo viên.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAuth}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
          >
            Đăng nhập / Đăng ký ngay
          </button>
        </div>
      )}

      {/* Profile & Level Overview Card */}
      <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-black shadow-lg">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold">{profile.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-semibold flex items-center gap-1">
                  {profile.role === 'teacher' ? (
                    <>
                      <Briefcase className="w-3 h-3 text-sky-300" />
                      <span>Giáo viên</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="w-3 h-3 text-indigo-300" />
                      <span>Học sinh</span>
                    </>
                  )}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                  {profile.grade}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {profile.email} • {profile.school || 'THCS/THPT'}
              </p>
            </div>
          </div>

          {/* Quick Metrics & Account Sync Action */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 rounded-2xl p-3 text-center border border-white/10">
              <div className="flex items-center justify-center gap-1 text-amber-400 font-bold text-lg">
                <Flame className="w-4 h-4 fill-amber-400" />
                <span>{profile.streakDays}</span>
              </div>
              <span className="text-[10px] text-slate-300">Chuỗi ngày</span>
            </div>

            <div className="bg-white/10 rounded-2xl p-3 text-center border border-white/10">
              <div className="flex items-center justify-center gap-1 text-sky-400 font-bold text-lg">
                <Award className="w-4 h-4" />
                <span>{profile.xp}</span>
              </div>
              <span className="text-[10px] text-slate-300">Điểm XP</span>
            </div>

            <div className="bg-white/10 rounded-2xl p-3 text-center border border-white/10">
              <div className="flex items-center justify-center gap-1 text-emerald-400 font-bold text-lg">
                <TrendingUp className="w-4 h-4" />
                <span>{averageScore}</span>
              </div>
              <span className="text-[10px] text-slate-300">Điểm TB Quiz</span>
            </div>

            <button
              onClick={onOpenAuth}
              className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
            >
              Đổi tài khoản
            </button>
          </div>
        </div>

        {/* Google Sheets Sync Banner */}
        {sheetUrl && (
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <Sheet className="w-4 h-4" />
              <span>Dữ liệu điểm số và tài khoản đã được đồng bộ trực tiếp với Google Sheets của bạn.</span>
            </div>
            <a
              href={sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <span>Mở bảng điểm Google Sheets</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
            <Zap className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {profile.stats.questionsAsked}
          </div>
          <span className="text-xs text-slate-500 font-medium">Câu hỏi đã trao đổi</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
            <Target className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {profile.stats.problemsSolved}
          </div>
          <span className="text-xs text-slate-500 font-medium">Bài tập đã giải</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {profile.stats.reviewsCreated}
          </div>
          <span className="text-xs text-slate-500 font-medium">Đề cương đã ôn</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {totalQuizzes || profile.stats.quizzesCompleted}
          </div>
          <span className="text-xs text-slate-500 font-medium">Bài thi trắc nghiệm</span>
        </div>
      </div>

      {/* QUIZ PERFORMANCE BY SUBJECT */}
      {Object.keys(subjectScores).length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Năng lực học tập theo từng môn học (Dựa trên lịch sử Quiz)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(subjectScores).map(([sub, data]) => {
              const subAvg = (data.totalScore / data.count).toFixed(1);
              const percent = Math.min(Math.round((Number(subAvg) / 10) * 100), 100);
              return (
                <div key={sub} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>{sub}</span>
                    <span className="text-indigo-600">{subAvg}/10 ({data.count} bài)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-sky-500 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* WEAK TOPICS SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Lỗ hổng kiến thức cần khắc phục
              </h3>
              <p className="text-xs text-slate-500">
                Tự động phát hiện từ các câu hỏi bị làm sai trong bài trắc nghiệm
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
            {weakTopics.filter((w) => w.status !== 'mastered').length} chuyên đề cần chú ý
          </span>
        </div>

        {weakTopics.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            🎉 Tuyệt vời! Chưa phát hiện lỗ hổng kiến thức nào. Hãy làm thêm các bài trắc nghiệm nhé!
          </div>
        ) : (
          <div className="space-y-3">
            {weakTopics.map((item) => {
              const isMastered = item.status === 'mastered';
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isMastered
                      ? 'bg-slate-50/60 border-slate-200 opacity-60'
                      : 'bg-white border-rose-200/80 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {item.subject}
                      </span>
                      {isMastered ? (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã nắm vững
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Sai {item.wrongCount} lần
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{item.topicName}</h4>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => onGoToReview(item.topicName)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                    >
                      Ôn lý thuyết ➔
                    </button>

                    <button
                      onClick={() => onGoToQuiz(item.subject, item.topicName)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                    >
                      Luyện lại trắc nghiệm
                    </button>

                    {!isMastered && (
                      <button
                        onClick={() => handleResolveWeakTopic(item.id)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                        title="Đánh dấu đã hiểu"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUIZ HISTORY TABLE */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base">
              Lịch sử làm bài trắc nghiệm (Đã lưu Firestore & Google Sheets)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {quizHistory.length} bài đã lưu
          </span>
        </div>

        {quizHistory.length === 0 ? (
          <p className="text-center py-6 text-slate-400 text-xs">
            Em chưa làm bài trắc nghiệm nào. Hãy vào mục "Trắc nghiệm" để bắt đầu thử sức nhé!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Môn học</th>
                  <th className="py-2.5 px-3">Chủ đề</th>
                  <th className="py-2.5 px-3">Số câu đúng</th>
                  <th className="py-2.5 px-3 text-right">Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quizHistory.slice(0, 15).map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(res.timestamp).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                      {res.subject} ({res.grade})
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium">
                      {res.topic}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {res.correctCount}/{res.totalQuestions}
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          res.score >= 8
                            ? 'bg-emerald-100 text-emerald-800'
                            : res.score >= 5
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {res.score}/10
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
