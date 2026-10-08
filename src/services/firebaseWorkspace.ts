import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppUser, QuizSubmissionResult, UserProfile, UserRole } from '../types/study';

// Initialize Firebase App instance safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Provider with Google Sheets scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

// In-memory token cache (Do NOT store in localStorage per security guidelines)
let cachedAccessToken: string | null = null;
let cachedSpreadsheetId: string | null = null;
const SPREADSHEET_ID_KEY = 'study_ai_spreadsheet_id_v1';
const WEBHOOK_URL_KEY = 'study_ai_apps_script_webhook_url_v1';
const LAST_AUTOSYNC_TIME_KEY = 'study_ai_last_autosync_time_v1';

export const getAppsScriptWebhookUrl = (): string => {
  return localStorage.getItem(WEBHOOK_URL_KEY) || '';
};

export const setAppsScriptWebhookUrl = (url: string): void => {
  localStorage.setItem(WEBHOOK_URL_KEY, url.trim());
};

export const getLastAutoSyncTime = (): number => {
  const t = localStorage.getItem(LAST_AUTOSYNC_TIME_KEY);
  return t ? parseInt(t, 10) : 0;
};

export const recordAutoSyncTime = (): void => {
  localStorage.setItem(LAST_AUTOSYNC_TIME_KEY, Date.now().toString());
};

export const getCachedAccessToken = () => cachedAccessToken;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Initialize Auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google Sign-In with popup
export const signInWithGoogle = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không thể nhận access token từ Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    // Normal user cancellation - do not treat as an unhandled error
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    console.error('Lỗi đăng nhập Google:', error);
    throw error;
  }
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};

// ==========================================
// GOOGLE SHEETS INTEGRATION HELPERS
// ==========================================

// Find or create "StudyAI - Quản Lý Học Tập & Điểm Số" spreadsheet
export const getOrCreateSpreadsheet = async (token: string): Promise<string> => {
  // Check if we already have the ID in localStorage
  const savedId = localStorage.getItem(SPREADSHEET_ID_KEY);
  if (savedId) {
    cachedSpreadsheetId = savedId;
    return savedId;
  }

  // Create new Spreadsheet with 2 sheets: "TaiKhoan" and "LichSuQuiz"
  try {
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'StudyAI - Quản Lý Học Tập & Điểm Số',
        },
        sheets: [
          {
            properties: {
              title: 'TaiKhoan',
              gridProperties: { rowCount: 100, columnCount: 10 },
            },
          },
          {
            properties: {
              title: 'LichSuQuiz',
              gridProperties: { rowCount: 200, columnCount: 12 },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      throw new Error(err.error?.message || 'Không thể tạo Google Sheet');
    }

    const created = await createRes.json();
    const newId = created.spreadsheetId;
    localStorage.setItem(SPREADSHEET_ID_KEY, newId);
    cachedSpreadsheetId = newId;

    // Initialize headers for "TaiKhoan"
    await appendSheetRow(
      token,
      newId,
      'TaiKhoan!A1',
      [
        [
          'Mã ID',
          'Email',
          'Họ Và Tên',
          'Vai Trò (Học sinh / GV)',
          'Khối Lớp',
          'Môn Phụ Trách / Yêu Thích',
          'Trường Học',
          'Thời Gian Đăng Ký',
        ],
      ]
    );

    // Initialize headers for "LichSuQuiz"
    await appendSheetRow(
      token,
      newId,
      'LichSuQuiz!A1',
      [
        [
          'Mã Bài Thi',
          'Thời Gian',
          'Email Người Làm',
          'Họ Tên',
          'Vai Trò',
          'Môn Học',
          'Khối Lớp',
          'Chủ Đề Quiz',
          'Số Câu Đúng',
          'Tổng Số Câu',
          'Điểm Số (Thang 10)',
          'Lỗ Hổng Kiến Thức (Chủ đề sai)',
        ],
      ]
    );

    return newId;
  } catch (error) {
    console.error('Lỗi tạo Google Sheet:', error);
    throw error;
  }
};

// Append rows to a specific Google Sheet range
export const appendSheetRow = async (
  token: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Không thể ghi dữ liệu vào Google Sheets');
  }

  return await res.json();
};

