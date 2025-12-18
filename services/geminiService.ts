
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

// Helper to get today's date in DD/MM/YYYY
const getTodayString = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Hàm ghi âm và chuẩn hóa thông tin hành chính
 * @param audioBase64 Dữ liệu âm thanh base64
 * @param fieldName Tên trường cần xử lý (Địa chỉ, Kỳ kê khai, v.v.)
 * @param mimeType Định dạng âm thanh
 */
export const transcribeStandardizedInfo = async (
  audioBase64: string, 
  fieldName: string,
  mimeType: string = "audio/webm"
): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: `Bạn là trợ lý kế toán chuyên nghiệp. Hãy nghe âm thanh và trích xuất thông tin cho trường "${fieldName}".
            
            QUY TẮC ĐỊNH DẠNG:
            1. Nếu là "Kỳ kê khai": 
               - Chuyển thành định dạng: "Tháng MM/YYYY", "Quý Q/YYYY" hoặc "Năm YYYY".
               - Ví dụ: nói "tháng mười năm hai ba" -> trả về "Tháng 10/2023".
               - Ví dụ: nói "quý hai năm nay" -> trả về "Quý 2/${new Date().getFullYear()}".
            
            2. Nếu là "Địa chỉ" hoặc "Địa điểm kinh doanh":
               - Viết hoa các chữ cái đầu của tên riêng, tên đường, phường, quận, tỉnh.
               - Ngăn cách các cấp hành chính bằng dấu phẩy.
               - Ví dụ: nói "số mười hai đường láng quận đống đa hà nội" -> trả về "Số 12, Đường Láng, Quận Đống Đa, Hà Nội".
            
            3. Nếu là "Họ tên": Viết hoa toàn bộ chữ cái đầu.
            
            4. Nếu là "Mã số thuế": Chỉ trả về dãy số liên tục.
            
            Chỉ trả về nội dung đã chuẩn hóa, KHÔNG thêm lời dẫn, KHÔNG giải thích.`
          }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini standardized transcription error:", error);
    return "";
  }
};

// 1. Function to simply transcribe audio to text (for General use)
export const transcribeAudio = async (audioBase64: string, mimeType: string = "audio/webm"): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: "Hãy viết lại chính xác những gì người dùng nói bằng tiếng Việt. Chỉ trả về nội dung văn bản, không thêm lời dẫn."
          }
        ]
      }
    });
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini transcription error:", error);
    return "";
  }
};

// 2. Function to parse audio directly into Transaction JSON (Smart Add)
export const parseTransactionFromAudio = async (audioBase64: string, mimeType: string = "audio/webm"): Promise<Partial<Transaction>> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          },
          {
            text: `Bạn là trợ lý kế toán. Hãy nghe đoạn âm thanh tiếng Việt và trích xuất thông tin giao dịch.
            Ngày hiện tại là: ${getTodayString()}. 
            Nếu người dùng nói "hôm nay", "hôm qua", hãy tính ra ngày cụ thể (định dạng DD/MM/YYYY).
            Trả về JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            date: { type: Type.STRING, description: "Ngày giao dịch DD/MM/YYYY" },
            description: { type: Type.STRING, description: "Nội dung giao dịch, bán hàng hóa gì" },
            amount: { type: Type.NUMBER, description: "Số tiền bằng số (VNĐ)" }
          },
          required: ["description", "amount"]
        }
      }
    });

    const result = response.text;
    if (!result) return {};
    return JSON.parse(result);

  } catch (error) {
    console.error("Gemini parsing error:", error);
    return {
      description: "Không nghe rõ nội dung",
      amount: 0,
      date: getTodayString()
    };
  }
};

// Deprecated: kept for fallback if needed, but UI now prefers audio
export const parseTransactionFromVoice = async (transcript: string): Promise<Partial<Transaction>> => {
    // Legacy text implementation
    return {}; 
};
