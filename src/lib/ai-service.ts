import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// DIAGNÓSTICO: Log simplificado para verificar presencia de llave (sin exponerla toda)
if (!API_KEY) {
    console.error("❌ AI_SERVICE: VITE_GEMINI_API_KEY no detectada en environment.");
} else {
    console.log(`✅ AI_SERVICE: Key detectada (Inicia con: ${API_KEY.substring(0, 4)}..., Longitud: ${API_KEY.length})`);
}

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

// Lista exhaustiva de modelos y versiones para burlar el 404
const AVAILABLE_MODELS = [
    { name: "gemini-1.5-flash", version: 'v1' },
    { name: "gemini-1.5-flash", version: 'v1beta' },
    { name: "gemini-1.5-pro", version: 'v1' },
    { name: "gemini-1.5-flash-latest", version: 'v1' },
    { name: "gemini-1.0-pro", version: 'v1' },
    { name: "gemini-pro", version: 'v1beta' },
    { name: "gemini-2.0-flash-exp", version: 'v1beta' }
];

async function listAvailableModels() {
    if (!genAI) return;
    try {
        const result = await (genAI as any).listModels();
        console.log("🔎 DIAGNÓSTICO DE MODELOS: Tu API Key tiene acceso a:", 
            result.models.map((m: any) => m.name).join(", "));
    } catch (e) {
        console.log("🔎 DIAGNÓSTICO DE MODELOS: No se pudieron listar los modelos:", e);
    }
}

async function callWithFallback(prompt: string, isJson: boolean = true) {
    if (!genAI) {
        throw new Error("AI Service no configurado. Verifica VITE_GEMINI_API_KEY.");
    }

    let lastError = null;
    const modelNames = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];

    for (const name of modelNames) {
        // TIER 1: Intento sin forzar versión (deja que el SDK decida)
        // TIER 2: Intento con v1
        // TIER 3: Intento con v1beta
        const versions = [undefined, 'v1', 'v1beta'];

        for (const version of versions) {
            try {
                console.log(`🤖 IA: Probando ${name} ${version ? `(${version})` : '(Auto)'}...`);
                
                const modelOptions: any = { model: name };
                const requestOptions: any = version ? { apiVersion: version } : undefined;
                
                const model = genAI.getGenerativeModel(modelOptions, requestOptions);
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();
                
                if (isJson) {
                    const jsonText = text.replace(/```json|```/g, "").trim();
                    return JSON.parse(jsonText);
                }
                return text;
            } catch (error: any) {
                lastError = error;
                const msg = error.message || String(error);
                if (msg.includes("leaked")) {
                    console.error("❌ ERROR CRÍTICO: API Key bloqueada por Google (leaked).");
                    throw new Error("API Key bloqueada.");
                }
                console.warn(`⚠️ IA: Intento fallido con ${name} ${version || 'Auto'}:`, msg);
                continue;
            }
        }
    }

    // Si todo falla, tiramos la sonda de diagnóstico antes de rendirnos
    console.error("🚨 TODOS LOS MODELOS FALLARON. Iniciando sonda de diagnóstico...");
    await listAvailableModels();

    throw lastError || new Error("Falla masiva de conexión con Gemini (404/403).");
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
