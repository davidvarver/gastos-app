import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface ParsedTransaction {
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'transfer';
    date: string; // ISO format
    categoryName?: string;
    accountName?: string;
    isMaaserable?: boolean;
    isDeductible?: boolean;
}

const AVAILABLE_MODELS = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-exp",
    "gemini-pro"
];

async function callWithFallback(prompt: string, isJson: boolean = true) {
    if (!genAI) {
        throw new Error("AI Service not configured. Please add VITE_GEMINI_API_KEY.");
    }

    let lastError = null;

    for (const modelName of AVAILABLE_MODELS) {
        try {
            console.log(`Trying Gemini model: ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            
            if (isJson) {
                const jsonText = text.replace(/```json|```/g, "").trim();
                return JSON.parse(jsonText);
            }
            return text;
        } catch (error: any) {
            console.warn(`Model ${modelName} failed:`, error.message || error);
            lastError = error;
            // If it's a 404 or model not found, we definitely want to try the next one
            continue;
        }
    }

    throw lastError || new Error("All Gemini models failed.");
}

export async function parseTransactionWithAI(
    text: string,
    accounts: { name: string, id: string }[],
    categories: { name: string, id: string }[]
): Promise<Partial<ParsedTransaction>> {
    const prompt = `
    Eres un asistente financiero experto. Tu tarea es extraer información de una transacción a partir de un texto en lenguaje natural.

    CUENTAS DISPONIBLES: ${accounts.map(a => a.name).join(", ")}
    CATEGORÍAS DISPONIBLES: ${categories.map(c => c.name).join(", ")}

    REGLAS:
    1. Si el texto no menciona una cuenta, no devuelvas "accountName".
    2. Si el texto no menciona una categoría, intenta clasificarla en las disponibles. Si no encaja, no devuelvas "categoryName".
    3. El tipo debe ser 'expense' (gasto), 'income' (ingreso) o 'transfer' (transferencia).
    4. La fecha debe estar en formato YYYY-MM-DD. Si no se menciona, usa la fecha actual (${new Date().toISOString().split('T')[0]}).
    5. Devuelve EXCLUSIVAMENTE un objeto JSON.

    TEXTO: "${text}"

    JSON esperado:
    {
      "description": "descripción breve",
      "amount": 100.50,
      "type": "expense",
      "date": "2024-03-20",
      "categoryName": "NombreCategoría",
      "accountName": "NombreCuenta",
      "isMaaserable": false,
      "isDeductible": false
    }
  `;

    try {
        return await callWithFallback(prompt);
    } catch (error) {
        console.error("Error parsing with AI:", error);
        throw new Error("No pude entender la transacción. ¿Podrías ser más específico?");
    }
}

export async function analyzeFinancialData(
    data: {
        income: number;
        expense: number;
        net: number;
        maaser: number;
        topCategories: { name: string, amount: number }[];
        month: string;
    }
): Promise<string[]> {
    if (!genAI) {
        return [
            "✨ Mantén un seguimiento constante para optimizar tu capital.",
            "📊 Revisa tus categorías de mayor gasto para identificar oportunidades de ahorro.",
            "🙏 El Maaser es una excelente práctica; asegúrate de mantener tu registro al día."
        ];
    }

    const prompt = `
    Como un coach financiero experto y amable, analiza estos datos mensuales (${data.month}):
    - Ingresos: ${data.income}
    - Gastos: ${data.expense}
    - Neto: ${data.net}
    - Maaser/Donaciones: ${data.maaser}
    - Categorías principales: ${data.topCategories.map(c => `${c.name}: ${c.amount}`).join(", ")}

    Proporciona 3 consejos personalizados y accionables de una sola frase cada uno.
    Usa un tono premium, alentador y profesional.
    Si el balance es negativo, sé empático pero directo.
    Si hay ahorro, sugiere cómo optimizarlo.
    Devuelve un JSON con el formato: ["consejo1", "consejo2", "consejo3"]
    `;

    try {
        return await callWithFallback(prompt);
    } catch (error) {
        console.error("Error analyzing financials:", error);
        return [
            "✨ Mantén un seguimiento constante para optimizar tu capital.",
            "📊 Revisa tus categorías de mayor gasto para identificar oportunidades de ahorro.",
            "🙏 El Maaser es una excelente práctica; asegúrate de mantener tu registro al día."
        ];
    }
}
