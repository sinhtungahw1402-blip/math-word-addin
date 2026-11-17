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
 * Crops a bounding box [ymin, xmin, ymax, xmax] (normalized 0-1000) from source canvas
 */
export function cropImageFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  box_2d: [number, number, number, number],
  padding = 6
): { base64: string; width: number; height: number; dataUrl: string } {
  const [ymin, xmin, ymax, xmax] = box_2d;
  const W = sourceCanvas.width;
  const H = sourceCanvas.height;

  // Convert 0-1000 normalized coordinates to actual pixel bounds
  const rawTop = (ymin / 1000) * H;
  const rawLeft = (xmin / 1000) * W;
  const rawBottom = (ymax / 1000) * H;
  const rawRight = (xmax / 1000) * W;

  // Add padding around diagram
  const left = Math.max(0, Math.floor(rawLeft - padding));
  const top = Math.max(0, Math.floor(rawTop - padding));
  const right = Math.min(W, Math.ceil(rawRight + padding));
  const bottom = Math.min(H, Math.ceil(rawBottom + padding));

  const cropW = Math.max(16, right - left);
  const cropH = Math.max(16, bottom - top);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get 2D canvas context for crop');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, cropW, cropH);
  ctx.drawImage(sourceCanvas, left, top, cropW, cropH, 0, 0, cropW, cropH);

  const dataUrl = cropCanvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

  return { base64, width: cropW, height: cropH, dataUrl };
}

/**
 * Calls Gemini Vision API to parse document text, LaTeX formulas, and detect diagrams
 */
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
 * Employs 2026 Interactions API with automatic dynamic model discovery fallback
 */
