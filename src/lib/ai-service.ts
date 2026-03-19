import { supabase } from './supabase';

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

async function callAIProxy(prompt: string, isJson: boolean = true) {
    // 1. Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.access_token) {
        console.error("Auth Error:", sessionError);
        throw new Error("Debes iniciar sesión para usar la inteligencia artificial.");
    }

    // 2. Call our secure proxy
    const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ prompt, isJson })
    });

    if (!response.ok) {
        let errMessage = response.statusText;
        try {
            const errData = await response.json();
            errMessage = errData.error || errMessage;
        } catch (e) {
            // ignore
        }
        throw new Error(errMessage);
    }

    const data = await response.json();
    return data.result;
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
        return await callAIProxy(prompt, true);
    } catch (error: any) {
        console.error("Error parsing with AI:", error);
        throw new Error(error.message || "No pude entender la transacción. ¿Podrías ser más específico?");
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
        return await callAIProxy(prompt, true);
    } catch (error) {
        console.error("Error analyzing financials:", error);
        return [
            "✨ Mantén un seguimiento constante para optimizar tu capital.",
            "📊 Revisa tus categorías de mayor gasto para identificar oportunidades de ahorro.",
            "🙏 El Maaser es una excelente práctica; asegúrate de mantener tu registro al día."
        ];
    }
}
