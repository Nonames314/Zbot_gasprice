import { GoogleGenAI } from '@google/genai';
import { config } from './config';
import { fetchGasPrices, GasPrices } from './gasPrice';

let ai: GoogleGenAI | null = null;
if (config.geminiApiKey) {
    ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
}

const MODEL = 'gemini-3.1-flash-lite-preview';

export async function getGeminiResponse(userMessage: string): Promise<string> {
    if (!ai) {
        return "Xin lỗi, hiện tại API Key của AI chưa được cấu hình. Vui lòng liên hệ quản trị viên.";
    }

    try {
        const gasData = await fetchGasPrices();
        const gasContext = gasData ? JSON.stringify(gasData, null, 2) : 'Dữ liệu giá xăng đang bị lỗi không thể tải được.';

        const systemInstruction = `Bạn là một trợ lý ảo Zalo cung cấp thông tin giá xăng dầu tại Việt Nam (Petrolimex và PVOil).
Dưới đây là thông tin giá xăng hiện tại (dưới dạng JSON):
${gasContext}

Nhiệm vụ của bạn là:
1. Trả lời các câu hỏi của người dùng về giá xăng một cách thân thiện, ngắn gọn và chính xác.
2. Nếu họ hỏi giá, hãy đọc dữ liệu JSON được cung cấp ở trên và trả lời bằng tiếng Việt.
3. KHÔNG trả lời các câu hỏi không liên quan đến xăng dầu, xe cộ, hoặc lịch sử giao dịch. Nếu câu hỏi không liên quan, hãy nói: "Xin lỗi, tôi chỉ có thể hỗ trợ thông tin giá xăng dầu."

⚠️ QUAN TRỌNG VỀ ĐỊNH DẠNG ZALO:
- TUYỆT ĐỐI KHÔNG sử dụng các định dạng Markdown như in đậm (**), in nghiêng (_), hoặc tiêu đề (#).
- Sử dụng dấu gạch ngang (-) ở đầu dòng để làm danh sách (Ví dụ: "- Xăng RON 95: ...").
- Chỉ sử dụng văn bản thuần túy (plain text) và sang dòng mới để trình bày cho dễ đọc.
- Khuyến khích sử dụng Emoji (⛽, 🚗, ⬇️, ⬆️, 💰) để báo cáo giá trực quan.
`;

        const response = await ai.models.generateContent({
             model: MODEL,
             contents: userMessage,
             config: {
                systemInstruction: systemInstruction,
             }
        });

        let reply = response.text ? response.text.trim() : "Không thể tạo phản hồi từ AI.";
        
        // Sanitize for Zalo formatting:
        // 1. Remove list markers (like `* ` or `- ` at start of line) and replace with standard dashes
        reply = reply.replace(/^[\*\-]\s+/gm, '- ');
        
        // 2. Convert standard Markdown bold `**text**` to Zalo bold `*text*`
        reply = reply.replace(/\*\*([^*]+)\*\*/g, '*$1*');
        
        // 3. Optional: if there are still rogue consecutive asterisks, remove them or convert to single
        reply = reply.replace(/\*{2,}/g, '*');

        return reply;
    } catch (error) {
        console.error('Error in Gemini response:', error);
        return "Xin lỗi, hệ thống AI đang gặp sự cố. Bạn vui lòng thử lại sau.";
    }
}
