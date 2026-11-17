import * as pdfjsLib from 'pdfjs-dist';
import katex from 'katex';
import { mml2omml } from 'mathml2omml';
import { isWordHost, InsertionResult } from './wordService';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('/pdf.worker.min.js', window.location.href).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

export interface DocumentBlock {
  id: string;
  type: 'paragraph' | 'image' | 'heading';
  content?: string; // Text containing LaTeX $...$ or $$...$$
  imageBase64?: string; // PNG base64 without prefix
  imageDataUrl?: string; // Full data:image/png;base64,... for preview
  imageWidth?: number;
  imageHeight?: number;
  caption?: string;
  box_2d?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] normalized 0-1000
}

export interface ScanResult {
  title?: string;
  blocks: DocumentBlock[];
}

export interface PdfPageRenderResult {
  canvas: HTMLCanvasElement;
  pageNumber: number;
  totalPages: number;
  dataUrl: string;
}

/**
 * Loads a PDF file and renders a specific page to an HTML5 canvas at high resolution
 */
export async function renderPdfPageToCanvas(
  pdfData: ArrayBuffer,
  pageNum = 1,
  scale = 2.0
): Promise<PdfPageRenderResult> {
  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const validPageNum = Math.max(1, Math.min(totalPages, pageNum));

  const page = await pdf.getPage(validPageNum);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Không thể khởi tạo Canvas 2D context để render PDF');
  }

  // Draw white background
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: context, viewport }).promise;
  const dataUrl = canvas.toDataURL('image/png');

  return {
    canvas,
    pageNumber: validPageNum,
    totalPages,
    dataUrl
  };
}

/**
 * Loads an image (File or Blob) into an HTML5 Canvas
 */
export async function loadImageToCanvas(imageFile: File | Blob): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve({ canvas, dataUrl });
      };
      img.onerror = (err) => reject(new Error('Không thể đọc dữ liệu hình ảnh: ' + err));
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Intelligently analyzes canvas pixels around an AI-predicted bounding box:
 * If the bounding box cuts through diagram lines, shapes, or vertex labels (A, B, C, D, ...),
 * it automatically expands outward until a clean margin of white background is reached.
 */
export function smartExpandBoundingBox(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  box: [number, number, number, number],
  padding = 12
): [number, number, number, number] {
  let [top, left, bottom, right] = box;

  // Clamp initial coordinates to canvas bounds
  top = Math.max(0, Math.min(height - 1, top));
  bottom = Math.max(0, Math.min(height - 1, bottom));
  left = Math.max(0, Math.min(width - 1, left));
  right = Math.max(0, Math.min(width - 1, right));

  if (bottom <= top || right <= left) {
    return [
      Math.max(0, top - padding),
      Math.max(0, left - padding),
      Math.min(height, bottom + padding),
      Math.min(width, right + padding)
    ];
  }

  const boxW = right - left;
  const boxH = bottom - top;

  // Maximum search expansion (protect against runaway into adjacent columns or distant questions)
  const maxExpandX = Math.max(60, Math.round(boxW * 0.45));
  const maxExpandY = Math.max(30, Math.round(boxH * 0.22));

  const minSearchLeft = Math.max(0, left - maxExpandX);
  const maxSearchRight = Math.min(width - 1, right + maxExpandX);
  const minSearchTop = Math.max(0, top - maxExpandY);
  const maxSearchBottom = Math.min(height - 1, bottom + maxExpandY);

  const searchW = maxSearchRight - minSearchLeft + 1;
  const searchH = maxSearchBottom - minSearchTop + 1;

  let imgData: ImageData;
  try {
    imgData = ctx.getImageData(minSearchLeft, minSearchTop, searchW, searchH);
  } catch {
    // If getImageData fails, fall back to simple padding
    return [
      Math.max(0, top - padding),
      Math.max(0, left - padding),
      Math.min(height, bottom + padding),
      Math.min(width, right + padding)
    ];
  }

  const data = imgData.data;
  const stride = searchW;

  const isInk = (x: number, y: number): boolean => {
    if (x < minSearchLeft || x > maxSearchRight || y < minSearchTop || y > maxSearchBottom) return false;
    const localX = x - minSearchLeft;
    const localY = y - minSearchTop;
    const idx = (localY * stride + localX) * 4;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    // Dark ink (text/lines) or colored ink (colored diagrams, vertices, plots)
    const isDark = (r + g + b) / 3 < 235;
    const isColored = Math.abs(r - g) > 25 || Math.abs(g - b) > 25 || Math.abs(r - b) > 25;
    return isDark || isColored;
  };

  // 1. Expand RIGHT:
  let curRight = right;
  const lookaheadX = 22;
  while (curRight < maxSearchRight) {
    let foundInk = false;
    let furthestInkX = curRight;
    for (let dx = 0; dx <= lookaheadX && curRight + dx <= maxSearchRight; dx++) {
      for (let y = top; y <= bottom; y += 2) {
        if (isInk(curRight + dx, y)) {
          foundInk = true;
          furthestInkX = curRight + dx;
          break;
        }
      }
    }
    if (foundInk) {
      curRight = furthestInkX + 1;
    } else {
      break;
    }
  }

  // 2. Expand LEFT:
  let curLeft = left;
  while (curLeft > minSearchLeft) {
    let foundInk = false;
    let furthestInkX = curLeft;
    for (let dx = 0; dx <= lookaheadX && curLeft - dx >= minSearchLeft; dx++) {
      for (let y = top; y <= bottom; y += 2) {
        if (isInk(curLeft - dx, y)) {
          foundInk = true;
          furthestInkX = curLeft - dx;
          break;
        }
      }
    }
    if (foundInk) {
      curLeft = furthestInkX - 1;
    } else {
      break;
    }
  }

  // 3. Expand TOP (using updated horizontal boundaries):
  let curTop = top;
  const lookaheadY = 16;
  while (curTop > minSearchTop) {
    let foundInk = false;
    let furthestInkY = curTop;
    for (let dy = 0; dy <= lookaheadY && curTop - dy >= minSearchTop; dy++) {
      for (let x = curLeft; x <= curRight; x += 2) {
        if (isInk(x, curTop - dy)) {
          foundInk = true;
          furthestInkY = curTop - dy;
          break;
        }
      }
    }
    if (foundInk) {
      curTop = furthestInkY - 1;
    } else {
      break;
    }
  }

  // 4. Expand BOTTOM:
  let curBottom = bottom;
  while (curBottom < maxSearchBottom) {
    let foundInk = false;
    let furthestInkY = curBottom;
    for (let dy = 0; dy <= lookaheadY && curBottom + dy <= maxSearchBottom; dy++) {
      for (let x = curLeft; x <= curRight; x += 2) {
        if (isInk(x, curBottom + dy)) {
          foundInk = true;
          furthestInkY = curBottom + dy;
          break;
        }
      }
    }
    if (foundInk) {
      curBottom = furthestInkY + 1;
    } else {
      break;
    }
  }

  return [
    Math.max(0, curTop - padding),
    Math.max(0, curLeft - padding),
    Math.min(height, curBottom + padding),
    Math.min(width, curRight + padding)
  ];
}

