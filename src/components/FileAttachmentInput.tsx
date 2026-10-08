import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Paperclip } from 'lucide-react';
import { UploadedFileItem } from '../types/study';

interface Props {
  files: UploadedFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFileItem[]>>;
  maxFiles?: number;
  label?: string;
  accept?: string;
}

export const FileAttachmentInput: React.FC<Props> = ({
  files,
  setFiles,
  maxFiles = 3,
  label = 'Tải ảnh hoặc tệp đề bài',
  accept = 'image/*,.pdf,.txt,.docx',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    Array.from(selectedFiles).forEach((file) => {
      if (files.length >= maxFiles) return;

      const reader = new FileReader();
      reader.onload = () => {
        const rawResult = reader.result as string;
        // Strip data:image/...;base64, prefix for Gemini
        const base64Data = rawResult.includes(',')
          ? rawResult.split(',')[1]
          : rawResult;

        const newItem: UploadedFileItem = {
          id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64Data,
          previewUrl: file.type.startsWith('image/') ? rawResult : undefined,
          size: file.size,
        };

        setFiles((prev) => [...prev, newItem].slice(0, maxFiles));
      };

      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Button to trigger file pick */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
        >
          <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
          <span>{label}</span>
        </button>
        <span className="text-[11px] text-slate-400">
          (Hỗ trợ ảnh chụp đề bài PNG, JPG, PDF)
        </span>
      </div>

      {/* List of attached files with previews */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {files.map((file) => {
            const isImage = file.mimeType.startsWith('image/');
            return (
              <div
                key={file.id}
                className="relative flex items-center gap-2 p-1.5 pr-2 rounded-xl bg-slate-50 border border-slate-200 text-xs max-w-xs shadow-2xs"
              >
                {isImage && file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                )}

                <div className="overflow-hidden">
                  <p className="font-semibold text-slate-800 truncate max-w-[140px] text-[11px]">
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemove(file.id)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-auto"
                  title="Xóa tệp"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
