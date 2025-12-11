import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;

        const apiKey = process.env.GEMINI_API_KEY?.trim();
        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY environment variable");
            return res.status(500).json({ error: 'Server misconfiguration: No API Key' });
        }

        // Initialize Gemini
        const genAI = new GoogleGenerativeAI(apiKey);

        // List of models to try in order of preference
        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-pro-vision" // Legacy fallback
        ];

        let lastError = null;
        let result = null;

        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting to use model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });

                result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: image,
                            mimeType: "image/jpeg"
                        }
                    }
                ]);

                // If we get here, it worked
                break;
            } catch (error) {
                console.warn(`Model ${modelName} failed:`, error.message);
                lastError = error;
                // If it's a 404, continue to next model. If it's auth error, stop.
                if (!error.message.includes('404') && !error.message.includes('not found')) {
                    // If it's not a "Not Found" error, it might be something else we can't fix by switching models (like quota or auth)
                    // But for robustness, let's just keep trying unless we run out.
                }
            }
        }

        if (!result) {
            throw new Error(`All models failed. Last error: ${lastError?.message}`);
        }

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
