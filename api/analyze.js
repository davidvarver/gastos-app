import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY environment variable");
            return res.status(500).json({ error: 'Server misconfiguration: No API Key' });
        }

        // Initialize Gemini
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
        
        If you cannot find a value, use reasonable defaults.
        Do not include markdown formatting like \`\`\`json. Just the raw JSON.
        `;

        // The image comes as base64 string without data prefix from the client
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: image,
                    mimeType: "image/jpeg"
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleanedText);

        return res.status(200).json(json);

    } catch (error) {
        console.error("API Error Trace:", error);
        return res.status(500).json({
            error: 'Failed to analyze receipt',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
