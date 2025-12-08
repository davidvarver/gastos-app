import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AnalyzedReceipt {
    amount: number;
    date: string;
    description: string;
    category_suggestion: string;
}

export async function analyzeReceipt(imageFile: File, apiKey: string): Promise<AnalyzedReceipt> {
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64Image = base64Data.split(',')[1];

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    Analyze this receipt image and extract the following transaction details.
    Return strictly a JSON object with this structure:
    {
        "amount": number, // Total amount found
        "date": "YYYY-MM-DD", // Date of the transaction. If year is missing, assume current year.
        "description": "string", // Name of establishment + brief summary (e.g. "OXXO - Refrescos y Papas")
        "category_suggestion": "string" // Suggest one: Comida, Super, Gasolina, Servicios, Salud, Ropa, Restaurante, Otros
    }
    
    If you cannot find a value, use reasonable defaults (e.g. description "Compra", date today).
    Do not include markdown formatting like \`\`\`json. Just the raw JSON.
  `;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: imageFile.type
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean potentially remaining markdown
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanedText);
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        throw new Error("No se pudo analizar el ticket. Verifica tu API Key o la imagen.");
    }
}