export const getSpreadsheetUrl = (): string | null => {
  const id = cachedSpreadsheetId || localStorage.getItem(SPREADSHEET_ID_KEY);
  return id ? `https://docs.google.com/spreadsheets/d/${id}` : null;
};

// Parse spreadsheet ID from a Google Sheet URL or direct ID
export const parseSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

// Set custom spreadsheet linked by Admin
export const setCustomSpreadsheetId = (input: string): string => {
  const parsedId = parseSpreadsheetId(input);
  if (!parsedId) {
    throw new Error('Đường link hoặc ID Google Sheet không hợp lệ.');
  }
  cachedSpreadsheetId = parsedId;
  localStorage.setItem(SPREADSHEET_ID_KEY, parsedId);
  return parsedId;
};

// Helper: Ensure a sheet/tab exists in the spreadsheet
export const ensureSheetTabExists = async (
  token: string,
  spreadsheetId: string,
  tabTitle: string
) => {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!metaRes.ok) return;
    const meta = await metaRes.json();
    const sheetTitles = meta.sheets?.map((s: any) => s.properties?.title) || [];
    if (!sheetTitles.includes(tabTitle)) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                addSheet: {
                  properties: { title: tabTitle },
                },
              },
            ],
          }),
        }
      );
    }
  } catch (e) {
    console.warn(`Lỗi tạo tab ${tabTitle}:`, e);
  }
};

