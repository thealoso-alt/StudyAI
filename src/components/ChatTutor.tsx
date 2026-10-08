import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Bot,
  User,
  Lightbulb,
  AlertCircle,
  ChevronRight,
  Paperclip,
} from 'lucide-react';
import { Grade, Subject, ChatMessage, UploadedFileItem } from '../types/study';
import { SUBJECTS, SAMPLE_QUESTIONS_BY_SUBJECT } from '../data/subjects';
import { MarkdownContent } from './MarkdownContent';
import { sendMessageToTutor } from '../services/api';
import { FileAttachmentInput } from './FileAttachmentInput';
import { FormulaToolbar } from './FormulaToolbar';

interface Props {
  selectedGrade: Grade;
  setSelectedGrade: (grade: Grade) => void;
  selectedSubject: Subject;
  setSelectedSubject: (subject: Subject) => void;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onQuestionAsked: () => void;
  initialPrompt?: string;
  clearInitialPrompt?: () => void;
}

export const ChatTutor: React.FC<Props> = ({
  selectedGrade,
  setSelectedGrade,
  selectedSubject,
  setSelectedSubject,
  chatHistory,
  setChatHistory,
  onQuestionAsked,
  initialPrompt,
  clearInitialPrompt,
}) => {
  const [input, setInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<UploadedFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, loading]);

  // Handle external initial prompt if triggered from hero search
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSend(initialPrompt.trim());
      if (clearInitialPrompt) clearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleSend = async (messageText: string) => {
    const textToSend = messageText.trim();
    const hasFiles = attachedFiles.length > 0;
    if ((!textToSend && !hasFiles) || loading) return;

    setErrorMessage(null);
    setLastFailedMessage(null);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: textToSend || 'Em gửi hình ảnh/tệp đề bài này, nhờ Thầy/Cô hướng dẫn giải thích giúp em nhé!',
      timestamp: Date.now(),
      subject: selectedSubject,
      grade: selectedGrade,
      files: hasFiles
        ? attachedFiles.map((f) => ({ name: f.name, mimeType: f.mimeType }))
        : undefined,
    };

    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    const filesToUpload = [...attachedFiles];
    setInput('');
    setAttachedFiles([]);
    setLoading(true);
    onQuestionAsked();

    try {
      // Build conversation context: pass last 8 messages for context memory
      const contextMessages = newHistory.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await sendMessageToTutor(
        contextMessages,
        selectedGrade,
        selectedSubject,
        filesToUpload
      );

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        subject: selectedSubject,
        grade: selectedGrade,
      };

      setChatHistory([...newHistory, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMessage(
        err.message || 'Không thể kết nối đến Gia sư AI. Vui lòng thử lại.'
      );
      setLastFailedMessage(textToSend);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (window.confirm('Em có chắc muốn xóa lịch sử trò chuyện để bắt đầu chủ đề mới?')) {
      setChatHistory([]);
      setErrorMessage(null);
    }
  };

  const sampleQuestions =
    SAMPLE_QUESTIONS_BY_SUBJECT[selectedSubject] ||
    SAMPLE_QUESTIONS_BY_SUBJECT['Toán'];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] max-h-[820px] bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      {/* Chat Header Toolbar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Gia sư AI</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            </h2>
            <p className="text-[11px] text-slate-500">
              {selectedGrade} • Môn {selectedSubject}
            </p>
          </div>
        </div>

        {/* Grade & Subject Selectors */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value as Subject)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {chatHistory.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Bắt đầu hội thoại mới"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-rose-600 hover:border-rose-200 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-slate-50/50 to-white">
        {chatHistory.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col justify-center items-center text-center max-w-xl mx-auto py-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
              <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Chào em! Thầy/Cô StudyAI đã sẵn sàng hỗ trợ môn {selectedSubject} ({selectedGrade}).
            </h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Em có thể hỏi câu hỏi, dán đề bài hoặc chụp ảnh bài tập gửi lên. AI sẽ phân tích và hướng dẫn em từng bước.
            </p>

            {/* Quick Suggestions */}
            <div className="mt-6 w-full text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý câu hỏi môn {selectedSubject}:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="group flex items-start gap-2 p-3 text-left rounded-xl bg-white border border-slate-200/90 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-xs text-slate-700 shadow-2xs"
                  >
                    <ChevronRight className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform" />
                    <div className="flex-1 overflow-hidden pointer-events-none">
                      <MarkdownContent content={q} compact={true} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Chat History Messages */
          <>
            {chatHistory.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 max-w-3xl ${
                    isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-2xs ${
                      isUser
                        ? 'bg-indigo-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`group relative rounded-2xl p-4 text-sm leading-relaxed transition-all shadow-2xs ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                    }`}
                  >
                    {/* Attached files indicator */}
                    {msg.files && msg.files.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1.5 pb-2 border-b border-indigo-400/40 text-xs">
                        {msg.files.map((f, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/20 text-[11px]"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>{f.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {isUser ? (
                      <MarkdownContent content={msg.content} className="text-white prose-p:text-white prose-strong:text-white" />
                    ) : (
                      <>
                        <MarkdownContent content={msg.content} />
                        {/* Copy button */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                          <span className="text-[11px]">
                            {msg.subject ? `Môn ${msg.subject}` : ''} • Gia sư StudyAI
                          </span>
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors text-slate-400"
                            title="Sao chép nội dung"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600 text-[11px]">Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Sao chép</span>
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Thinking / Loading State */}
            {loading && (
              <div className="flex gap-3 max-w-3xl mr-auto">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-2xs">
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600">
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>Gia sư StudyAI đang suy nghĩ và chuẩn bị lời giải thích...</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message with Retry */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                {lastFailedMessage && (
                  <button
                    onClick={() => handleSend(lastFailedMessage)}
                    className="shrink-0 font-bold underline hover:text-rose-900"
                  >
                    Thử lại
                  </button>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0 space-y-2">
        {/* Attachment preview component */}
        <FileAttachmentInput
          files={attachedFiles}
          setFiles={setAttachedFiles}
          label="Đính kèm ảnh/tệp đề bài"
        />

        {/* Quick Formula Toolbar */}
        <FormulaToolbar
          compact={true}
          onInsertSymbol={(sym) => {
            setInput((prev) => {
              const space = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
              return prev + space + sym;
            });
            textareaRef.current?.focus();
          }}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="relative flex items-end gap-2"
        >
          <div className="relative flex-1 bg-slate-100 focus-within:bg-white rounded-2xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-3 focus-within:ring-indigo-500/15 transition-all">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Nhập câu hỏi hoặc tải ảnh đề bài môn ${selectedSubject} (Nhấn Enter gửi, Shift+Enter xuống dòng)...`}
              className="w-full bg-transparent px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32"
            />
          </div>

          <button
            type="submit"
            disabled={(!input.trim() && attachedFiles.length === 0) || loading}
            className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            title="Gửi câu hỏi"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400">
          Gia sư AI đồng hành cùng học sinh & GV: Nhận diện ảnh đề bài • Giải thích từng bước • Kiểm tra hiểu bài
        </p>
      </div>
    </div>
  );
};
