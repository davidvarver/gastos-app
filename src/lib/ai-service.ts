import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

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

export async function parseTransactionWithAI(
    text: string,
    accounts: { name: string, id: string }[],
    categories: { name: string, id: string }[]
): Promise<Partial<ParsedTransaction>> {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const jsonText = response.text().replace(/```json|```/g, "").trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error parsing with AI:", error);
        throw new Error("No pude entender la transacción. ¿Podrías ser más específico?");
    }
}
