import React, { useState } from 'react';
import { Calculator, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { QUICK_MATH_SYMBOLS } from '../utils/mathUtils';
import { FormulaReferenceModal } from './FormulaReferenceModal';

interface Props {
  onInsertSymbol: (symbol: string) => void;
  className?: string;
  compact?: boolean;
}

export const FormulaToolbar: React.FC<Props> = ({
  onInsertSymbol,
  className = '',
  compact = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Calculator className="w-3.5 h-3.5 text-indigo-600" />
          <span>Ký hiệu & Cấu trúc công thức chuẩn:</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors"
          >
            <BookOpen className="w-3 h-3" />
            <span>Cẩm nang công thức</span>
          </button>

          {compact && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded"
              title={expanded ? 'Thu gọn thanh ký hiệu' : 'Mở rộng thanh ký hiệu'}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin text-xs">
          {QUICK_MATH_SYMBOLS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onInsertSymbol(item.insert)}
              title={item.title}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-700 font-mono text-xs border border-slate-200/80 transition-colors whitespace-nowrap shrink-0 active:scale-95 shadow-2xs"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Modal Cẩm nang công thức */}
      <FormulaReferenceModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onInsertFormula={(formula) => onInsertSymbol(formula)}
      />
    </div>
  );
};