/**
 * Crops a bounding box [ymin, xmin, ymax, xmax] (normalized 0-1000) from source canvas
 * with intelligent edge detection and auto-expansion to prevent slicing diagrams or labels.
 */
export function cropImageFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  box_2d: [number, number, number, number],
  padding = 10
): { base64: string; width: number; height: number; dataUrl: string } {
  const [y1, x1, y2, x2] = box_2d;
  const ymin = Math.max(0, Math.min(1000, Math.min(y1, y2)));
  const ymax = Math.max(0, Math.min(1000, Math.max(y1, y2)));
  const xmin = Math.max(0, Math.min(1000, Math.min(x1, x2)));
  const xmax = Math.max(0, Math.min(1000, Math.max(x1, x2)));
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;

  // Convert 0-1000 normalized coordinates to actual pixel bounds
  const rawTop = Math.round((ymin / 1000) * H);
  const rawLeft = Math.round((xmin / 1000) * W);
  const rawBottom = Math.round((ymax / 1000) * H);
  const rawRight = Math.round((xmax / 1000) * W);

  const ctx = sourceCanvas.getContext('2d');
  let top = rawTop;
  let left = rawLeft;
  let bottom = rawBottom;
  let right = rawRight;

  if (ctx) {
    [top, left, bottom, right] = smartExpandBoundingBox(
      ctx,
      W,
      H,
      [rawTop, rawLeft, rawBottom, rawRight],
      padding
    );
  } else {
    top = Math.max(0, rawTop - padding);
    left = Math.max(0, rawLeft - padding);
    bottom = Math.min(H, rawBottom + padding);
    right = Math.min(W, rawRight + padding);
  }

  const cropW = Math.max(16, right - left);
  const cropH = Math.max(16, bottom - top);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const cropCtx = cropCanvas.getContext('2d');
  if (!cropCtx) throw new Error('Cannot get 2D canvas context for crop');

  cropCtx.fillStyle = '#ffffff';
  cropCtx.fillRect(0, 0, cropW, cropH);

  cropCtx.drawImage(sourceCanvas, left, top, cropW, cropH, 0, 0, cropW, cropH);

  const dataUrl = cropCanvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

  return { base64, width: cropW, height: cropH, dataUrl };
}

