import { createClient } from '@supabase/supabase-js';

// Simple in-memory rate limiter (per Vercel instance)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; 

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 1. Validate payload size loosely
        const requestBody = JSON.stringify(req.body || {});
        if (requestBody.length > 50000) { // 50KB soft limit to prevent giant abuse
            return res.status(413).json({ error: 'Payload too large' });
        }

        const { prompt, isJson } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Missing prompt' });
        }

        // 2. Authentication via Supabase JWT
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing or invalid Bearer token' });
        }
        
        const token = authHeader.split(' ')[1];
        
        // Initialize Supabase Client
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Server misconfiguration: Supabase not configured' });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        // 3. Rate Limiting (by user ID)
        const now = Date.now();
        const userRateData = rateLimitMap.get(user.id) || { count: 0, firstRequest: now };
        
        if (now - userRateData.firstRequest > RATE_LIMIT_WINDOW_MS) {
            // Reset window
            userRateData.count = 1;
            userRateData.firstRequest = now;
        } else {
            userRateData.count++;
            if (userRateData.count > MAX_REQUESTS_PER_WINDOW) {
                return res.status(429).json({ error: 'Too many requests, please try again later.' });
            }
        }
        rateLimitMap.set(user.id, userRateData);

        // 4. Connect to Gemini API with fallback logic
        const apiKey = (process.env.GEMINI_API_KEY)?.trim();
        if (!apiKey) {
             return res.status(500).json({ error: 'Server misconfiguration: AI service unavailable.' });
        }

        const modelsToTry = [
            "gemini-2.0-flash", 
            "gemini-flash-latest",
            "gemini-pro-latest",
            "gemini-2.5-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash", 
            "gemini-1.5-pro"
        ];
        
        const apiVersions = ["v1", "v1beta"];
        const delay = (ms) => new Promise(res => setTimeout(res, ms));
        
        let resultJson = null;
        let resultText = null;
        
        outerLoop: for (const modelName of modelsToTry) {
            for (const apiVersion of apiVersions) {
                try {
                    const cleanModelName = modelName.replace('models/', '');
                    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${cleanModelName}:generateContent?key=${apiKey}`;

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{ text: prompt }]
                            }]
                        })
                    });

                    if (!response.ok) {
                        if (response.status === 429) {
                            await delay(300); // Backoff for quota limit
                        }
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const data = await response.json();

                    if (!data.candidates || data.candidates.length === 0) {
                        throw new Error("No candidates returned");
                    }

                    const text = data.candidates[0].content.parts[0].text;
                    
                    if (isJson) {
                        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                        resultJson = JSON.parse(cleanedText);
                    } else {
                        resultText = text;
                    }
                    
                    break outerLoop; // Success

                } catch (error) {
                    // We catch and ignore errors in the outer loop to allow fallback
                    // We purposefully do not log raw errors to clients.
                    continue;
                }
            }
        }

        if (isJson && !resultJson) {
            return res.status(503).json({ error: 'AI processing failed due to high load or unavailability.' });
        }
        if (!isJson && !resultText) {
            return res.status(503).json({ error: 'AI processing failed due to high load or unavailability.' });
        }

        return res.status(200).json({ result: isJson ? resultJson : resultText });

    } catch (error) {
        console.error("Critical Proxy Error:", error.message);
        return res.status(500).json({
            error: 'Internal server error processing AI request. Please try again.'
        });
    }
}