// Helper: Overwrite or update an entire sheet range
export const updateSheetRange = async (
  token: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}?valueInputOption=USER_ENTERED`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Không thể cập nhật Google Sheets');
  }

  return await res.json();
};

// ==========================================
// ADMIN: SYNC ALL APP DATA TO GOOGLE SHEETS
// ==========================================
export const syncAllAppDataToGoogleSheets = async (
  tokenOverride?: string
): Promise<{
  success: boolean;
  spreadsheetId: string;
  sheetUrl: string;
  stats: {
    accountsCount: number;
    quizzesCount: number;
    bankCount: number;
    weakTopicsCount: number;
  };
}> => {
  const token = tokenOverride || cachedAccessToken;
  if (!token) {
    throw new Error(
      'Chưa kết nối tài khoản Google. Vui lòng bấm Đăng nhập Google để cấp quyền Google Sheets trước khi đồng bộ.'
    );
  }

  const spreadsheetId = await getOrCreateSpreadsheet(token);

  // Import stored data from storage
  const {
    getStoredAccounts,
    getStoredProfile,
    getStoredQuizHistory,
    getBankQuizzes,
    getStoredWeakTopics,
  } = await import('./storage');

  const accounts = getStoredAccounts();
  const currentProfile = getStoredProfile();
  const quizHistory = getStoredQuizHistory();
  const bankQuizzes = getBankQuizzes();
  const weakTopics = getStoredWeakTopics();

  // Make sure current profile is also included in accounts list
  if (!accounts.some((a) => a.id === currentProfile.id || a.email === currentProfile.email)) {
    accounts.unshift({
      id: currentProfile.id,
      username: currentProfile.username || (currentProfile.email ? currentProfile.email.split('@')[0] : 'user'),
      email: currentProfile.email,
      name: currentProfile.name,
      role: currentProfile.role,
      grade: currentProfile.grade,
      subject: currentProfile.favoriteSubject,
      school: currentProfile.school || 'THCS/THPT',
      createdAt: Date.now(),
    });
  }

  // Ensure all 5 tabs exist in Google Sheets
  await ensureSheetTabExists(token, spreadsheetId, 'TaiKhoan');
  await ensureSheetTabExists(token, spreadsheetId, 'LichSuQuiz');
  await ensureSheetTabExists(token, spreadsheetId, 'NganHangDeThi');
  await ensureSheetTabExists(token, spreadsheetId, 'LoHongKienThuc');
  await ensureSheetTabExists(token, spreadsheetId, 'TienDoHocTap');

  // 1. Sync Sheet TaiKhoan
  const taiKhoanRows: any[][] = [
    [
      'Mã ID',
      'Email',
      'Họ Và Tên',
      'Vai Trò',
      'Khối Lớp',
      'Môn Học / Phụ Trách',
      'Trường Học',
      'Ngày Tạo',
    ],
    ...accounts.map((acc) => [
      acc.id,
      acc.email,
      acc.name,
      acc.role === 'admin' ? 'Quản trị viên (Admin)' : acc.role === 'teacher' ? 'Giáo viên (GV)' : 'Học sinh',
      acc.grade || '',
      acc.subject || '',
      acc.school || '',
      new Date(acc.createdAt).toLocaleString('vi-VN'),
    ]),
  ];
  await updateSheetRange(token, spreadsheetId, 'TaiKhoan!A1:H' + (taiKhoanRows.length + 10), taiKhoanRows);

  // 2. Sync Sheet LichSuQuiz
  const lichSuRows: any[][] = [
    [
      'Mã Bài Thi',
      'Thời Gian',
      'Email Học Sinh',
      'Họ Tên',
      'Vai Trò',
      'Môn Học',
      'Khối Lớp',
      'Chủ Đề Quiz',
      'Số Câu Đúng',
      'Tổng Số Câu',
      'Điểm Số (Thang 10)',
      'Lỗ Hổng Kiến Thức',
    ],
    ...quizHistory.map((q) => [
      q.id,
      new Date(q.timestamp).toLocaleString('vi-VN'),
      q.userEmail || currentProfile.email,
      q.userName || currentProfile.name,
      q.userRole || currentProfile.role,
      q.subject,
      q.grade,
      q.topic,
      q.correctCount,
      q.totalQuestions,
      q.score,
      q.weakSubtopics?.join(', ') || 'Không có',
    ]),
  ];
  await updateSheetRange(token, spreadsheetId, 'LichSuQuiz!A1:L' + (lichSuRows.length + 10), lichSuRows);

  // 3. Sync Sheet NganHangDeThi
  const bankRows: any[][] = [
    [
      'Mã Đề',
      'Tiêu Đề Đề Thi',
      'Chủ Đề',
      'Môn Học',
      'Khối Lớp',
      'Người Soạn',
      'Vai Trò',
      'Số Lượng Câu Hỏi',
      'Ngày Tạo',
    ],
    ...bankQuizzes.map((b) => [
      b.id,
      b.title,
      b.topic,
      b.subject,
      b.grade,
      b.creatorName,
      b.creatorRole === 'teacher' ? 'Giáo viên' : 'Học sinh',
      b.data?.questions?.length || 0,
      new Date(b.createdAt).toLocaleString('vi-VN'),
    ]),
  ];
  await updateSheetRange(token, spreadsheetId, 'NganHangDeThi!A1:I' + (bankRows.length + 10), bankRows);

  // 4. Sync Sheet LoHongKienThuc
  const weakRows: any[][] = [
    ['Mã Lỗ Hổng', 'Môn Học', 'Chuyên Đề Bị Sai', 'Số Lần Trả Lời Sai', 'Tổng Lần Kiểm Tra', 'Trạng Thái', 'Cập Nhật Lần Cuối'],
    ...weakTopics.map((w) => [
      w.id,
      w.subject,
      w.topicName,
      w.wrongCount,
      w.totalTested,
      w.status === 'mastered' ? 'Đã nắm vững' : w.status === 'reviewing' ? 'Đang ôn tập' : 'Cần luyện tập',
      new Date(w.lastMissedDate).toLocaleString('vi-VN'),
    ]),
  ];
  await updateSheetRange(token, spreadsheetId, 'LoHongKienThuc!A1:G' + (weakRows.length + 10), weakRows);

  // 5. Sync Sheet TienDoHocTap
  const progressRows: any[][] = [
    [
      'Tên Học Sinh/GV',
      'Email',
      'Khối Lớp',
      'Điểm XP Tích Lũy',
      'Chuỗi Ngày Học (Streak)',
      'Số Câu Hỏi Đã Hỏi',
      'Số Bài Tập Đã Giải',
      'Số Đề Cương Đã Ôn',
      'Số Đề Thi Đã Làm',
      'Điểm TB Trắc Nghiệm',
    ],
    [
      currentProfile.name,
      currentProfile.email,
      currentProfile.grade,
      currentProfile.xp,
      currentProfile.streakDays,
      currentProfile.stats.questionsAsked,
      currentProfile.stats.problemsSolved,
      currentProfile.stats.reviewsCreated,
      currentProfile.stats.quizzesCompleted,
      currentProfile.stats.quizzesCompleted > 0
        ? (currentProfile.stats.totalQuizScoreSum / currentProfile.stats.quizzesCompleted).toFixed(1)
        : '0.0',
    ],
  ];
  await updateSheetRange(token, spreadsheetId, 'TienDoHocTap!A1:J' + (progressRows.length + 10), progressRows);

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  return {
    success: true,
    spreadsheetId,
    sheetUrl,
    stats: {
      accountsCount: accounts.length,
      quizzesCount: quizHistory.length,
      bankCount: bankQuizzes.length,
      weakTopicsCount: weakTopics.length,
    },
  };
};

// ==========================================
// USER ACCOUNT SYNCHRONIZATION
// ==========================================

export const syncUserRegistration = async (
  user: AppUser,
  accessToken?: string | null
): Promise<{ firestoreSuccess: boolean; sheetsSuccess: boolean; sheetUrl?: string }> => {
  let firestoreSuccess = false;
  let sheetsSuccess = false;
  let sheetUrl: string | undefined = undefined;

  // 1. Save to Firestore `users` collection
  try {
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(
      userDocRef,
      {
        ...user,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    firestoreSuccess = true;
  } catch (err) {
    console.warn('Lưu vào Firestore thất bại (dùng local fallback):', err);
  }

  // 2. Save to Google Sheets if access token available
  const token = accessToken || cachedAccessToken;
  if (token) {
    try {
      const sheetId = await getOrCreateSpreadsheet(token);
      await appendSheetRow(token, sheetId, 'TaiKhoan!A:H', [
        [
          user.id,
          user.email,
          user.name,
          user.role === 'teacher' ? 'Giáo viên' : 'Học sinh',
          user.grade || '',
          user.subject || '',
          user.school || '',
          new Date(user.createdAt).toLocaleString('vi-VN'),
        ],
      ]);
      sheetsSuccess = true;
      sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`;
    } catch (sheetErr) {
      console.warn('Lưu vào Google Sheets thất bại:', sheetErr);
    }
  }

  return { firestoreSuccess, sheetsSuccess, sheetUrl };
};

