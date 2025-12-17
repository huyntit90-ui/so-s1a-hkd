import { GoogleGenAI, Type } from "@google/genai";
import { Transaction } from "../types";

// Helper to get today's date in DD/MM/YYYY
const getTodayString = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// 1. Function to simply transcribe audio to text (for Name, Address, etc.)
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