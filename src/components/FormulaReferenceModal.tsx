import React, { useState } from 'react';
import {
  X,
  Search,
  Copy,
  Check,
  PlusCircle,
  BookOpen,
  Sparkles,
  Calculator,
  Atom,
  FlaskConical,
  ChevronRight,
} from 'lucide-react';
import { STANDARD_FORMULAS, FormulaSnippet } from '../utils/mathUtils';
import { MarkdownContent } from './MarkdownContent';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onInsertFormula?: (latexSnippet: string) => void;
}

export const FormulaReferenceModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onInsertFormula,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = ['Tất cả', 'Toán học', 'Vật lý', 'Hóa học'];

  const filteredFormulas = STANDARD_FORMULAS.filter((f) => {
    const matchesCat =
      selectedCategory === 'Tất cả' || f.category === selectedCategory;
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      f.name.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query) ||
      f.latex.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (formula: FormulaSnippet) => {
    if (onInsertFormula) {
      onInsertFormula(formula.template || `$${formula.latex}$`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Cẩm nang & Quy chuẩn Công thức</h3>
              <p className="text-xs text-slate-300">
                Chuẩn hóa cấu trúc Toán - Lý - Hóa theo định dạng LaTeX quốc tế & SGK Việt Nam
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Category tabs */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm công thức (Vi-ét, Pytago, mol, pH...)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Content Formula Cards */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {filteredFormulas.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              Không tìm thấy công thức phù hợp với từ khóa "{search}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFormulas.map((formula) => {
                const isCopied = copiedId === formula.id;
                return (
                  <div
                    key={formula.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 bg-white shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Badge category & grade */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            formula.category === 'Toán học'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : formula.category === 'Vật lý'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {formula.category}
                        </span>
                        {formula.gradeLevel && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formula.gradeLevel}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm mb-2">
                        {formula.name}
                      </h4>

                      {/* Rendered Formula via KaTeX */}
                      <div className="my-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center overflow-x-auto text-center min-h-[56px]">
                        <MarkdownContent
                          content={`$$${formula.latex}$$`}
                          className="prose-p:my-0 text-sm"
                        />
                      </div>

                      {/* Explanation */}
                      <div className="text-xs text-slate-600 mb-3 leading-relaxed">
                        <MarkdownContent content={formula.description} compact={true} />
                      </div>
                    </div>

                    {/* Actions: Insert & Copy */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleCopy(formula.id, formula.template || `$${formula.latex}$`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
                        title="Sao chép cú pháp LaTeX"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                            <span>Chép mã LaTeX</span>
                          </>
                        )}
                      </button>

                      {onInsertFormula && (
                        <button
                          onClick={() => handleInsert(formula)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-2xs hover:scale-102"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Chèn vào bài</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Mẹo: Định dạng trong dòng dùng <code className="bg-slate-200 text-indigo-700 px-1 py-0.5 rounded font-mono">$...$</code>, dòng riêng biệt dùng <code className="bg-slate-200 text-indigo-700 px-1 py-0.5 rounded font-mono">$$...$$</code>.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
