import React, { useState } from 'react';
import {
  BookOpenCheck,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Lightbulb,
  Bookmark,
  Layers,
  Search,
} from 'lucide-react';
import { Grade, Subject } from '../types/study';
import { SUBJECTS, POPULAR_TOPICS } from '../data/subjects';
import { generateTopicReview } from '../services/api';
import { MarkdownContent } from './MarkdownContent';
import { saveReviewItem, getSavedReviews, SavedItem } from '../services/storage';
import { FormulaToolbar } from './FormulaToolbar';

interface Props {
  selectedGrade: Grade;
  setSelectedGrade: (grade: Grade) => void;
  selectedSubject: Subject;
  setSelectedSubject: (subject: Subject) => void;
  onReviewCreated: () => void;
}

export const ReviewTopic: React.FC<Props> = ({
  selectedGrade,
  setSelectedGrade,
  selectedSubject,
  setSelectedSubject,
  onReviewCreated,
}) => {
  const [topicInput, setTopicInput] = useState('');
  const [reviewResult, setReviewResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedReviews, setSavedReviews] = useState<SavedItem[]>(getSavedReviews());
  const [showHistory, setShowHistory] = useState(false);

  const handleGenerate = async (topicToUse?: string) => {
    const text = (topicToUse || topicInput).trim();
    if (!text || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await generateTopicReview(text, selectedGrade, selectedSubject);
      setReviewResult(result);
      onReviewCreated();

      const newItem: SavedItem = {
        id: `rev-${Date.now()}`,
        title: text,
        content: result,
        subject: selectedSubject,
        grade: selectedGrade,
        createdAt: Date.now(),
      };
      saveReviewItem(newItem);
      setSavedReviews(getSavedReviews());
    } catch (err: any) {
      console.error('Review error:', err);
      setErrorMessage(
        err.message || 'Không thể tạo đề cương ôn tập lúc này. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!reviewResult) return;
    navigator.clipboard.writeText(reviewResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredTopics = POPULAR_TOPICS.filter(
    (p) => p.subject === selectedSubject
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-purple-200 mb-3 border border-white/10">
            <BookOpenCheck className="w-3.5 h-3.5 text-pink-300" />
            <span>Hệ thống hóa & Đề cương thông minh</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Ôn bài & Tóm tắt kiến thức trọng tâm
          </h2>
          <p className="mt-2 text-purple-100 text-xs sm:text-sm leading-relaxed">
            Chỉ cần nhập tên bài học hoặc chuyên đề, AI sẽ xây dựng sơ đồ khái niệm,
            công thức cốt lõi, ví dụ mẫu, bẫy trắc nghiệm và tóm tắt 30 giây dễ học thuộc.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <span className="text-purple-200">Khối lớp:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value as Grade)}
                className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
              >
                {['Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'].map((g) => (
                  <option key={g} value={g} className="text-slate-900">
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <span className="text-purple-200">Môn học:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
              >
                {SUBJECTS.map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-900">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {savedReviews.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="ml-auto text-xs font-bold text-pink-200 hover:text-white flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Đề cương đã lưu ({savedReviews.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && savedReviews.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
            <span>Đề cương em đã từng ôn tập:</span>
            <button
              onClick={() => setShowHistory(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Đóng lại
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {savedReviews.slice(0, 6).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setTopicInput(item.title);
                  setReviewResult(item.content);
                  setShowHistory(false);
                }}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-left hover:border-purple-400 text-xs transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-semibold text-purple-600">
                    {item.subject} • {item.grade}
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <p className="font-medium text-slate-800 line-clamp-2 group-hover:text-purple-600">
                  {item.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Topic Input Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            Nhập tên bài học hoặc chuyên đề cần ôn tập ({selectedSubject} – {selectedGrade}):
          </label>

          {/* Quick Formula Toolbar */}
          <FormulaToolbar
            compact={true}
            onInsertSymbol={(sym) => {
              setTopicInput((prev) => {
                const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                return prev + space + sym;
              });
            }}
          />

          <div className="relative">
            <input
              type="text"
              value={topicInput}
              onChange={(e) => setTopicInput(e.target.value)}
              placeholder="Ví dụ: Định lý Vi-ét, Quang hợp ở thực vật, Thì Hiện tại hoàn thành, Lực đẩy Ác-si-mét..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-purple-500 focus:ring-3 focus:ring-purple-500/15"
            />
          </div>
        </div>

        {/* Popular Topic Suggestions for Current Subject */}
        {filteredTopics.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Chủ đề trọng tâm gợi ý môn {selectedSubject}:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredTopics.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTopicInput(item.topic);
                    handleGenerate(item.topic);
                  }}
                  className="text-xs bg-purple-50/70 hover:bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg border border-purple-200 transition-colors"
                >
                  {item.topic}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              setTopicInput('');
              setReviewResult(null);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            disabled={!topicInput.trim() || loading}
            onClick={() => handleGenerate()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-102"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>AI đang tổng hợp đề cương...</span>
              </>
            ) : (
              <>
                <BookOpenCheck className="w-4 h-4" />
                <span>Tổng hợp Đề cương & Ôn bài</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => handleGenerate()}
            className="font-bold underline hover:text-rose-900 text-xs"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 animate-pulse">
          <div className="h-6 bg-purple-100 rounded w-1/2" />
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
            <div className="h-3 bg-slate-100 rounded w-3/4" />
          </div>
          <div className="h-28 bg-purple-50/40 rounded-xl" />
        </div>
      )}

      {/* Review Document Result */}
      {reviewResult && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Đề cương ôn tập: {topicInput}
                </h3>
                <span className="text-[11px] text-slate-500">
                  {selectedSubject} • {selectedGrade}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Sao chép đề cương</span>
                </>
              )}
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <MarkdownContent content={reviewResult} />
          </div>
        </div>
      )}
    </div>
  );
};