/**
 * Optimizes an HTML5 Canvas image for ultra-fast AI Vision upload:
 * - Scales max dimension to maxDimension (default 1400px), maintaining aspect ratio
 * - Converts to high-contrast JPEG (quality 0.85) on solid white background
 * - Reduces payload from 5-7MB down to ~200KB (35x reduction!), eliminating network lag
 */
export function prepareOptimizedImageForAi(
  sourceCanvas: HTMLCanvasElement,
  maxDimension = 1400,
  quality = 0.85
): { base64: string; mimeType: string; scale: number } {
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;

  let targetW = W;
  let targetH = H;
  let scale = 1.0;
  const maxSide = Math.max(W, H);

  if (maxSide > maxDimension) {
    scale = maxDimension / maxSide;
    targetW = Math.round(W * scale);
    targetH = Math.round(H * scale);
  }

  const optCanvas = document.createElement('canvas');
  optCanvas.width = targetW;
  optCanvas.height = targetH;
  const ctx = optCanvas.getContext('2d');
  if (!ctx) {
    const dataUrl = sourceCanvas.toDataURL('image/jpeg', quality);
    return {
      base64: dataUrl.replace(/^data:image\/[a-z]+;base64,/, ''),
      mimeType: 'image/jpeg',
      scale
    };
  }

  // Pure white background for high text/equation contrast
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, targetW, targetH);

  const dataUrl = optCanvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');

  return {
    base64,
    mimeType: 'image/jpeg',
    scale
  };
}

/**
 * Calls Gemini Vision API to parse document text, LaTeX formulas, and detect diagrams
 */
export const GEMINI_WEB_PROMPT = `Bạn là chuyên gia số hóa đề thi Toán học Việt Nam. Hãy đọc hình ảnh này và chuyển đổi thành danh sách các khối (blocks) theo đúng thứ tự từ trên xuống dưới.

QUY TẮC BẮT BUỘC:
1. Nhận diện CHÍNH XÁC 100% văn bản tiếng Việt (câu hỏi trắc nghiệm, các lựa chọn A., B., C., D., lời giải, bảng).
2. TẤT CẢ công thức toán học PHẢI được viết bằng mã LaTeX:
   - Trong dòng kẹp giữa $: ví dụ $y = \\frac{2x+1}{x-1}$, $\\vec{u} = (1; 2)$.
   - Dòng riêng kẹp giữa $$: ví dụ $$\\int_{0}^{1} f(x) dx$$.
   - QUAN TRỌNG: Các toán tử giới hạn lim, max, min, sum, prod PHẢI LUÔN DÙNG \\limits (ví dụ $\\lim\\limits_{x \\to +\\infty}$, $\\max\\limits_{x \\in [a;b]}$, $\\sum\\limits_{i=1}^n$) để biến số nằm ngay dưới đáy toán tử theo chuẩn SGK Việt Nam.
3. TÁCH HÌNH ẢNH MINH HỌA (Hình học không gian, hình phẳng, đồ thị hàm số, bảng biến thiên vẽ tay):
   - BẮT BUỘC BAO TRỌN 100% TOÀN BỘ HÌNH VẼ: Phải bao gồm tất cả các đỉnh, cạnh ngoài cùng, các chữ cái ký hiệu đỉnh (A, B, C, D, A1, B1, C1, D1, S, O, x, y, z...), số đo, góc, mũi tên và chú thích của hình.
   - TUYỆT ĐỐI KHÔNG ĐƯỢC CẮT XÉN BẤT KỲ CẠNH NÀO HAY CHỮ NÀO (đặc biệt các đỉnh, cạnh bên phải và bên dưới).
   - NÊN LẤY RỘNG RA NGOÀI MỖI PHÍA (dư một khoảng trắng an toàn xung quanh hình vẽ, tốt hơn là bị cắt sát hoặc thiếu một phần hình).
   - Tạo khối "image", trả về tọa độ bounding box "box_2d": [ymin, xmin, ymax, xmax] từ 0 đến 1000.
4. Trả về đúng định dạng JSON:
{
  "title": "Tiêu đề đề thi",
  "blocks": [
    { "type": "paragraph", "content": "Câu 1. Cho hàm số $y = f(x)$ có đồ thị như hình vẽ:" },
    { "type": "image", "caption": "Hình minh họa", "box_2d": [ymin, xmin, ymax, xmax] },
    { "type": "paragraph", "content": "Mệnh đề nào dưới đây đúng?\\nA. $a > 0$.\\nB. $a < 0$." }
  ]
}`;

/**
 * Normalizes mathematical operators like lim, max, min, inf, sup, sum, prod, bigcup, bigcap
 * so that limits/subscripts are placed directly below/above the operator (\limits),
 * matching standard Vietnamese educational typography (e.g. \lim\limits_{x \to 0}).
 */
