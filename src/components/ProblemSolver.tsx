import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { Grade, Subject, UploadedFileItem } from '../types/study';
import { SUBJECTS } from '../data/subjects';
import { solveProblemWithAI } from '../services/api';
import { MarkdownContent } from './MarkdownContent';
import { saveSolutionItem, SavedItem, getSavedSolutions } from '../services/storage';
import { FileAttachmentInput } from './FileAttachmentInput';
import { FormulaToolbar } from './FormulaToolbar';

interface Props {
  selectedGrade: Grade;
  setSelectedGrade: (grade: Grade) => void;
  selectedSubject: Subject;
  setSelectedSubject: (subject: Subject) => void;
  onProblemSolved: () => void;
}

const SAMPLE_PROBLEMS: Partial<Record<Subject, string[]>> = {
  Toán: [
    'Giải phương trình bậc hai: $2x^2 - 5x + 2 = 0$ bằng công thức nghiệm $\\Delta = b^2 - 4ac$ và phân tích nhân tử.',
    'Cho tam giác $ABC$ vuông tại $A$ có $AB = 9\\text{ cm}$, $AC = 12\\text{ cm}$. Kẻ đường cao $AH$. Tính độ dài $AH$, $BH$ và $CH$.',
    'Tìm giá trị lớn nhất và giá trị nhỏ nhất của hàm số $y = x^3 - 3x + 2$ trên đoạn $[0; 2]$.',
  ],
  'Vật lý': [
    'Một ô tô đang chuyển động với vận tốc ban đầu $v_0 = 72\\text{ km/h} = 20\\text{ m/s}$ thì hãm phanh chuyển động chậm dần đều với gia tốc $a = -2\\text{ m/s}^2$. Tính quãng đường $s$ ô tô đi được đến khi dừng hẳn và thời gian $t$ hãm phanh.',
    'Một mạch điện kín gồm nguồn điện có suất điện động $\\mathcal{E} = 12\\text{ V}$, điện trở trong $r = 1\\,\\Omega$ mắc với điện trở ngoài $R = 5\\,\\Omega$. Tính cường độ dòng điện $I$ và công suất tiêu thụ $P$ trên $R$.',
  ],
  'Hóa học': [
    'Hòa tan hoàn toàn $6{,}5\\text{ g}$ $\\mathrm{Zn}$ vào dung dịch $\\mathrm{HCl}$ dư. Viết phương trình phản ứng $\\mathrm{Zn + 2HCl \\rightarrow ZnCl_2 + H_2 \\uparrow}$, tính thể tích khí $\\mathrm{H_2}$ sinh ra (đktc) và khối lượng muối $\\mathrm{ZnCl_2}$ thu được.',
    'Đốt cháy hoàn toàn $4{,}4\\text{ g}$ một ankan $X$ thu được $6{,}72\\text{ lít}$ $\\mathrm{CO_2}$ (đktc). Xác định công thức phân tử và gọi tên ankan $X$.',
  ],
  'Tiếng Anh': [
    'Rewrite the sentence: "People believe that regular exercise improves mental health." using the passive voice structure with "It is believed that..." and "Regular exercise is believed...".',
    'Choose the correct form of the verbs in brackets: If I (know) your phone number yesterday, I (call) you to inform about the change in schedule.',
  ],
  'Sinh học': [
    'Ở một loài thực vật, alen A quy định thân cao trội hoàn toàn so với alen a quy định thân thấp. Cho cây thân cao dị hợp tự thụ phấn $Aa \\times Aa$. Xác định tỉ lệ kiểu gen và tỉ lệ kiểu hình ở đời $F_1$.',
  ],
};

