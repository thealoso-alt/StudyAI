/**
 * Utilities for LaTeX & Math/Science Formula Normalization, Syntax Preprocessing and Reference Templates
 */

export interface FormulaSnippet {
  id: string;
  name: string;
  category: 'Toán học' | 'Vật lý' | 'Hóa học' | 'Ký hiệu chung';
  latex: string;
  template: string;
  description: string;
  gradeLevel?: string;
}

/**
 * Preprocess markdown content containing math formulas:
 * 1. Convert standard LaTeX environments and delimiters \(...\) to $...$ and \[...\] to $$...$$
 * 2. Ensure block formulas $$...$$ have newline padding so remark-math parses them reliably
 * 3. Normalize common chemistry notations and escaped characters
 */
export function preprocessMath(content: string): string {
  if (!content) return '';

  let text = content;

  // Protect code blocks (```...```) from math replacement
  const codeBlocks: string[] = [];
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Protect inline code (`...`)
  const inlineCodes: string[] = [];
  text = text.replace(/`[^`\n]+`/g, (match) => {
    inlineCodes.push(match);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });

  // Convert \[ ... \] into $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, formula) => {
    return `\n\n$$\n${formula.trim()}\n$$\n\n`;
  });

  // Convert \( ... \) into $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, formula) => {
    return `$${formula.trim()}$`;
  });

  // Fix glued block formulas: text $$formula$$ text -> text \n\n$$formula$$\n\n text
  text = text.replace(/([^\n])\$\$([\s\S]*?)\$\$([^\n])/g, '$1\n\n$$$2$$\n\n$3');

  // Ensure $$ have newlines if they are single lines
  text = text.replace(/\n\$\$([^\n]+)\$\$\n/g, '\n\n$$\n$1\n$$\n\n');

  // Convert \ce{...} to \mathrm{...} if present
  text = text.replace(/\\ce\{([^{}]+)\}/g, (_, inner) => `\\mathrm{${inner}}`);

  // Restore inline codes
  text = text.replace(/__INLINE_CODE_(\d+)__/g, (_, idx) => inlineCodes[Number(idx)] || '');

  // Restore code blocks
  text = text.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => codeBlocks[Number(idx)] || '');

  return text;
}

/**
 * Quick symbol toolbar items for students & teachers
 */
export const QUICK_MATH_SYMBOLS = [
  { label: 'x²', insert: '$x^2$', title: 'Lũy thừa bậc hai' },
  { label: 'xⁿ', insert: '$x^{n}$', title: 'Lũy thừa bậc n' },
  { label: 'xᵢ', insert: '$x_{1}$', title: 'Chỉ số dưới' },
  { label: 'a/b', insert: '$\\frac{a}{b}$', title: 'Phân số' },
  { label: '√x', insert: '$\\sqrt{x}$', title: 'Căn bậc hai' },
  { label: '±', insert: '$\\pm$', title: 'Cộng trừ' },
  { label: 'Δ', insert: '$\\Delta$', title: 'Delta biệt thức' },
  { label: 'π', insert: '$\\pi$', title: 'Số Pi' },
  { label: 'α', insert: '$\\alpha$', title: 'Alpha' },
  { label: 'β', insert: '$\\beta$', title: 'Beta' },
  { label: 'θ', insert: '$\\theta$', title: 'Theta' },
  { label: 'ω', insert: '$\\omega$', title: 'Omega (tần số góc)' },
  { label: 'λ', insert: '$\\lambda$', title: 'Bước sóng Lambda' },
  { label: 'Ω', insert: '$\\Omega$', title: 'Điện trở Ohm' },
  { label: '≤', insert: '$\\le$', title: 'Nhỏ hơn hoặc bằng' },
  { label: '≥', insert: '$\\ge$', title: 'Lớn hơn hoặc bằng' },
  { label: '≠', insert: '$\\neq$', title: 'Khác' },
  { label: '≈', insert: '$\\approx$', title: 'Xấp xỉ' },
  { label: '→', insert: '$\\rightarrow$', title: 'Mũi tên suy ra / phản ứng' },
  { label: '⇌', insert: '$\\rightleftharpoons$', title: 'Phản ứng thuận nghịch' },
  { label: '↑', insert: '$\\uparrow$', title: 'Khí thoát ra' },
  { label: '↓', insert: '$\\downarrow$', title: 'Kết tủa' },
  { label: 'v⃗', insert: '$\\vec{v}$', title: 'Vectơ vận tốc' },
  { label: '∫', insert: '$\\int_{a}^{b} f(x)\\,dx$', title: 'Tích phân' },
  { label: 'lim', insert: '$\\lim_{x \\to x_0} f(x)$', title: 'Giới hạn' },
  { label: 'Hệ pt', insert: '$$\\begin{cases} ax + by = c \\\\ dx + ey = f \\end{cases}$$', title: 'Hệ phương trình' },
];

/**
 * Comprehensive standard formulas repository for Reference Modal & Insertion
 */
export const STANDARD_FORMULAS: FormulaSnippet[] = [
  // --- TOÁN HỌC ---
  {
    id: 'math-quad',
    name: 'Phương trình bậc hai & Biệt thức Delta',
    category: 'Toán học',
    latex: 'ax^2 + bx + c = 0 \\quad (a \\neq 0)',
    template: '$$ax^2 + bx + c = 0 \\quad (a \\neq 0)$$\n$$\\Delta = b^2 - 4ac$$\n$$x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}$$',
    description: 'Nghiệm phương trình bậc 2 theo biệt thức Delta: $\\Delta > 0$ có 2 nghiệm phân biệt, $\\Delta = 0$ có nghiệm kép $x = -\\frac{b}{2a}$, $\\Delta < 0$ vô nghiệm.',
    gradeLevel: 'Lớp 9, 10',
  },
  {
    id: 'math-viet',
    name: 'Định lý Vi-ét (Viète)',
    category: 'Toán học',
    latex: '\\begin{cases} S = x_1 + x_2 = -\\frac{b}{a} \\\\ P = x_1 x_2 = \\frac{c}{a} \\end{cases}',
    template: '$$\\begin{cases} S = x_1 + x_2 = -\\frac{b}{a} \\\\ P = x_1 \\cdot x_2 = \\frac{c}{a} \\end{cases}$$',
    description: 'Mối quan hệ giữa tổng và tích các nghiệm của phương trình bậc 2 với các hệ số.',
    gradeLevel: 'Lớp 9, 10',
  },
  {
    id: 'math-system',
    name: 'Hệ hai phương trình bậc nhất hai ẩn',
    category: 'Toán học',
    latex: '\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}',
    template: '$$\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}$$',
    description: 'Hệ phương trình tuyến tính chuẩn mực, giải bằng phương pháp thế hoặc cộng đại số.',
    gradeLevel: 'Lớp 9',
  },
  {
    id: 'math-identities',
    name: 'Hằng đẳng thức đáng nhớ',
    category: 'Toán học',
    latex: '(a \\pm b)^2 = a^2 \\pm 2ab + b^2',
    template: '$$(a + b)^2 = a^2 + 2ab + b^2$$\n$$(a - b)^2 = a^2 - 2ab + b^2$$\n$$a^2 - b^2 = (a - b)(a + b)$$\n$$a^3 - b^3 = (a - b)(a^2 + ab + b^2)$$',
    description: 'Các hằng đẳng thức cốt lõi giúp biến đổi đa thức, phân tích nhân tử và rút gọn biểu thức.',
    gradeLevel: 'Lớp 8',
  },
  {
    id: 'math-pythagoras',
    name: 'Định lý Pytago & Hệ thức lượng tam giác vuông',
    category: 'Toán học',
    latex: 'a^2 = b^2 + c^2 \\quad;\\quad h^2 = b\' \\cdot c\'',
    template: '$$a^2 = b^2 + c^2$$\n$$h^2 = b\' \\cdot c\'$$\n$$b^2 = a \\cdot b\' \\quad;\\quad c^2 = a \\cdot c\'$$\n$$\\frac{1}{h^2} = \\frac{1}{b^2} + \\frac{1}{c^2}$$',
    description: 'Định lý Pytago và các hệ thức lượng giữa cạnh và đường cao trong tam giác vuông.',
    gradeLevel: 'Lớp 7, 9',
  },
  {
    id: 'math-trig-basic',
    name: 'Công thức Lượng giác cơ bản & Nhân đôi',
    category: 'Toán học',
    latex: '\\sin^2\\alpha + \\cos^2\\alpha = 1 \\quad;\\quad \\sin(2\\alpha) = 2\\sin\\alpha\\cos\\alpha',
    template: '$$\\sin^2\\alpha + \\cos^2\\alpha = 1$$\n$$\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} \\quad (\\cos\\alpha \\neq 0)$$\n$$\\sin(2\\alpha) = 2\\sin\\alpha\\cos\\alpha$$\n$$\\cos(2\\alpha) = \\cos^2\\alpha - \\sin^2\\alpha = 2\\cos^2\\alpha - 1 = 1 - 2\\sin^2\\alpha$$',
    description: 'Hằng đẳng thức lượng giác và công thức góc nhân đôi trong chương trình THCS & THPT.',
    gradeLevel: 'Lớp 9, 10, 11',
  },
  {
    id: 'math-sine-cosine-law',
    name: 'Định lý Sin và Cosin trong tam giác',
    category: 'Toán học',
    latex: 'a^2 = b^2 + c^2 - 2bc\\cos A \\quad;\\quad \\frac{a}{\\sin A} = 2R',
    template: '$$a^2 = b^2 + c^2 - 2bc\\cos A$$\n$$\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R$$\n$$S = \\frac{1}{2}ab\\sin C = \\sqrt{p(p-a)(p-b)(p-c)}$$',
    description: 'Giải tam giác bất kỳ: tính cạnh, góc, bán kính đường tròn ngoại tiếp $R$ và diện tích bằng công thức Heron.',
    gradeLevel: 'Lớp 10',
  },
  {
    id: 'math-derivative',
    name: 'Bảng Đạo hàm cơ bản',
    category: 'Toán học',
    latex: '(x^n)\' = n x^{n-1} \\quad;\\quad (\\sqrt{x})\' = \\frac{1}{2\\sqrt{x}}',
    template: '$$(x^n)\' = n x^{n-1}$$\n$$(\\sqrt{x})\' = \\frac{1}{2\\sqrt{x}}$$\n$$(\\sin x)\' = \\cos x \\quad;\\quad (\\cos x)\' = -\\sin x$$\n$$(e^x)\' = e^x \\quad;\\quad (\\ln x)\' = \\frac{1}{x}$$',
    description: 'Quy tắc tính đạo hàm hàm sơ cấp phục vụ khảo sát hàm số và tìm cực trị.',
    gradeLevel: 'Lớp 11, 12',
  },
  {
    id: 'math-integral',
    name: 'Tích phân Newton - Leibniz',
    category: 'Toán học',
    latex: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)',
    template: '$$\\int_{a}^{b} f(x)\\,dx = \\left. F(x) \\right|_{a}^{b} = F(b) - F(a)$$\n$$\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)$$',
    description: 'Định nghĩa tích phân xác định và công thức tính nguyên hàm.',
    gradeLevel: 'Lớp 12',
  },

  // --- VẬT LÝ ---
  {
    id: 'phys-motion',
    name: 'Chuyển động thẳng biến đổi đều',
    category: 'Vật lý',
    latex: 'v = v_0 + at \\quad;\\quad s = v_0 t + \\frac{1}{2}at^2',
    template: '$$v = v_0 + at$$\n$$s = v_0 t + \\frac{1}{2}at^2$$\n$$v^2 - v_0^2 = 2as$$',
    description: 'Các phương trình mô tả vận tốc, quãng đường và hệ thức độc lập với thời gian trong chuyển động thẳng có gia tốc $a$ không đổi.',
    gradeLevel: 'Lớp 10',
  },
  {
    id: 'phys-newton2',
    name: 'Định luật II Newton & Lực ma sát',
    category: 'Vật lý',
    latex: '\\vec{F} = m \\vec{a} \\quad;\\quad F_{ms} = \\mu N',
    template: '$$\\vec{F}_{hl} = m \\vec{a} \\iff a = \\frac{F}{m}$$\n$$P = mg$$\n$$F_{ms} = \\mu N$$',
    description: 'Định luật cốt lõi của cơ học cổ điển: gia tốc tỉ lệ thuận với lực tác dụng và tỉ lệ nghịch với khối lượng của vật.',
    gradeLevel: 'Lớp 10',
  },
  {
    id: 'phys-work-energy',
    name: 'Công, Động năng & Định luật bảo toàn cơ năng',
    category: 'Vật lý',
    latex: 'A = F \\cdot s \\cdot \\cos\\alpha \\quad;\\quad W_d = \\frac{1}{2}mv^2',
    template: '$$A = F \\cdot s \\cdot \\cos\\alpha$$\n$$\\mathcal{P} = \\frac{A}{t} = F \\cdot v$$\n$$W_d = \\frac{1}{2}mv^2 \\quad;\\quad W_t = mgz$$\n$$W = W_d + W_t = \\text{hằng số (khi chỉ có trọng lực)}$$',
    description: 'Công cơ học, công suất $\\mathcal{P}$, động năng $W_d$, thế năng trọng trường $W_t$ và bảo toàn cơ năng.',
    gradeLevel: 'Lớp 10',
  },
  {
    id: 'phys-ohm',
    name: 'Định luật Ôm (Ohm) cho đoạn mạch & toàn mạch',
    category: 'Vật lý',
    latex: 'I = \\frac{U}{R} \\quad;\\quad I = \\frac{\\mathcal{E}}{R_N + r}',
    template: '$$I = \\frac{U}{R}$$\n$$I = \\frac{\\mathcal{E}}{R_N + r}$$\n$$R = \\rho \\frac{l}{S}$$\n$$P = U \\cdot I = I^2 R = \\frac{U^2}{R}$$\n$$Q = I^2 R t \\quad (\\text{Định luật Jun - Len-xơ})$$',
    description: 'Mối quan hệ giữa cường độ dòng điện $I$, hiệu điện thế $U$, suất điện động $\\mathcal{E}$, điện trở ngoài $R_N$ và điện trở trong $r$.',
    gradeLevel: 'Lớp 9, 11',
  },
  {
    id: 'phys-oscillation',
    name: 'Dao động điều hòa & Con lắc lò xo',
    category: 'Vật lý',
    latex: 'x = A \\cos(\\omega t + \\varphi) \\quad;\\quad T = 2\\pi \\sqrt{\\frac{m}{k}}',
    template: '$$x = A \\cos(\\omega t + \\varphi)$$\n$$v = x\' = -\\omega A \\sin(\\omega t + \\varphi)$$\n$$a = v\' = -\\omega^2 x$$\n$$T = \\frac{2\\pi}{\\omega} = 2\\pi \\sqrt{\\frac{m}{k}} \\quad;\\quad f = \\frac{1}{T} = \\frac{1}{2\\pi}\\sqrt{\\frac{k}{m}}$$',
    description: 'Phương trình li độ $x$, vận tốc $v$, gia tốc $a$ và chu kỳ dao động của con lắc lò xo.',
    gradeLevel: 'Lớp 12',
  },
  {
    id: 'phys-wave',
    name: 'Sóng cơ & Phương trình truyền sóng',
    category: 'Vật lý',
    latex: '\\lambda = v \\cdot T = \\frac{v}{f}',
    template: '$$\\lambda = v \\cdot T = \\frac{v}{f}$$\n$$u_M(t) = A \\cos\\left(\\omega t - \\frac{2\\pi x}{\\lambda}\\right)$$',
    description: 'Bước sóng $\\lambda$, vận tốc truyền sóng $v$, chu kỳ $T$ và phương trình dao động của sóng tại điểm $M$.',
    gradeLevel: 'Lớp 11, 12',
  },
  {
    id: 'phys-optics',
    name: 'Công thức Thấu kính mỏng & Khúc xạ ánh sáng',
    category: 'Vật lý',
    latex: 'n_1 \\sin i = n_2 \\sin r \\quad;\\quad \\frac{1}{f} = \\frac{1}{d} + \\frac{1}{d\'}',
    template: '$$n_1 \\sin i = n_2 \\sin r$$\n$$\\frac{1}{f} = \\frac{1}{d} + \\frac{1}{d\'}$$\n$$D = \\frac{1}{f} \\quad (\\text{dp})$$\n$$k = -\\frac{d\'}{d}$$',
    description: 'Định luật khúc xạ ánh sáng, tiêu cự thấu kính $f$, khoảng cách vật $d$, khoảng cách ảnh $d\'$ và độ phóng đại $k$.',
    gradeLevel: 'Lớp 9, 11',
  },

  // --- HÓA HỌC ---
  {
    id: 'chem-mole',
    name: 'Hệ thống công thức tính Số mol (n)',
    category: 'Hóa học',
    latex: 'n = \\frac{m}{M} = \\frac{V}{22{,}4} = C_M \\cdot V',
    template: '$$n = \\frac{m}{M} \\quad (\\text{mol})$$\n$$n = \\frac{V}{22{,}4} \\quad (\\text{Khí ở đktc cũ}) \\quad\\text{hoặc}\\quad n = \\frac{V}{24{,}79} \\quad (\\text{đkc 25}^\\circ\\text{C, 1 bar})$$\n$$n = C_M \\cdot V_{dd}$$',
    description: 'Ba công thức tính số mol cơ bản nhất cho chất rắn/lỏng, chất khí và dung dịch.',
    gradeLevel: 'Lớp 8, 9, 10',
  },
  {
    id: 'chem-conc',
    name: 'Nồng độ phần trăm (C%) & Nồng độ mol (CM)',
    category: 'Hóa học',
    latex: 'C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\% \\quad;\\quad C\\% = \\frac{C_M \\cdot M}{10 \\cdot D}',
    template: '$$C\\% = \\frac{m_{ct}}{m_{dd}} \\times 100\\%$$\n$$m_{dd} = m_{ct} + m_{dm} = V_{dd} \\times D$$\n$$C_M = \\frac{n}{V_{dd}} \\quad (\\text{mol/L})$$\n$$C\\% = \\frac{C_M \\cdot M}{10 \\cdot D}$$',
    description: 'Mối quan hệ giữa nồng độ phần trăm, nồng độ mol và khối lượng riêng dung dịch $D$ (g/mL).',
    gradeLevel: 'Lớp 8, 9, 10',
  },
  {
    id: 'chem-ph',
    name: 'Thang đo pH & Tích số ion của nước',
    category: 'Hóa học',
    latex: '\\mathrm{pH} = -\\log[\\mathrm{H}^+] \\quad;\\quad [\\mathrm{H}^+][\\mathrm{OH}^-] = 10^{-14}',
    template: '$$\\mathrm{pH} = -\\log[\\mathrm{H}^+] \\iff [\\mathrm{H}^+] = 10^{-\\mathrm{pH}}$$\n$$[\\mathrm{H}^+] \\cdot [\\mathrm{OH}^-] = 10^{-14} \\quad (25^\\circ\\mathrm{C})$$\n$$\\mathrm{pH} + \\mathrm{pOH} = 14$$',
    description: 'Xác định môi trường axit ($\\mathrm{pH} < 7$), trung tính ($\\mathrm{pH} = 7$), hoặc bazơ ($\\mathrm{pH} > 7$).',
    gradeLevel: 'Lớp 11',
  },
  {
    id: 'chem-redox',
    name: 'Phương trình phản ứng Kim loại tác dụng với Axit',
    category: 'Hóa học',
    latex: '\\mathrm{Zn + 2HCl \\rightarrow ZnCl_2 + H_2 \\uparrow}',
    template: '$$\\mathrm{Zn + 2HCl \\rightarrow ZnCl_2 + H_2 \\uparrow}$$\n$$\\mathrm{2Al + 3H_2SO_4 \\rightarrow Al_2(SO_4)_3 + 3H_2 \\uparrow}$$\n$$\\mathrm{Fe + 4HNO_3 \\rightarrow Fe(NO_3)_3 + NO \\uparrow + 2H_2O}$$',
    description: 'Phản ứng thế và oxi hóa - khử của kim loại với axit loãng và axit có tính oxi hóa mạnh.',
    gradeLevel: 'Lớp 9, 10',
  },
  {
    id: 'chem-organic',
    name: 'Phương trình este hóa & Đốt cháy Hiđrocacbon',
    category: 'Hóa học',
    latex: '\\mathrm{CH_3COOH + C_2H_5OH \\overset{H_2SO_4, t^\\circ}{\\rightleftharpoons} CH_3COOC_2H_5 + H_2O}',
    template: '$$\\mathrm{C_n H_{2n+2} + \\frac{3n+1}{2}O_2 \\xrightarrow{t^\\circ} n CO_2 + (n+1) H_2O}$$\n$$\\mathrm{CH_3COOH + C_2H_5OH \\overset{H_2SO_4\\,\\text{đặc},\\,t^\\circ}{\\rightleftharpoons} CH_3COOC_2H_5 + H_2O}$$',
    description: 'Phản ứng đốt cháy ankan và phản ứng thuận nghịch tạo este etyl axetat.',
    gradeLevel: 'Lớp 9, 11, 12',
  },
];
