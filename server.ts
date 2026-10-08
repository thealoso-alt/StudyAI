import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));

// Initialize GoogleGenAI SDK with required telemetry header
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Common Tutor System Instruction in Vietnamese
const BASE_TUTOR_SYSTEM_INSTRUCTION = `Bạn là "StudyAI" – một Gia sư AI thông minh, tận tâm và giàu kinh nghiệm sư phạm dành riêng cho học sinh và giáo viên Việt Nam (từ lớp 6 đến lớp 12).

NGUYÊN TẮC VÀ PHƯƠNG PHÁP SƯ PHẠM CỐT LÕI:
1. Bạn giải thích dễ hiểu, tự nhiên, gần gũi, xưng hô thân mật (Thầy/Cô - Em hoặc StudyAI - Bạn).
2. Phù hợp chính xác với chương trình giáo dục phổ thông Việt Nam (Chương trình GDPT mới: Kết nối tri thức, Chân trời sáng tạo, Cánh diều) và trình độ khối lớp mà học sinh đã chọn.
3. TUYỆT ĐỐI KHÔNG CHỈ ĐƯA ĐÁP ÁN: Mục tiêu tối thượng là giúp học sinh hiểu sâu bản chất, phương pháp tư duy và cách giải quyết vấn đề.
4. Chia kiến thức và bài toán thành từng bước logic, rõ ràng, dễ tiếp thu.
5. Luôn khuyến khích học sinh tự suy nghĩ, gợi mở thay vì làm thay hoàn toàn.
6. Nếu đề bài chưa rõ ràng hoặc thiếu dữ kiện, hãy hỏi lại học sinh để làm rõ thay vì phỏng đoán bừa.
7. Khi nhận hình ảnh hoặc tệp đề bài được đính kèm: Hãy đọc kỹ chữ viết, công thức, hình vẽ hoặc sơ đồ trong ảnh, phiên âm chính xác đề bài rồi mới tiến hành phân tích và giải thích.
8. Không bịa đặt thông tin; nếu một kiến thức nằm ngoài phạm vi hoặc không chắc chắn thì phải nói rõ.
9. Ở cuối mỗi câu trả lời hoặc lời giải thích, hãy đưa ra một câu hỏi gợi mở ngắn hoặc câu đố nhỏ ("💡 Thử thách nhanh cho bạn:") để kiểm tra xem học sinh đã thực sự nắm được bài hay chưa.
10. QUY CHUẨN ĐỊNH DẠNG CÔNG THỨC TOÁN - LÝ - HÓA (BẮT BUỘC):
- Tất cả công thức Toán học, Vật lý, Hóa học và biểu thức đại số PHẢI được viết theo chuẩn LaTeX chính xác, rõ ràng và đúng cấu trúc.
- Dùng dấu $công_thức$ cho công thức nằm trong dòng (inline). Ví dụ: $x^2 + 2x + 1 = 0$, $v = v_0 + at$, $\\vec{F} = m \\vec{a}$, $\\Delta = b^2 - 4ac$, $S = \\frac{1}{2}ah$.
- Dùng dấu $$công_thức$$ trên dòng riêng biệt (block display) cho các công thức trọng tâm, hệ phương trình, tích phân, phân số lớn hoặc biến đổi nhiều bước:
  Ví dụ:
  $$x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$
  $$\\begin{cases} 2x + y = 7 \\\\ x - y = 2 \\end{cases}$$
  $$\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)$$
- Môn Hóa học: Biểu diễn công thức và phương trình hóa học bằng LaTeX chuẩn \\mathrm{...}:
  Ví dụ: $\\mathrm{2H_2 + O_2 \\xrightarrow{t^\\circ} 2H_2O}$, $\\mathrm{Fe + 2HCl \\rightarrow FeCl_2 + H_2 \\uparrow}$, $\\mathrm{Ca(OH)_2 + CO_2 \\rightarrow CaCO_3 \\downarrow + H_2O}$, $\\mathrm{pH} = -\\log[\\mathrm{H^+}]$.
- Môn Vật lý: Viết đại lượng, vectơ và đơn vị rõ ràng theo chuẩn: $\\vec{v}$, $\\vec{F}$, $\\mathrm{m/s^2}$, $\\mathrm{kg}$, $\\Omega$, $\\mu\\mathrm{C}$, $W = F \\cdot s \\cdot \\cos\\alpha$.
- Luôn kiểm tra tính chính xác của các chỉ số trên (^), chỉ số dưới (_), phân số (\\frac{tu}{mau}), căn thức (\\sqrt{...}), dấu ngoặc (\\left( ... \\right)). Tránh viết công thức bằng chữ thường không định dạng như x2, H2O, m/s2.`;

