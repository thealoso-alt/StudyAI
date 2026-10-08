import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Timer,
  Award,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  BookOpenCheck,
  Check,
  X,
  Target,
  Zap,
  Sheet,
  Download,
  Share2,
  FileText,
  PlusCircle,
  FolderOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Grade,
  Subject,
  QuizData,
  QuizQuestion,
  QuizSubmissionResult,
  UserProfile,
  UploadedFileItem,
  SavedBankQuiz,
} from '../types/study';
import { SUBJECTS, POPULAR_TOPICS } from '../data/subjects';
import { generateQuizFromAI } from '../services/api';
import { saveQuizResult, saveBankQuiz, getBankQuizzes } from '../services/storage';
import { autoSyncQuiz, syncQuizResult, getSpreadsheetUrl } from '../services/firebaseWorkspace';
import { FileAttachmentInput } from './FileAttachmentInput';
import { MarkdownContent } from './MarkdownContent';
import { FormulaToolbar } from './FormulaToolbar';

interface Props {
  selectedGrade: Grade;
  setSelectedGrade: (grade: Grade) => void;
  selectedSubject: Subject;
  setSelectedSubject: (subject: Subject) => void;
  currentUser: UserProfile;
  onQuizCompleted: (result: QuizSubmissionResult) => void;
  onGoToReview: (topic: string) => void;
  onNotification: (msg: string) => void;
  onOpenAuth?: () => void;
}

