import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
    runtime: 'edge', // Optional: Use Vercel Edge Runtime for speed if supported, or remove for Node.js
};

export default async function handler(request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { image } = await request.json();

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'Server misconfiguration: No API Key' }), { status: 500 });
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
                    mimeType: "image/jpeg" // We upload as jpeg mostly, or we can pass mime type from client if needed. For now assuming typical mobile photo.
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(cleanedText);

        return new Response(JSON.stringify(json), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("API Error:", error);
        return new Response(JSON.stringify({ error: 'Failed to analyze receipt', details: error.message }), { status: 500 });
    }
}
