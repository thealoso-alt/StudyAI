import { Grade, Subject, QuizData, UploadedFileItem, UserRole } from '../types/study';

// Safe JSON response parser that handles HTML error pages, 502/504 gateways, and non-JSON payloads gracefully
async function parseJsonResponse<T>(response: Response, defaultErrorMsg: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `${defaultErrorMsg} (mã lỗi ${response.status})`);
    } else {
      throw new Error(`${defaultErrorMsg} (mã lỗi ${response.status}). Vui lòng bấm Thử lại sau giây lát!`);
    }
  }

  if (!isJson) {
    throw new Error('Máy chủ phản hồi không đúng định dạng JSON. Vui lòng bấm Thử lại!');
  }

  return await response.json();
}

export async function sendMessageToTutor(
  messages: { role: string; content: string }[],
  grade: Grade,
  subject: Subject,
  files?: UploadedFileItem[]
): Promise<string> {
  const payloadFiles = files?.map((f) => ({
    name: f.name,
    mimeType: f.mimeType,
    data: f.data,
  }));

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, grade, subject, files: payloadFiles }),
  });

  const data = await parseJsonResponse<{ reply: string }>(
    response,
    'Lỗi kết nối tới trợ lý AI StudyAI'
  );
  return data.reply;
}

export async function solveProblemWithAI(
  problem: string,
  grade: Grade,
  subject: Subject,
  files?: UploadedFileItem[]
): Promise<string> {
  const payloadFiles = files?.map((f) => ({
    name: f.name,
    mimeType: f.mimeType,
    data: f.data,
  }));

  const response = await fetch('/api/solve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ problem, grade, subject, files: payloadFiles }),
  });

  const data = await parseJsonResponse<{ solution: string }>(
    response,
    'Lỗi khi giải bài tập từng bước'
  );
  return data.solution;
}

export async function generateTopicReview(
  topic: string,
  grade: Grade,
  subject: Subject
): Promise<string> {
  const response = await fetch('/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, grade, subject }),
  });

  const data = await parseJsonResponse<{ review: string }>(
    response,
    'Lỗi khi tạo đề cương ôn bài'
  );
  return data.review;
}

export async function generateQuizFromAI(
  subject: Subject,
  grade: Grade,
  topic: string,
  questionCount: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  files?: UploadedFileItem[],
  customPrompt?: string,
  role: UserRole = 'student'
): Promise<QuizData> {
  const payloadFiles = files?.map((f) => ({
    name: f.name,
    mimeType: f.mimeType,
    data: f.data,
  }));

  const response = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject,
      grade,
      topic,
      questionCount,
      difficulty,
      files: payloadFiles,
      customPrompt,
      role,
    }),
  });

  const data = await parseJsonResponse<QuizData>(
    response,
    'Lỗi khi tạo câu hỏi trắc nghiệm'
  );
  return data;
}