// ==========================================
// QUIZ RESULT SYNCHRONIZATION
// ==========================================

export const syncQuizResult = async (
  result: QuizSubmissionResult,
  user: UserProfile,
  accessToken?: string | null
): Promise<{ firestoreSuccess: boolean; sheetsSuccess: boolean }> => {
  let firestoreSuccess = false;
  let sheetsSuccess = false;

  // 1. Save to Firestore `quiz_results` collection
  try {
    const quizDocRef = doc(db, 'quiz_results', result.id);
    await setDoc(quizDocRef, {
      ...result,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      savedAt: Date.now(),
    });
    firestoreSuccess = true;
  } catch (err) {
    console.warn('Lưu kết quả quiz vào Firestore thất bại:', err);
  }

  // 2. Save to Google Sheets if access token available
  const token = accessToken || cachedAccessToken;
  if (token) {
    try {
      const sheetId = await getOrCreateSpreadsheet(token);
      await appendSheetRow(token, sheetId, 'LichSuQuiz!A:L', [
        [
          result.id,
          new Date(result.timestamp).toLocaleString('vi-VN'),
          user.email || 'Học sinh ẩn danh',
          user.name,
          user.role === 'teacher' ? 'Giáo viên' : 'Học sinh',
          result.subject,
          result.grade,
          result.topic,
          result.correctCount,
          result.totalQuestions,
          result.score,
          result.weakSubtopics?.join(', ') || 'Không có',
        ],
      ]);
      sheetsSuccess = true;
    } catch (sheetErr) {
      console.warn('Ghi kết quả vào Google Sheets thất bại:', sheetErr);
    }
  }

  return { firestoreSuccess, sheetsSuccess };
};