export const ProblemSolver: React.FC<Props> = ({
  selectedGrade,
  setSelectedGrade,
  selectedSubject,
  setSelectedSubject,
  onProblemSolved,
}) => {
  const [problemText, setProblemText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<UploadedFileItem[]>([]);
  const [solution, setSolution] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [savedList, setSavedList] = useState<SavedItem[]>(getSavedSolutions());

  const handleSolve = async (textToSolve?: string) => {
    const text = (textToSolve !== undefined ? textToSolve : problemText).trim();
    const hasFiles = attachedFiles.length > 0;
    if (!text && !hasFiles) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const result = await solveProblemWithAI(
        text,
        selectedGrade,
        selectedSubject,
        attachedFiles
      );
      setSolution(result);
      onProblemSolved();

      const title = text
        ? text.length > 60
          ? text.substring(0, 60) + '...'
          : text
        : attachedFiles[0]?.name || 'Bài tập giải từ tệp đính kèm';

      const newItem: SavedItem = {
        id: `sol-${Date.now()}`,
        title,
        content: result,
        subject: selectedSubject,
        grade: selectedGrade,
        createdAt: Date.now(),
      };
      saveSolutionItem(newItem);
      setSavedList(getSavedSolutions());
    } catch (err: any) {
      console.error('Solve error:', err);
      setErrorMessage(
        err.message || 'Không thể tạo lời giải lúc này. Vui lòng kiểm tra lại đề bài và thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!solution) return;
    navigator.clipboard.writeText(solution);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveManual = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const samples =
    SAMPLE_PROBLEMS[selectedSubject] || SAMPLE_PROBLEMS['Toán'] || [];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-indigo-200 mb-3 border border-white/10">
            <Wand2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Phương pháp sư phạm 6 bước độc quyền</span>
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight">
            Giải bài tập từng bước – Hiểu sâu bản chất
          </h2>
          <p className="mt-2 text-indigo-100 text-xs sm:text-sm leading-relaxed">
            AI phân tích đề bài từ văn bản hoặc hình ảnh chụp, chỉ ra dữ kiện, công thức áp dụng,
            lời giải chi tiết từng bước, đáp số, giải thích tại sao và cảnh báo bẫy thi thường gặp.
          </p>

          {/* Configuration toolbar */}
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl backdrop-blur-xs">
              <span className="text-indigo-200">Khối lớp:</span>
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
              <span className="text-indigo-200">Môn học:</span>
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

            {savedList.length > 0 && (
              <button
                onClick={() => setHistoryOpen(!historyOpen)}
                className="ml-auto text-xs font-bold text-sky-200 hover:text-white flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Bài đã giải gần đây ({savedList.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Saved Solutions Drawer */}
      {historyOpen && savedList.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-xs font-bold text-slate-700">
            <span>Danh sách bài tập em đã nhờ AI giải:</span>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              Đóng lại
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {savedList.slice(0, 6).map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setProblemText(item.title);
                  setSolution(item.content);
                  setHistoryOpen(false);
                }}
                className="p-2.5 rounded-xl bg-white border border-slate-200 text-left hover:border-indigo-400 text-xs transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-semibold text-indigo-600">
                    {item.subject} • {item.grade}
                  </span>
                  <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <p className="font-medium text-slate-800 line-clamp-2 group-hover:text-indigo-600">
                  {item.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Problem Input Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            Nhập đề bài hoặc chụp/tải ảnh bài tập ({selectedSubject} – {selectedGrade}):
          </label>

          {/* Quick Formula Toolbar */}
          <FormulaToolbar
            onInsertSymbol={(sym) => {
              setProblemText((prev) => {
                const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                return prev + space + sym;
              });
            }}
          />

          <textarea
            rows={4}
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            placeholder="Dán hoặc gõ đề bài tập tại đây, dùng thanh ký hiệu phía trên để chèn công thức chuẩn..."
            className="w-full rounded-xl border border-slate-300 p-3.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/15"
          />
        </div>

        {/* Upload Attachment component */}
        <FileAttachmentInput
          files={attachedFiles}
          setFiles={setAttachedFiles}
          label="Tải ảnh đề bài / file bài tập"
        />

        {/* Sample Problems */}
        {samples.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              <span>Đề bài mẫu chuẩn định dạng để thử nghiệm:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {samples.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setProblemText(sample);
                    handleSolve(sample);
                  }}
                  className="text-xs bg-slate-50 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800 p-2.5 rounded-xl border border-slate-200 transition-all text-left shadow-2xs hover:shadow-xs group max-w-full"
                >
                  <MarkdownContent content={sample} compact={true} className="pointer-events-none group-hover:text-indigo-900" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => {
              setProblemText('');
              setAttachedFiles([]);
              setSolution(null);
              setErrorMessage(null);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Xóa trắng</span>
          </button>

          <button
            type="button"
            disabled={(!problemText.trim() && attachedFiles.length === 0) || loading}
            onClick={() => handleSolve()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-102"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>AI đang phân tích & giải bài...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Phân tích & Giải từng bước</span>
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
            onClick={() => handleSolve()}
            className="font-bold underline hover:text-rose-900 text-xs"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100" />
            <div className="h-4 bg-slate-200 rounded w-1/3" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
            <div className="h-3 bg-slate-100 rounded w-4/6" />
          </div>
          <div className="h-24 bg-indigo-50/50 rounded-xl" />
        </div>
      )}

      {/* Solution Presentation */}
      {solution && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Solution Toolbar */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Lời giải chi tiết 6 bước sư phạm
                </h3>
                <span className="text-[11px] text-slate-500">
                  {selectedSubject} • {selectedGrade}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                    <span>Sao chép</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSaveManual}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{savedSuccess ? 'Đã lưu vào bộ nhớ!' : 'Đã lưu'}</span>
              </button>
            </div>
          </div>

          {/* Solution Body */}
          <div className="p-6 sm:p-8">
            <MarkdownContent content={solution} />
          </div>

          {/* Educational Note Footer */}
          <div className="p-4 bg-indigo-50/60 border-t border-indigo-100 flex items-start gap-3 text-xs text-indigo-900">
            <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Lời khuyên từ StudyAI:</strong> Sau khi đọc lời giải, em hãy lấy giấy bút tự làm
              lại bài toán mà không nhìn tài liệu, sau đó giải thử phần <em>"Bài tập tự luyện tương tự"</em> ở cuối để chắc chắn đã nắm vững phương pháp nhé!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
