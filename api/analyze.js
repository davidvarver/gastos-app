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

        // List of models to try (Exact names from your diagnostic list)
        const modelsToTry = [
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "gemini-pro-vision"
        ];

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

        let lastError = null;
        let resultJson = null;

        // Loop through models manually via REST API
        for (const modelName of modelsToTry) {
            try {
                console.log(`Attempting raw fetch with model: ${modelName}`);

                // Construct the URL manually. Note: we remove 'models/' prefix if present in the array for the URL construction
                // because the API expects .../models/[NAME]:generateContent
                // But wait, the previous error said "models/gemini... not found". 
                // The standard endpoint is https://generativelanguage.googleapis.com/v1beta/models/[NAME]:generateContent

                const cleanModelName = modelName.replace('models/', '');
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModelName}:generateContent?key=${apiKey}`;

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: "image/jpeg",
                                        data: image
                                    }
                                }
                            ]
                        }]
                    })
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errText}`);
                }

                const data = await response.json();

                // Check if we have candidates
                if (!data.candidates || data.candidates.length === 0) {
                    throw new Error("No candidates returned from API");
                }

                const text = data.candidates[0].content.parts[0].text;

                // Clean the text
                const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                resultJson = JSON.parse(cleanedText);

                // If success, break loop
                console.log(`Success with model: ${modelName}`);
                break;

            } catch (error) {
                console.warn(`Raw API failed for ${modelName}:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        if (!resultJson) {
            throw new Error(`All raw API attempts failed. Last error: ${lastError?.message}`);
        }

        return res.status(200).json(resultJson);

    } catch (error) {
        console.error("Critical API Error:", error);
        return res.status(500).json({
            error: 'Failed to analyze receipt (Raw API)',
            details: error.message
        });
    }
}