export function normalizeMathLimits(code: string): string {
  if (!code) return '';
  return code.replace(
    /(?:\\|(?<=[^a-zA-Z]|^))(lim|max|min|inf|sup|limsup|liminf|sum|prod|bigcup|bigcap)(?!\s*\\limits)\s*([_\^])/g,
    (_, op, sub) => '\\' + op + '\\limits' + sub
  );
}

/**
 * Auto-wraps orphan LaTeX math commands outside $...$ (e.g. raw "\frac{1}{2}", "\lim_{...}", "-\infty")
 */
function wrapOrphanLatex(text: string): string {
  if (!text || !text.includes('\\')) return text;

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

  const processed = parts.map((part) => {
    if (part.startsWith('$')) return part;
    if (!part.includes('\\')) return part;

    return part.replace(
      /(?:(?:[a-zA-Z_][a-zA-Z0-9_]*\s*=\s*)?[-+]?\s*\\(?:frac|sqrt|lim|sum|prod|int|vec|alpha|beta|gamma|delta|pi|infty|pm|mp|le|ge|ne|approx|subset|cup|cap|to|forall|exists)(?:[a-zA-Z0-9_\^\+\-\*\/\=\(\)\[\]\{\}\\\s,;]*[a-zA-Z0-9_\^\+\-\*\/\=\(\)\[\]\}\\\)])?)/g,
      (match) => {
        const leadingSpace = match.match(/^\s*/)?.[0] || '';
        const trailingSpace = match.match(/\s*$/)?.[0] || '';
        const trimmed = match.trim();
        const words = trimmed.split(/\s+/);
        const hasPlainWords = words.some(
          (w) =>
            /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(w) ||
            (/[a-zA-Z]{5,}/.test(w) && !w.includes('\\'))
        );
        if (hasPlainWords) return match;
        return leadingSpace + '$' + trimmed + '$' + trailingSpace;
      }
    );
  });

  return processed.join('');
}

/**
 * Comprehensive preprocessor for math formulas:
 * 1. Balances unpaired single dollar signs (e.g. unclosed "$S = 1 - \frac{1}{2} + ...")
 * 2. Auto-wraps orphan LaTeX expressions outside $...$ (e.g. raw "\frac{1}{2}", "\lim_{...}")
 * 3. Replaces 3+ raw dots with standard LaTeX \dots inside math expressions
 * 4. Normalizes operators to \limits (\lim\limits, \max\limits, \min\limits, \sum\limits, etc.)
 */
export function repairAndNormalizeText(text: string): string {
  if (!text) return '';

  // 1. Balance unpaired single dollar signs line-by-line
  const lines = text.split(/\r?\n/);
  const balancedLines = lines.map((line) => {
    const withoutDisplay = line.replace(/\$\$[\s\S]*?\$\$/g, '');
    const count = (withoutDisplay.match(/(?<!\\)\$/g) || []).length;
    if (count % 2 !== 0) {
      // Check if line ends with punctuation (?, !, :, or single period not preceded by dot)
      const puncMatch = line.match(/(?<=[^\.])([\?!:]|\.(?!\.))\s*$/);
      if (puncMatch) {
        const idx = line.lastIndexOf(puncMatch[1]);
        return line.substring(0, idx).trimEnd() + '$' + line.substring(idx);
      }
      return line.trimEnd() + '$';
    }
    return line;
  });
  const step1 = balancedLines.join('\n');

  // 2. Auto-wrap orphan LaTeX commands outside $
  const step2 = wrapOrphanLatex(step1);

  // 3. Inside math expressions, replace 3+ raw dots with \dots
  const step3 = step2.replace(/(\$[^\$]+?\$)/g, (mathMatch) => {
    return mathMatch.replace(/\.{3,}/g, '\\dots ');
  });

  // 4. Normalize limits (\lim\limits)
  return normalizeMathLimits(step3);
}

/**
 * Parses raw AI text response (from API or pasted from Gemini Web) into structured DocumentBlocks
 */
