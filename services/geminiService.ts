import { GoogleGenAI } from "@google/genai";
import { Transaction, InventoryItem, SalesLead, Asset, Project } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;

export const generateExecutiveReport = async (
  financials: Transaction[],
  inventory: InventoryItem[],
  sales: SalesLead[],
  assets: Asset[],
  language: 'en' | 'ar'
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Summarize data to avoid token limits and focus on key metrics
    const totalRevenue = financials.filter(t => t.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = financials.filter(t => t.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
    const lowStockItems = inventory.filter(i => i.stockLevel <= i.reorderPoint).map(i => i.name);
    const pipelineValue = sales.filter(s => s.stage !== 'Closed Lost').reduce((acc, s) => acc + s.value, 0);
    const totalAssetsValue = assets.reduce((acc, a) => acc + a.value, 0);
    const bankBalance = assets.filter(a => a.type === 'Bank Balance').reduce((acc, a) => acc + a.value, 0);

    const isArabic = language === 'ar';

    const prompt = `
      Act as a Chief Strategy Officer for a mid-sized company.
      Analyze the following ERP snapshot data and provide a concise, strategic executive summary.
      
      **Financial Overview:**
      - Total Revenue: ${formatCurrency(totalRevenue)}
      - Total Expenses: ${formatCurrency(totalExpenses)}
      - Net Profit: ${formatCurrency(totalRevenue - totalExpenses)}
      - Total Assets Value: ${formatCurrency(totalAssetsValue)}
      - Cash on Hand: ${formatCurrency(bankBalance)}
      
      **Operations & Stock:**
      - Critical Low Stock Items: ${lowStockItems.join(', ') || 'None'}
      - Total SKUs: ${inventory.length}
      
      **Sales & Growth:**
      - Sales Pipeline Value: ${formatCurrency(pipelineValue)}
      
      **Instructions:**
      1. **Executive Summary:** A 2-sentence high-level overview of the company's current standing.
      2. **Health Score:** (0-100) with a brief justification.
      3. **Critical Observations:** Identify top 3 risks, bottlenecks, or positive trends.
      4. **Strategic Recommendations:** Provide 3 specific, actionable steps for the next quarter.
      
      ${isArabic ? `
      **IMPORTANT - LANGUAGE REQUIREMENT:**
      - The output MUST be entirely in **ARABIC** (Modern Standard Arabic).
      - Use professional business terminology (e.g., "صافي الربح", "التدفق النقدي", "المخزون", "تحليل استراتيجي").
      - Format using Markdown with bold headers in Arabic.
      ` : `
      Format using Markdown with bold headers. Keep it professional, direct, and data-driven.
      `}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768
        }
      }
    });

    return response.text || (isArabic ? "لا يمكن إنشاء التقرير في الوقت الحالي." : "Unable to generate report at this time.");
  } catch (error) {
    console.error("AI Report Generation Error:", error);
    return language === 'ar' 
      ? "خطأ في إنشاء تقرير الذكاء الاصطناعي. يرجى التحقق من مفتاح API." 
      : "Error generating AI report. Please check API configuration.";
  }
};

export const askAiQuery = async (
  question: string,
  financials: Transaction[],
  inventory: InventoryItem[],
  projects: Project[],
  sales: SalesLead[],
  assets: Asset[],
  language: 'en' | 'ar'
): Promise<string> => {
  try {
    const ai = getAiClient();

    // Prepare dense context
    const totalRev = financials.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const totalExp = financials.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    const projectStats = projects.map(p => `${p.name} (Status: ${p.status}, Progress: ${p.progress}%, Budget: ${p.budget})`).join('; ');
    const assetBreakdown = assets.map(a => `${a.name} (${a.type}: ${a.value})`).join('; ');
    
    const context = `
      **Current Financials:** Revenue ${formatCurrency(totalRev)}, Expenses ${formatCurrency(totalExp)}.
      **Inventory Status:** ${inventory.length} total SKUs. ${inventory.filter(i => i.stockLevel < i.reorderPoint).length} low stock alerts.
      **Projects:** ${projectStats}
      **Assets:** ${assetBreakdown}
      **Sales Pipeline:** ${sales.length} active leads.
    `;

    const isArabic = language === 'ar';

    const prompt = `
      You are an expert ERP Strategic Advisor. You have access to the following business data context:
      ${context}

      **User Question:** "${question}"

      **Instructions:**
      - Answer the user's question specifically using the data provided.
      - Use your advanced reasoning capabilities to find correlations, risks, or opportunities.
      - If the answer involves numbers, calculate them precisely.
      - Be professional, concise, and helpful.
      
      ${isArabic ? `
      - Answer entirely in **ARABIC**.
      ` : ''}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 32768
        }
      }
    });

    return response.text || (isArabic ? "لم أتمكن من الإجابة." : "I could not generate an answer.");
  } catch (error) {
    console.error("AI Query Error:", error);
    return language === 'ar' 
      ? "حدث خطأ أثناء معالجة سؤالك." 
      : "Error processing your question.";
  }
};