export const QuizModule: React.FC<Props> = ({
  selectedGrade,
  setSelectedGrade,
  selectedSubject,
  setSelectedSubject,
  currentUser,
  onQuizCompleted,
  onGoToReview,
  onNotification,
  onOpenAuth,
}) => {
  // Mode: 'student_practice' or 'teacher_creator'
  const [subMode, setSubMode] = useState<'practice' | 'creator'>('practice');

  // Generator parameters
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [customTeacherPrompt, setCustomTeacherPrompt] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<UploadedFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active quiz state
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Timer
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Bank of created quizzes
  const [bankQuizzes, setBankQuizzes] = useState<SavedBankQuiz[]>(getBankQuizzes());
  const [showBank, setShowBank] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && !submitted) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, submitted]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const handleCreateQuiz = async (overrideTopic?: string) => {
    const finalTopic = (overrideTopic !== undefined ? overrideTopic : topic).trim();
    const hasFiles = attachedFiles.length > 0;
    if (!finalTopic && !hasFiles) return;

    setLoading(true);
    setErrorMessage(null);
    setSubmitted(false);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setSecondsElapsed(0);
    setQuizResult(null);
    setSyncStatus(null);

    try {
      const data = await generateQuizFromAI(
        selectedSubject,
        selectedGrade,
        finalTopic,
        questionCount,
        difficulty,
        attachedFiles,
        customTeacherPrompt,
        currentUser.role
      );

      if (!data.questions || data.questions.length === 0) {
        throw new Error('Không tạo được câu hỏi. Vui lòng thử lại với nội dung cụ thể hơn.');
      }

      setQuizData(data);

      // Auto save to Question Bank for Teachers or Practice
      const bankItem: SavedBankQuiz = {
        id: `bank-${Date.now()}`,
        title: data.title || `Trắc nghiệm: ${data.topic || finalTopic}`,
        topic: data.topic || finalTopic,
        grade: selectedGrade,
        subject: selectedSubject,
        creatorName: currentUser.name,
        creatorRole: currentUser.role,
        createdAt: Date.now(),
        data,
      };
      saveBankQuiz(bankItem);
      setBankQuizzes(getBankQuizzes());

      if (subMode === 'practice') {
        setTimerActive(true);
      }
      onNotification(`Đã tạo thành công bộ ${data.questions.length} câu hỏi chuẩn JSON!`);
    } catch (err: any) {
      console.error('Quiz creation error:', err);
      setErrorMessage(
        err.message || 'Lỗi khi tạo đề trắc nghiệm. Vui lòng kiểm tra lại và thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, letter: string) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: letter,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quizData) return;

    const total = quizData.questions.length;
    let correct = 0;
    const weakList: string[] = [];

    quizData.questions.forEach((q) => {
      const userChoice = (selectedAnswers[q.id] || '').trim().toUpperCase();
      const actualCorrect = (q.correctAnswer || '').trim().charAt(0).toUpperCase();

      if (userChoice === actualCorrect) {
        correct += 1;
      } else {
        if (q.subtopic) {
          weakList.push(q.subtopic);
        }
      }
    });

    const rawScore = (correct / total) * 10;
    const finalScore = Math.round(rawScore * 10) / 10;

    const result: QuizSubmissionResult = {
      id: `quiz-res-${Date.now()}`,
      timestamp: Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      userEmail: currentUser.email,
      userRole: currentUser.role,
      subject: selectedSubject,
      grade: selectedGrade,
      topic: quizData.topic || topic,
      score: finalScore,
      correctCount: correct,
      totalQuestions: total,
      userAnswers: selectedAnswers,
      weakSubtopics: Array.from(new Set(weakList)),
      questions: quizData.questions,
    };

    setSubmitted(true);
    setTimerActive(false);
    setQuizResult(result);

    if (currentUser.isGuest) {
      setSyncStatus('Chế độ Khách: Kết quả không được lưu vào hồ sơ. Vui lòng đăng nhập để lưu kết quả.');
    } else {
      // Save locally for this user
      saveQuizResult(result);
      onQuizCompleted(result);

      // Auto-sync in background to Google Sheets & Firestore without user needing to click buttons
      setSyncStatus('Đang tự động đồng bộ kết quả sang Google Sheets...');
      autoSyncQuiz(result, currentUser);
      syncQuizResult(result, currentUser).then((syncRes) => {
        if (syncRes.sheetsSuccess || syncRes.firestoreSuccess) {
          setSyncStatus('Đã tự động lưu kết quả vào tài khoản và Google Sheets!');
        } else {
          setSyncStatus('Đã tự động lưu kết quả vào tài khoản của bạn.');
        }
      });
    }

    // Confetti celebration if score >= 8
    if (finalScore >= 8) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const currentQ: QuizQuestion | undefined = quizData?.questions[currentQuestionIndex];

  const getChoiceLetter = (optStr: string, idx: number) => {
    const letters = ['A', 'B', 'C', 'D'];
    const trimmed = optStr.trim();
    if (trimmed.length >= 2 && trimmed[1] === '.') {
      return trimmed[0].toUpperCase();
    }
    return letters[idx] || 'A';
  };

  const handleExportJSON = () => {
    if (!quizData) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(quizData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `StudyAI_Quiz_${quizData.topic || 'DeThi'}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onNotification('Đã tải tệp JSON câu hỏi về máy!');
  };

  const subjectPopularTopics = POPULAR_TOPICS.filter(
    (p) => p.subject === selectedSubject
  );

  const sheetUrl = getSpreadsheetUrl();

  return (
    <div className="space-y-6">
      {/* Quiz Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-emerald-200 mb-3 border border-white/10">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Đánh giá năng lực • Tạo đề GV • Đồng bộ Google Sheets</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Luyện thi & Soạn thảo trắc nghiệm chuẩn JSON
          </h2>
          <p className="mt-2 text-emerald-100 text-xs sm:text-sm leading-relaxed">
            Hỗ trợ học sinh tự luyện thi bấm giờ, và hỗ trợ thầy cô tạo đề thi trắc nghiệm từ văn bản hoặc ảnh chụp đề thi.
            Mọi bài thi đều được tự động lưu vào <strong>Firestore</strong> và bảng tính <strong>Google Sheets</strong>.
          </p>

          {/* Mode Switch: Practice vs Teacher Quiz Creator */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setSubMode('practice');
                setQuizData(null);
                setSubmitted(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                subMode === 'practice'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Học sinh: Luyện đề & Bấm giờ
            </button>
            <button
              onClick={() => {
                setSubMode('creator');
                setQuizData(null);
                setSubmitted(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                subMode === 'creator'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'bg-white/15 text-white hover:bg-white/25'
              }`}
            >
              Giáo viên / Tự tạo đề: Soạn đề & Xuất JSON
            </button>

            {bankQuizzes.length > 0 && (
              <button
                onClick={() => setShowBank(!showBank)}
                className="ml-auto text-xs font-bold text-sky-200 hover:text-white flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Ngân hàng đề ({bankQuizzes.length})</span>
              </button>
            )}
          </div>

          {/* Config Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <span className="text-emerald-200">Khối lớp:</span>
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
              <span className="text-emerald-200">Môn học:</span>
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

            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <span className="text-emerald-200">Số câu:</span>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value={3} className="text-slate-900">
                  3 câu
                </option>
                <option value={5} className="text-slate-900">
                  5 câu
                </option>
                <option value={10} className="text-slate-900">
                  10 câu
                </option>
                <option value={15} className="text-slate-900">
                  15 câu
                </option>
                <option value={20} className="text-slate-900">
                  20 câu
                </option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <span className="text-emerald-200">Mức độ:</span>
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')
                }
                className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
              >
                <option value="easy" className="text-slate-900">
                  Nhận biết & Thông hiểu
                </option>
                <option value="medium" className="text-slate-900">
                  Thông hiểu & Vận dụng
                </option>
                <option value="hard" className="text-slate-900">
                  Vận dụng cao
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Question Bank Drawer */}
      {showBank && bankQuizzes.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
            <span>Ngân hàng đề thi đã tạo:</span>
            <button
              onClick={() => setShowBank(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Đóng lại
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {bankQuizzes.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-white border border-slate-200 text-left hover:border-emerald-400 text-xs transition-all shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-emerald-700">
                    {item.subject} • {item.grade}
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <h5 className="font-bold text-slate-900 line-clamp-2">{item.title}</h5>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {item.data.questions?.length || 0} câu
                  </span>
                  <button
                    onClick={() => {
                      setQuizData(item.data);
                      setSubmitted(false);
                      setCurrentQuestionIndex(0);
                      setSelectedAnswers({});
                      setShowBank(false);
                    }}
                    className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[11px] hover:bg-emerald-700"
                  >
                    Mở đề này
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QUIZ GENERATOR FORM (When no active quiz) */}
      {!quizData && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-800">
              Chủ đề bài kiểm tra trắc nghiệm ({selectedSubject} – {selectedGrade}):
            </label>

            {/* Quick Formula Toolbar */}
            <FormulaToolbar
              compact={true}
              onInsertSymbol={(sym) => {
                setTopic((prev) => {
                  const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                  return prev + space + sym;
                });
              }}
            />

            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ví dụ: Phương trình bậc hai $ax^2+bx+c=0$, Định luật Ôm $I=U/R$, Quang hợp..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-3 focus:ring-emerald-500/15"
            />
          </div>

          {/* Teacher custom prompt if in creator mode */}
          {subMode === 'creator' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yêu cầu sư phạm bổ sung của Thầy/Cô (Tùy chọn):
              </label>
              <textarea
                rows={2}
                value={customTeacherPrompt}
                onChange={(e) => setCustomTeacherPrompt(e.target.value)}
                placeholder="Ví dụ: Tập trung vào các bẫy đề thi học kỳ, có 2 câu toán thực tế, bám sát đề thi tuyển sinh lớp 10..."
                className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Multimodal upload: attach photos or documents */}
          <FileAttachmentInput
            files={attachedFiles}
            setFiles={setAttachedFiles}
            label="Tải ảnh tài liệu / ảnh chụp đề thi"
          />

          {/* Suggested topics */}
          {subjectPopularTopics.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-500 mb-2 block">
                Chủ đề trắc nghiệm gợi ý môn {selectedSubject}:
              </span>
              <div className="flex flex-wrap gap-2">
                {subjectPopularTopics.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setTopic(item.topic);
                      handleCreateQuiz(item.topic);
                    }}
                    className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                  >
                    {item.topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={(!topic.trim() && attachedFiles.length === 0) || loading}
              onClick={() => handleCreateQuiz()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-102"
            >
              {loading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>AI đang soạn đề thi trắc nghiệm chuẩn JSON...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>{subMode === 'creator' ? 'Tạo đề & Lưu ngân hàng' : 'Bắt đầu làm bài thi'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            onClick={() => handleCreateQuiz()}
            className="font-bold underline text-xs hover:text-rose-900"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 animate-pulse">
          <div className="h-5 bg-emerald-100 rounded w-1/3" />
          <div className="h-10 bg-slate-100 rounded w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="h-12 bg-slate-50 rounded-xl border border-slate-100" />
            <div className="h-12 bg-slate-50 rounded-xl border border-slate-100" />
            <div className="h-12 bg-slate-50 rounded-xl border border-slate-100" />
            <div className="h-12 bg-slate-50 rounded-xl border border-slate-100" />
          </div>
        </div>
      )}

      {/* ACTIVE QUIZ VIEW */}
      {quizData && currentQ && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Top Status Bar: Timer & Actions */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {quizData.title || `Trắc nghiệm: ${quizData.topic}`}
              </h3>
              <p className="text-[11px] text-slate-500">
                {selectedSubject} • {selectedGrade} • {quizData.questions.length} câu hỏi
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
                title="Tải cấu trúc JSON của đề thi"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Xuất JSON</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
                <Timer className="w-3.5 h-3.5 text-indigo-600" />
                <span>{formatTime(secondsElapsed)}</span>
              </div>

              {!submitted ? (
                <button
                  onClick={handleSubmitQuiz}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  Nộp bài chấm điểm
                </button>
              ) : (
                <button
                  onClick={() => {
                    setQuizData(null);
                    setSubmitted(false);
                    setQuizResult(null);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Tạo đề khác</span>
                </button>
              )}
            </div>
          </div>

          {/* Question Navigation Bubbles */}
          <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-200/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 mr-1 shrink-0">
              Câu:
            </span>
            {quizData.questions.map((q, idx) => {
              const isAnswered = selectedAnswers[q.id] !== undefined;
              const isCurrent = idx === currentQuestionIndex;
              const isCorrect =
                submitted &&
                selectedAnswers[q.id] ===
                  (q.correctAnswer || '').trim().charAt(0).toUpperCase();

              let btnStyle = 'bg-white border-slate-200 text-slate-700';
              if (submitted) {
                btnStyle = isCorrect
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-rose-600 text-white border-rose-600';
              } else if (isCurrent) {
                btnStyle = 'bg-indigo-600 text-white border-indigo-600 font-bold';
              } else if (isAnswered) {
                btnStyle = 'bg-indigo-50 text-indigo-700 border-indigo-300 font-bold';
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`w-8 h-8 rounded-lg border text-xs font-semibold flex items-center justify-center shrink-0 transition-all ${btnStyle}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Current Question Body */}
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  Câu hỏi {currentQuestionIndex + 1}/{quizData.questions.length}
                </span>
                {currentQ.subtopic && (
                  <span className="text-xs text-slate-500 font-medium">
                    Chuyên đề: <strong>{currentQ.subtopic}</strong>
                  </span>
                )}
              </div>
              <div className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                <MarkdownContent content={currentQ.question} compact={true} />
              </div>
            </div>

            {/* 4 Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentQ.options.map((opt, oIdx) => {
                const choiceLetter = getChoiceLetter(opt, oIdx);
                const isSelected = selectedAnswers[currentQ.id] === choiceLetter;
                const correctLetter = (currentQ.correctAnswer || '')
                  .trim()
                  .charAt(0)
                  .toUpperCase();
                const isActuallyCorrect = choiceLetter === correctLetter;

                let optCardStyle =
                  'bg-white border-slate-200 hover:border-indigo-400 hover:bg-slate-50';

                if (submitted) {
                  if (isActuallyCorrect) {
                    optCardStyle =
                      'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold ring-1 ring-emerald-500';
                  } else if (isSelected && !isActuallyCorrect) {
                    optCardStyle =
                      'bg-rose-50 border-rose-500 text-rose-950 line-through ring-1 ring-rose-500';
                  } else {
                    optCardStyle = 'bg-slate-50/50 border-slate-200 opacity-60';
                  }
                } else if (isSelected) {
                  optCardStyle =
                    'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-semibold ring-2 ring-indigo-500/30';
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={submitted}
                    onClick={() => handleSelectOption(currentQ.id, choiceLetter)}
                    className={`p-4 rounded-xl border text-left text-sm transition-all flex items-start gap-3 shadow-2xs ${optCardStyle}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        submitted
                          ? isActuallyCorrect
                            ? 'bg-emerald-600 text-white'
                            : isSelected
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                          : isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {submitted ? (
                        isActuallyCorrect ? (
                          <Check className="w-4 h-4" />
                        ) : isSelected ? (
                          <X className="w-4 h-4" />
                        ) : (
                          choiceLetter
                        )
                      ) : (
                        choiceLetter
                      )}
                    </div>
                    <div className="flex-1 mt-0.5 pointer-events-none overflow-hidden">
                      <MarkdownContent content={opt} compact={true} />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation Section */}
            {submitted && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                  <BookOpenCheck className="w-4 h-4 text-indigo-600" />
                  <span>
                    Đáp án đúng: <strong>{currentQ.correctAnswer}</strong>
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  <MarkdownContent content={currentQ.explanation} />
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={currentQuestionIndex === 0}
                onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Câu trước</span>
              </button>

              <div className="text-xs text-slate-400 font-medium">
                Đã làm: {Object.keys(selectedAnswers).length}/{quizData.questions.length} câu
              </div>

              {currentQuestionIndex < quizData.questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <span>Câu kế tiếp</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : !submitted ? (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  <span>Nộp bài ngay</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setQuizData(null);
                    setSubmitted(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors"
                >
                  <span>Làm đề khác</span>
                </button>
              )}
            </div>
          </div>

          {/* QUIZ RESULTS SCORECARD */}
          {submitted && quizResult && (
            <div className="p-6 bg-gradient-to-br from-indigo-50/70 via-white to-emerald-50/50 border-t border-slate-200">
              <div className="max-w-2xl mx-auto space-y-5">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-md mb-2">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Kết quả bài kiểm tra: {quizResult.score}/10 điểm
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Đúng {quizResult.correctCount}/{quizResult.totalQuestions} câu • Hoàn thành trong{' '}
                    {formatTime(secondsElapsed)}
                  </p>

                  {/* Sync status indicator */}
                  {syncStatus && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
                      <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{syncStatus}</span>
                      {sheetUrl && (
                        <a
                          href={sheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-emerald-800"
                        >
                          Mở Sheet ➔
                        </a>
                      )}
                    </div>
                  )}

                  {/* Guest Notice & Login Prompt */}
                  {currentUser.isGuest && onOpenAuth && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                      <span>
                        ⚠️ Bạn đang ở chế độ Khách. Kết quả này chưa được lưu. Hãy đăng nhập tài khoản để lưu điểm và cập nhật Google Sheet!
                      </span>
                      <button
                        type="button"
                        onClick={onOpenAuth}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs whitespace-nowrap shadow-xs transition-colors shrink-0"
                      >
                        Đăng nhập để lưu kết quả
                      </button>
                    </div>
                  )}
                </div>

                {/* Score commentary */}
                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs sm:text-sm text-slate-700">
                  {quizResult.score >= 8.0 ? (
                    <p className="font-semibold text-emerald-700 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      Xuất sắc! Em đã nắm rất chắc kiến thức chủ đề này!
                    </p>
                  ) : quizResult.score >= 5.0 ? (
                    <p className="font-semibold text-amber-700 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-amber-500" />
                      Khá tốt! Em hiểu kiến thức cơ bản nhưng cần xem lại các chủ đề yếu bên dưới.
                    </p>
                  ) : (
                    <p className="font-semibold text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      Cần cố gắng thêm! Hãy xem lại phần ôn bài và làm lại nhé.
                    </p>
                  )}
                </div>

                {/* Weak Topics Identification */}
                {quizResult.weakSubtopics.length > 0 && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Các chủ đề em còn trả lời sai (Lỗ hổng kiến thức):</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {quizResult.weakSubtopics.map((weak, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-rose-200 text-xs text-rose-900 font-semibold shadow-2xs"
                        >
                          <span>{weak}</span>
                          <button
                            onClick={() => onGoToReview(weak)}
                            className="text-[11px] bg-rose-100 hover:bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-bold transition-colors"
                          >
                            Ôn ngay ➔
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
