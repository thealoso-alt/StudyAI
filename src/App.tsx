import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  Grade,
  Subject,
  UserProfile,
  ChatMessage,
  WeakTopicItem,
  QuizSubmissionResult,
} from './types/study';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ChatTutor } from './components/ChatTutor';
import { ProblemSolver } from './components/ProblemSolver';
import { ReviewTopic } from './components/ReviewTopic';
import { QuizModule } from './components/QuizModule';
import { ProgressTracker } from './components/ProgressTracker';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { FormulaReferenceModal } from './components/FormulaReferenceModal';
import {
  getStoredProfile,
  saveProfile,
  getStoredChatHistory,
  saveChatHistory,
  getStoredWeakTopics,
  incrementStat,
} from './services/storage';
import { initAuth } from './services/firebaseWorkspace';

export default function App() {
  const [profile, setProfile] = useState<UserProfile>(getStoredProfile);
  const [selectedGrade, setSelectedGrade] = useState<Grade>(profile.grade);
  const [selectedSubject, setSelectedSubject] = useState<Subject>(profile.favoriteSubject);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => getStoredChatHistory(profile.id));
  const [weakTopics, setWeakTopics] = useState<WeakTopicItem[]>(() => getStoredWeakTopics(profile.id));
  const [initialChatPrompt, setInitialChatPrompt] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [formulaModalOpen, setFormulaModalOpen] = useState(false);

  // Initialize auth listener
  useEffect(() => {
    initAuth((user) => {
      if (user && user.displayName) {
        setProfile((prev) => {
          const updated = {
            ...prev,
            name: user.displayName || prev.name,
            email: user.email || prev.email,
          };
          saveProfile(updated);
          return updated;
        });
      }
    });
  }, []);

  // Handle active user change (Login, Logout, Register)
  const handleUserChanged = (updated: UserProfile) => {
    setProfile(updated);
    setSelectedGrade(updated.grade);
    setSelectedSubject(updated.favoriteSubject);
    setChatHistory(getStoredChatHistory(updated.id));
    setWeakTopics(getStoredWeakTopics(updated.id));
  };

  // Sync profile grade changes
  const handleGradeChange = (grade: Grade) => {
    setSelectedGrade(grade);
    const updated = { ...profile, grade };
    setProfile(updated);
    saveProfile(updated);
  };

  // Sync chat history scoped to active user
  useEffect(() => {
    saveChatHistory(chatHistory, profile.id);
  }, [chatHistory, profile.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Callback when student asks a question in chat
  const handleQuestionAsked = () => {
    const updated = incrementStat('questionsAsked');
    setProfile(updated);
    showToast('+15 XP: Đã trao đổi cùng Gia sư StudyAI! 🌟');
  };

  // Callback when a problem is solved
  const handleProblemSolved = () => {
    const updated = incrementStat('problemsSolved');
    setProfile(updated);
    showToast('+20 XP: Đã hoàn thành 1 bài tập phân tích 6 bước! 🚀');
  };

  // Callback when review is created
  const handleReviewCreated = () => {
    const updated = incrementStat('reviewsCreated');
    setProfile(updated);
    showToast('+15 XP: Đã ôn tập hệ thống hóa kiến thức! 📚');
  };

  // Callback when quiz is completed
  const handleQuizCompleted = (result: QuizSubmissionResult) => {
    setProfile(getStoredProfile());
    setWeakTopics(getStoredWeakTopics(profile.id));
    showToast(`+${Math.round(result.score * 10)} XP: Hoàn thành bài trắc nghiệm (${result.score}/10 điểm)! 🎯`);
  };

  // Quick ask from hero input
  const handleQuickAsk = (questionText: string) => {
    setInitialChatPrompt(questionText);
    setActiveTab('chat');
  };

  // Navigation shortcuts from Weak Topics
  const handleGoToReview = (topicName: string) => {
    setActiveTab('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoToQuiz = (subject: Subject, topicName: string) => {
    setSelectedSubject(subject);
    setActiveTab('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedGrade={selectedGrade}
        setSelectedGrade={handleGradeChange}
        profile={profile}
        onOpenAuth={() => setAuthModalOpen(true)}
        onOpenFormulas={() => setFormulaModalOpen(true)}
      />

      {/* Auth / Register / Google Sheets Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={profile}
        onUserChanged={handleUserChanged}
        onNotification={showToast}
      />

      {/* Standard Formula Reference Modal */}
      <FormulaReferenceModal
        isOpen={formulaModalOpen}
        onClose={() => setFormulaModalOpen(false)}
        onInsertFormula={(formula) => {
          setInitialChatPrompt(formula);
          setActiveTab('chat');
          showToast('Đã chèn công thức chuẩn vào khung trò chuyện! ✨');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Render Active View */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            {chatHistory.length === 0 && (
              <HeroSection
                profile={profile}
                selectedGrade={selectedGrade}
                selectedSubject={selectedSubject}
                setSelectedSubject={setSelectedSubject}
                setActiveTab={setActiveTab}
                onQuickAsk={handleQuickAsk}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}

            <ChatTutor
              selectedGrade={selectedGrade}
              setSelectedGrade={handleGradeChange}
              selectedSubject={selectedSubject}
              setSelectedSubject={setSelectedSubject}
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              onQuestionAsked={handleQuestionAsked}
              initialPrompt={initialChatPrompt}
              clearInitialPrompt={() => setInitialChatPrompt('')}
            />
          </div>
        )}

        {activeTab === 'solver' && (
          <ProblemSolver
            selectedGrade={selectedGrade}
            setSelectedGrade={handleGradeChange}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            onProblemSolved={handleProblemSolved}
          />
        )}

        {activeTab === 'review' && (
          <ReviewTopic
            selectedGrade={selectedGrade}
            setSelectedGrade={handleGradeChange}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            onReviewCreated={handleReviewCreated}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizModule
            selectedGrade={selectedGrade}
            setSelectedGrade={handleGradeChange}
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            currentUser={profile}
            onQuizCompleted={handleQuizCompleted}
            onGoToReview={handleGoToReview}
            onNotification={showToast}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTracker
            profile={profile}
            setProfile={setProfile}
            weakTopics={weakTopics}
            setWeakTopics={setWeakTopics}
            onGoToReview={handleGoToReview}
            onGoToQuiz={handleGoToQuiz}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel
            currentUser={profile}
            onUserChanged={handleUserChanged}
            onNotification={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-700">StudyAI</span>
            <span>– Gia sư ảo đồng hành cùng học sinh và giáo viên Việt Nam THCS & THPT</span>
          </div>
          <div className="text-slate-400">
            Học tập chủ động • Tự động đồng bộ Google Sheets & Firestore • Hiểu sâu bản chất
          </div>
        </div>
      </footer>
    </div>
  );
}