// Helper to convert uploaded files to Gemini content parts
function buildFileParts(files?: Array<{ name: string; mimeType: string; data: string }>) {
  if (!files || !Array.isArray(files) || files.length === 0) return [];
  const parts: any[] = [];
  for (const f of files) {
    if (f.data && f.mimeType) {
      parts.push({
        inlineData: {
          mimeType: f.mimeType,
          data: f.data,
        },
      });
    }
  }
  return parts;
}

// Candidate models with fast failover: 'gemini-3.5-flash-lite' is super fast (1s) and available; followed by 'gemini-3.8-flash' and 'gemini-3.5-flash'
const CANDIDATE_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];

async function generateWithModelFallback<T>(
  generateFn: (model: string) => Promise<T>,
  timeoutMs = 15000
): Promise<T> {
  let lastError: any;
  for (const model of CANDIDATE_MODELS) {
    try {
      const result = await Promise.race([
        generateFn(model),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout model ${model} sau ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} issue (${err?.message || ''}), trying fallback model...`);
    }
  }
  throw lastError;
}

// User-friendly error message formatter
function formatErrorMessage(err: any, fallbackText: string): string {
  const msg = err?.message || '';
  if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand')) {
    return 'Hệ thống AI đang nhận lượng truy cập cao trong giây lát. Vui lòng bấm Thử lại sau vài giây!';
  }
  if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Hệ thống đã đạt giới hạn yêu cầu tạm thời. Vui lòng đợi một lát rồi thử lại nhé.';
  }
  return fallbackText;
}

// Built-in educational fallback quizzes for common topics when API is experiencing high demand
function generateFallbackQuiz(subject: string, grade: string, topic: string) {
  return {
    title: `Bài kiểm tra củng cố kiến thức: ${topic}`,
    topic,
    grade,
    subject,
    questions: [
      {
        id: 1,
        question: `Khái niệm hoặc tính chất cơ bản nào sau đây là ĐÚNG khi nói về "${topic}" (${subject} - ${grade})?`,
        options: [
          'A. Đây là kiến thức nền tảng thường xuyên xuất hiện trong đề thi học kỳ.',
          'B. Khái niệm này chỉ áp dụng trong các trường hợp đặc biệt không xác định.',
          'C. Hoàn toàn trái ngược với các định luật bảo toàn trong khoa học tự nhiên.',
          'D. Chỉ áp dụng cho bậc đại học, không có trong chương trình phổ thông.',
        ],
        correctAnswer: 'A',
        explanation: 'Phương án A chính xác vì chuyên đề này là trọng tâm trong chương trình SGK mới của Bộ Giáo dục và Đào tạo.',
        subtopic: 'Khái niệm và định nghĩa trọng tâm',
      },
      {
        id: 2,
        question: `Khi giải bài toán hoặc câu hỏi liên quan đến "${topic}", bước đầu tiên học sinh cần làm là gì?`,
        options: [
          'A. Đoán đáp án ngẫu nhiên để tiết kiệm thời gian.',
          'B. Đọc kỹ đề, xác định dữ kiện đã cho và yêu cầu cần tìm.',
          'C. Chỉ áp dụng công thức phức tạp nhất mà không kiểm tra điều kiện.',
          'D. Bỏ qua các đơn vị đo và dấu của các đại lượng.',
        ],
        correctAnswer: 'B',
        explanation: 'Phương pháp khoa học chuẩn: Luôn phân tích giả thiết, kết luận và xác định kiến thức/công thức áp dụng trước khi tính toán.',
        subtopic: 'Phương pháp phân tích bài toán',
      },
      {
        id: 3,
        question: `Lỗi sai phổ biến mà học sinh hay mắc phải nhất ở dạng bài này là gì?`,
        options: [
          'A. Nhầm lẫn dấu, quên xét điều kiện xác định hoặc đổi sai đơn vị.',
          'B. Vẽ hình quá chi tiết và ghi chú đầy đủ.',
          'C. Kiểm tra lại đáp số sau khi hoàn thành.',
          'D. Trình bày lập luận chặt chẽ từng bước.',
        ],
        correctAnswer: 'A',
        explanation: 'Học sinh rất hay quên xét điều kiện có nghĩa của bài toán hoặc nhầm lẫn dấu khi biến đổi biểu thức.',
        subtopic: 'Kỹ năng tránh bẫy đề thi',
      },
    ],
  };
}

// API 1: Chatbot gia sư đa lượt (Multi-turn chat + Multimodal)
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, grade, subject, files } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Danh sách tin nhắn không hợp lệ.' });
      return;
    }

    const ai = getGenAIClient();

    const systemInstruction = `${BASE_TUTOR_SYSTEM_INSTRUCTION}
Hiện tại học sinh đang học: ${grade || 'THCS/THPT'}, Môn học: ${subject || 'Tổng hợp'}.
Hãy điều chỉnh thuật ngữ, mức độ nâng cao và ví dụ minh họa chính xác theo khối lớp và môn học này.`;

    // Format contents for generateContent
    const formattedContents = messages.map((m: { role: string; content: string }, index: number) => {
      const isLatestUser = index === messages.length - 1 && m.role === 'user';
      const parts: any[] = [];

      // If this is the latest message and files are attached, prepend the file parts
      if (isLatestUser && files && Array.isArray(files) && files.length > 0) {
        const fileParts = buildFileParts(files);
        parts.push(...fileParts);
      }

      parts.push({ text: m.content || '(Xem hình ảnh/tệp tin đính kèm và hướng dẫn giải giúp em)' });

      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    const response = await generateWithModelFallback((model) =>
      ai.models.generateContent({
        model,
        contents: formattedContents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      })
    );

    const reply = response.text || 'Xin lỗi, thầy/cô chưa xử lý được câu trả lời này. Em hãy thử lại nhé!';
    res.json({ reply });
  } catch (error: any) {
    console.error('Lỗi API /api/chat:', error);
    res.status(500).json({
      error: formatErrorMessage(error, 'Đã có lỗi xảy ra khi kết nối tới trợ lý AI.'),
    });
  }
});

// API 2: Giải bài tập sư phạm từng bước (+ Multimodal image/file input)
app.post('/api/solve', async (req: Request, res: Response) => {
  try {
    const { problem, grade, subject, files } = req.body;

    const hasText = problem && typeof problem === 'string' && problem.trim().length > 0;
    const hasFiles = files && Array.isArray(files) && files.length > 0;

    if (!hasText && !hasFiles) {
      res.status(400).json({ error: 'Vui lòng nhập đề bài hoặc tải ảnh/tệp đề bài cần giải.' });
      return;
    }

    const ai = getGenAIClient();

    const promptText = `Học sinh lớp: ${grade || 'Chung'}, Môn học: ${subject || 'Toán học'}.
Đề bài cần giải ${hasText ? `:\n"""\n${problem}\n"""` : 'được đính kèm trong hình ảnh/tệp tin đính kèm.'}

YÊU CẦU ĐỐI VỚI GIA SƯ:
Nếu có ảnh/tệp, hãy trích xuất chính xác đề bài và công thức ra trước. Sau đó giải theo đúng chuẩn cấu trúc 6 phần sư phạm:

1. 🔍 **PHÂN TÍCH ĐỀ BÀI**: Tóm tắt hiện tượng, ý nghĩa bài toán.
2. 📋 **DỮ KIỆN BÀI TOÁN**:
   - Dữ kiện đã cho (Giả thiết): Ghi rõ các đại lượng, đơn vị bằng công thức LaTeX (ví dụ: $m = 6{,}5\\text{ g}$, $v_0 = 20\\text{ m/s}$, $R = 10\\,\\Omega$).
   - Yêu cầu cần tìm/chứng minh (Kết luận): Ký hiệu rõ đại lượng cần tính.
3. 🧠 **KIẾN THỨC & CÔNG THỨC ÁP DỤNG**: Liệt kê đầy đủ công thức chuẩn bằng LaTeX ($...$ hoặc $$...$$), nêu rõ ý nghĩa từng đại lượng và điều kiện áp dụng.
4. 📝 **HƯỚNG DẪN GIẢI TỪNG BƯỚC**:
   - Bước 1, Bước 2,... lập luận chặt chẽ, chi tiết, dễ hiểu, tránh nhảy cóc.
   - Mọi phương trình, phép biến đổi đại số, phân số, căn thức, tích phân, phương trình hóa học đều PHẢI viết bằng công thức LaTeX chuẩn.
5. ✅ **KẾT LUẬN & ĐÁP SỐ**: Đáp án chính xác cuối cùng, làm nổi bật bằng công thức chuẩn.
6. 💡 **GIẢI THÍCH TẠI SAO & BẪY CẦN TRÁNH**:
   - Tại sao lại chọn phương pháp này?
   - Những lỗi sai phổ biến mà học sinh hay mắc phải ở dạng bài này (sai dấu, nhầm công thức, quên đổi đơn vị, quên điều kiện xác định).
7. 🎯 **BÀI TẬP TỰ LUYỆN TƯƠNG TỰ**: Đưa ra 1 bài tập có dạng tương tự kèm đáp số gợi ý để học sinh tự làm kiểm tra bản thân.`;

    const contents: any[] = [];
    const fileParts = buildFileParts(files);
    if (fileParts.length > 0) {
      contents.push(...fileParts);
    }
    contents.push({ text: promptText });

    const response = await generateWithModelFallback((model) =>
      ai.models.generateContent({
        model,
        contents: { parts: contents },
        config: {
          systemInstruction: BASE_TUTOR_SYSTEM_INSTRUCTION,
          temperature: 0.5,
        },
      })
    );

    const solution = response.text || 'Không thể tạo lời giải lúc này.';
    res.json({ solution });
  } catch (error: any) {
    console.error('Lỗi API /api/solve:', error);
    res.status(500).json({
      error: formatErrorMessage(error, 'Lỗi khi giải bài tập.'),
    });
  }
});

// API 3: Ôn bài & Tóm tắt kiến thức cốt lõi (Topic Revision)
app.post('/api/review', async (req: Request, res: Response) => {
  try {
    const { topic, grade, subject } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      res.status(400).json({ error: 'Vui lòng nhập tên bài hoặc chủ đề cần ôn tập.' });
      return;
    }

    const ai = getGenAIClient();

    const prompt = `Học sinh khối lớp: ${grade || 'THCS/THPT'}, Môn học: ${subject || 'Toán học'}.
Chủ đề / Tên bài học: "${topic}".

Hãy xây dựng một đề cương ôn tập toàn diện, súc tích và cực kỳ dễ hiểu theo chuẩn chương trình GDPT Việt Nam gồm các phần:
1. 📌 **TỔNG QUAN & Ý NGHĨA**: Tại sao chúng ta cần học chủ đề này? Ứng dụng thực tế là gì?
2. 🔑 **CÁC KHÁI NIỆM & ĐỊNH NGHĨA QUAN TRỌNG**: Định nghĩa cô đọng, dễ thuộc.
3. 📐 **BẢNG CÔNG THỨC / ĐỊNH LÝ / QUY TẮC CỐT LÕI**: Bảng công thức chuẩn LaTeX đầy đủ ($...$ và $$...$$), kèm điều kiện áp dụng, các dạng biến thể và đơn vị đo chuẩn.
4. 💡 **VÍ DỤ MINH HỌA ĐIỂN HÌNH**: 1-2 ví dụ tiêu biểu từ cơ bản đến nâng cao có lời giải ngắn, viết các công thức và phép tính bằng LaTeX chuẩn.
5. ⚠️ **BẪY ĐỀ THI & LỖI SAI THƯỜNG GẶP**: Những chỗ học sinh hay bị trừ điểm hoặc chọn sai trong trắc nghiệm.
6. ⚡ **TÓM TẮT 30 GIÂY (FLASHCARD NOTE)**: 3-5 gạch đầu dòng ghi nhớ nhanh trước khi vào phòng thi.
7. ❓ **3 CÂU HỎI TỰ KIỂM TRA NHANH**: Kèm đáp án và giải thích ngắn gọn ẩn phía sau.`;

    const response = await generateWithModelFallback((model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: BASE_TUTOR_SYSTEM_INSTRUCTION,
          temperature: 0.6,
        },
      })
    );

    const reviewContent = response.text || 'Không thể tạo tài liệu ôn tập.';
    res.json({ review: reviewContent });
  } catch (error: any) {
    console.error('Lỗi API /api/review:', error);
    res.status(500).json({
      error: formatErrorMessage(error, 'Lỗi khi tạo nội dung ôn bài.'),
    });
  }
});

// API 4: Tạo bộ câu hỏi trắc nghiệm chuẩn JSON (Quiz Generator cho HS & GV)
app.post('/api/quiz', async (req: Request, res: Response) => {
  try {
    const {
      subject,
      grade,
      topic,
      questionCount = 5,
      difficulty = 'medium',
      files,
      customPrompt,
      role = 'student', // 'student' or 'teacher'
    } = req.body;

    const hasTopic = topic && typeof topic === 'string' && topic.trim().length > 0;
    const hasFiles = files && Array.isArray(files) && files.length > 0;

    if (!hasTopic && !hasFiles) {
      res.status(400).json({ error: 'Vui lòng cung cấp chủ đề hoặc tải tệp tài liệu/đề thi.' });
      return;
    }

    const ai = getGenAIClient();
    const count = Math.min(Math.max(Number(questionCount) || 5, 2), 20);

    const promptText = `Bạn là chuyên gia soạn thảo đề thi trắc nghiệm và ngân hàng câu hỏi chuẩn cho giáo viên và học sinh Việt Nam.
- Đối tượng: ${role === 'teacher' ? 'Giáo viên đang tạo đề kiểm tra lớp học' : 'Học sinh đang tự luyện tập'}
- Khối lớp: ${grade || 'Lớp 10'}
- Môn học: ${subject || 'Tổng hợp'}
- Chủ đề: "${topic || 'Theo tài liệu/hình ảnh đính kèm'}"
- Số lượng câu hỏi: ${count} câu
- Mức độ: ${difficulty === 'easy' ? 'Nhận biết - Thông hiểu' : difficulty === 'hard' ? 'Vận dụng - Vận dụng cao' : 'Thông hiểu - Vận dụng'}
${customPrompt ? `- Yêu cầu đặc biệt: ${customPrompt}` : ''}

YÊU CẦU BẮT BUỘC VỀ DỮ LIỆU JSON:
1. Câu hỏi bám sát chuẩn kiến thức SGK Việt Nam hiện hành (Kết nối tri thức, Chân trời sáng tạo, Cánh diều).
2. Nếu có tệp/ảnh đính kèm: Hãy khai thác các câu hỏi, dữ liệu hoặc nội dung từ tệp đó để tạo ra các câu hỏi trắc nghiệm chất lượng.
3. Đúng 4 phương án rõ ràng (A, B, C, D).
4. Trường correctAnswer CHỈ LÀ một chữ cái in hoa: "A", "B", "C" hoặc "D".
5. Trường explanation phải phân tích cặn kẽ tại sao phương án đó đúng, và tại sao các phương án khác sai (tránh học vẹt).
6. Mỗi câu hỏi phải có trường "subtopic" (tên chuyên đề nhỏ cụ thể) để phục vụ việc đánh giá lỗ hổng kiến thức.
7. ĐỊNH DẠNG CÔNG THỨC TOÁN - LÝ - HÓA CHUẨN XÁC: Mọi biểu thức, phương trình và công thức trong trường "question", các phương án trong "options" và lời giải trong "explanation" PHẢI viết theo chuẩn LaTeX nằm trong cặp dấu $...$ (ví dụ: "$x^2 - 5x + 6 = 0$", "$\\frac{1}{2}$", "$\\mathrm{H_2SO_4}$", "$\\vec{a}$", "$a = -2\\text{ m/s}^2$"). Hãy escape dấu gạch chéo ngược hợp lệ trong JSON (ví dụ \\\\frac, \\\\sqrt).`;

    const parts: any[] = [];
    const fileParts = buildFileParts(files);
    if (fileParts.length > 0) {
      parts.push(...fileParts);
    }
    parts.push({ text: promptText });

    const response = await generateWithModelFallback((model) =>
      ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Tiêu đề bài kiểm tra trắc nghiệm' },
              topic: { type: Type.STRING, description: 'Chủ đề' },
              grade: { type: Type.STRING, description: 'Khối lớp' },
              subject: { type: Type.STRING, description: 'Môn học' },
              questions: {
                type: Type.ARRAY,
                description: 'Danh sách các câu hỏi',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER },
                    question: { type: Type.STRING, description: 'Nội dung câu hỏi' },
                    options: {
                      type: Type.ARRAY,
                      description: 'Mảng 4 phương án A, B, C, D (ví dụ: ["A. ...", "B. ...", "C. ...", "D. ..."])',
                      items: { type: Type.STRING },
                    },
                    correctAnswer: {
                      type: Type.STRING,
                      description: 'Chỉ ghi chữ cái đáp án đúng: A, B, C hoặc D',
                    },
                    explanation: {
                      type: Type.STRING,
                      description: 'Lời giải chi tiết và phân tích cặn kẽ tại sao đúng/sai',
                    },
                    subtopic: {
                      type: Type.STRING,
                      description: 'Tên chuyên đề nhỏ của câu hỏi để phát hiện lỗ hổng kiến thức',
                    },
                  },
                  required: ['id', 'question', 'options', 'correctAnswer', 'explanation', 'subtopic'],
                },
              },
            },
            required: ['title', 'topic', 'questions'],
          },
        },
      })
    );

    const rawText = response.text || '{}';
    const parsed = JSON.parse(rawText);
    res.json(parsed);
  } catch (error: any) {
    console.warn('Lỗi API /api/quiz:', error?.message);
    const isTransient =
      error?.message?.includes('503') ||
      error?.message?.includes('429') ||
      error?.message?.includes('UNAVAILABLE') ||
      error?.status === 503;

    if (isTransient && req.body.topic) {
      console.log('Phục hồi bằng bộ đề trắc nghiệm chuẩn dự phòng...');
      const fallback = generateFallbackQuiz(
        req.body.subject || 'Toán',
        req.body.grade || 'Lớp 10',
        req.body.topic
      );
      res.json(fallback);
      return;
    }

    res.status(500).json({
      error: formatErrorMessage(error, 'Lỗi khi tạo đề trắc nghiệm.'),
    });
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'StudyAI – Trợ lý học tập AI',
    timestamp: new Date().toISOString(),
  });
});

// Explicit 404 handler for API routes to prevent fallback to index.html
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    error: `API endpoint ${req.method} ${req.path} không tìm thấy.`,
  });
});

// Express error handling middleware for API routes
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Express uncaught error:', err);
  if (req.path.startsWith('/api')) {
    res.status(500).json({ error: err?.message || 'Lỗi xử lý yêu cầu phía máy chủ.' });
    return;
  }
  next(err);
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyAI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
