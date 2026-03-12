export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image } = req.body;

        const apiKey = (process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY)?.trim();
        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY environment variable");
            return res.status(500).json({ error: 'Server misconfiguration: No API Key' });
        }

        // Confirmamos modelos que SI funcionan segun diagnostico previo
        const modelsToTry = [
            "gemini-2.0-flash", 
            "gemini-flash-latest",
            "gemini-flash-lite-latest",
            "gemini-pro-latest",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash", 
            "gemini-1.5-pro"
        ];
        
        const apiVersions = ["v1", "v1beta"];

        // ... (prompt remains the same)

        let errorLog = [];
        let resultJson = null;
        
        const delay = (ms) => new Promise(res => setTimeout(res, ms));

        // Loop through models and versions
        outerLoop: for (const modelName of modelsToTry) {
            for (const apiVersion of apiVersions) {
                try {
                    console.log(`Attempting fetch with model: ${modelName} (${apiVersion})`);

                    const cleanModelName = modelName.replace('models/', '');
                    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${cleanModelName}:generateContent?key=${apiKey}`;

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
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
                        let errDetails = errText;
                        try {
                            const errJson = JSON.parse(errText);
                            errDetails = errJson.error?.message || errText;
                        } catch (e) { /* ignore */ }

                        // Si es 429, esperamos un poco antes de seguir
                        if (response.status === 429) {
                            console.warn(`Quota exceeded for ${modelName}, waiting...`);
                            await delay(500);
                        }

                        throw new Error(`HTTP ${response.status}: ${errDetails}`);
                    }

                    const data = await response.json();

                    if (!data.candidates || data.candidates.length === 0) {
                        throw new Error("No candidates returned from API");
                    }

                    const text = data.candidates[0].content.parts[0].text;
                    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    resultJson = JSON.parse(cleanedText);

                    console.log(`Success with model: ${modelName} (${apiVersion})`);
                    break outerLoop;

                } catch (error) {
                    console.warn(`API failed for ${modelName} (${apiVersion}):`, error.message);
                    errorLog.push({ model: `${modelName} (${apiVersion})`, error: error.message });
                }
            }
        }

        if (!resultJson) {
            console.error("All attempts failed:", errorLog);
            return res.status(500).json({
                error: 'All models failed',
                debug_log: errorLog
            });
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