export async function callGeminiVisionOcr(
  imageBase64: string,
  apiKey: string,
  model = 'gemini-2.5-flash'
): Promise<ScanResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Vui lòng nhập khóa API Gemini (Google AI Studio) để sử dụng tính năng này.');
  }

  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  const promptText = `
Bạn là chuyên gia số hóa tài liệu đề thi và sách giáo khoa Toán học Việt Nam.
Nhiệm vụ của bạn là chuyển đổi hình ảnh trang tài liệu/đề thi thành danh sách các khối nội dung (blocks) theo đúng thứ tự từ trên xuống dưới.

QUY TẮC BẮT BUỘC:
1. Nhận diện CHÍNH XÁC 100% văn bản tiếng Việt (kể cả câu hỏi trắc nghiệm, các lựa chọn A., B., C., D., lời giải, bảng).
2. TẤT CẢ công thức toán học PHẢI được viết bằng mã LaTeX:
   - Công thức nằm trong dòng kẹp giữa $: ví dụ $y = \\frac{2x+1}{x-1}$, $\\Delta = b^2 - 4ac$, $\\vec{u} = (1; 2)$.
   - Công thức nằm trên dòng riêng kẹp giữa $$: ví dụ $$\\int_{0}^{1} f(x) dx$$.
3. QUAN TRỌNG NHẤT - TÁCH HÌNH ẢNH MINH HỌA (Hình học, Đồ thị, Bảng biến thiên):
   - Khi gặp hình vẽ hình học (tam giác, tứ giác, hình chóp, khối lăng trụ, nón, trụ, cầu...), đồ thị hàm số, bảng biến thiên vẽ tay/chụp, sơ đồ, hoặc hình ảnh minh họa:
     Tạo một khối type "image", KHÔNG cố gắng gõ lại hình thành chữ.
     Trả về tọa độ hộp bao (bounding box) "box_2d": [ymin, xmin, ymax, xmax] với tọa độ chuẩn hóa từ 0 đến 1000 (0 là mép trên/trái, 1000 là mép dưới/phải).
   - Đặt khối "image" này vào đúng vị trí tuần tự xen kẽ giữa các đoạn văn bản (ví dụ ngay sau câu hỏi hoặc trước các đáp án A B C D).
4. ĐỊNH DẠNG TRẢ VỀ:
   BẮT BUỘC chỉ trả về JSON hợp lệ (không kèm markdown \`\`\`json ở ngoài), theo mẫu sau:
{
  "title": "Tiêu đề tài liệu nếu có",
  "blocks": [
    {
      "type": "paragraph",
      "content": "Câu 1. Cho hàm số $y = \\frac{ax+b}{cx+d}$ có đồ thị như hình vẽ bên dưới:"
    },
    {
      "type": "image",
      "caption": "Đồ thị hàm số Câu 1",
      "box_2d": [215, 520, 580, 940]
    },
    {
      "type": "paragraph",
      "content": "Mệnh đề nào dưới đây là đúng?\\nA. $ad - bc > 0$.\\nB. $a > 0, b < 0$.\\nC. $c > 0, d < 0$.\\nD. $a < 0, d > 0$."
    }
  ]
}
`;

  const parseJsonResult = (rawText: string): ScanResult => {
    let parsed: any;
    try {
      let cleanJson = rawText.trim();
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) cleanJson = match[0];
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error('[MathAddin] Lỗi parse JSON từ Gemini:', rawText);
      throw new Error('Định dạng phản hồi từ AI không hợp lệ. Vui lòng bấm Quét lại.');
    }

    const rawBlocks = Array.isArray(parsed.blocks) ? parsed.blocks : [];
    const blocks: DocumentBlock[] = rawBlocks.map((b: any, idx: number) => ({
      id: `block_${Date.now()}_${idx}`,
      type: b.type === 'image' ? 'image' : 'paragraph',
      content: b.content || '',
      caption: b.caption || '',
      box_2d: b.box_2d && Array.isArray(b.box_2d) && b.box_2d.length === 4 ? b.box_2d : undefined
    }));

    return {
      title: parsed.title || 'Tài liệu đã quét',
      blocks
    };
  };

  let lastError: any = null;

  // STRATEGY 1: 2026 Interactions API (Google's standard recommended API for gemini-2.5-flash)
  try {
    const interactionsUrl = `https://generativelanguage.googleapis.com/v1beta/interactions`;
    const interactionsPayload = {
      model: model || 'gemini-2.5-flash',
      generation_config: {
        temperature: 0.1,
        response_mime_type: 'application/json'
      },
      input: [
        {
          type: 'text',
          text: promptText
        },
        {
          type: 'image',
          data: cleanBase64,
          mime_type: 'image/png'
        }
      ]
    };

    const resp = await fetch(interactionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': cleanKey
      },
      body: JSON.stringify(interactionsPayload)
    });

    if (resp.ok) {
      const data = await resp.json();
      const text = extractTextFromApiResponse(data);
      if (text) {
        return parseJsonResult(text);
      }
    } else {
      const errData = await resp.json().catch(() => ({}));
      console.warn('[MathAddin] Interactions API returned:', resp.status, errData);
      lastError = new Error(`Lỗi Gemini API (${resp.status}): ${errData.error?.message || resp.statusText}`);
    }
  } catch (err: any) {
    console.warn('[MathAddin] Interactions API network error:', err);
    lastError = err;
  }

  // STRATEGY 2: Dynamic ListModels query to find active models on this user's key
  let discoveredModels: string[] = [];
  for (const apiVer of ['v1beta', 'v1']) {
    try {
      const lmResp = await fetch(`https://generativelanguage.googleapis.com/${apiVer}/models?key=${cleanKey}`, {
        headers: { 'x-goog-api-key': cleanKey }
      });
      if (lmResp.ok) {
        const lmData = await lmResp.json();
        if (Array.isArray(lmData.models)) {
          const valid = lmData.models
            .filter((m: any) =>
              Array.isArray(m.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent')
            )
            .map((m: any) => ({
              apiVer,
              name: m.name.replace(/^models\//, '')
            }));

          if (valid.length > 0) {
            // Sort to prioritize gemini-2.5-flash and 1.5-flash
            valid.sort((a: any, b: any) => {
              const aScore =
                (a.name.includes('2.5-flash') ? 20 : 0) +
                (a.name.includes('1.5-flash') ? 10 : 0) +
                (a.name.includes('flash') ? 5 : 0);
              const bScore =
                (b.name.includes('2.5-flash') ? 20 : 0) +
                (b.name.includes('1.5-flash') ? 10 : 0) +
                (b.name.includes('flash') ? 5 : 0);
              return bScore - aScore;
            });
            for (const v of valid) {
              discoveredModels.push(`${v.apiVer}::${v.name}`);
            }
            break;
          }
        }
      }
    } catch (e) {
      console.warn(`[MathAddin] ListModels check error (${apiVer}):`, e);
    }
  }

  if (discoveredModels.length === 0) {
    discoveredModels = [
      'v1beta::gemini-2.5-flash',
      'v1::gemini-1.5-flash',
      'v1beta::gemini-1.5-flash',
      'v1::gemini-1.5-pro',
      'v1beta::gemini-2.5-flash-lite'
    ];
  }

  // STRATEGY 3: Legacy generateContent with discovered models
  const legacyPayload = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inline_data: {
              mime_type: 'image/png',
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

  for (const item of discoveredModels) {
    const [apiVer, modName] = item.split('::');
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${modName}:generateContent?key=${cleanKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': cleanKey
        },
        body: JSON.stringify(legacyPayload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error?.message || response.statusText;

        if (
          response.status === 404 ||
          errMsg.toLowerCase().includes('not found') ||
          errMsg.toLowerCase().includes('no longer available')
        ) {
          console.warn(`[MathAddin] Model ${item} 404, thử tiếp...`);
          lastError = new Error(`Lỗi Gemini API (${response.status}): ${errMsg}`);
          continue;
        }

        if (response.status === 429) {
          throw new Error('Đã đạt giới hạn số lượt quét miễn phí (15 lần/phút). Bạn vui lòng đợi 30 giây rồi bấm thử lại!');
        }

        if (response.status === 400 && errMsg.toLowerCase().includes('api_key_invalid')) {
          throw new Error('Khóa API không hợp lệ. Vui lòng kiểm tra lại khóa API Google AI Studio của bạn.');
        }

        lastError = new Error(`Lỗi Gemini API (${response.status}): ${errMsg}`);
        continue;
      }

      const result = await response.json();
      const rawText = extractTextFromApiResponse(result);
      if (!rawText) {
        throw new Error('Gemini không trả về nội dung nhận diện.');
      }

      return parseJsonResult(rawText);
    } catch (err: any) {
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

  throw lastError || new Error('Không thể kết nối đến mô hình Gemini AI. Vui lòng thử lại sau.');
}

/**
 * Converts a text line or paragraph with mixed text and LaTeX into WordprocessingML (<w:p>)
 * Inline math $...$ -> <m:oMath>
 * Display math $$...$$ -> <m:oMathPara><m:oMath>
 */
export function convertMixedTextToOoxmlParagraphs(text: string): string {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  let pXmlList = '';

  for (const line of lines) {
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
            const omml = mml2omml(clean[0]);
            if (token.isDisplay) {
              runsXml += `<m:oMathPara>${omml}</m:oMathPara>`;
            } else {
              runsXml += omml;
            }
          } else {
            runsXml += `<w:r><w:t xml:space="preserve">${token.content}</w:t></w:r>`;
          }
        } catch {
          runsXml += `<w:r><w:t xml:space="preserve">${token.content}</w:t></w:r>`;
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
 * Inserts document blocks (paragraphs, OMML math, and interspersed images) into Word at cursor
 */
export async function insertDocumentBlocksToWord(blocks: DocumentBlock[]): Promise<InsertionResult> {
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
    await Word.run(async (context) => {
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

      // 2. Insert items sequentially at cursor
      let targetRange = context.document.getSelection();

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const location = i === 0 ? Word.InsertLocation.replace : Word.InsertLocation.after;

        if (item.type === 'paragraphs') {
          const pXml = convertMixedTextToOoxmlParagraphs(item.content);
          const ooxml = buildOoxmlPackageForParagraphs(pXml);
          targetRange = targetRange.insertOoxml(ooxml, location);
        } else if (item.type === 'image') {
          const pic = targetRange.insertInlinePictureFromBase64(item.base64, location);

          // Scaled width for comfortable Word layout (max 380 pt)
          const maxW = 380;
          if (item.width > maxW) {
            pic.width = maxW;
            pic.height = Math.round((item.height * maxW) / item.width);
          } else {
            pic.width = item.width;
            pic.height = item.height;
          }

          pic.paragraph.alignment = Word.Alignment.centered;
          pic.paragraph.spaceBefore = 6;
          pic.paragraph.spaceAfter = 6;

          targetRange = pic.paragraph.getRange(Word.RangeLocation.after);

          if (item.caption && item.caption.trim()) {
            const capP = targetRange.insertParagraph(item.caption.trim(), Word.InsertLocation.after);
            capP.font.name = 'Times New Roman';
            capP.font.size = 10.5;
            capP.font.italic = true;
            capP.font.color = '#555555';
            capP.alignment = Word.Alignment.centered;
            capP.spaceAfter = 8;
            targetRange = capP.getRange(Word.RangeLocation.after);
          }
        }
      }

      await context.sync();
    });

    return {
      success: true,
      message: `Đã chuyển đổi và chèn thành công ${blocks.length} khối nội dung và hình ảnh vào Word!`
    };
  } catch (error: any) {
    console.error('[MathAddin] Lỗi insertDocumentBlocksToWord:', error);
    return {
      success: false,
      message: `Lỗi chèn vào Word: ${error?.message || error}`
    };
  }
}
