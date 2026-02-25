export interface ReceiptItem {
    description: string;
    amount: number;
    category_suggestion: string;
}

export interface AnalyzedReceipt {
    amount: number;
    date: string;
    description: string;
    category_suggestion: string;
    items?: ReceiptItem[];
}

export async function analyzeReceipt(imageFile: File): Promise<AnalyzedReceipt> {

    // Compress and Resize Image (Client-side) to avoid Vercel 4.5MB limit
    const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1024;
                    const MAX_HEIGHT = 1024;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Compress to JPEG 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    // Remove prefix
                    resolve(dataUrl.split(',')[1]);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const base64Image = await compressImage(imageFile);

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

        if (err.debug_log) {
            // Format the debug log into a readable string
            const logMsg = err.debug_log.map((l: { model: string; error: string }) => `[${l.model}]: ${l.error}`).join('\n');
            throw new Error(`All models failed:\n${logMsg}`);
        }

        const errorMessage = err.details || err.error || "Error al analizar el ticket en el servidor";
        throw new Error(errorMessage);
    }

    return await response.json();
}
