export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: "No GEMINI_API_KEY found in environment" });
    }

    try {
        // Direct call to Google REST API to list models
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({
                error: "Failed to fetch models from Google",
                details: errorText
            });
        }

        const data = await response.json();

        // Filter for "generateContent" supported models
        const chatModels = data.models?.filter(m =>
            m.supportedGenerationMethods.includes("generateContent")
        ).map(m => m.name); // e.g. "models/gemini-1.5-flash"

        return res.status(200).json({
            info: "List of models available to your API Key",
            count: chatModels?.length,
            models: chatModels,
            full_response: data
        });

    } catch (error) {
        return res.status(500).json({
            error: "Internal Server Error",
            message: error.message
        });
    }
}