// ==========================================
// AUTOMATIC REAL-TIME SYNC ENGINE
// ("thông tin trên app lưu tự động qua gg sheet chứ k cần nút chức năng đẩy qua")
// ==========================================

// Helper to post directly to Google Apps Script Webhook (if configured by Admin)
async function sendToAppsScriptWebhook(action: string, payload: any): Promise<boolean> {
  const webhookUrl = getAppsScriptWebhookUrl();
  if (!webhookUrl) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'no-cors', // Apps script redirects with 302, no-cors works reliably
      body: JSON.stringify({ action, payload, timestamp: Date.now() }),
    });
    return true;
  } catch (e) {
    console.warn('Lỗi gửi dữ liệu tới Apps Script Webhook:', e);
    return false;
  }
}

// 1. Tự động lưu tài khoản (HS, GV, Admin) khi tạo mới hoặc đổi mật khẩu
export const autoSyncUser = async (user: AppUser): Promise<void> => {
  try {
    recordAutoSyncTime();
    // Gửi qua webhook nếu có
    sendToAppsScriptWebhook('sync_user', user);

    // Đồng bộ Firestore
    try {
      const userDocRef = doc(db, 'users', user.id);
      await setDoc(userDocRef, { ...user, updatedAt: Date.now() }, { merge: true });
    } catch {}

    // Đồng bộ Google Sheets nếu có token
    const token = cachedAccessToken;
    if (token) {
      const sheetId = await getOrCreateSpreadsheet(token);
      await appendSheetRow(token, sheetId, 'TaiKhoan!A:H', [
        [
          user.id,
          user.email,
          user.name,
          user.role === 'admin' ? 'Quản trị viên (Admin)' : user.role === 'teacher' ? 'Giáo viên (GV)' : 'Học sinh',
          user.grade || '',
          user.subject || '',
          user.school || '',
          new Date(user.createdAt).toLocaleString('vi-VN'),
        ],
      ]);
    }
  } catch (e) {
    console.warn('Auto-sync user background error:', e);
  }
};

// 2. Tự động lưu kết quả bài làm trắc nghiệm của học sinh
export const autoSyncQuiz = async (
  result: QuizSubmissionResult,
  user: UserProfile
): Promise<void> => {
  if (user.isGuest || user.id === 'guest') return;
  try {
    recordAutoSyncTime();
    sendToAppsScriptWebhook('sync_quiz', { result, user });

    // Firestore
    try {
      const quizDocRef = doc(db, 'quiz_results', result.id);
      await setDoc(quizDocRef, {
        ...result,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        savedAt: Date.now(),
      });
    } catch {}

    // Google Sheets
    const token = cachedAccessToken;
    if (token) {
      const sheetId = await getOrCreateSpreadsheet(token);
      await appendSheetRow(token, sheetId, 'LichSuQuiz!A:L', [
        [
          result.id,
          new Date(result.timestamp).toLocaleString('vi-VN'),
          user.email || user.username || 'Học sinh',
          user.name,
          user.role === 'teacher' ? 'Giáo viên' : 'Học sinh',
          result.subject,
          result.grade,
          result.topic,
          result.correctCount,
          result.totalQuestions,
          result.score,
          result.weakSubtopics?.join(', ') || 'Không có',
        ],
      ]);

      // Tự động cập nhật dòng Tiến độ học tập của người này
      await appendSheetRow(token, sheetId, 'TienDoHocTap!A:J', [
        [
          user.name,
          user.email || user.username,
          user.grade,
          user.xp,
          user.streakDays,
          user.stats.questionsAsked,
          user.stats.problemsSolved,
          user.stats.reviewsCreated,
          user.stats.quizzesCompleted,
          user.stats.quizzesCompleted > 0
            ? (user.stats.totalQuizScoreSum / user.stats.quizzesCompleted).toFixed(1)
            : result.score.toFixed(1),
        ],
      ]);
    }
  } catch (e) {
    console.warn('Auto-sync quiz background error:', e);
  }
};

