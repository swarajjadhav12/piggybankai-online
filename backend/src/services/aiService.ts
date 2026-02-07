import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/database.js';

// ================= ENV GUARD =================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables');
}

// Type assertion: After the check above, GEMINI_API_KEY is guaranteed to be a string
const API_KEY: string = GEMINI_API_KEY;

// ================= TYPES =================
type AIInsightInput = {
  type: string;
  title: string;
  content: string;
  priority?: number;
};

// ================= SERVICE =================
class AIService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    this.genAI = new GoogleGenerativeAI(API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  // ---------- CHAT ----------
  async chat(input: {
    userId: string;
    message: string;
    context?: string;
  }): Promise<{ reply: string }> {
    try {
      const prompt = input.context
        ? `${input.context}\n\nUser: ${input.message}`
        : input.message;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return { reply: response.text() };
    } catch (error) {
      if (error instanceof Error) {
        console.error('AI chat error:', error.message);
      } else {
        console.error('AI chat error: unknown');
      }
      throw new Error('Failed to generate AI response');
    }
  }

  async sendMessage(input: {
    userId: string;
    message: string;
    context?: string;
  }): Promise<string> {
    const result = await this.chat(input);
    return result.reply;
  }

  // ---------- INSIGHTS ----------
  async generateFinancialInsights(userId: string): Promise<AIInsightInput[]> {
    try {
      const [expenses, savings, goals] = await Promise.all([
        prisma.expense.findMany({ where: { userId } }),
        prisma.saving.findMany({ where: { userId } }),
        prisma.goal.findMany({ where: { userId } }),
      ]);

      const prompt = `
You are a personal finance AI.

Expenses:
${JSON.stringify(expenses)}

Savings:
${JSON.stringify(savings)}

Goals:
${JSON.stringify(goals)}

Generate 3 short, actionable financial insights.
Return ONLY valid JSON array.
Each item must include:
- type
- title
- content
- priority (1-5)
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let parsed: unknown;

      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error('AI returned invalid JSON');
      }

      if (!Array.isArray(parsed)) {
        throw new Error('AI response is not an array');
      }

      return parsed.map((item: any) => ({
        type: String(item.type || 'GENERAL'),
        title: String(item.title || 'Insight'),
        content: String(item.content || ''),
        priority: Number(item.priority || 3),
      }));
    } catch (error) {
      if (error instanceof Error) {
        console.error('Generate insights error:', error.message);
      } else {
        console.error('Generate insights error: unknown');
      }
      throw new Error('Failed to generate insights');
    }
  }
}

// ================= EXPORT =================
export const aiService = new AIService();