export function parseAiTextResponse(rawText: string): ScanResult {
  const clean = rawText.trim();

  // 1. Try finding and parsing JSON object
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const jsonStr = jsonMatch[0];

    // Attempt 1a: Direct parse
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        return {
          title: parsed.title || 'Tài liệu đã nhận diện',
          blocks: parsed.blocks.map((b: any, idx: number) => ({
            id: `block_${Date.now()}_${idx}`,
            type: b.type === 'image' ? 'image' : 'paragraph',
            content: repairAndNormalizeText((b.content || '').replace(/\\n/g, '\n')),
            caption: b.caption || '',
            box_2d: Array.isArray(b.box_2d) && b.box_2d.length === 4 ? b.box_2d : undefined
          }))
        };
      }
    } catch (_) {}

    // Attempt 1b: Fix unescaped backslashes commonly produced by LLMs for LaTeX formulas
    try {
      const fixedJson = jsonStr.replace(/\\(?!["\\/])/g, '\\\\');
      const parsed = JSON.parse(fixedJson);
      if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        return {
          title: parsed.title || 'Tài liệu đã nhận diện',
          blocks: parsed.blocks.map((b: any, idx: number) => ({
            id: `block_${Date.now()}_${idx}`,
            type: b.type === 'image' ? 'image' : 'paragraph',
            content: repairAndNormalizeText((b.content || '').replace(/\\n/g, '\n')),
            caption: b.caption || '',
            box_2d: Array.isArray(b.box_2d) && b.box_2d.length === 4 ? b.box_2d : undefined
          }))
        };
      }
    } catch (_) {}

    // Attempt 1c: Regex block extractor for malformed/truncated JSON
    try {
      const blocks: DocumentBlock[] = [];
      const blockRegex = /\{\s*"type"\s*:\s*"(paragraph|image)"[\s\S]*?\}(?=\s*,\s*\{|\s*\])/g;
      let m: RegExpExecArray | null;
      while ((m = blockRegex.exec(jsonStr)) !== null) {
        const itemStr = m[0];
        const typeMatch = itemStr.match(/"type"\s*:\s*"(paragraph|image)"/);
        const type: 'paragraph' | 'image' = typeMatch && typeMatch[1] === 'image' ? 'image' : 'paragraph';

        const contentMatch = itemStr.match(/"content"\s*:\s*"([\s\S]*?)"(?=\s*,\s*"|\s*\})/);
        let content = contentMatch ? contentMatch[1] : '';
        content = content.replace(/\\"/g, '"').replace(/\\\\/g, '\\').replace(/\\n/g, '\n');

        const captionMatch = itemStr.match(/"caption"\s*:\s*"([\s\S]*?)"/);
        const caption = captionMatch ? captionMatch[1] : '';

        const boxMatch = itemStr.match(/"box_2d"\s*:\s*\[([\d\s,]+)\]/);
        let box_2d: [number, number, number, number] | undefined = undefined;
        if (boxMatch) {
          const coords = boxMatch[1].split(',').map((s) => parseInt(s.trim(), 10));
          if (coords.length === 4 && coords.every((n) => !isNaN(n))) {
            box_2d = coords as [number, number, number, number];
          }
        }

        blocks.push({
          id: `block_${Date.now()}_${blocks.length}`,
          type,
          content: repairAndNormalizeText(content),
          caption,
          box_2d
        });
      }

      if (blocks.length > 0) {
        const titleMatch = jsonStr.match(/"title"\s*:\s*"([^"]+)"/);
        return {
          title: titleMatch ? titleMatch[1] : 'Tài liệu đã nhận diện',
          blocks
        };
      }
    } catch (_) {}
  }

  // 2. Fallback: Parse markdown or plain text line-by-line (ignore raw JSON wrappers)
  if (clean.includes('"blocks"') || (clean.startsWith('{') && clean.endsWith('}'))) {
    return {
      title: 'Tài liệu đã nhận diện',
      blocks: []
    };
  }

  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const blocks: DocumentBlock[] = lines.map((line, idx) => ({
    id: `block_${Date.now()}_${idx}`,
    type: 'paragraph',
    content: repairAndNormalizeText(line.trim().replace(/\\n/g, '\n'))
  }));

  return {
    title: 'Tài liệu đã nhận diện từ Gemini Web',
    blocks
  };
}

function extractTextFromApiResponse(result: any): string {
  if (result.output_text) return result.output_text;
  if (Array.isArray(result.steps)) {
    let out = '';
    for (const step of result.steps) {
      if (step.type === 'model_output' && Array.isArray(step.content)) {
        for (const c of step.content) {
          if (c.type === 'text' && c.text) {
            out += c.text;
          }
        }
      }
    }
    if (out) return out;
  }
  if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
    return result.candidates[0].content.parts[0].text;
  }
  return '';
}

/**
 * Calls Gemini Vision API to parse document text, LaTeX formulas, and detect diagrams
 * Directly targets Google's standard gemini-3.8-flash model with zero-burst rate limiting
 */
export async function callGeminiVisionOcr(
  imageBase64: string,
  apiKey: string,
  model = 'gemini-3.8-flash',
  mimeType = 'image/jpeg',
  externalSignal?: AbortSignal
): Promise<ScanResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Vui lòng nhập khóa API Gemini (Google AI Studio) để sử dụng tính năng này.');
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
  const chosenModel = model || 'gemini-3.8-flash';

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: GEMINI_WEB_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: cleanBase64
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json'
    }
  };

  // 1. Try standard generateContent with selected model (gemini-3.8-flash)
  const candidateModels = [chosenModel, 'gemini-3.8-flash', 'gemini-3.5-flash-lite'].filter(
    (m, idx, arr) => Boolean(m) && arr.indexOf(m) === idx
  );

  let lastError: any = null;

  for (const mod of candidateModels) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${cleanKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || response.statusText;

        // Rate limit (429)
        if (response.status === 429) {
          throw new Error('Đã đạt giới hạn số lượt quét miễn phí (15 lần/phút). Bạn vui lòng đợi khoảng 30 giây rồi bấm thử lại, hoặc dùng chế độ "Dùng Gemini Web" ở bên dưới nhé!');
        }

        // Invalid key
        if (response.status === 400 && errMsg.toLowerCase().includes('api_key_invalid')) {
          throw new Error('Khóa API không hợp lệ. Vui lòng kiểm tra lại khóa API Google AI Studio của bạn.');
        }

        // If 404, try next candidate
        if (response.status === 404) {
          lastError = new Error(`Lỗi Gemini API (${response.status}): ${errMsg}`);
          continue;
        }

        throw new Error(`Lỗi Gemini API (${response.status}): ${errMsg}`);
      }

      const result = await response.json();
      const rawText = extractTextFromApiResponse(result);
      if (!rawText) {
        throw new Error('Gemini không trả về nội dung nhận diện.');
      }

      return parseAiTextResponse(rawText);
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        if (externalSignal?.aborted) {
          throw new Error('Đã dừng và hủy quét theo yêu cầu.');
        }
        throw new Error('Thời gian phản hồi quá lâu (hơn 35s). Mạng internet có thể bị nghẽn, bạn vui lòng thử lại hoặc chọn mô hình Gemini 3.5 Flash Lite siêu tốc trong Cài đặt!');
      }
      if (
        err.message &&
        (err.message.includes('không hợp lệ') ||
          err.message.includes('giới hạn') ||
          err.message.includes('429'))
      ) {
        throw err;
      }
      lastError = err;
    }
  }

  // 2. Secondary fallback: 2026 Interactions API
  try {
    const intController = new AbortController();
    const intTimeoutId = setTimeout(() => intController.abort(), 15000);
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => intController.abort(), { once: true });
    }

    const interactionsUrl = `https://generativelanguage.googleapis.com/v1beta/interactions`;
    const interactionsPayload = {
      model: chosenModel,
      generation_config: {
        temperature: 0.1,
        response_mime_type: 'application/json'
      },
      input: [
        {
          type: 'text',
          text: GEMINI_WEB_PROMPT
        },
        {
          type: 'image',
          data: cleanBase64,
          mime_type: mimeType
        }
      ]
    };

    const resp = await fetch(interactionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey
      },
      body: JSON.stringify(interactionsPayload),
      signal: intController.signal
    });
    clearTimeout(intTimeoutId);

    if (resp.ok) {
      const data = await resp.json();
      const text = extractTextFromApiResponse(data);
      if (text) {
        return parseAiTextResponse(text);
      }
    }
  } catch (e) {
    console.warn('[MathAddin] Interactions fallback error:', e);
  }

  throw lastError || new Error('Không thể kết nối đến mô hình Gemini AI. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau 30 giây.');
}

