export interface AnalyzedReceipt {
    amount: number;
    date: string;
    description: string;
    category_suggestion: string;
}

export async function analyzeReceipt(imageFile: File): Promise<AnalyzedReceipt> {

    // Convert to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });

    // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
    const base64Image = base64Data.split(',')[1];

    // Call our serverless function
    const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: base64Image
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Error al analizar el ticket en el servidor");
    }

    return await response.json();
}