// 3. Tự động lưu tiến độ học tập (XP, câu hỏi, bài giải)
export const autoSyncProgress = async (user: UserProfile): Promise<void> => {
  if (user.isGuest || user.id === 'guest') return;
  try {
    recordAutoSyncTime();
    sendToAppsScriptWebhook('sync_progress', user);

    const token = cachedAccessToken;
    if (token) {
      const sheetId = await getOrCreateSpreadsheet(token);
      await appendSheetRow(token, sheetId, 'TienDoHocTap!A:J', [
        [
          user.name,
          user.email || user.username,
          user.grade,
          user.xp,
          user.streakDays,
          user.stats.questionsAsked,
          user.stats.problemsSolved,
          user.stats.reviewsCreated,
          user.stats.quizzesCompleted,
          user.stats.quizzesCompleted > 0
            ? (user.stats.totalQuizScoreSum / user.stats.quizzesCompleted).toFixed(1)
            : '0.0',
        ],
      ]);
    }
  } catch (e) {
    console.warn('Auto-sync progress background error:', e);
  }
};

// 4. Tự động lưu đề thi do Giáo viên / Học sinh biên soạn vào ngân hàng
export const autoSyncBankQuiz = async (quiz: any): Promise<void> => {
  try {
    recordAutoSyncTime();
    sendToAppsScriptWebhook('sync_bank', quiz);

    const token = cachedAccessToken;
    if (token) {
      const sheetId = await getOrCreateSpreadsheet(token);
      await appendSheetRow(token, sheetId, 'NganHangDeThi!A:I', [
        [
          quiz.id,
          quiz.title,
          quiz.topic,
          quiz.subject,
          quiz.grade,
          quiz.creatorName,
          quiz.creatorRole === 'teacher' ? 'Giáo viên' : 'Học sinh',
          quiz.data?.questions?.length || 0,
          new Date(quiz.createdAt).toLocaleString('vi-VN'),
        ],
      ]);
    }
  } catch (e) {
    console.warn('Auto-sync bank quiz error:', e);
  }
};

// Sample Google Apps Script Code template for Admin
export const SAMPLE_APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = data.action;
    var payload = data.payload;

    if (action === "sync_user") {
      var sheet = ss.getSheetByName("TaiKhoan") || ss.insertSheet("TaiKhoan");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Mã ID", "Email", "Họ Tên", "Vai Trò", "Lớp", "Môn", "Trường", "Thời Gian"]);
      }
      sheet.appendRow([payload.id, payload.email, payload.name, payload.role, payload.grade || "", payload.subject || "", payload.school || "", new Date().toLocaleString("vi-VN")]);
    } else if (action === "sync_quiz") {
      var sheet = ss.getSheetByName("LichSuQuiz") || ss.insertSheet("LichSuQuiz");
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Mã Bài", "Thời Gian", "Email", "Họ Tên", "Vai Trò", "Môn", "Lớp", "Chủ Đề", "Đúng", "Tổng", "Điểm", "Lỗ Hổng"]);
      }
      var r = payload.result;
      var u = payload.user;
      sheet.appendRow([r.id, new Date(r.timestamp).toLocaleString("vi-VN"), u.email || "", u.name, u.role, r.subject, r.grade, r.topic, r.correctCount, r.totalQuestions, r.score, (r.weakSubtopics || []).join(", ")]);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;