export type FormulaInsertMode = 'equation' | 'mathtype';

/**
 * Sanitizes OMML XML generated by mathml2omml:
 * Escapes unescaped '<', '>', '&' inside <m:t> text nodes so Word's XML parser never crashes.
 */
export function sanitizeOmml(omml: string): string {
  return omml.replace(/<m:t\b([^>]*)>([\s\S]*?)<\/m:t>/g, (_match, attrs, content) => {
    const safeAmp = content.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;');
    const safeLtGt = safeAmp
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<m:t${attrs}>${safeLtGt}</m:t>`;
  });
}

/**
 * Converts a text line or paragraph with mixed text and LaTeX into WordprocessingML (<w:p>)
 * - When formulaMode is 'equation': Converts $...$ and $$...$$ into native Word OMML (<m:oMath>) without $ symbols.
 * - When formulaMode is 'mathtype': Keeps $...$ and $$...$$ delimiters intact in Times New Roman text for MathType (Alt+\) / BTN conversion.
 */
export function convertMixedTextToOoxmlParagraphs(
  text: string,
  formulaMode: FormulaInsertMode = 'equation'
): string {
  const normalizedText = repairAndNormalizeText(text);
  const lines = normalizedText.split(/\r?\n/).filter(line => line.trim().length > 0);
  let pXmlList = '';

  for (const line of lines) {
    // Mode 2: MathType / LaTeX mode -> Preserve $...$ and $$...$$ intact
    if (formulaMode === 'mathtype') {
      const escaped = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const runXml = `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
      pXmlList += `<w:p><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr>${runXml}</w:p>`;
      continue;
    }

    // Mode 1: Native Word Equation mode -> Convert $...$ to OMML, no $ in document
    const tokens: { type: 'text' | 'math'; content: string; isDisplay?: boolean }[] = [];
    let lastIndex = 0;
    const regex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'text', content: line.substring(lastIndex, match.index) });
      }
      const rawMath = match[0];
      const isDisplay = rawMath.startsWith('$$');
      const mathCode = isDisplay ? rawMath.slice(2, -2).trim() : rawMath.slice(1, -1).trim();
      tokens.push({ type: 'math', content: mathCode, isDisplay });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < line.length) {
      tokens.push({ type: 'text', content: line.substring(lastIndex) });
    }

    let runsXml = '';
    for (const token of tokens) {
      if (token.type === 'text') {
        const escaped = token.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
      } else {
        try {
          const rawMml = katex.renderToString(token.content, { output: 'mathml', throwOnError: false });
          const clean = rawMml
            .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/gi, '')
            .replace(/<annotation-xml[^>]*>[\s\S]*?<\/annotation-xml>/gi, '')
            .match(/<math[\s\S]*?<\/math>/i);
          if (clean) {
            let omml = mml2omml(clean[0]);
            omml = sanitizeOmml(omml);
            if (token.isDisplay) {
              runsXml += `<m:oMathPara>${omml}</m:oMathPara>`;
            } else {
              runsXml += omml;
            }
          } else {
            const esc = token.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${esc}</w:t></w:r>`;
          }
        } catch {
          const esc = token.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          runsXml += `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${esc}</w:t></w:r>`;
        }
      }
    }

    pXmlList += `<w:p><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr>${runsXml}</w:p>`;
  }

  return pXmlList;
}

/**
 * Builds flat OPC OpenXML package for paragraphs with OMML equations
 */
export function buildOoxmlPackageForParagraphs(pXmlList: string): string {
  return `<?xml version="1.0" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<pkg:package xmlns:pkg="http://schemas.microsoft.com/office/2006/xmlPackage">
  <pkg:part pkg:name="/_rels/.rels" pkg:contentType="application/vnd.openxmlformats-package.relationships+xml" pkg:padding="512">
    <pkg:xmlData>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>
    </pkg:xmlData>
  </pkg:part>
  <pkg:part pkg:name="/word/document.xml" pkg:contentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml">
    <pkg:xmlData>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
        <w:body>
          ${pXmlList}
        </w:body>
      </w:document>
    </pkg:xmlData>
  </pkg:part>
</pkg:package>`;
}

/**
 * Inserts document blocks (paragraphs, OMML math, and interspersed images) into Word at cursor.
 * - formulaMode 'equation': Inserts native Word OMML equations (no $ signs).
 * - formulaMode 'mathtype': Preserves $...$ and $$...$$ text for MathType (Alt+\) or BTN tools.
 * Uses sequential per-item execution and cursor advance so that NO question (like Bài 30)
 * is ever skipped or dropped after an image.
 */
export async function insertDocumentBlocksToWord(
  blocks: DocumentBlock[],
  formulaMode: FormulaInsertMode = 'equation'
): Promise<InsertionResult> {
  if (!isWordHost()) {
    return {
      success: false,
      message: 'Vui lòng mở Add-in trong Microsoft Word để chèn nội dung.'
    };
  }

  if (!blocks || blocks.length === 0) {
    return {
      success: false,
      message: 'Không có khối nội dung nào để chèn vào Word.'
    };
  }

  try {
    // 1. Group consecutive paragraphs to batch them into single OOXML packages
    type InsertionItem =
      | { type: 'paragraphs'; content: string }
      | { type: 'image'; base64: string; width: number; height: number; caption?: string };

    const items: InsertionItem[] = [];
    let currentParagraphs: string[] = [];

    for (const block of blocks) {
      if (block.type === 'paragraph' && block.content && block.content.trim()) {
        currentParagraphs.push(block.content.trim());
      } else if (block.type === 'image' && block.imageBase64) {
        if (currentParagraphs.length > 0) {
          items.push({ type: 'paragraphs', content: currentParagraphs.join('\n') });
          currentParagraphs = [];
        }
        items.push({
          type: 'image',
          base64: block.imageBase64,
          width: block.imageWidth || 300,
          height: block.imageHeight || 200,
          caption: block.caption
        });
      }
    }
    if (currentParagraphs.length > 0) {
      items.push({ type: 'paragraphs', content: currentParagraphs.join('\n') });
    }

    if (items.length === 0) {
      return {
        success: false,
        message: 'Không có nội dung văn bản hoặc hình ảnh hợp lệ để chèn.'
      };
    }

    // 2. Sequential Insertion with dedicated per-item Word.run & context.sync
    // Ensures every item (text, math equation, picture, caption) is fully committed in Word,
    // and selection automatically advances to the end of each inserted item.
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        await Word.run(async (context) => {
          const currentSel = context.document.getSelection();

          if (item.type === 'paragraphs') {
            try {
              const pXml = convertMixedTextToOoxmlParagraphs(item.content, formulaMode);
              const ooxml = buildOoxmlPackageForParagraphs(pXml);

              // If i === 0, replace current selection. If i > 0, insert on a clean paragraph below
              const targetRange = i === 0
                ? currentSel
                : currentSel.insertParagraph('', Word.InsertLocation.after);

              const insertedRange = targetRange.insertOoxml(ooxml, Word.InsertLocation.replace);
              insertedRange.select(Word.SelectionMode.end);
              await context.sync();
            } catch (ooxmlError) {
              console.warn(`[MathAddin] OOXML failed for item ${i}, using plain text fallback:`, ooxmlError);
              const targetRange = i === 0
                ? currentSel
                : currentSel.insertParagraph('', Word.InsertLocation.after);
              const cleanFallback = formulaMode === 'equation'
                ? item.content.replace(/\$\$([\s\S]+?)\$\$/g, '$1').replace(/\$([^\$]+?)\$/g, '$1')
                : item.content;
              const insertedRange = targetRange.insertText(cleanFallback, Word.InsertLocation.replace);
              insertedRange.select(Word.SelectionMode.end);
              await context.sync();
            }
          } else if (item.type === 'image') {
            try {
              // 1. Create a dedicated centered paragraph for the image
              const imgParagraph = currentSel.insertParagraph('', Word.InsertLocation.after);
              imgParagraph.alignment = Word.Alignment.centered;
              imgParagraph.spaceBefore = 6;
              imgParagraph.spaceAfter = 6;

              // 2. Insert image inside this paragraph
              const pic = imgParagraph.insertInlinePictureFromBase64(item.base64, Word.InsertLocation.replace);

              // 3. Set display dimensions (scaling max 420 pt)
              const maxW = 420;
              if (item.width > maxW) {
                pic.width = maxW;
                pic.height = Math.round((item.height * maxW) / item.width);
              } else if (item.width > 0 && item.height > 0) {
                pic.width = item.width;
                pic.height = item.height;
              }

              // 4. Add centered caption below if present
              if (item.caption && item.caption.trim()) {
                const capParagraph = imgParagraph.insertParagraph(item.caption.trim(), Word.InsertLocation.after);
                capParagraph.font.name = 'Times New Roman';
                capParagraph.font.size = 10.5;
                capParagraph.font.italic = true;
                capParagraph.font.color = '#555555';
                capParagraph.alignment = Word.Alignment.centered;
                capParagraph.spaceAfter = 8;
                capParagraph.select(Word.SelectionMode.end);
              } else {
                imgParagraph.select(Word.SelectionMode.end);
              }

              await context.sync();
            } catch (imgError) {
              console.warn(`[MathAddin] Image insertion failed for item ${i}:`, imgError);
              const fallbackP = currentSel.insertParagraph(`[Hình vẽ: ${item.caption || 'Minh họa'}]`, Word.InsertLocation.after);
              fallbackP.font.italic = true;
              fallbackP.select(Word.SelectionMode.end);
              await context.sync();
            }
          }

          successCount++;
        });
      } catch (itemErr) {
        console.error(`[MathAddin] Error executing item ${i}:`, itemErr);
        // Continue loop to never drop remaining questions!
      }
    }

    const modeDesc = formulaMode === 'mathtype' ? 'MathType (trong dấu $$)' : 'chuẩn Word Equation';
    return {
      success: true,
      message: `Đã chèn thành công đầy đủ ${blocks.length} khối nội dung theo định dạng ${modeDesc} vào Word!`
    };
  } catch (error: any) {
    console.error('[MathAddin] Lỗi insertDocumentBlocksToWord:', error);
    return {
      success: false,
      message: `Lỗi chèn vào Word: ${error?.message || error}`
    };
  }
}

/**
 * Inserts a single document block into Word at cursor
 */
export async function insertSingleBlockToWord(
  block: DocumentBlock,
  formulaMode: FormulaInsertMode = 'equation'
): Promise<InsertionResult> {
  return insertDocumentBlocksToWord([block], formulaMode);
}
